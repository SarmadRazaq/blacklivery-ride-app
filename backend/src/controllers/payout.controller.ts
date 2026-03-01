import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { walletService } from '../services/WalletService';
import { paymentService } from '../services/payment/PaymentService';
import { db } from '../config/firebase';
import { RegionCode } from '../config/region.config';
import Stripe from 'stripe';
import { logger } from '../utils/logger';

let _stripeInstance: Stripe | null = null;
const getStripe = (): Stripe => {
    if (!_stripeInstance) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
        _stripeInstance = new Stripe(key, { apiVersion: '2025-01-27.acacia' } as any);
    }
    return _stripeInstance;
};

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
    try {
        const { uid } = req.user;
        const rawCurrency = (req.body.currency ?? 'NGN').toString().toUpperCase();
        const currency = (['NGN', 'USD'].includes(rawCurrency) ? rawCurrency : 'NGN') as SupportedCurrency;
        const amount = Number(req.body.amount);
        let accountNumber = req.body.accountNumber as string | undefined;
        let bankCode = req.body.bankCode as string | undefined;
        const bankAccountId = req.body.bankAccountId as string | undefined;

        if (bankAccountId) {
            const methodDoc = await db.collection('payment_methods').doc(bankAccountId).get();
            if (methodDoc.exists && methodDoc.data()?.userId === uid) {
                const details = methodDoc.data()?.details;
                accountNumber = details?.accountNumber;
                bankCode = details?.bankCode;
            }
        }

        // (moved try above to wrap bank account lookup)
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

        const reference = `PAYOUT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
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
        res.status(500).json({ error: 'Payout failed' });
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
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Stripe Connect onboarding failed' : error.message });
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
                `REF-REJECT-${payout.reference}`,
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
                `REF-FAIL-${payout.reference}`,
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

            return res.status(500).json({ error: 'Payout initiation failed' });
        }
    } catch (error: any) {
        logger.error({ err: error, payoutId: req.params.id }, 'Payout approval error');
        res.status(500).json({ error: 'Failed to approve payout' });
    }
};

export const getBanks = async (req: AuthRequest, res: Response) => {
    try {
        // Fetch banks from Paystack API
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecret) {
            // Fallback to static list if Paystack not configured
            return res.status(200).json([
                { code: '044', name: 'Access Bank' },
                { code: '023', name: 'Citibank Nigeria' },
                { code: '063', name: 'Diamond Bank (Access)' },
                { code: '050', name: 'Ecobank Nigeria' },
                { code: '084', name: 'Enterprise Bank' },
                { code: '070', name: 'Fidelity Bank' },
                { code: '011', name: 'First Bank of Nigeria' },
                { code: '214', name: 'First City Monument Bank' },
                { code: '058', name: 'GTBank' },
                { code: '030', name: 'Heritage Bank' },
                { code: '301', name: 'Jaiz Bank' },
                { code: '082', name: 'Keystone Bank' },
                { code: '526', name: 'Parallex Bank' },
                { code: '076', name: 'Polaris Bank' },
                { code: '101', name: 'Providus Bank' },
                { code: '221', name: 'Stanbic IBTC Bank' },
                { code: '068', name: 'Standard Chartered Bank' },
                { code: '232', name: 'Sterling Bank' },
                { code: '100', name: 'Suntrust Bank' },
                { code: '032', name: 'Union Bank of Nigeria' },
                { code: '033', name: 'United Bank for Africa (UBA)' },
                { code: '215', name: 'Unity Bank' },
                { code: '035', name: 'Wema Bank' },
                { code: '057', name: 'Zenith Bank' },
                { code: '999992', name: 'OPay' },
                { code: '999991', name: 'PalmPay' },
                { code: '999993', name: 'Kuda Bank' },
                { code: '999994', name: 'Moniepoint' },
            ]);
        }

        const axios = (await import('axios')).default;
        const response = await axios.get('https://api.paystack.co/bank', {
            headers: { Authorization: `Bearer ${paystackSecret}` },
            timeout: 10000
        });

        const banks = response.data?.data?.map((b: any) => ({
            code: b.code,
            name: b.name,
            type: b.type,
            currency: b.currency
        })) || [];

        res.status(200).json(banks);
    } catch (error: any) {
        logger.error({ err: error }, 'Failed to fetch banks');
        if (process.env.NODE_ENV === 'production') {
            return res.status(502).json({ error: 'Unable to fetch bank list right now' });
        }

        // Non-production fallback to keep local/dev flows usable
        res.status(200).json([
            { code: '044', name: 'Access Bank' },
            { code: '058', name: 'GTBank' },
            { code: '033', name: 'UBA' },
            { code: '057', name: 'Zenith Bank' },
            { code: '011', name: 'First Bank' },
            { code: '070', name: 'Fidelity Bank' },
        ]);
    }
};

export const verifyAccount = async (req: AuthRequest, res: Response) => {
    try {
        const { accountNumber, bankCode } = req.body;

        if (!accountNumber || !bankCode) {
            return res.status(400).json({ error: 'Account number and bank code are required' });
        }

        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecret) {
            if (process.env.NODE_ENV === 'production') {
                logger.error('PAYSTACK_SECRET_KEY missing in production');
                return res.status(503).json({ error: 'Account verification service unavailable' });
            }

            // Development fallback only
            logger.warn('Paystack secret missing in non-production, returning mock verification');
            return res.status(200).json({
                accountName: 'Test Account Name',
                accountNumber,
                bankCode
            });
        }

        const axios = (await import('axios')).default;
        try {
            const response = await axios.get(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
                headers: { Authorization: `Bearer ${paystackSecret}` },
                timeout: 10000
            });

            if (response.data.status) {
                res.status(200).json({
                    accountName: response.data.data.account_name,
                    accountNumber: response.data.data.account_number,
                    bankId: response.data.data.bank_id
                });
            } else {
                res.status(400).json({ error: 'Could not resolve account details' });
            }
        } catch (error: any) {
            logger.error({ err: error }, 'Paystack resolve account failed');
            res.status(400).json({ error: 'Could not verify account details. Please check the number and bank.' });
        }

    } catch (error: any) {
        logger.error({ err: error }, 'verifyAccount failed');
        res.status(500).json({ error: 'Failed to verify account' });
    }
};

export const monnifyWebhook = async (req: Request, res: Response) => {
    const signature = req.headers['monnify-signature'] as string | undefined;
    const secret = process.env.MONNIFY_WEBHOOK_SECRET;

    if (!signature || !secret) {
        return res.status(403).json({ message: 'Invalid signature' });
    }

    // Verify HMAC-SHA512 signature
    const computedHash = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    const computedBuf = Buffer.from(computedHash, 'hex');
    const sigBuf = Buffer.from(signature as string, 'hex');
    if (computedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(computedBuf, sigBuf)) {
        return res.status(403).json({ message: 'Signature mismatch' });
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

/**
 * Stripe Connect Webhook — handles account updates, transfer reversals, payout failures
 */
export const stripeConnectWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string | undefined;
    const endpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
        return res.status(400).json({ error: 'Missing signature or webhook secret' });
    }

    // Verify using the Stripe SDK: validates raw bytes, HMAC-SHA256, and timestamp (replay attack protection)
    let event: Stripe.Event;
    try {
        const rawBody = (req as any).rawBody as Buffer | undefined;
        if (!rawBody) {
            logger.error('rawBody unavailable for Stripe Connect webhook — check express.json verify callback');
            return res.status(500).json({ error: 'Webhook configuration error' });
        }
        event = getStripe().webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err: any) {
        logger.warn({ err: err.message }, 'Stripe Connect webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    try {
        const eventType = event?.type;

        logger.info({ eventType, eventId: event?.id }, 'Stripe Connect webhook received');

        switch (eventType) {
            case 'account.updated': {
                const account = event.data?.object;
                const accountId = account?.id;
                if (!accountId) break;

                // Find the user with this Stripe Connect account
                const userSnap = await db.collection('users')
                    .where('stripeConnectAccountId', '==', accountId)
                    .limit(1)
                    .get();

                if (!userSnap.empty) {
                    const userDoc = userSnap.docs[0];
                    await userDoc.ref.update({
                        'stripeConnect.chargesEnabled': account.charges_enabled || false,
                        'stripeConnect.payoutsEnabled': account.payouts_enabled || false,
                        'stripeConnect.detailsSubmitted': account.details_submitted || false,
                        'stripeConnect.updatedAt': new Date()
                    });
                    logger.info({ accountId, userId: userDoc.id, chargesEnabled: account.charges_enabled }, 'Stripe Connect account updated');
                }
                break;
            }

            case 'transfer.reversed': {
                const transfer = event.data?.object;
                const transferId = transfer?.id;
                if (!transferId) break;

                // Find payout by gateway response ID
                const payoutSnap = await db.collection('payout_requests')
                    .where('gatewayResponse.id', '==', transferId)
                    .limit(1)
                    .get();

                if (!payoutSnap.empty) {
                    const payoutDoc = payoutSnap.docs[0];
                    const payout = payoutDoc.data();

                    await payoutDoc.ref.update({
                        status: 'reversed',
                        reversedAt: new Date(),
                        updatedAt: new Date(),
                        statusHistory: appendHistory(payout?.statusHistory, {
                            status: 'reversed',
                            at: new Date(),
                            actor: 'stripe_webhook',
                            notes: `Transfer reversed: ${transfer.reversals?.data?.[0]?.id || 'unknown'}`
                        })
                    });

                    // Refund driver wallet
                    await walletService.processTransaction(
                        payout.userId,
                        payout.amount,
                        'credit',
                        'refund',
                        'Transfer reversal refund',
                        `REV-${payout.reference}`,
                        {
                            walletCurrency: 'USD',
                            metadata: { payoutReference: payout.reference, action: 'transfer_reversed' }
                        }
                    );

                    logger.warn({ transferId, payoutId: payoutDoc.id }, 'Stripe transfer reversed — wallet refunded');
                }
                break;
            }

            case 'payout.failed': {
                const payout = event.data?.object;
                const destination = payout?.destination;
                if (!destination) break;

                // Notify admin about payout failure
                logger.error({
                    destination,
                    failureCode: payout.failure_code,
                    failureMessage: payout.failure_message
                }, 'Stripe payout failed for connected account');
                break;
            }

            default:
                logger.info({ eventType }, 'Unhandled Stripe Connect event');
        }

        res.status(200).json({ received: true });
    } catch (error: any) {
        logger.error({ err: error }, 'Stripe Connect webhook processing failed');
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

/**
 * Retry a failed payout (admin only). Max 3 retries.
 */
export const retryPayout = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
    }

    try {
        const payoutRef = db.collection('payout_requests').doc(id);
        const payoutDoc = await payoutRef.get();

        if (!payoutDoc.exists) {
            return res.status(404).json({ error: 'Payout request not found' });
        }

        const payout = payoutDoc.data()!;

        if (payout.status !== 'failed') {
            return res.status(400).json({ error: 'Only failed payouts can be retried' });
        }

        const retryCount = payout.retryCount ?? 0;
        if (retryCount >= 3) {
            return res.status(400).json({ error: 'Maximum retry attempts (3) reached' });
        }

        const currency = (payout.currency ?? 'NGN').toUpperCase() as SupportedCurrency;
        const region: RegionCode = currency === 'USD' ? 'US-CHI' : 'NG';

        let recipientCode = payout.recipientCode;

        if (!recipientCode) {
            const userDoc = await db.collection('users').doc(payout.userId).get();
            const userData = userDoc.data() ?? {};
            const fullName = userData.displayName ?? 'Blacklivery Driver';

            if (currency === 'NGN' && payout.accountNumber && payout.bankCode) {
                recipientCode = await paymentService.createRecipient(region, fullName, payout.accountNumber, payout.bankCode);
            } else if (currency === 'USD' && payout.stripeConnectAccountId) {
                recipientCode = payout.stripeConnectAccountId;
            } else {
                return res.status(400).json({ error: 'Missing recipient details for retry' });
            }
        }

        const now = new Date();

        try {
            const transferId = await paymentService.transferFunds(region, recipientCode, payout.amount, currency, 'Payout Retry');

            await payoutRef.update({
                status: 'processing',
                retryCount: retryCount + 1,
                updatedAt: now,
                recipientCode,
                gatewayResponse: { id: transferId },
                statusHistory: appendHistory(payout.statusHistory, {
                    status: 'processing',
                    at: now,
                    actor: req.user.uid,
                    notes: `Retry #${retryCount + 1} initiated: ${transferId}`
                })
            });

            return res.status(200).json({ message: 'Payout retry initiated', transferId });
        } catch (error: any) {
            logger.error({ err: error, payoutId: id, retryCount: retryCount + 1 }, 'Payout retry failed');

            await payoutRef.update({
                retryCount: retryCount + 1,
                updatedAt: now,
                statusHistory: appendHistory(payout.statusHistory, {
                    status: 'failed',
                    at: now,
                    actor: req.user.uid,
                    notes: `Retry #${retryCount + 1} failed: ${error.message}`
                })
            });

            return res.status(500).json({ error: 'Payout retry failed' });
        }
    } catch (error: any) {
        logger.error({ err: error, payoutId: id }, 'Payout retry error');
        res.status(500).json({ error: 'Failed to retry payout' });
    }
};

/**
 * Get payout history for authenticated driver
 */
export const getPayoutHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { uid } = req.user;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const countSnap = await db.collection('payout_requests')
            .where('userId', '==', uid)
            .count()
            .get();
        const total = countSnap.data().count;

        const snapshot = await db.collection('payout_requests')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit)
            .get();

        const payouts = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({
            success: true,
            data: payouts,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        logger.error({ err: error }, 'Error getting payout history');
        res.status(500).json({ error: 'Failed to get payout history' });
    }
};
