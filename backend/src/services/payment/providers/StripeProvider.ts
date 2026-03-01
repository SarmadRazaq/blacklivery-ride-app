import Stripe from 'stripe';
import { logger } from '../../../utils/logger';
import { IPaymentProvider, PaymentInitResult, PaymentVerificationResult } from '../IPaymentProvider';

export class StripeProvider implements IPaymentProvider {
    private stripe: Stripe;
    private readonly webhookSecret: string;

    constructor() {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }
        this.stripe = new Stripe(key, {
            apiVersion: '2025-01-27.acacia',
        } as any);
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('STRIPE_WEBHOOK_SECRET is required in production');
            }
            logger.warn('STRIPE_WEBHOOK_SECRET not set — webhook verification disabled in dev');
        }
        this.webhookSecret = webhookSecret || '';
    }

    async initializeTransaction(email: string, amount: number, currency: string, reference: string, metadata?: any): Promise<PaymentInitResult> {
        const centsAmount = Math.round(amount * 100);
        const baseUrl = process.env.FRONTEND_URL ?? 'https://blacklivery.com';

        try {
            // Use Stripe Checkout Session so the mobile WebView gets a redirect URL
            // (Payment Intents return clientSecret which requires native SDK; Checkout gives a hosted URL)
            const session = await this.stripe.checkout.sessions.create({
                mode: 'payment',
                customer_email: email,
                client_reference_id: reference,
                line_items: [{
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: { name: 'BlackLivery Ride Payment' },
                        unit_amount: centsAmount,
                    },
                    quantity: 1,
                }],
                payment_intent_data: {
                    metadata: { ...metadata, reference },
                    receipt_email: email,
                },
                metadata: { ...metadata, reference },
                // {CHECKOUT_SESSION_ID} is replaced by Stripe at redirect time
                success_url: `${baseUrl}/payment/callback?reference=${reference}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/payment/cancel?reference=${reference}`,
            });

            return {
                reference,
                authorizationUrl: session.url || undefined,
            };
        } catch (error: any) {
            logger.error({ err: error }, 'Stripe Checkout Session init error');
            throw new Error('Payment initialization failed');
        }
    }

    async verifyTransaction(reference: string): Promise<PaymentVerificationResult> {
        try {
            // Search PaymentIntents by our reference stored in metadata.
            // Checkout Sessions create a PaymentIntent with payment_intent_data.metadata,
            // so both direct PI and Checkout flows are covered.
            const results = await this.stripe.paymentIntents.search({
                query: `metadata['reference']:'${reference}'`,
                limit: 1,
            });

            if (results.data.length > 0) {
                const pi = results.data[0];
                return {
                    success: pi.status === 'succeeded',
                    amount: pi.amount / 100,
                    currency: pi.currency.toUpperCase(),
                    reference: (pi.metadata?.reference as string) || reference,
                    status: pi.status,
                    gateway: 'stripe',
                    metadata: pi.metadata,
                };
            }

            // Fallback: treat reference as a direct PaymentIntent ID (legacy)
            const pi = await this.stripe.paymentIntents.retrieve(reference);
            return {
                success: pi.status === 'succeeded',
                amount: pi.amount / 100,
                currency: pi.currency.toUpperCase(),
                reference: pi.id,
                status: pi.status,
                gateway: 'stripe',
                metadata: pi.metadata,
            };
        } catch (error) {
            return {
                success: false,
                amount: 0,
                currency: '',
                reference,
                status: 'failed',
                gateway: 'stripe',
            };
        }
    }

    async verifyWebhook(payload: Buffer | string, signature: string): Promise<PaymentVerificationResult | null> {
        if (!this.webhookSecret) {
            logger.warn('Stripe webhook verification skipped — no secret configured');
            return null;
        }
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
        } catch (err: any) {
            logger.warn({ err }, 'Stripe webhook signature verification failed');
            return null;
        }

        if (event.type === 'payment_intent.succeeded') {
            const pi = event.data.object as Stripe.PaymentIntent;
            return {
                success: true,
                amount: pi.amount / 100,
                currency: pi.currency.toUpperCase(),
                reference: pi.id,
                status: 'success',
                gateway: 'stripe',
                metadata: pi.metadata
            };
        }

        return null;
    }

    async createRecipient(name: string, _accountNumber: string, _bankCode: string): Promise<string> {
        // Create Express Account
        try {
            const account = await this.stripe.accounts.create({
                type: 'express',
                country: 'US',
                email: undefined, // Can pass email if we want pre-fill
                capabilities: {
                    transfers: { requested: true },
                },
                business_type: 'individual',
                individual: {
                    first_name: name.split(' ')[0],
                    last_name: name.split(' ').slice(1).join(' ') || undefined
                }
            });
            return account.id;
        } catch (error: any) {
            logger.error({ err: error }, 'Stripe create account error');
            throw new Error('Failed to create Stripe account');
        }
    }

    async generateOnboardingLink(recipientCode: string, refreshUrl: string, returnUrl: string): Promise<string> {
        try {
            const link = await this.stripe.accountLinks.create({
                account: recipientCode,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            });
            return link.url;
        } catch (error: any) {
            logger.error({ err: error }, 'Stripe onboarding link error');
            throw new Error('Failed to generate onboarding link');
        }
    }

    async transfer(recipientCode: string, amount: number, currency: string, reason: string, _reference?: string): Promise<string> {
        const centsAmount = Math.round(amount * 100);
        try {
            const transfer = await this.stripe.transfers.create({
                amount: centsAmount,
                currency: currency.toLowerCase(),
                destination: recipientCode,
                description: reason
            });
            return transfer.id;
        } catch (error: any) {
            logger.error({ err: error }, 'Stripe transfer error');
            throw new Error('Transfer failed');
        }
    }
}
