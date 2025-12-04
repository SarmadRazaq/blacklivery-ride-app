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
exports.MonnifyStrategy = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
class MonnifyStrategy {
    constructor() {
        // ...existing fields...
        this.disbursementUrl = 'https://sandbox.monnify.com/api/v2/disbursements/single';
        // ...existing ctor...
        this.webhookSecret = process.env.MONNIFY_WEBHOOK_SECRET || '';
    }
    // ...existing initiatePayment/verifyPayment...
    initiateTransfer(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield this.getAuthToken();
            const response = yield axios_1.default.post(this.disbursementUrl, {
                amount: payload.amount,
                reference: payload.reference,
                narration: payload.narration,
                destinationAccountNumber: payload.destinationAccountNumber,
                destinationBankCode: payload.destinationBankCode,
                destinationAccountName: payload.destinationAccountName,
                currency: payload.currencyCode,
                sourceAccountNumber: process.env.MONNIFY_SOURCE_ACCOUNT,
                customerName: payload.customerName,
                customerEmail: payload.customerEmail
            }, { headers: { Authorization: `Bearer ${token}` } });
            return response.data;
        });
    }
    getAuthToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.apiKey || !this.apiSecret)
                throw new Error('Monnify API credentials missing');
            const base64 = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
            const response = yield axios_1.default.post('https://sandbox.monnify.com/api/v1/auth/login', {}, { headers: { Authorization: `Basic ${base64}` } });
            return response.data.responseBody.accessToken;
        });
    }
    verifyWebhook(signature, payload) {
        if (!signature || !this.webhookSecret)
            return false;
        const raw = typeof payload === 'string' ? payload : payload.toString();
        const computed = crypto_1.default.createHmac('sha512', this.webhookSecret).update(raw).digest('hex');
        return computed === signature;
    }
}
exports.MonnifyStrategy = MonnifyStrategy;
//# sourceMappingURL=MonnifyStrategy.js.map