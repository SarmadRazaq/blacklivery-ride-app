import axios from 'axios';
import crypto from 'crypto';
import {
    IPaymentStrategy,
    PaymentInitiateRequest,
    PaymentVerifyResponse,
    PaymentRefundResponse
} from './IPaymentStrategy';

export class FlutterwaveStrategy implements IPaymentStrategy {
    private secretKey: string;
    private hashSecret: string;
    private baseUrl = 'https://api.flutterwave.com/v3';

    constructor() {
        this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
        this.hashSecret = process.env.FLUTTERWAVE_HASH_SECRET || this.secretKey;
        if (!this.secretKey) {
            console.warn('FLUTTERWAVE_SECRET_KEY is not set');
        }
    }

    async initiatePayment(request: PaymentInitiateRequest): Promise<any> {
        const response = await axios.post(
            `${this.baseUrl}/payments`,
            {
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
                    title: request.description ?? 'Blacklivery Ride',
                    logo: 'https://blacklivery.com/logo.png'
                }
            },
            { headers: { Authorization: `Bearer ${this.secretKey}` } }
        );

        return response.data.data;
    }

    async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
        const response = await axios.get(
            `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${reference}`,
            { headers: { Authorization: `Bearer ${this.secretKey}` } }
        );

        const data = response.data.data;
        return {
            status: data.status === 'successful' ? 'success' : data.status === 'pending' ? 'pending' : 'failed',
            reference: data.tx_ref,
            amount: data.amount,
            currency: data.currency,
            gatewayReference: data.id?.toString(),
            metadata: data.meta ?? undefined,
            raw: data
        };
    }

    async refundPayment(reference: string, amount?: number): Promise<PaymentRefundResponse> {
        const response = await axios.post(
            `${this.baseUrl}/transactions/${reference}/refund`,
            amount ? { amount } : {},
            { headers: { Authorization: `Bearer ${this.secretKey}` } }
        );

        const data = response.data.data;
        return {
            status: data.status === 'successful' ? 'success' : data.status === 'pending' ? 'pending' : 'failed',
            reference,
            amount: data.amount,
            currency: data.currency,
            gatewayReference: data.id?.toString(),
            raw: data
        };
    }

    verifyWebhook(signature?: string): boolean {
        if (!signature) return false;
        return signature === this.hashSecret;
    }
}
