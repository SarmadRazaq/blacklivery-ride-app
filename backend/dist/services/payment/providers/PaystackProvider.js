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
exports.PaystackProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
class PaystackProvider {
    constructor() {
        this.baseUrl = 'https://api.paystack.co';
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    }
    get headers() {
        return {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
        };
    }
    initializeTransaction(email, amount, currency, reference, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Paystack expects amount in kobo (x100)
            const koboAmount = Math.round(amount * 100);
            try {
                const response = yield axios_1.default.post(`${this.baseUrl}/transaction/initialize`, {
                    email,
                    amount: koboAmount,
                    currency: 'NGN', // Force NGN for Paystack usually, or pass through if they support others
                    reference,
                    metadata,
                    callback_url: process.env.PAYSTACK_CALLBACK_URL // e.g. mobile app deep link
                }, { headers: this.headers });
                return {
                    reference,
                    accessCode: response.data.data.access_code,
                    authorizationUrl: response.data.data.authorization_url
                };
            }
            catch (error) {
                console.error('Paystack init error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error('Payment initialization failed');
            }
        });
    }
    verifyTransaction(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.baseUrl}/transaction/verify/${reference}`, { headers: this.headers });
                const data = response.data.data;
                return {
                    success: data.status === 'success',
                    amount: data.amount / 100, // Convert back to unit
                    currency: data.currency,
                    reference: data.reference,
                    status: data.status,
                    gateway: 'paystack',
                    metadata: data.metadata
                };
            }
            catch (error) {
                return {
                    success: false,
                    amount: 0,
                    currency: '',
                    reference,
                    status: 'failed',
                    gateway: 'paystack'
                };
            }
        });
    }
    verifyWebhook(payload, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            const hash = crypto_1.default.createHmac('sha512', this.secretKey)
                .update(JSON.stringify(payload))
                .digest('hex');
            if (hash !== signature) {
                console.warn('Invalid Paystack signature');
                return null;
            }
            const event = payload.event;
            const data = payload.data;
            if (event === 'charge.success') {
                return {
                    success: true,
                    amount: data.amount / 100,
                    currency: data.currency,
                    reference: data.reference,
                    status: 'success',
                    gateway: 'paystack',
                    metadata: data.metadata
                };
            }
            return null; // Ignore other events
        });
    }
    createRecipient(name, accountNumber, bankCode) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.post(`${this.baseUrl}/transferrecipient`, {
                    type: 'nuban',
                    name,
                    account_number: accountNumber,
                    bank_code: bankCode,
                    currency: 'NGN'
                }, { headers: this.headers });
                return response.data.data.recipient_code;
            }
            catch (error) {
                console.error('Paystack recipient error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error('Failed to create recipient');
            }
        });
    }
    transfer(recipientCode, amount, currency, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const koboAmount = Math.round(amount * 100);
            try {
                const response = yield axios_1.default.post(`${this.baseUrl}/transfer`, {
                    source: 'balance',
                    amount: koboAmount,
                    recipient: recipientCode,
                    reason
                }, { headers: this.headers });
                return response.data.data.transfer_code;
            }
            catch (error) {
                console.error('Paystack transfer error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error('Transfer failed');
            }
        });
    }
}
exports.PaystackProvider = PaystackProvider;
//# sourceMappingURL=PaystackProvider.js.map