import { IPaymentProvider, PaymentInitResult, PaymentVerificationResult } from './IPaymentProvider';
import { PaystackProvider } from './providers/PaystackProvider';
import { StripeProvider } from './providers/StripeProvider';
import { FlutterwaveProvider } from './providers/FlutterwaveProvider';
import { MonnifyProvider } from './providers/MonnifyProvider';
import { RegionCode } from '../../config/region.config';
import { logger } from '../../utils/logger';

export class PaymentService {
    private providers: Record<string, IPaymentProvider> = {};
    private initialized = false;

    private ensureInitialized(): void {
        if (this.initialized) return;
        this.initialized = true;

        const tryInit = (key: string, factory: () => IPaymentProvider) => {
            try {
                this.providers[key] = factory();
            } catch (e: any) {
                logger.warn({ key, err: e.message }, `Payment provider ${key} unavailable — missing env vars`);
            }
        };

        tryInit('NG', () => new PaystackProvider());
        tryInit('NG-PAYSTACK', () => new PaystackProvider());
        tryInit('NG-FLUTTERWAVE', () => new FlutterwaveProvider());
        tryInit('NG-MONNIFY', () => new MonnifyProvider());
        tryInit('US-CHI', () => new StripeProvider());
    }

    private getProvider(region: RegionCode, providerName?: string): IPaymentProvider {
        this.ensureInitialized();
        if (providerName) {
            const key = `${region}-${providerName.toUpperCase()}`;
            if (this.providers[key]) return this.providers[key];
            if (this.providers[providerName.toUpperCase()]) return this.providers[providerName.toUpperCase()];
        }
        const provider = this.providers[region] || this.providers['NG'];
        if (!provider) {
            throw new Error(`No payment provider available for region ${region}. Check API key configuration.`);
        }
        return provider;
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
        this.ensureInitialized();
        const gatewayMap: Record<string, string> = {
            paystack: 'NG-PAYSTACK',
            flutterwave: 'NG-FLUTTERWAVE',
            monnify: 'NG-MONNIFY',
            stripe: 'US-CHI',
        };
        const key = gatewayMap[gateway];
        if (!key) throw new Error(`Unknown gateway: ${gateway}`);
        const provider = this.providers[key];
        if (!provider) throw new Error(`Payment provider for ${gateway} is not configured. Check API keys.`);
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

    async transferFunds(region: RegionCode, recipientCode: string, amount: number, currency: string, reason: string, providerName?: string, reference?: string): Promise<string> {
        const provider = this.getProvider(region, providerName);
        return provider.transfer(recipientCode, amount, currency, reason, reference);
    }
}

export const paymentService = new PaymentService();
