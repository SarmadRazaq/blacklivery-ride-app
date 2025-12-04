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
exports.FlutterwaveStrategy = void 0;
const axios_1 = __importDefault(require("axios"));
class FlutterwaveStrategy {
    constructor() {
        this.baseUrl = 'https://api.flutterwave.com/v3';
        this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
        this.hashSecret = process.env.FLUTTERWAVE_HASH_SECRET || this.secretKey;
        if (!this.secretKey) {
            console.warn('FLUTTERWAVE_SECRET_KEY is not set');
        }
    }
    initiatePayment(request) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const response = yield axios_1.default.post(`${this.baseUrl}/payments`, {
                tx_ref: request.reference,
                amount: request.amount,
                currency: request.currency,
                redirect_url: request.callbackUrl,
                customer: {
                    email: request.customerEmail,
                    name: request.customerName,
                    phonenumber: request.customerPhone
                },
                meta: request.metadata,
                customizations: {
                    title: (_a = request.description) !== null && _a !== void 0 ? _a : 'Blacklivery Ride',
                    logo: 'https://blacklivery.com/logo.png'
                }
            }, { headers: { Authorization: `Bearer ${this.secretKey}` } });
            return response.data.data;
        });
    }
    verifyPayment(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const response = yield axios_1.default.get(`${this.baseUrl}/transactions/verify_by_reference?tx_ref=${reference}`, { headers: { Authorization: `Bearer ${this.secretKey}` } });
            const data = response.data.data;
            return {
                status: data.status === 'successful' ? 'success' : data.status === 'pending' ? 'pending' : 'failed',
                reference: data.tx_ref,
                amount: data.amount,
                currency: data.currency,
                gatewayReference: (_a = data.id) === null || _a === void 0 ? void 0 : _a.toString(),
                metadata: (_b = data.meta) !== null && _b !== void 0 ? _b : undefined,
                raw: data
            };
        });
    }
    refundPayment(reference, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const response = yield axios_1.default.post(`${this.baseUrl}/transactions/${reference}/refund`, amount ? { amount } : {}, { headers: { Authorization: `Bearer ${this.secretKey}` } });
            const data = response.data.data;
            return {
                status: data.status === 'successful' ? 'success' : data.status === 'pending' ? 'pending' : 'failed',
                reference,
                amount: data.amount,
                currency: data.currency,
                gatewayReference: (_a = data.id) === null || _a === void 0 ? void 0 : _a.toString(),
                raw: data
            };
        });
    }
    verifyWebhook(signature) {
        if (!signature)
            return false;
        return signature === this.hashSecret;
    }
}
exports.FlutterwaveStrategy = FlutterwaveStrategy;
//# sourceMappingURL=FlutterwaveStrategy.js.map