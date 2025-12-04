export type PaymentStatus = 'success' | 'failed' | 'pending';

export interface PaymentInitiateRequest {
    reference: string;
    userId?: string;
    amount: number;
    currency: 'NGN' | 'USD';
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    description?: string;
    callbackUrl?: string;
    metadata?: Record<string, unknown>;
    captureNow?: boolean;
}

export interface PaymentVerifyResponse {
    status: PaymentStatus;
    reference: string;
    amount: number;
    currency: string;
    gatewayReference?: string;
    metadata?: Record<string, unknown>;
    raw?: unknown;
    gateway?: string;
}

export interface PaymentRefundResponse {
    status: PaymentStatus;
    reference: string;
    amount: number;
    currency: string;
    gatewayReference?: string;
    raw?: unknown;
}

export interface IPaymentStrategy {
    initiatePayment(request: PaymentInitiateRequest): Promise<any>;
    verifyPayment(reference: string): Promise<PaymentVerifyResponse>;
    refundPayment?(reference: string, amount?: number): Promise<PaymentRefundResponse>;
}
