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
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = exports.PaymentService = void 0;
const PaystackProvider_1 = require("./providers/PaystackProvider");
const StripeProvider_1 = require("./providers/StripeProvider");
const FlutterwaveProvider_1 = require("./providers/FlutterwaveProvider");
const MonnifyProvider_1 = require("./providers/MonnifyProvider");
class PaymentService {
    constructor() {
        this.providers = {
            'NG': new PaystackProvider_1.PaystackProvider(), // Default for NG
            'NG-PAYSTACK': new PaystackProvider_1.PaystackProvider(),
            'NG-FLUTTERWAVE': new FlutterwaveProvider_1.FlutterwaveProvider(),
            'NG-MONNIFY': new MonnifyProvider_1.MonnifyProvider(),
            'US-CHI': new StripeProvider_1.StripeProvider()
        };
    }
    getProvider(region, providerName) {
        if (providerName) {
            const key = `${region}-${providerName.toUpperCase()}`;
            if (this.providers[key])
                return this.providers[key];
            // Fallback to direct key match if passed like 'NG-FLUTTERWAVE'
            if (this.providers[providerName.toUpperCase()])
                return this.providers[providerName.toUpperCase()];
        }
        return this.providers[region] || this.providers['NG'];
    }
    initializePayment(region, email, amount, currency, reference, metadata, providerName) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = this.getProvider(region, providerName);
            return provider.initializeTransaction(email, amount, currency, reference, metadata);
        });
    }
    verifyPayment(region, reference, providerName) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = this.getProvider(region, providerName);
            return provider.verifyTransaction(reference);
        });
    }
    // Webhooks
    verifyWebhook(gateway, payload, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            let provider;
            switch (gateway) {
                case 'paystack':
                    provider = this.providers['NG-PAYSTACK'];
                    break;
                case 'flutterwave':
                    provider = this.providers['NG-FLUTTERWAVE'];
                    break;
                case 'monnify':
                    provider = this.providers['NG-MONNIFY'];
                    break;
                case 'stripe':
                    provider = this.providers['US-CHI'];
                    break;
                default:
                    throw new Error(`Unknown gateway: ${gateway}`);
            }
            return provider.verifyWebhook(payload, signature);
        });
    }
    // Payouts
    createRecipient(region, name, accountNumber, bankCode, providerName) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = this.getProvider(region, providerName);
            return provider.createRecipient(name, accountNumber, bankCode);
        });
    }
    generateOnboardingLink(region, recipientCode, refreshUrl, returnUrl, providerName) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = this.getProvider(region, providerName);
            if (provider.generateOnboardingLink) {
                return provider.generateOnboardingLink(recipientCode, refreshUrl, returnUrl);
            }
            throw new Error('Onboarding not supported for this provider');
        });
    }
    transferFunds(region, recipientCode, amount, currency, reason, providerName) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = this.getProvider(region, providerName);
            return provider.transfer(recipientCode, amount, currency, reason);
        });
    }
}
exports.PaymentService = PaymentService;
exports.paymentService = new PaymentService();
//# sourceMappingURL=PaymentService.js.map