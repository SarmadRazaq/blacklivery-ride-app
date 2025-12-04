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
exports.PaystackStrategy = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
class PaystackStrategy {
    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
        if (!this.secretKey) {
            console.warn('PAYSTACK_SECRET_KEY is not set');
        }
    }
    initiatePayment(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.post('https://api.paystack.co/transaction/initialize', {
                email: request.customerEmail,
                amount: Math.round(request.amount * 100),
                currency: request.currency,
                reference: request.reference,
                callback_url: request.callbackUrl,
                metadata: request.metadata
            }, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data.data;
        });
    }
    verifyPayment(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const response = yield axios_1.default.get(`https://api.paystack.co/transaction/verify/${reference}`, {
                headers: { Authorization: `Bearer ${this.secretKey}` }
            });
            const data = response.data.data;
            return {
                status: data.status === 'success' ? 'success' : data.status === 'pending' ? 'pending' : 'failed',
                reference: data.reference,
                amount: data.amount / 100,
                currency: data.currency,
                gatewayReference: (_a = data.id) === null || _a === void 0 ? void 0 : _a.toString(),
                metadata: (_b = data.metadata) !== null && _b !== void 0 ? _b : undefined,
                raw: data
            };
        });
    }
    refundPayment(reference, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const payload = { transaction: reference };
            if (amount) {
                payload.amount = Math.round(amount * 100);
            }
            const response = yield axios_1.default.post('https://api.paystack.co/refund', payload, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = response.data.data;
            return {
                status: data.status === 'processed' ? 'success' : data.status === 'pending' ? 'pending' : 'failed',
                reference,
                amount: data.amount / 100,
                currency: data.currency,
                gatewayReference: (_a = data.id) === null || _a === void 0 ? void 0 : _a.toString(),
                raw: data
            };
        });
    }
    verifyWebhook(payload, signature) {
        if (!signature)
            return false;
        const computed = crypto_1.default
            .createHmac('sha512', this.secretKey)
            .update(typeof payload === 'string' ? payload : payload.toString())
            .digest('hex');
        return computed === signature;
    }
}
exports.PaystackStrategy = PaystackStrategy;
//# sourceMappingURL=PaystackStrategy.js.map