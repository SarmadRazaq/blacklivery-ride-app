import axios from 'axios';
import crypto from 'crypto';
import { IPaymentStrategy, PaymentInitiateRequest, PaymentVerifyResponse, PaymentRefundResponse } from './IPaymentStrategy';

export class PaystackStrategy implements IPaymentStrategy {
    private readonly secretKey: string;

    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
        if (!this.secretKey) {
            console.warn('PAYSTACK_SECRET_KEY is not set');
        }
    }

    async initiatePayment(request: PaymentInitiateRequest): Promise<any> {
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: request.customerEmail,
                amount: Math.round(request.amount * 100),
                currency: request.currency,
                reference: request.reference,
                callback_url: request.callbackUrl,
                metadata: request.metadata
            },
            {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.data;
    }

    async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${this.secretKey}` }
        });

        const data = response.data.data;
        return {
            status: data.status === 'success' ? 'success' : data.status === 'pending' ? 'pending' : 'failed',
            reference: data.reference,
            amount: data.amount / 100,
            currency: data.currency,
            gatewayReference: data.id?.toString(),
            metadata: data.metadata ?? undefined,
            raw: data
        };
    }

    async refundPayment(reference: string, amount?: number): Promise<PaymentRefundResponse> {
        const payload: Record<string, unknown> = { transaction: reference };
        if (amount) {
            payload.amount = Math.round(amount * 100);
        }

        const response = await axios.post('https://api.paystack.co/refund', payload, {
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data.data;
        return {
            status: data.status === 'processed' ? 'success' : data.status === 'pending' ? 'pending' : 'failed',
            reference,
            amount: data.amount / 100,
            currency: data.currency,
            gatewayReference: data.id?.toString(),
            raw: data
        };
    }

    verifyWebhook(payload: string | Buffer, signature?: string): boolean {
        if (!signature) return false;
        const computed = crypto
            .createHmac('sha512', this.secretKey)
            .update(typeof payload === 'string' ? payload : payload.toString())
            .digest('hex');
        return computed === signature;
    }
}
