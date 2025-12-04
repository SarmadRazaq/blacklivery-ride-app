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
exports.MonnifyProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
class MonnifyProvider {
    constructor() {
        var _a, _b, _c, _d;
        this.baseUrl = (_a = process.env.MONNIFY_BASE_URL) !== null && _a !== void 0 ? _a : 'https://api.monnify.com';
        this.contractCode = (_b = process.env.MONNIFY_CONTRACT_CODE) !== null && _b !== void 0 ? _b : '';
        this.apiKey = (_c = process.env.MONNIFY_API_KEY) !== null && _c !== void 0 ? _c : '';
        this.apiSecret = (_d = process.env.MONNIFY_API_SECRET) !== null && _d !== void 0 ? _d : '';
    }
    getAuthToken() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
            const { data } = yield axios_1.default.post(`${this.baseUrl}/api/v1/auth/login`, {}, { headers: { Authorization: `Basic ${credentials}` } });
            return (_a = data === null || data === void 0 ? void 0 : data.responseBody) === null || _a === void 0 ? void 0 : _a.accessToken;
        });
    }
    initializeTransaction(email, amount, currency, reference, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const token = yield this.getAuthToken();
                const payload = {
                    amount,
                    customerName: (metadata === null || metadata === void 0 ? void 0 : metadata.customerName) || 'Customer',
                    customerEmail: email,
                    paymentReference: reference,
                    paymentDescription: (metadata === null || metadata === void 0 ? void 0 : metadata.description) || 'Blacklivery Ride',
                    currencyCode: currency,
                    contractCode: this.contractCode,
                    redirectUrl: process.env.MONNIFY_CALLBACK_URL,
                    metadata
                };
                const { data } = yield axios_1.default.post(`${this.baseUrl}/api/v1/merchant/transactions/init-transaction`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                return {
                    reference,
                    authorizationUrl: (_a = data === null || data === void 0 ? void 0 : data.responseBody) === null || _a === void 0 ? void 0 : _a.checkoutUrl
                };
            }
            catch (error) {
                console.error('Monnify init error:', ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
                throw new Error('Payment initialization failed');
            }
        });
    }
    verifyTransaction(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const token = yield this.getAuthToken();
                const { data } = yield axios_1.default.get(`${this.baseUrl}/api/v1/merchant/transactions/query?paymentReference=${reference}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const response = data === null || data === void 0 ? void 0 : data.responseBody;
                return {
                    success: ((_a = response === null || response === void 0 ? void 0 : response.paymentStatus) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'paid',
                    amount: Number((_b = response === null || response === void 0 ? void 0 : response.amountPaid) !== null && _b !== void 0 ? _b : 0),
                    currency: (_c = response === null || response === void 0 ? void 0 : response.currencyCode) !== null && _c !== void 0 ? _c : 'NGN',
                    reference,
                    status: ((_d = response === null || response === void 0 ? void 0 : response.paymentStatus) === null || _d === void 0 ? void 0 : _d.toLowerCase()) === 'paid' ? 'success' : 'failed',
                    gateway: 'monnify',
                    metadata: response === null || response === void 0 ? void 0 : response.metaData
                };
            }
            catch (error) {
                return {
                    success: false,
                    amount: 0,
                    currency: '',
                    reference,
                    status: 'failed',
                    gateway: 'monnify'
                };
            }
        });
    }
    verifyWebhook(payload, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
            const computed = crypto_1.default.createHmac('sha512', this.apiSecret).update(raw).digest('hex');
            if (computed !== signature)
                return null;
            const eventData = typeof payload === 'string' ? JSON.parse(payload) : payload;
            // Monnify webhook structure might vary, assuming standard event
            if (eventData.eventType === 'SUCCESSFUL_TRANSACTION') {
                const data = eventData.eventData;
                return {
                    success: true,
                    amount: data.amountPaid,
                    currency: data.currency,
                    reference: data.paymentReference,
                    status: 'success',
                    gateway: 'monnify',
                    metadata: data.metaData
                };
            }
            return null;
        });
    }
    createRecipient(name, accountNumber, bankCode) {
        return __awaiter(this, void 0, void 0, function* () {
            // Monnify doesn't strictly use "recipient codes" like Paystack.
            // We can return a JSON string of the details to be used in transfer
            return JSON.stringify({ name, accountNumber, bankCode });
        });
    }
    transfer(recipientCode, amount, currency, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const recipient = JSON.parse(recipientCode);
                const token = yield this.getAuthToken();
                const payload = {
                    amount,
                    reference: `TRF-${Date.now()}`, // Generate a unique ref
                    narration: reason,
                    destinationBankCode: recipient.bankCode,
                    destinationAccountNumber: recipient.accountNumber,
                    currency,
                    sourceAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT_NUMBER, // Required for Monnify disbursements
                    destinationAccountName: recipient.name
                };
                const { data } = yield axios_1.default.post(`${this.baseUrl}/api/v2/disbursements/single`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                return (_a = data === null || data === void 0 ? void 0 : data.responseBody) === null || _a === void 0 ? void 0 : _a.reference;
            }
            catch (error) {
                console.error('Monnify transfer error:', ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
                throw new Error('Transfer failed');
            }
        });
    }
}
exports.MonnifyProvider = MonnifyProvider;
//# sourceMappingURL=MonnifyProvider.js.map