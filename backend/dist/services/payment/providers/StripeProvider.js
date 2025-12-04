"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeProvider = void 0;
const stripe_1 = __importDefault(require("stripe"));
class StripeProvider {
    constructor() {
        this.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2025-01-27.acacia',
        });
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    }
    initializeTransaction(email, amount, currency, reference, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const centsAmount = Math.round(amount * 100);
            try {
                const paymentIntent = yield this.stripe.paymentIntents.create({
                    amount: centsAmount,
                    currency: currency.toLowerCase(),
                    metadata: Object.assign(Object.assign({}, metadata), { reference }),
                    receipt_email: email,
                    automatic_payment_methods: { enabled: true }
                });
                return {
                    reference,
                    clientSecret: paymentIntent.client_secret || undefined
                };
            }
            catch (error) {
                console.error('Stripe init error:', error.message);
                throw new Error('Payment initialization failed');
            }
        });
    }
    verifyTransaction(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pi = yield this.stripe.paymentIntents.retrieve(reference);
                return {
                    success: pi.status === 'succeeded',
                    amount: pi.amount / 100,
                    currency: pi.currency.toUpperCase(),
                    reference: pi.id,
                    status: pi.status,
                    gateway: 'stripe',
                    metadata: pi.metadata
                };
            }
            catch (error) {
                return {
                    success: false,
                    amount: 0,
                    currency: '',
                    reference,
                    status: 'failed',
                    gateway: 'stripe'
                };
            }
        });
    }
    verifyWebhook(payload, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            let event;
            try {
                event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
            }
            catch (err) {
                console.warn(`Stripe Webhook Error: ${err.message}`);
                return null;
            }
            if (event.type === 'payment_intent.succeeded') {
                const pi = event.data.object;
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
        });
    }
    createRecipient(name, _accountNumber, _bankCode) {
        return __awaiter(this, void 0, void 0, function* () {
            // Create Express Account
            try {
                const account = yield this.stripe.accounts.create({
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
            }
            catch (error) {
                console.error('Stripe create account error:', error.message);
                throw new Error('Failed to create Stripe account');
            }
        });
    }
    generateOnboardingLink(recipientCode, refreshUrl, returnUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const link = yield this.stripe.accountLinks.create({
                    account: recipientCode,
                    refresh_url: refreshUrl,
                    return_url: returnUrl,
                    type: 'account_onboarding',
                });
                return link.url;
            }
            catch (error) {
                console.error('Stripe onboarding link error:', error.message);
                throw new Error('Failed to generate onboarding link');
            }
        });
    }
    transfer(recipientCode, amount, currency, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const centsAmount = Math.round(amount * 100);
            try {
                const transfer = yield this.stripe.transfers.create({
                    amount: centsAmount,
                    currency: currency.toLowerCase(),
                    destination: recipientCode,
                    description: reason
                });
                return transfer.id;
            }
            catch (error) {
                console.error('Stripe transfer error:', error.message);
                throw new Error('Transfer failed');
            }
        });
    }
}
exports.StripeProvider = StripeProvider;
//# sourceMappingURL=StripeProvider.js.map