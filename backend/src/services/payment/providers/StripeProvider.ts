import Stripe from 'stripe';
import { IPaymentProvider, PaymentInitResult, PaymentVerificationResult } from '../IPaymentProvider';

export class StripeProvider implements IPaymentProvider {
    private stripe: Stripe;
    private readonly webhookSecret: string;

    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2025-01-27.acacia', 
        } as any);
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    }

    async initializeTransaction(email: string, amount: number, currency: string, reference: string, metadata?: any): Promise<PaymentInitResult> {
        const centsAmount = Math.round(amount * 100);

        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: centsAmount,
                currency: currency.toLowerCase(),
                metadata: { ...metadata, reference },
                receipt_email: email,
                automatic_payment_methods: { enabled: true }
            });

            return {
                reference,
                clientSecret: paymentIntent.client_secret || undefined
            };
        } catch (error: any) {
            console.error('Stripe init error:', error.message);
            throw new Error('Payment initialization failed');
        }
    }

    async verifyTransaction(reference: string): Promise<PaymentVerificationResult> {
        try {
            const pi = await this.stripe.paymentIntents.retrieve(reference);
            return {
                success: pi.status === 'succeeded',
                amount: pi.amount / 100,
                currency: pi.currency.toUpperCase(),
                reference: pi.id,
                status: pi.status,
                gateway: 'stripe',
                metadata: pi.metadata
            };
        } catch (error) {
            return {
                success: false,
                amount: 0,
                currency: '',
                reference,
                status: 'failed',
                gateway: 'stripe'
            };
        }
    }

    async verifyWebhook(payload: Buffer | string, signature: string): Promise<PaymentVerificationResult | null> {
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
        } catch (err: any) {
            console.warn(`Stripe Webhook Error: ${err.message}`);
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
            console.error('Stripe create account error:', error.message);
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
            console.error('Stripe onboarding link error:', error.message);
            throw new Error('Failed to generate onboarding link');
        }
    }

    async transfer(recipientCode: string, amount: number, currency: string, reason: string): Promise<string> {
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
             console.error('Stripe transfer error:', error.message);
             throw new Error('Transfer failed');
        }
    }
}
