import Stripe from 'stripe';
import { IPaymentStrategy, PaymentInitiateRequest, PaymentVerifyResponse, PaymentRefundResponse } from './IPaymentStrategy';

export class StripeStrategy implements IPaymentStrategy {
    private stripe: Stripe;
    private webhookSecret: string;

    constructor() {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY not configured');
        }

        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    }

    private serializeMetadata(metadata?: Record<string, unknown>): Stripe.MetadataParam {
        const result: Stripe.MetadataParam = {};
        if (!metadata) return result;

        Object.entries(metadata).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                result[key] = String(value);
                return;
            }
            result[key] = JSON.stringify(value);
        });

        return result;
    }

    async initiatePayment(request: PaymentInitiateRequest): Promise<{ clientSecret?: string; paymentIntentId: string }> {
        const metadata = this.serializeMetadata({
            ...request.metadata,
            userId: request.userId ?? '',
            purpose: request.metadata?.purpose ?? 'wallet_topup'
        });

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: Math.round(request.amount * 100),
            currency: request.currency.toLowerCase(),
            capture_method: request.captureNow === false ? 'manual' : 'automatic',
            description: request.description,
            receipt_email: request.customerEmail,
            metadata,
            automatic_payment_methods: { enabled: true }
        });

        return {
            clientSecret: paymentIntent.client_secret ?? undefined,
            paymentIntentId: paymentIntent.id
        };
    }

    async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
        const intent = await this.stripe.paymentIntents.retrieve(reference);

        return {
            status: intent.status === 'succeeded' ? 'success' : intent.status === 'processing' ? 'pending' : 'failed',
            reference: intent.id,
            amount: (intent.amount_received || intent.amount || 0) / 100,
            currency: intent.currency.toUpperCase(),
            gatewayReference: intent.id,
            metadata: intent.metadata ?? undefined,
            raw: intent
        };
    }

    async refundPayment(reference: string, amount?: number): Promise<PaymentRefundResponse> {
        const refund = await this.stripe.refunds.create({
            payment_intent: reference,
            amount: amount ? Math.round(amount * 100) : undefined
        });

        return {
            status: refund.status === 'succeeded' ? 'success' : refund.status === 'pending' ? 'pending' : 'failed',
            reference,
            amount: (refund.amount ?? 0) / 100,
            currency: refund.currency?.toUpperCase() ?? 'USD',
            gatewayReference: refund.id,
            raw: refund
        };
    }

    constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
        if (!this.webhookSecret) {
            throw new Error('Stripe webhook secret not configured');
        }
        return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    }
}
