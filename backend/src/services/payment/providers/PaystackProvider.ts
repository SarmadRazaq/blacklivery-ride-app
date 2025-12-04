import axios from 'axios';
import crypto from 'crypto';
import { IPaymentProvider, PaymentInitResult, PaymentVerificationResult } from '../IPaymentProvider';

export class PaystackProvider implements IPaymentProvider {
    private readonly secretKey: string;
    private readonly baseUrl = 'https://api.paystack.co';

    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    }

    private get headers() {
        return {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
        };
    }

    async initializeTransaction(email: string, amount: number, currency: string, reference: string, metadata?: any): Promise<PaymentInitResult> {
        // Paystack expects amount in kobo (x100)
        const koboAmount = Math.round(amount * 100);

        try {
            const response = await axios.post(
                `${this.baseUrl}/transaction/initialize`,
                {
                    email,
                    amount: koboAmount,
                    currency: 'NGN', // Force NGN for Paystack usually, or pass through if they support others
                    reference,
                    metadata,
                    callback_url: process.env.PAYSTACK_CALLBACK_URL // e.g. mobile app deep link
                },
                { headers: this.headers }
            );

            return {
                reference,
                accessCode: response.data.data.access_code,
                authorizationUrl: response.data.data.authorization_url
            };
        } catch (error: any) {
            console.error('Paystack init error:', error.response?.data || error.message);
            throw new Error('Payment initialization failed');
        }
    }

    async verifyTransaction(reference: string): Promise<PaymentVerificationResult> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/transaction/verify/${reference}`,
                { headers: this.headers }
            );
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
        } catch (error) {
            return {
                success: false,
                amount: 0,
                currency: '',
                reference,
                status: 'failed',
                gateway: 'paystack'
            };
        }
    }

    async verifyWebhook(payload: any, signature: string): Promise<PaymentVerificationResult | null> {
        const hash = crypto.createHmac('sha512', this.secretKey)
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
    }

    async createRecipient(name: string, accountNumber: string, bankCode: string): Promise<string> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/transferrecipient`,
                {
                    type: 'nuban',
                    name,
                    account_number: accountNumber,
                    bank_code: bankCode,
                    currency: 'NGN'
                },
                { headers: this.headers }
            );
            return response.data.data.recipient_code;
        } catch (error: any) {
            console.error('Paystack recipient error:', error.response?.data || error.message);
            throw new Error('Failed to create recipient');
        }
    }

    async transfer(recipientCode: string, amount: number, currency: string, reason: string): Promise<string> {
        const koboAmount = Math.round(amount * 100);
        try {
            const response = await axios.post(
                `${this.baseUrl}/transfer`,
                {
                    source: 'balance',
                    amount: koboAmount,
                    recipient: recipientCode,
                    reason
                },
                { headers: this.headers }
            );
            return response.data.data.transfer_code;
        } catch (error: any) {
            console.error('Paystack transfer error:', error.response?.data || error.message);
            throw new Error('Transfer failed');
        }
    }
}
