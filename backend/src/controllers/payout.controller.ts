import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { walletService } from '../services/WalletService';
import { paymentService } from '../services/payment/PaymentService';
import { db } from '../config/firebase';
import { RegionCode } from '../config/region.config';
import { logger } from '../utils/logger';

type SupportedCurrency = 'NGN' | 'USD';

interface PaymentsConfig {
    payoutMinimums?: Partial<Record<SupportedCurrency, number>>;
}

let paymentsConfigCache: { data: PaymentsConfig; expiresAt: number } | null = null;

const getPaymentsConfig = async (): Promise<PaymentsConfig> => {
    if (paymentsConfigCache && paymentsConfigCache.expiresAt > Date.now()) {
        return paymentsConfigCache.data;
    }

    const snapshot = await db.collection('config').doc('payments').get();
    const data = (snapshot.data() as PaymentsConfig | undefined) ?? {};
    paymentsConfigCache = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
    return data;
};

const appendHistory = (
    history: Array<{ status: string; at: Date; actor: string; notes?: string }> | undefined,
    entry: { status: string; at: Date; actor: string; notes?: string }
) => [...(history ?? []), entry];

export const requestPayout = async (req: AuthRequest, res: Response) => {
    const { uid } = req.user;
    const rawCurrency = (req.body.currency ?? 'NGN').toString().toUpperCase();
    const currency = (['NGN', 'USD'].includes(rawCurrency) ? rawCurrency : 'NGN') as SupportedCurrency;
    const amount = Number(req.body.amount);
    const accountNumber = req.body.accountNumber as string | undefined;
    const bankCode = req.body.bankCode as string | undefined;

    try {
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid payout amount' });
        }

        const config = await getPaymentsConfig();
        const minimum = config.payoutMinimums?.[currency] ?? 0;
        if (amount < minimum) {
            return res.status(400).json({ error: `Minimum payout for ${currency} is ${minimum}` });
        }

        const wallet = await walletService.getWallet(uid, currency);
        if (wallet.balance.amount < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data() ?? {};
        const stripeConnectAccountId =
            userData.stripeConnectAccountId ??
            userData.payouts?.stripeConnectAccountId ??
            userData.driverProfile?.stripeConnectAccountId ??
            null;

        if (currency === 'USD' && !stripeConnectAccountId) {
            return res.status(400).json({ error: 'Stripe Connect account required for USD payouts' });
        }

        if (currency === 'NGN' && (!accountNumber || !bankCode)) {
            return res.status(400).json({ error: 'Bank account number and bank code are required' });
        }

        const reference = `PAYOUT-${Date.now()}`;
        await walletService.processTransaction(uid, amount, 'debit', 'driver_payout', 'Payout Request Hold', reference, {
            walletCurrency: currency,
            metadata: { payoutReference: reference, payoutChannel: currency === 'USD' ? 'stripe_connect' : 'bank_transfer' }
        });

        const now = new Date();
        const payoutRequest = {
            userId: uid,
            amount,
            currency,
            accountNumber: currency === 'USD' ? null : accountNumber,
            bankCode: currency === 'USD' ? null : bankCode,
            reference,
            status: 'pending',
            gateway: null,
            retryCount: 0,
            createdAt: now,
            updatedAt: now,
            statusHistory: [
                {
                    status: 'pending',
                    at: now,
                    actor: uid,
                    notes: 'Payout requested'
                }
            ],
            metadata: {
                accountName: req.body.accountName,
                minimumPayout: minimum
            },
            payoutChannel: currency === 'USD' ? 'stripe_connect' : 'bank_transfer',
            stripeConnectAccountId: stripeConnectAccountId ?? null,
            walletCurrency: currency,
            walletId: wallet.id
        };

        const docRef = await db.collection('payout_requests').add(payoutRequest);

        res.status(201).json({
            message: 'Payout request submitted for approval',
            requestId: docRef.id,
            reference
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Payout request failed');
        res.status(500).json({ error: 'Payout failed', details: error.message });
    }
};

export const createStripeConnectAccount = async (req: AuthRequest, res: Response) => {
    const { uid, displayName } = req.user;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        
        let accountId = userData?.stripeConnectAccountId;

        if (!accountId) {
             // Create account
             accountId = await paymentService.createRecipient('US-CHI', displayName || 'Driver', '', '');
             // Save account ID
             await userDoc.ref.update({ stripeConnectAccountId: accountId });
        }

        // Generate link
        // Hardcoded return URLs for now, should be from config
        const link = await paymentService.generateOnboardingLink(
            'US-CHI', 
            accountId, 
            `${process.env.FRONTEND_URL}/payouts/refresh`, 
            `${process.env.FRONTEND_URL}/payouts/success`
        );
        
        res.status(200).json({ url: link });
    } catch (error: any) {
        logger.error({ err: error }, 'Stripe Connect onboarding failed');
        res.status(500).json({ error: error.message });
    }
};

export const approvePayout = async (req: AuthRequest, res: Response) => {
    const { id } = req.params; // Payout Request ID (or Transaction Reference)
    const { approved } = req.body; // true to approve, false to reject

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
    }

    try {
        const payoutRef = db.collection('payout_requests').doc(id);
        const payoutDoc = await payoutRef.get();

        if (!payoutDoc.exists) {
            return res.status(404).json({ error: 'Payout request not found' });
        }

        const payout = payoutDoc.data();
        if (!payout || payout.status !== 'pending') {
            return res.status(400).json({ error: 'Payout already processed' });
        }
        const currency = (payout.currency ?? 'NGN').toUpperCase() as SupportedCurrency;
        if (currency === 'USD' && !payout.stripeConnectAccountId) {
            return res.status(400).json({ error: 'Missing Stripe Connect account for USD payout' });
        }

        if (!approved) {
            await walletService.processTransaction(
                payout.userId,
                payout.amount,
                'credit',
                'refund',
                'Payout Rejected Refund',
                `REF-${payout.reference}`,
                {
                    walletCurrency: currency,
                    metadata: { payoutReference: payout.reference, action: 'rejected' }
                }
            );

            await payoutRef.update({
                status: 'rejected',
                rejectedAt: new Date(),
                rejectedBy: req.user.uid,
                updatedAt: new Date(),
                statusHistory: appendHistory(payout.statusHistory, {
                    status: 'rejected',
                    at: new Date(),
                    actor: req.user.uid,
                    notes: 'Payout rejected'
                })
            });

            return res.status(200).json({ message: 'Payout rejected and refunded' });
        }

        const userDoc = await db.collection('users').doc(payout.userId).get();
        const userData = userDoc.data();
        const fullName = userData?.displayName ?? 'Blacklivery Driver';

        try {
            const region: RegionCode = currency === 'USD' ? 'US-CHI' : 'NG';
            let recipientCode = payout.recipientCode;

            if (!recipientCode) {
                if (currency === 'NGN' && payout.accountNumber && payout.bankCode) {
                    recipientCode = await paymentService.createRecipient(region, fullName, payout.accountNumber, payout.bankCode);
                } else if (currency === 'USD' && payout.stripeConnectAccountId) {
                    recipientCode = payout.stripeConnectAccountId;
                } else {
                    throw new Error('Missing recipient details');
                }
            }

            const transferId = await paymentService.transferFunds(region, recipientCode, payout.amount, currency, 'Payout');

            await payoutRef.update({
                status: 'processing',
                gateway: currency === 'USD' ? 'stripe' : 'paystack',
                processingStartedAt: new Date(),
                approvedAt: new Date(),
                approvedBy: req.user.uid,
                updatedAt: new Date(),
                recipientCode,
                gatewayResponse: { id: transferId },
                statusHistory: appendHistory(payout.statusHistory, {
                    status: 'processing',
                    at: new Date(),
                    actor: req.user.uid,
                    notes: `Payout initiated: ${transferId}`
                })
            });

            return res.status(200).json({ message: 'Payout approved; transfer initiated', transferId });
        } catch (error: any) {
            logger.error({ err: error, payoutId: id }, 'Failed to initiate payout');

            await walletService.processTransaction(
                payout.userId,
                payout.amount,
                'credit',
                'refund',
                'Payout initiation refund',
                `REF-${payout.reference}`,
                {
                    walletCurrency: currency,
                    metadata: { payoutReference: payout.reference, action: 'gateway_failed' }
                }
            );

            await payoutRef.update({
                status: 'failed',
                failedAt: new Date(),
                failureReason: error.message,
                updatedAt: new Date(),
                statusHistory: appendHistory(payout.statusHistory, {
                    status: 'failed',
                    at: new Date(),
                    actor: req.user.uid,
                    notes: `Gateway initiation failed: ${error.message}`
                })
            });

            return res.status(500).json({ error: 'Payout initiation failed', details: error.message });
        }
    } catch (error: any) {
        logger.error({ err: error, payoutId: req.params.id }, 'Payout approval error');
        res.status(500).json({ error: 'Failed to approve payout', details: error.message });
    }
};

export const getBanks = async (req: AuthRequest, res: Response) => {
    res.status(200).json([
        { code: '044', name: 'Access Bank' },
        { code: '058', name: 'GTBank' },
        { code: '033', name: 'UBA' }
    ]);
};

export const monnifyWebhook = async (req: Request, res: Response) => {
    const signature = req.headers['monnify-signature'];
    if (!signature || signature !== process.env.MONNIFY_WEBHOOK_SECRET) {
        return res.status(403).json({ message: 'Invalid signature' });
    }

    const event = req.body;
    const reference = event?.eventData?.transactionReference;
    if (!reference) {
        return res.status(400).json({ message: 'Missing reference' });
    }

    const payoutSnapshot = await db.collection('payout_requests').where('reference', '==', reference).limit(1).get();
    if (payoutSnapshot.empty) {
        return res.status(404).json({ message: 'Payout not found' });
    }

    const payoutDoc = payoutSnapshot.docs[0];
    const payout = payoutDoc.data();
    const history = payout?.statusHistory ?? [];
    const now = new Date();

    if (event.eventType === 'SUCCESSFUL_DISBURSEMENT') {
        await payoutDoc.ref.update({
            status: 'completed',
            completedAt: now,
            updatedAt: now,
            gatewayResponse: event,
            statusHistory: appendHistory(history, {
                status: 'completed',
                at: now,
                actor: 'monnify_webhook',
                notes: 'Payout completed'
            })
        });

        logger.info({ reference }, 'Payout completed via Monnify');
    } else if (event.eventType === 'FAILED_DISBURSEMENT') {
        const retryCount = (payout.retryCount ?? 0) + 1;
        await payoutDoc.ref.update({
            status: 'failed',
            failedAt: now,
            failureReason: event.eventData?.failureReason,
            retryCount,
            needsAttention: true,
            updatedAt: now,
            gatewayResponse: event,
            statusHistory: appendHistory(history, {
                status: 'failed',
                at: now,
                actor: 'monnify_webhook',
                notes: `Gateway failure: ${event.eventData?.failureReason}`
            })
        });

        await walletService.processTransaction(
            payout.userId,
            payout.amount,
            'credit',
            'refund',
            'Payout failure refund',
            `REF-${reference}`,
            {
                walletCurrency: (payout.currency ?? 'NGN').toUpperCase() as SupportedCurrency,
                metadata: { payoutReference: reference, action: 'webhook_failed' }
            }
        );

        logger.error(
            {
                reference,
                failureReason: event.eventData?.failureReason,
                retryCount
            },
            'Monnify payout failed; wallet refunded'
        );
    }

    res.status(200).json({ received: true });
};
