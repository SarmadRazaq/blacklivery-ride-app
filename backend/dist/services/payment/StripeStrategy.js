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
exports.StripeStrategy = void 0;
const stripe_1 = __importDefault(require("stripe"));
class StripeStrategy {
    constructor() {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY not configured');
        }
        this.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    }
    serializeMetadata(metadata) {
        const result = {};
        if (!metadata)
            return result;
        Object.entries(metadata).forEach(([key, value]) => {
            if (value === undefined || value === null)
                return;
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                result[key] = String(value);
                return;
            }
            result[key] = JSON.stringify(value);
        });
        return result;
    }
    initiatePayment(request) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const metadata = this.serializeMetadata(Object.assign(Object.assign({}, request.metadata), { userId: (_a = request.userId) !== null && _a !== void 0 ? _a : '', purpose: (_c = (_b = request.metadata) === null || _b === void 0 ? void 0 : _b.purpose) !== null && _c !== void 0 ? _c : 'wallet_topup' }));
            const paymentIntent = yield this.stripe.paymentIntents.create({
                amount: Math.round(request.amount * 100),
                currency: request.currency.toLowerCase(),
                capture_method: request.captureNow === false ? 'manual' : 'automatic',
                description: request.description,
                receipt_email: request.customerEmail,
                metadata,
                automatic_payment_methods: { enabled: true }
            });
            return {
                clientSecret: (_d = paymentIntent.client_secret) !== null && _d !== void 0 ? _d : undefined,
                paymentIntentId: paymentIntent.id
            };
        });
    }
    verifyPayment(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const intent = yield this.stripe.paymentIntents.retrieve(reference);
            return {
                status: intent.status === 'succeeded' ? 'success' : intent.status === 'processing' ? 'pending' : 'failed',
                reference: intent.id,
                amount: (intent.amount_received || intent.amount || 0) / 100,
                currency: intent.currency.toUpperCase(),
                gatewayReference: intent.id,
                metadata: (_a = intent.metadata) !== null && _a !== void 0 ? _a : undefined,
                raw: intent
            };
        });
    }
    refundPayment(reference, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const refund = yield this.stripe.refunds.create({
                payment_intent: reference,
                amount: amount ? Math.round(amount * 100) : undefined
            });
            return {
                status: refund.status === 'succeeded' ? 'success' : refund.status === 'pending' ? 'pending' : 'failed',
                reference,
                amount: ((_a = refund.amount) !== null && _a !== void 0 ? _a : 0) / 100,
                currency: (_c = (_b = refund.currency) === null || _b === void 0 ? void 0 : _b.toUpperCase()) !== null && _c !== void 0 ? _c : 'USD',
                gatewayReference: refund.id,
                raw: refund
            };
        });
    }
    constructWebhookEvent(payload, signature) {
        if (!this.webhookSecret) {
            throw new Error('Stripe webhook secret not configured');
        }
        return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    }
}
exports.StripeStrategy = StripeStrategy;
//# sourceMappingURL=StripeStrategy.js.map