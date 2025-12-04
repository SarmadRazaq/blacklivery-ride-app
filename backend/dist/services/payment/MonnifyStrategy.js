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
exports.monnifyStrategy = exports.MonnifyStrategy = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
class MonnifyStrategy {
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
    initiatePayment(request) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const token = yield this.getAuthToken();
            const payload = {
                amount: request.amount,
                customerName: request.customerName,
                customerEmail: request.customerEmail,
                paymentReference: request.reference,
                paymentDescription: request.description,
                currencyCode: (_a = request.currency) !== null && _a !== void 0 ? _a : 'NGN',
                contractCode: this.contractCode,
                redirectUrl: request.callbackUrl
            };
            const { data } = yield axios_1.default.post(`${this.baseUrl}/api/v1/merchant/transactions/init-transaction`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return data === null || data === void 0 ? void 0 : data.responseBody;
        });
    }
    verifyPayment(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const token = yield this.getAuthToken();
            const { data } = yield axios_1.default.get(`${this.baseUrl}/api/v1/merchant/transactions/query?paymentReference=${reference}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const response = data === null || data === void 0 ? void 0 : data.responseBody;
            return {
                status: ((_a = response === null || response === void 0 ? void 0 : response.paymentStatus) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'paid' ? 'success' : 'failed',
                reference,
                amount: Number((_b = response === null || response === void 0 ? void 0 : response.amountPaid) !== null && _b !== void 0 ? _b : 0),
                currency: (_c = response === null || response === void 0 ? void 0 : response.currencyCode) !== null && _c !== void 0 ? _c : 'NGN',
                raw: response
            };
        });
    }
    initiatePayout(payout) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const token = yield this.getAuthToken();
            const payload = {
                amount: payout.amount,
                reference: payout.reference,
                narration: payout.narration,
                destinationBankCode: payout.bankCode,
                destinationAccountNumber: payout.accountNumber,
                currency: (_a = payout.currency) !== null && _a !== void 0 ? _a : 'NGN',
                customerName: payout.customerName,
                contractCode: this.contractCode
            };
            const { data } = yield axios_1.default.post(`${this.baseUrl}/api/v2/disbursements/single`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return data === null || data === void 0 ? void 0 : data.responseBody;
        });
    }
    verifyPayout(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const token = yield this.getAuthToken();
            const { data } = yield axios_1.default.get(`${this.baseUrl}/api/v2/disbursements/single/summary?reference=${reference}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const response = data === null || data === void 0 ? void 0 : data.responseBody;
            const status = (_a = response === null || response === void 0 ? void 0 : response.status) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            return {
                status: status === 'processing' || status === 'pending' ? 'pending' : status === 'success' ? 'success' : 'failed',
                reference,
                amount: Number((_b = response === null || response === void 0 ? void 0 : response.amount) !== null && _b !== void 0 ? _b : 0),
                currency: (_c = response === null || response === void 0 ? void 0 : response.currency) !== null && _c !== void 0 ? _c : 'NGN',
                raw: response
            };
        });
    }
    verifyWebhook(signature, payload) {
        if (!signature)
            return false;
        const raw = typeof payload === 'string' ? payload : payload.toString();
        const computed = crypto_1.default.createHmac('sha512', this.apiSecret).update(raw).digest('hex');
        return computed === signature;
    }
}
exports.MonnifyStrategy = MonnifyStrategy;
exports.monnifyStrategy = new MonnifyStrategy();
//# sourceMappingURL=MonnifyStrategy.js.map