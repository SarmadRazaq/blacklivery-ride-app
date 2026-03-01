export interface PaymentInitResult {
    reference: string;
    accessCode?: string;
    authorizationUrl?: string;
    clientSecret?: string; // For Stripe
}

export interface PaymentVerificationResult {
    success: boolean;
    amount: number;
    currency: string;
    reference: string;
    status: string;
    gateway: string;
    metadata?: any;
}

export interface IPaymentProvider {
    initializeTransaction(email: string, amount: number, currency: string, reference: string, metadata?: any): Promise<PaymentInitResult>;
    verifyTransaction(reference: string): Promise<PaymentVerificationResult>;
    
    // Webhooks
    verifyWebhook(payload: any, signature: string): Promise<PaymentVerificationResult | null>;

    // Payouts
    createRecipient(name: string, accountNumber: string, bankCode: string): Promise<string>;
    transfer(recipientCode: string, amount: number, currency: string, reason: string, reference?: string): Promise<string>;
    
    // Optional Onboarding (Stripe)
    generateOnboardingLink?(recipientCode: string, refreshUrl: string, returnUrl: string): Promise<string>;
}
