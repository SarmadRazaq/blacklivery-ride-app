import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../../utils/logger';
import { IPaymentProvider, PaymentInitResult, PaymentVerificationResult } from '../IPaymentProvider';

export class PaystackProvider implements IPaymentProvider {
    private readonly secretKey: string;
    private readonly baseUrl = 'https://api.paystack.co';

    constructor() {
        const key = process.env.PAYSTACK_SECRET_KEY;
        if (!key) {
            // Throw an error to ensure production doesn't silently accept fake payments
            logger.error('CRITICAL: PAYSTACK_SECRET_KEY is not configured in .env');
            throw new Error('PAYSTACK_SECRET_KEY is not configured');
        }
        this.secretKey = key;
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
                    currency: 'NGN',
                    reference,
                    metadata,
                    callback_url: process.env.PAYSTACK_CALLBACK_URL
                },
                { headers: this.headers }
            );

            return {
                reference,
                accessCode: response.data.data.access_code,
                authorizationUrl: response.data.data.authorization_url
            };
        } catch (error: any) {
            // Log valuable debugging info
            if (error.response) {
                logger.error({
                    status: error.response.status,
                    data: error.response.data,
                    inputAmount: amount,
                    koboAmount
                }, 'Paystack API responded with error');
            } else {
                logger.error({ err: error, inputAmount: amount }, 'Paystack init error (no response)');
            }
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
        } catch (error: any) {
            logger.error({ err: error }, 'Paystack verify error');
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

        const hashBuf = Buffer.from(hash, 'hex');
        const sigBuf = Buffer.from(signature, 'hex');
        if (hashBuf.length !== sigBuf.length || !crypto.timingSafeEqual(hashBuf, sigBuf)) {
            logger.warn('Invalid Paystack signature');
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
            logger.error({ err: error }, 'Paystack recipient error');
            throw new Error('Failed to create recipient');
        }
    }

    async transfer(recipientCode: string, amount: number, currency: string, reason: string, _reference?: string): Promise<string> {
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
            logger.error({ err: error }, 'Paystack transfer error');
            throw new Error('Transfer failed');
        }
    }
}
