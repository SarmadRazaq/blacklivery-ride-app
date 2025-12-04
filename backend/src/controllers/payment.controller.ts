import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { paymentService } from '../services/payment/PaymentService';
import { walletService } from '../services/WalletService';
import { RegionCode } from '../config/region.config';

// Webhooks not yet implemented in PaymentService
/*
const forwardWebhook = async (gateway: string, req: Request, res: Response) => {
    try {
        // Stub
        res.status(200).json({ received: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
};
*/

export const initiatePayment = async (req: AuthRequest, res: Response) => {
    const { amount, currency, metadata = {}, description, callbackUrl, captureNow = true, purpose, region } = req.body;
    const { uid, email, name, phone_number } = req.user; // Standard Firebase token claims

    try {
        const reference = req.body.reference ?? `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const mergedMetadata = {
            ...metadata,
            userId: uid,
            riderId: uid,
            purpose: purpose ?? metadata.purpose ?? 'wallet_topup',
            captureMode: captureNow ? 'auto' : 'manual'
        };

        const targetRegion = (region as RegionCode) || 'NG';

        const result = await paymentService.initializePayment(
            targetRegion,
            email, // Token email
            amount,
            currency,
            reference,
            mergedMetadata
        );
        res.status(200).json(result);
    } catch (error) {
        console.error('Error initiating payment:', error);
        res.status(500).json({ error: 'Payment initiation failed' });
    }
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
    const { reference, currency, purpose, region } = req.body;
    const { uid } = req.user;

    try {
        const targetRegion = (region as RegionCode) || 'NG';
        const verification = await paymentService.verifyPayment(targetRegion, reference);

        if (verification.success) {
            // TODO: Credit wallet or update ride status here
            // For now, just return success
        }

        res.status(200).json(verification);
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
        return res.status(400).send('Missing signature');
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
        return res.status(400).send('Raw body missing');
    }

    const result = await paymentService.verifyWebhook('stripe', rawBody, signature);
    if (!result) {
        return res.status(400).send('Webhook Error');
    }

    if (result.success && result.status === 'success') {
        const { userId, rideId, purpose } = result.metadata || {};
        if (userId) {
            try {
                await walletService.recordEscrowDeposit({
                    reference: result.reference,
                    amount: result.amount,
                    currency: result.currency as 'NGN' | 'USD',
                    riderId: userId,
                    rideId,
                    purpose: purpose || 'wallet_topup',
                    gateway: 'stripe',
                    metadata: result.metadata
                });
            } catch (e) {
                console.error('Wallet deposit failed', e);
            }
        }
    }
    res.json({ received: true });
};

export const handlePaystackWebhook = async (req: Request, res: Response) => {
    const signature = req.headers['x-paystack-signature'] as string;
    if (!signature) {
        return res.status(400).send('Missing signature');
    }

    const result = await paymentService.verifyWebhook('paystack', req.body, signature);
    if (!result) {
        return res.status(400).send('Webhook Error');
    }

    if (result.success && result.status === 'success') {
        const { userId, rideId, purpose } = result.metadata || {};
        if (userId) {
            try {
                await walletService.recordEscrowDeposit({
                    reference: result.reference,
                    amount: result.amount,
                    currency: result.currency as 'NGN' | 'USD',
                    riderId: userId,
                    rideId,
                    purpose: purpose || 'wallet_topup',
                    gateway: 'paystack',
                    metadata: result.metadata
                });
            } catch (e) {
                console.error('Wallet deposit failed', e);
            }
        }
    }
    res.json({ received: true });
};

export const handleFlutterwaveWebhook = (req: Request, res: Response) => res.json({ received: true }); // forwardWebhook('flutterwave', req, res);
export const handleMonnifyWebhook = (req: Request, res: Response) => res.json({ received: true }); // forwardWebhook('monnify', req, res);
