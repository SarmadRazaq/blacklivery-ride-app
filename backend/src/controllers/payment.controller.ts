import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { paymentService } from '../services/payment/PaymentService';
import { walletService } from '../services/WalletService';
import { rideService } from '../services/RideService';
import { db } from '../config/firebase';
import { RegionCode } from '../config/region.config';
import { logger } from '../utils/logger';
import { PaymentVerificationResult, CardDetails } from '../services/payment/IPaymentProvider';

/**
 * Save a card as a payment method when a card_setup charge succeeds.
 * Idempotent: uses the payment reference as the document ID to avoid duplicates.
 */
const saveCardPaymentMethod = async (
    userId: string,
    gateway: string,
    reference: string,
    cardDetails?: CardDetails
): Promise<void> => {
    try {
        const docId = `card_${reference}`;
        const docRef = db.collection('payment_methods').doc(docId);
        const existing = await docRef.get();
        if (existing.exists) return; // Already saved — idempotent

        await docRef.set({
            userId,
            type: 'card',
            brand: cardDetails?.brand || 'card',
            last4: cardDetails?.last4 || '****',
            expMonth: cardDetails?.expMonth || null,
            expYear: cardDetails?.expYear || null,
            gateway,
            authorizationCode: cardDetails?.authorizationCode || null,
            stripePaymentMethodId: cardDetails?.stripePaymentMethodId || null,
            stripeCustomerId: cardDetails?.stripeCustomerId || null,
            reference,
            isDefault: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        logger.info({ userId, gateway, last4: cardDetails?.last4 }, 'Saved card payment method from card_setup');
    } catch (e) {
        logger.error({ err: e, userId, reference }, 'Failed to save card payment method');
    }
};

/**
 * Validate webhook amount against the stored transaction amount.
 * Prevents attackers from crediting arbitrary amounts via forged webhooks.
 */
const validateWebhookAmount = async (reference: string, webhookAmount: number): Promise<boolean> => {
    try {
        const txSnapshot = await db.collection('transactions')
            .where('reference', '==', reference)
            .limit(1)
            .get();

        let storedAmount: number | undefined;

        if (!txSnapshot.empty) {
            storedAmount = txSnapshot.docs[0].data().amount;
        } else {
            // Fallback: check pending_payments (created during initiation, before any transaction exists)
            const pendingDoc = await db.collection('pending_payments').doc(reference).get();
            if (pendingDoc.exists) {
                storedAmount = pendingDoc.data()?.amount;
            }
        }

        if (storedAmount === undefined) {
            logger.warn({ reference, webhookAmount }, 'No matching transaction or pending payment found for webhook amount validation — rejecting');
            return false;
        }

        if (typeof storedAmount !== 'number') return false;

        // Allow up to 1% tolerance for currency conversion/rounding
        const tolerance = storedAmount * 0.01;
        if (Math.abs(webhookAmount - storedAmount) > tolerance) {
            logger.error({ reference, webhookAmount, storedAmount }, 'Webhook amount mismatch — possible fraud');
            return false;
        }

        return true;
    } catch (error) {
        logger.error({ err: error, reference }, 'Error validating webhook amount');
        // Fail closed — reject on DB errors. Legitimate payments will be retried by the gateway.
        return false;
    }
};

/**
 * Generic webhook handler for all payment gateways
 */
const handleWebhook = async (
    gateway: string,
    signatureHeader: string,
    req: Request,
    res: Response
) => {
    const signature = req.headers[signatureHeader] as string;
    if (!signature) {
        return res.status(400).send('Missing signature');
    }

    try {
        const body = gateway === 'stripe' ? (req as any).rawBody : req.body;
        if (gateway === 'stripe' && !body) {
            return res.status(400).send('Raw body missing');
        }

        const result = await paymentService.verifyWebhook(gateway as 'paystack' | 'flutterwave' | 'stripe' | 'monnify', body, signature);
        if (!result) {
            return res.status(400).send('Webhook verification failed');
        }

        if (result.success && result.status === 'success') {
            const { userId, rideId, purpose } = result.metadata || {};

            // Validate amount against stored transaction
            const amountValid = await validateWebhookAmount(result.reference, result.amount);
            if (!amountValid) {
                logger.error({ gateway, reference: result.reference }, 'Webhook rejected — amount mismatch');
                return res.status(400).send('Amount validation failed');
            }

            if (userId) {
                try {
                    const webhookPurpose = purpose || 'wallet_topup';
                    if (webhookPurpose === 'wallet_topup') {
                        // Direct credit to rider's wallet
                        await walletService.processTransaction(
                            userId,
                            result.amount,
                            'credit',
                            'wallet_topup',
                            `Wallet top-up via ${gateway}`,
                            result.reference,
                            {
                                walletCurrency: result.currency as 'NGN' | 'USD',
                                metadata: { gateway, ...result.metadata }
                            }
                        );
                    } else {
                        // Ride payment — hold in escrow
                        await walletService.recordEscrowDeposit({
                            reference: result.reference,
                            amount: result.amount,
                            currency: result.currency as 'NGN' | 'USD',
                            riderId: userId,
                            rideId,
                            purpose: webhookPurpose,
                            gateway: gateway as 'paystack' | 'flutterwave' | 'stripe' | 'monnify',
                            metadata: result.metadata
                        });
                    }
                } catch (e) {
                    logger.error({ err: e, reference: result.reference }, `${gateway} webhook wallet deposit failed`);
                }

                // Save card as payment method when this was a card_setup charge
                if (purpose === 'card_setup' && result.cardDetails) {
                    await saveCardPaymentMethod(userId, gateway, result.reference, result.cardDetails);
                }

                // If ride is already completed (driver marked done before webhook arrived),
                // trigger settlement now that the escrow hold exists.
                if (rideId) {
                    rideService.triggerSettlementIfComplete(rideId).catch(err =>
                        logger.error({ err, rideId }, 'Late-webhook settlement trigger failed')
                    );
                }
            }
        }
        res.json({ received: true });
    } catch (error) {
        logger.error({ err: error, gateway }, 'Webhook processing error');
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

export const handleStripeWebhook = (req: Request, res: Response) =>
    handleWebhook('stripe', 'stripe-signature', req, res);

export const handlePaystackWebhook = (req: Request, res: Response) =>
    handleWebhook('paystack', 'x-paystack-signature', req, res);

export const handleFlutterwaveWebhook = (req: Request, res: Response) =>
    handleWebhook('flutterwave', 'verif-hash', req, res);

export const handleMonnifyWebhook = (req: Request, res: Response) =>
    handleWebhook('monnify', 'monnify-signature', req, res);

export const initiatePayment = async (req: AuthRequest, res: Response) => {
    const { amount, currency, metadata = {}, description, callbackUrl, captureNow = true, purpose, region, rideId, sdkMode } = req.body;
    const { uid, email, name, phone_number } = req.user; // Standard Firebase token claims

    if (!amount || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ error: 'amount must be a positive number' });
        return;
    }

    try {
        logger.info(
            {
                uid,
                amount,
                currency,
                region: req.body.region,
                purpose,
                rideId
            },
            'Initiating payment request'
        );
        const reference = req.body.reference ?? `REF-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
        const mergedMetadata = {
            ...metadata,
            userId: uid,
            riderId: uid,
            rideId: rideId || metadata.rideId,
            purpose: purpose ?? metadata.purpose ?? 'wallet_topup',
            captureMode: captureNow ? 'auto' : 'manual',
            ...(sdkMode ? { sdkMode: true } : {}),
        };

        let targetRegion = (region as RegionCode) || 'NG';
        let paymentAmount = amount;
        let paymentCurrency = currency;

        // Security: If rideId is present, validate against Ride document
        if (rideId) {
            const rideDoc = await db.collection('rides').doc(rideId).get();
            if (!rideDoc.exists) {
                res.status(404).json({ error: 'Ride not found' });
                return;
            }
            const ride = rideDoc.data();

            // Validate user is the rider (or driver/admin)
            if (ride?.riderId !== uid && req.user.role !== 'admin') {
                res.status(403).json({ error: 'Unauthorized payment for this ride' });
                return;
            }

            // Enforce payment amount from ride pricing to prevent underpayment/overpayment tampering
            const expectedAmount =
                typeof ride?.pricing?.finalFare === 'number'
                    ? ride.pricing.finalFare
                    : typeof ride?.pricing?.estimatedFare === 'number'
                        ? ride.pricing.estimatedFare
                        : null;

            if (typeof expectedAmount === 'number' && expectedAmount > 0) {
                // Allow minor tolerance for rounding differences
                const tolerance = Math.max(0.5, expectedAmount * 0.01);
                if (Math.abs(amount - expectedAmount) > tolerance) {
                    res.status(400).json({
                        error: `Invalid amount. Expected ${expectedAmount}`
                    });
                    return;
                }
            }

            // Enforce currency and region from Ride
            // Prevent "Currency Injection" (Paying NGN for USD ride)
            if (ride?.pricing) {
                if (currency && currency !== ride.pricing.currency) {
                    res.status(400).json({ error: `Invalid currency. Expected ${ride.pricing.currency}` });
                    return;
                }
                paymentCurrency = ride.pricing.currency;

                // Infer region if not provided, or validate if provided
                // (Simple logic: USD -> Chicago, NGN -> Nigeria)
                // Better: Use ride.region if available
                if (ride.region) {
                    if (region && region !== ride.region) {
                        res.status(400).json({ error: `Invalid region. Expected ${ride.region}` });
                        return;
                    }
                    targetRegion = ride.region as RegionCode;
                }
            }
        }


        // Paystack rejects '.test' TLDs and requires a valid email structure
        let userEmail = email;
        if (!userEmail || userEmail.endsWith('.test') || !userEmail.includes('@')) {
            userEmail = `user-${uid}@blacklivery.app`;
        }

        logger.debug(
            {
                uid,
                hasFallbackEmail: !email || email.endsWith('.test') || !email.includes('@')
            },
            'Payment customer email resolved'
        );

        const result = await paymentService.initializePayment(
            targetRegion,
            userEmail, // Token email or fallback
            paymentAmount,
            paymentCurrency,
            reference,
            mergedMetadata,
            req.body.gateway // Allow explicit provider selection (e.g., 'flutterwave', 'monnify')
        );

        // Include the resolved email in the response so mobile SDKs (e.g. Flutterwave)
        // that require a customer email can use it without a second lookup.
        (result as any).email = userEmail;

        // Persist payment context so verifyPayment can route to the correct provider
        // even when the client doesn't resend region/gateway/purpose.
        db.collection('pending_payments').doc(reference).set({
            userId: uid,
            region: targetRegion,
            gateway: req.body.gateway || null,
            purpose: mergedMetadata.purpose,
            amount: paymentAmount,
            currency: paymentCurrency || 'NGN',
            createdAt: new Date(),
        }).catch(err => logger.error({ err, reference }, 'Failed to store pending_payments context'));

        // Write the payment reference to the ride document so settleRidePayment()
        // can find it when the ride completes (the escrow hold key must match this reference).
        if (rideId) {
            db.collection('rides').doc(rideId).update({
                'payment.holdReference': reference,
                'payment.paymentMethod': 'card',
                'payment.status': 'pending',
            }).catch(err => logger.error({ err, rideId, reference }, 'Failed to write holdReference to ride'));
        }

        res.status(200).json(result);
    } catch (error: any) {
        logger.error(
            { err: error, details: error?.response?.data || error?.message },
            'Payment initiation failed'
        );
        logger.error({ err: error }, 'Error initiating payment');
        res.status(500).json({ error: 'Payment initiation failed' });
    }
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
    const { reference, transactionId, currency, purpose, region } = req.body;
    const { uid } = req.user;

    const paymentReference = reference || transactionId;

    if (!paymentReference) {
        res.status(400).json({ error: 'Payment reference or transactionId is required' });
        return;
    }

    try {
        // Look up payment context stored during initiation so we route to the
        // correct provider even when the client only sends a reference.
        const pendingDoc = await db.collection('pending_payments').doc(paymentReference).get();
        const pendingData = pendingDoc.exists ? pendingDoc.data() : null;

        const targetRegion = (region as RegionCode) || pendingData?.region || 'NG';
        const verification = await paymentService.verifyPayment(targetRegion, paymentReference, pendingData?.gateway);

        if (verification.success) {
            const verifiedRideId = verification.metadata?.rideId;
            const verifiedPurpose = purpose || pendingData?.purpose || verification.metadata?.purpose || 'wallet_topup';
            const verifiedGateway = (verification.gateway || pendingData?.gateway || 'paystack') as 'paystack' | 'flutterwave' | 'stripe' | 'monnify';

            // Save card as payment method when this was a card_setup flow.
            // The charge is real money — also credit the wallet below.
            if (verifiedPurpose === 'card_setup' && verification.cardDetails) {
                await saveCardPaymentMethod(uid, verifiedGateway, paymentReference, verification.cardDetails);
            }

            // Credit wallet asynchronously — don't block the response.
            // Webhook will also attempt credit as a fallback.
            (async () => {
                if (verifiedPurpose === 'wallet_topup' || verifiedPurpose === 'card_setup') {
                    // Direct credit to rider's wallet — no escrow hold needed.
                    // card_setup charges are real money that goes to the wallet.
                    await walletService.processTransaction(
                        uid,
                        verification.amount,
                        'credit',
                        verifiedPurpose === 'card_setup' ? 'card_setup' : 'wallet_topup',
                        verifiedPurpose === 'card_setup'
                            ? `Card setup charge via ${verifiedGateway}`
                            : `Wallet top-up via ${verifiedGateway}`,
                        paymentReference,
                        {
                            walletCurrency: (verification.currency || currency || 'NGN') as 'NGN' | 'USD',
                            metadata: { gateway: verifiedGateway, ...verification.metadata }
                        }
                    );
                } else {
                    // Ride payment or other purpose — hold in escrow until ride completes
                    await walletService.recordEscrowDeposit({
                        reference: paymentReference,
                        amount: verification.amount,
                        currency: (verification.currency || currency || 'NGN') as 'NGN' | 'USD',
                        riderId: uid,
                        rideId: verifiedRideId,
                        purpose: verifiedPurpose,
                        gateway: verifiedGateway,
                        metadata: verification.metadata || {}
                    });
                }
            })().catch(walletError => {
                logger.error({ err: walletError, reference: paymentReference }, 'Failed to credit wallet after payment verification');
            });

            // If ride already completed before client called verify, trigger settlement now.
            if (verifiedRideId) {
                rideService.triggerSettlementIfComplete(verifiedRideId).catch(err =>
                    logger.error({ err, rideId: verifiedRideId }, 'Post-verify settlement trigger failed')
                );
            }
        }

        res.status(200).json(verification);
    } catch (error) {
        logger.error({ err: error }, 'Error verifying payment');
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

/**
 * Get wallet balance for authenticated user
 */
export const getWalletBalance = async (req: AuthRequest, res: Response) => {
    try {
        const { uid } = req.user;
        const currency = (req.query.currency as 'NGN' | 'USD') || 'NGN';

        const wallet = await walletService.getWallet(uid, currency);

        res.status(200).json({
            success: true,
            data: {
                balance: wallet.balance,
                currency: wallet.currency,
                lifetimeEarnings: wallet.lifetimeEarnings || 0,
                pendingWithdrawals: wallet.pendingWithdrawals || 0
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'Error getting wallet balance');
        res.status(500).json({ error: 'Failed to get wallet balance' });
    }
};

/**
 * Get payment/transaction history
 */
export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { uid } = req.user;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const countSnap = await db.collection('transactions')
            .where('userId', '==', uid)
            .count()
            .get();
        const total = countSnap.data().count;

        const snapshot = await db.collection('transactions')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit)
            .get();

        const transactions = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            const purpose = data.metadata?.purpose ?? data.category;
            let serviceType: string;
            if (purpose === 'delivery_payment' || purpose === 'delivery') {
                serviceType = 'delivery';
            } else if (purpose === 'airport_payment' || purpose === 'airport') {
                serviceType = 'airport';
            } else if (purpose === 'ride_payment' || purpose === 'ride' || data.category === 'ride_payment') {
                serviceType = 'ride';
            } else if (data.category === 'wallet_topup' || data.category === 'card_setup') {
                serviceType = 'topup';
            } else if (data.category === 'driver_payout' || data.category === 'payout') {
                serviceType = 'payout';
            } else if (data.category === 'refund') {
                serviceType = 'refund';
            } else {
                serviceType = data.category ?? 'other';
            }
            return { id: doc.id, ...data, serviceType };
        });

        res.status(200).json({
            success: true,
            data: transactions,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        logger.error({ err: error }, 'Error getting payment history');
        res.status(500).json({ error: 'Failed to get payment history' });
    }
};

/**
 * Get saved payment methods
 */
export const getPaymentMethods = async (req: AuthRequest, res: Response) => {
    try {
        const { uid } = req.user;

        const snapshot = await db.collection('payment_methods')
            .where('userId', '==', uid)
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .get();

        const methods = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ success: true, data: methods });
    } catch (error) {
        logger.error({ err: error }, 'Error getting payment methods');
        res.status(500).json({ error: 'Failed to get payment methods' });
    }
};

/**
 * Add a new payment method
 */
export const addPaymentMethod = async (req: AuthRequest, res: Response) => {
    try {
        const { uid } = req.user;
        const { type, details, isDefault } = req.body;

        if (!type || !details) {
            res.status(400).json({ error: 'type and details are required' });
            return;
        }

        // If setting as default, unset other defaults
        if (isDefault) {
            const existing = await db.collection('payment_methods')
                .where('userId', '==', uid)
                .where('isDefault', '==', true)
                .get();

            const batch = db.batch();
            existing.docs.forEach((doc: any) => {
                batch.update(doc.ref, { isDefault: false });
            });
            await batch.commit();
        }

        const methodRef = await db.collection('payment_methods').add({
            userId: uid,
            type,
            details,
            isDefault: isDefault || false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        res.status(201).json({
            success: true,
            data: { id: methodRef.id, type, details, isDefault: isDefault || false }
        });
    } catch (error) {
        logger.error({ err: error }, 'Error adding payment method');
        res.status(500).json({ error: 'Failed to add payment method' });
    }
};

/**
 * Delete a payment method
 */
export const deletePaymentMethod = async (req: AuthRequest, res: Response) => {
    try {
        const { uid } = req.user;
        const { id } = req.params;

        const methodRef = db.collection('payment_methods').doc(id);
        const doc = await methodRef.get();

        if (!doc.exists) {
            res.status(404).json({ error: 'Payment method not found' });
            return;
        }

        if (doc.data()!.userId !== uid) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        await methodRef.update({ isActive: false, deletedAt: new Date() });

        res.status(200).json({ success: true, message: 'Payment method deleted' });
    } catch (error) {
        logger.error({ err: error }, 'Error deleting payment method');
        res.status(500).json({ error: 'Failed to delete payment method' });
    }
};

/**
 * Add money to wallet
 */
export const addToWallet = async (req: AuthRequest, res: Response) => {
    try {
        const { amount, currency, paymentMethod } = req.body;
        const { uid, email } = req.user;

        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Invalid amount' });
            return;
        }

        const reference = `TOPUP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        // Default to NG region for now, or infer from currency
        const region = currency === 'USD' ? 'US-CHI' : 'NG';

        // ── Saved card: attempt off-session direct charge ──────────
        if (paymentMethod) {
            try {
                const methodDoc = await db.collection('payment_methods').doc(paymentMethod).get();
                if (methodDoc.exists) {
                    const methodData = methodDoc.data()!;
                    if (methodData.userId !== uid) {
                        res.status(403).json({ error: 'Unauthorized' });
                        return;
                    }

                    // Stripe off-session charge
                    if (methodData.gateway === 'stripe' && methodData.stripePaymentMethodId && methodData.stripeCustomerId) {
                        const stripeKey = process.env.STRIPE_SECRET_KEY;
                        if (stripeKey) {
                            const Stripe = require('stripe');
                            const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
                            const centsAmount = Math.round(amount * 100);

                            const pi = await stripe.paymentIntents.create({
                                amount: centsAmount,
                                currency: (currency || 'USD').toLowerCase(),
                                customer: methodData.stripeCustomerId,
                                payment_method: methodData.stripePaymentMethodId,
                                off_session: true,
                                confirm: true,
                                metadata: {
                                    purpose: 'wallet_topup',
                                    userId: uid,
                                    reference,
                                },
                            });

                            if (pi.status === 'succeeded') {
                                // Credit wallet immediately
                                await walletService.processTransaction(
                                    uid,
                                    amount,
                                    'credit',
                                    'wallet_topup',
                                    `Wallet top-up via Stripe (saved card)`,
                                    reference,
                                    {
                                        walletCurrency: currency as 'NGN' | 'USD',
                                        metadata: { gateway: 'stripe', paymentMethod, paymentIntentId: pi.id }
                                    }
                                );

                                res.status(200).json({ success: true, data: { charged: true, reference } });
                                return;
                            }
                            // If requires_action (3DS), fall through to normal flow
                            if (pi.status === 'requires_action' && pi.client_secret) {
                                res.status(200).json({ success: true, data: { reference, clientSecret: pi.client_secret } });
                                return;
                            }
                        }
                    }

                    // Paystack recurring charge via authorization code
                    if (methodData.gateway === 'paystack' && methodData.authorizationCode) {
                        const paystackKey = process.env.PAYSTACK_SECRET_KEY;
                        if (paystackKey) {
                            const axios = require('axios');
                            let userEmail = email;
                            if (!userEmail || userEmail.endsWith('.test') || !userEmail.includes('@')) {
                                userEmail = `user-${uid}@blacklivery.app`;
                            }
                            const koboAmount = Math.round(amount * 100);
                            const chargeResult = await axios.post(
                                'https://api.paystack.co/transaction/charge_authorization',
                                {
                                    authorization_code: methodData.authorizationCode,
                                    email: userEmail,
                                    amount: koboAmount,
                                    currency: (currency || 'NGN').toUpperCase(),
                                    reference,
                                },
                                { headers: { Authorization: `Bearer ${paystackKey}` } }
                            );

                            if (chargeResult.data?.data?.status === 'success') {
                                await walletService.processTransaction(
                                    uid,
                                    amount,
                                    'credit',
                                    'wallet_topup',
                                    `Wallet top-up via Paystack (saved card)`,
                                    reference,
                                    {
                                        walletCurrency: currency as 'NGN' | 'USD',
                                        metadata: { gateway: 'paystack', paymentMethod, paystackReference: chargeResult.data.data.reference }
                                    }
                                );

                                res.status(200).json({ success: true, data: { charged: true, reference } });
                                return;
                            }
                        }
                    }
                }
            } catch (offSessionErr: any) {
                logger.warn({ err: offSessionErr, paymentMethod }, 'Off-session charge failed — falling back to normal flow');
            }
        }

        // ── Fallback: normal payment initialization ────────────────
        // Paystack rejects '.test' TLDs
        let userEmail = email;
        if (!userEmail || userEmail.endsWith('.test') || !userEmail.includes('@')) {
            userEmail = `user-${uid}@blacklivery.app`;
        }

        const result = await paymentService.initializePayment(
            region,
            userEmail,
            amount,
            currency,
            reference,
            {
                purpose: 'wallet_topup',
                userId: uid,
                paymentMethod,
                captureMode: 'auto'
            }
        );

        // Store pending payment context so verifyPayment routes to correct provider
        db.collection('pending_payments').doc(reference).set({
            userId: uid,
            region,
            gateway: null,
            purpose: 'wallet_topup',
            amount,
            currency: currency || 'NGN',
            createdAt: new Date(),
        }).catch(err => logger.error({ err, reference }, 'Failed to store pending_payments context for wallet topup'));

        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        logger.error({ err: error }, 'Error adding to wallet');
        res.status(500).json({ error: 'Failed to add money to wallet' });
    }
};

/**
 * Withdraw from wallet
 */
export const withdrawFromWallet = async (req: AuthRequest, res: Response) => {
    try {
        const { amount, currency, bankAccountId } = req.body;
        const { uid } = req.user;

        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Invalid amount' });
            return;
        }

        // Enforce minimum withdrawal
        const minWithdrawal = currency === 'USD' ? 5 : 500;
        if (amount < minWithdrawal) {
            res.status(400).json({ error: `Minimum withdrawal is ${currency === 'USD' ? '$' : '₦'}${minWithdrawal}` });
            return;
        }

        // Validate currency
        if (!['NGN', 'USD'].includes(currency)) {
            res.status(400).json({ error: 'Unsupported currency. Use NGN or USD.' });
            return;
        }

        const wallet = await walletService.getWallet(uid, currency);
        if (wallet.balance.amount < amount) {
            res.status(400).json({ error: 'Insufficient balance' });
            return;
        }

        // Get bank details if bankAccountId provided
        let accountNumber, bankCode;
        if (bankAccountId) {
            const methodDoc = await db.collection('payment_methods').doc(bankAccountId).get();
            if (!methodDoc.exists) {
                res.status(404).json({ error: 'Bank account not found' });
                return;
            }
            const method = methodDoc.data();
            if (method?.userId !== uid) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }
            accountNumber = method?.details?.accountNumber;
            bankCode = method?.details?.bankCode;
        } else {
            // If no ID, expect details in body (not supported by mobile app yet but good for backend)
            accountNumber = req.body.accountNumber;
            bankCode = req.body.bankCode;
        }

        if (!accountNumber || !bankCode) {
            res.status(400).json({ error: 'Bank account details required' });
            return;
        }

        const reference = `WITHDRAW-${Date.now()}`;

        // Debit wallet immediately
        await walletService.processTransaction(
            uid,
            amount,
            'debit',
            'withdrawal',
            'Wallet Withdrawal',
            reference,
            {
                walletCurrency: currency,
                metadata: { withdrawalReference: reference, bankAccountId }
            }
        );

        // Create payout request record (reusing payout_requests collection for consistency)
        const now = new Date();
        await db.collection('payout_requests').add({
            userId: uid,
            amount,
            currency,
            accountNumber,
            bankCode,
            reference,
            status: 'pending',
            gateway: null,
            createdAt: now,
            updatedAt: now,
            statusHistory: [{ status: 'pending', at: now, actor: uid, notes: 'Wallet withdrawal requested' }],
            metadata: { bankAccountId, source: 'wallet_withdraw' },
            payoutChannel: 'bank_transfer',
            walletCurrency: currency,
            walletId: wallet.id
        });

        res.status(200).json({ success: true, data: { reference, status: 'pending' } });
    } catch (error: any) {
        logger.error({ err: error }, 'Error withdrawing from wallet');
        res.status(500).json({ error: 'Failed to withdraw from wallet' });
    }
};

/**
 * Request a refund for a wallet top-up transaction.
 * Creates a refund_requests document for admin review — does NOT auto-initiate a gateway refund.
 */
export const requestWalletRefund = async (req: AuthRequest, res: Response) => {
    try {
        const { uid } = req.user;
        const { reference, reason } = req.body;

        if (!reference || typeof reference !== 'string') {
            res.status(400).json({ error: 'reference is required' });
            return;
        }

        if (!reason || typeof reason !== 'string') {
            res.status(400).json({ error: 'reason is required' });
            return;
        }

        // Find the transaction by reference and verify ownership
        const txSnapshot = await db.collection('transactions')
            .where('reference', '==', reference)
            .where('userId', '==', uid)
            .limit(1)
            .get();

        if (txSnapshot.empty) {
            res.status(404).json({ error: 'Transaction not found' });
            return;
        }

        const txDoc = txSnapshot.docs[0];
        const tx = txDoc.data();

        // Only allow refund requests for wallet top-ups
        if (tx.category !== 'wallet_topup') {
            res.status(400).json({ error: 'Only wallet top-up transactions can be refunded' });
            return;
        }

        // Check it hasn't already been refunded
        if (tx.refundStatus === 'refunded' || tx.refundStatus === 'pending') {
            res.status(409).json({ error: 'A refund request already exists for this transaction' });
            return;
        }

        // Only allow within 24 hours of top-up
        const createdAt = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
        const ageMs = Date.now() - createdAt.getTime();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (ageMs > TWENTY_FOUR_HOURS) {
            res.status(400).json({ error: 'Refund window has expired (24 hours)' });
            return;
        }

        // Check no existing pending refund request for this reference
        const existingRefund = await db.collection('refund_requests')
            .where('originalReference', '==', reference)
            .limit(1)
            .get();

        if (!existingRefund.empty) {
            res.status(409).json({ error: 'A refund request already exists for this transaction' });
            return;
        }

        const refundRef = await db.collection('refund_requests').add({
            userId: uid,
            amount: tx.amount,
            currency: tx.currency || 'NGN',
            originalReference: reference,
            transactionId: txDoc.id,
            reason,
            status: 'pending',
            createdAt: new Date()
        });

        // Mark transaction as refund pending
        await txDoc.ref.update({ refundStatus: 'pending' });

        res.status(201).json({
            message: 'Refund request submitted. Our team will review and process it within 3-5 business days.',
            refundRequestId: refundRef.id
        });
    } catch (error) {
        logger.error({ err: error }, 'Error requesting wallet refund');
        res.status(500).json({ error: 'Failed to submit refund request' });
    }
};

/**
 * Charge the rider's on-platform wallet for a ride.
 *
 * Use this instead of `initiatePayment` when paymentMethod = 'wallet'.
 * The rider's wallet balance is debited, an escrow hold is created, and
 * settlement runs immediately if the ride is already completed.
 *
 * POST /api/v1/payments/wallet/charge-ride
 * Body: { rideId: string, amount: number, currency?: string }
 */
export const chargeRideWithWallet = async (req: AuthRequest, res: Response) => {
    const { rideId, amount, currency } = req.body;
    const { uid } = req.user;

    try {
        // Validate ride ownership and fetch authoritative fare
        const rideDoc = await db.collection('rides').doc(rideId).get();
        if (!rideDoc.exists) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }
        const ride = rideDoc.data()!;

        if (ride.riderId !== uid && req.user.role !== 'admin') {
            res.status(403).json({ error: 'Unauthorized payment for this ride' });
            return;
        }

        // Use the authoritative fare from the ride doc, reject tampered amounts
        const expectedAmount =
            typeof ride.pricing?.finalFare === 'number'
                ? ride.pricing.finalFare
                : typeof ride.pricing?.estimatedFare === 'number'
                    ? ride.pricing.estimatedFare
                    : null;

        if (typeof expectedAmount === 'number' && expectedAmount > 0) {
            const tolerance = Math.max(0.5, expectedAmount * 0.01);
            if (Math.abs(amount - expectedAmount) > tolerance) {
                res.status(400).json({ error: `Invalid amount. Expected ${expectedAmount}` });
                return;
            }
        }

        const rideCurrency = (ride.pricing?.currency ?? currency ?? 'NGN') as 'NGN' | 'USD';

        // Pre-flight balance check (the actual debit inside chargeWalletForRide
        // also throws 'Insufficient funds' if balance is too low, but checking
        // early gives a cleaner error message before the DB transaction starts)
        const wallet = await walletService.getWallet(uid, rideCurrency);
        if (wallet.balance.amount < amount) {
            res.status(400).json({ error: 'Insufficient wallet balance' });
            return;
        }

        const reference = `WALLET-RIDE-${rideId}-${Date.now()}`;
        const rideServiceType = ride.serviceType ?? ride.type ?? 'ride';
        const escrowPurpose: 'ride_payment' | 'delivery_payment' | 'airport_payment' =
            rideServiceType === 'delivery' ? 'delivery_payment' :
            rideServiceType === 'airport' || rideServiceType === 'airport_transfer' ? 'airport_payment' :
            'ride_payment';

        await walletService.chargeWalletForRide({
            riderId: uid,
            rideId,
            amount,
            currency: rideCurrency,
            reference,
            purpose: escrowPurpose,
        });

        // Record holdReference on ride doc (same pattern as card initiatePayment)
        await db.collection('rides').doc(rideId).update({
            'payment.holdReference': reference,
            'payment.paymentMethod': 'wallet',
            'payment.status': 'held',
        });

        // Trigger driver settlement now if ride already completed
        rideService.triggerSettlementIfComplete(rideId).catch(err =>
            logger.error({ err, rideId }, 'Wallet charge: post-debit settlement trigger failed')
        );

        res.status(200).json({ success: true, reference });
    } catch (error: any) {
        if (error?.message === 'Insufficient funds') {
            res.status(400).json({ error: 'Insufficient wallet balance' });
            return;
        }
        logger.error({ err: error, rideId, uid }, 'chargeRideWithWallet failed');
        res.status(500).json({ error: 'Wallet charge failed' });
    }
};

/**
 * Get transaction details
 */
export const getTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { uid } = req.user;

        const doc = await db.collection('transactions').doc(id).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Transaction not found' });
            return;
        }

        const data = doc.data();
        if (data?.userId !== uid) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        res.status(200).json({ success: true, data: { id: doc.id, ...data } });
    } catch (error) {
        logger.error({ err: error }, 'Error getting transaction');
        res.status(500).json({ error: 'Failed to get transaction' });
    }
};
