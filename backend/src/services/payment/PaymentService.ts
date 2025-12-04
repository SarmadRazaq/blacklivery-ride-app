import { IPaymentProvider, PaymentInitResult, PaymentVerificationResult } from './IPaymentProvider';
import { PaystackProvider } from './providers/PaystackProvider';
import { StripeProvider } from './providers/StripeProvider';
import { FlutterwaveProvider } from './providers/FlutterwaveProvider';
import { MonnifyProvider } from './providers/MonnifyProvider';
import { RegionCode } from '../../config/region.config';

export class PaymentService {
    private providers: Record<string, IPaymentProvider>;

    constructor() {
        this.providers = {
            'NG': new PaystackProvider(), // Default for NG
            'NG-PAYSTACK': new PaystackProvider(),
            'NG-FLUTTERWAVE': new FlutterwaveProvider(),
            'NG-MONNIFY': new MonnifyProvider(),
            'US-CHI': new StripeProvider()
        };
    }

    private getProvider(region: RegionCode, providerName?: string): IPaymentProvider {
        if (providerName) {
            const key = `${region}-${providerName.toUpperCase()}`;
            if (this.providers[key]) return this.providers[key];
            // Fallback to direct key match if passed like 'NG-FLUTTERWAVE'
            if (this.providers[providerName.toUpperCase()]) return this.providers[providerName.toUpperCase()];
        }
        return this.providers[region] || this.providers['NG'];
    }

    async initializePayment(region: RegionCode, email: string, amount: number, currency: string, reference: string, metadata?: any, providerName?: string): Promise<PaymentInitResult> {
        const provider = this.getProvider(region, providerName);
        return provider.initializeTransaction(email, amount, currency, reference, metadata);
    }

    async verifyPayment(region: RegionCode, reference: string, providerName?: string): Promise<PaymentVerificationResult> {
        const provider = this.getProvider(region, providerName);
        return provider.verifyTransaction(reference);
    }

    // Webhooks
    async verifyWebhook(gateway: 'paystack' | 'stripe' | 'flutterwave' | 'monnify', payload: any, signature: string): Promise<PaymentVerificationResult | null> {
        let provider: IPaymentProvider;
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
    }

    // Payouts
    async createRecipient(region: RegionCode, name: string, accountNumber: string, bankCode: string, providerName?: string): Promise<string> {
        const provider = this.getProvider(region, providerName);
        return provider.createRecipient(name, accountNumber, bankCode);
    }

    async generateOnboardingLink(region: RegionCode, recipientCode: string, refreshUrl: string, returnUrl: string, providerName?: string): Promise<string> {
        const provider = this.getProvider(region, providerName);
        if (provider.generateOnboardingLink) {
            return provider.generateOnboardingLink(recipientCode, refreshUrl, returnUrl);
        }
        throw new Error('Onboarding not supported for this provider');
    }

    async transferFunds(region: RegionCode, recipientCode: string, amount: number, currency: string, reason: string, providerName?: string): Promise<string> {
        const provider = this.getProvider(region, providerName);
        return provider.transfer(recipientCode, amount, currency, reason);
    }
}

export const paymentService = new PaymentService();
