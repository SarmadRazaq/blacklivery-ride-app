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
            // ── Native SDK mode ────────────────────────────────────────
            // When the mobile app sends `sdkMode: true` in metadata, we
            // return a `client_secret` so the Flutter Stripe SDK can handle
            // card input + 3DS natively.
            if (metadata?.sdkMode) {
                const { sdkMode, ...cleanMeta } = metadata;

                // For card_setup, find or create a Stripe Customer so the
                // payment method gets attached for later reuse.
                let customerId: string | undefined;
                if (cleanMeta.purpose === 'card_setup') {
                    try {
                        const customers = await this.stripe.customers.list({
                            email,
                            limit: 1,
                        });
                        if (customers.data.length > 0) {
                            customerId = customers.data[0].id;
                        } else {
                            const customer = await this.stripe.customers.create({
                                email,
                                metadata: { userId: cleanMeta.userId || cleanMeta.riderId },
                            });
                            customerId = customer.id;
                        }
                    } catch (e) {
                        logger.warn({ err: e }, 'Could not find/create Stripe customer — proceeding without');
                    }
                }

                // Create a PaymentIntent (charges the card)
                const pi = await this.stripe.paymentIntents.create({
                    amount: centsAmount,
                    currency: currency.toLowerCase(),
                    metadata: { ...cleanMeta, reference },
                    receipt_email: email,
                    automatic_payment_methods: { enabled: true },
                    // Attach to customer for card reuse (card_setup flows)
                    ...(customerId ? {
                        customer: customerId,
                        setup_future_usage: 'off_session',
                    } : {}),
                });

                return {
                    reference,
                    clientSecret: pi.client_secret || undefined,
                };
            }

            // ── WebView / Checkout Session mode (legacy) ───────────────
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

    private async extractCardDetailsFromPaymentMethod(pmOrId: string | Stripe.PaymentMethod | null | undefined): Promise<PaymentVerificationResult['cardDetails']> {
        try {
            if (!pmOrId) return undefined;
            let pm: Stripe.PaymentMethod;
            if (typeof pmOrId === 'string') {
                pm = await this.stripe.paymentMethods.retrieve(pmOrId);
            } else if (pmOrId.id) {
                pm = pmOrId;
            } else {
                return undefined;
            }
            if (pm.card) {
                return {
                    last4: pm.card.last4,
                    brand: pm.card.brand,
                    expMonth: pm.card.exp_month,
                    expYear: pm.card.exp_year,
                };
            }
        } catch (e) {
            logger.warn({ err: e }, 'Failed to extract Stripe card details');
        }
        return undefined;
    }

    private async extractCardDetails(pi: Stripe.PaymentIntent): Promise<PaymentVerificationResult['cardDetails']> {
        const details = await this.extractCardDetailsFromPaymentMethod(pi.payment_method as string | Stripe.PaymentMethod | null);
        if (details) {
            // Attach Stripe IDs for off-session reuse
            const pmId = typeof pi.payment_method === 'string' ? pi.payment_method : (pi.payment_method as Stripe.PaymentMethod)?.id;
            if (pmId) details.stripePaymentMethodId = pmId;
            if (pi.customer) {
                details.stripeCustomerId = typeof pi.customer === 'string' ? pi.customer : (pi.customer as Stripe.Customer).id;
            }
        }
        return details;
    }

    async verifyTransaction(reference: string): Promise<PaymentVerificationResult> {
        try {
            // Search PaymentIntents by our reference stored in metadata.
            const results = await this.stripe.paymentIntents.search({
                query: `metadata['reference']:'${reference}'`,
                limit: 1,
            });

            if (results.data.length > 0) {
                const pi = results.data[0];
                const cardDetails = pi.status === 'succeeded' ? await this.extractCardDetails(pi) : undefined;
                return {
                    success: pi.status === 'succeeded',
                    amount: pi.amount / 100,
                    currency: pi.currency.toUpperCase(),
                    reference: (pi.metadata?.reference as string) || reference,
                    status: pi.status,
                    gateway: 'stripe',
                    metadata: pi.metadata,
                    cardDetails,
                };
            }

            // Fallback: treat reference as a direct PaymentIntent ID (legacy)
            const pi = await this.stripe.paymentIntents.retrieve(reference);
            const cardDetails = pi.status === 'succeeded' ? await this.extractCardDetails(pi) : undefined;
            return {
                success: pi.status === 'succeeded',
                amount: pi.amount / 100,
                currency: pi.currency.toUpperCase(),
                reference: pi.id,
                status: pi.status,
                gateway: 'stripe',
                metadata: pi.metadata,
                cardDetails,
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
            const cardDetails = await this.extractCardDetails(pi);
            return {
                success: true,
                amount: pi.amount / 100,
                currency: pi.currency.toUpperCase(),
                reference: pi.id,
                status: 'success',
                gateway: 'stripe',
                metadata: pi.metadata,
                cardDetails,
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
