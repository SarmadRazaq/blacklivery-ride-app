import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../../utils/logger';
import { IPaymentProvider, PaymentInitResult, PaymentVerificationResult } from '../IPaymentProvider';

export class FlutterwaveProvider implements IPaymentProvider {
    private secretKey: string;
    private hashSecret: string;
    private baseUrl = 'https://api.flutterwave.com/v3';

    constructor() {
        const key = process.env.FLUTTERWAVE_SECRET_KEY;
        if (!key) {
            throw new Error('FLUTTERWAVE_SECRET_KEY is not configured');
        }
        this.secretKey = key;
        this.hashSecret = process.env.FLUTTERWAVE_WEBHOOK_HASH || this.secretKey;
    }

    async initializeTransaction(email: string, amount: number, currency: string, reference: string, metadata?: any): Promise<PaymentInitResult> {
        const { sdkMode, ...cleanMeta } = metadata || {};
        try {
            const response = await axios.post(
                `${this.baseUrl}/payments`,
                {
                    tx_ref: reference,
                    amount,
                    currency,
                    redirect_url: process.env.FLUTTERWAVE_CALLBACK_URL,
                    customer: {
                        email,
                        name: cleanMeta?.customerName,
                        phonenumber: cleanMeta?.customerPhone
                    },
                    meta: cleanMeta,
                    customizations: {
                        title: 'Blacklivery Ride',
                        logo: 'https://blacklivery.com/logo.png'
                    }
                },
                { headers: { Authorization: `Bearer ${this.secretKey}` } }
            );

            return {
                reference,
                authorizationUrl: response.data.data.link
            };
        } catch (error: any) {
            logger.error({ err: error }, 'Flutterwave init error');
            throw new Error('Payment initialization failed');
        }
    }

    async verifyTransaction(reference: string): Promise<PaymentVerificationResult> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${reference}`,
                { headers: { Authorization: `Bearer ${this.secretKey}` } }
            );

            const data = response.data.data;
            const card = data.card;
            const cardDetails = card ? {
                last4: card.last_4digits || card.last4 || '',
                brand: card.type || card.brand || 'card',
                expMonth: parseInt(card.expiry?.split('/')[0], 10) || undefined,
                expYear: parseInt(card.expiry?.split('/')[1], 10) || undefined,
            } : undefined;
            return {
                success: data.status === 'successful',
                amount: data.amount,
                currency: data.currency,
                reference: data.tx_ref,
                status: data.status,
                gateway: 'flutterwave',
                metadata: data.meta,
                cardDetails,
            };
        } catch (error) {
            return {
                success: false,
                amount: 0,
                currency: '',
                reference,
                status: 'failed',
                gateway: 'flutterwave'
            };
        }
    }

    async verifyWebhook(payload: any, signature: string): Promise<PaymentVerificationResult | null> {
        const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const computed = crypto.createHmac('sha512', this.hashSecret).update(raw).digest('hex');
        const computedBuf = Buffer.from(computed, 'hex');
        const sigBuf = Buffer.from(signature, 'hex');
        if (computedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(computedBuf, sigBuf)) return null;

        const data = payload.data;
        if (payload.event === 'charge.completed' && data.status === 'successful') {
            return {
                success: true,
                amount: data.amount,
                currency: data.currency,
                reference: data.tx_ref,
                status: 'success',
                gateway: 'flutterwave',
                metadata: data.meta
            };
        }

        return null;
    }

    async createRecipient(name: string, accountNumber: string, bankCode: string): Promise<string> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/beneficiaries`,
                {
                    account_number: accountNumber,
                    account_bank: bankCode,
                    beneficiary_name: name
                },
                { headers: { Authorization: `Bearer ${this.secretKey}` } }
            );
            // Flutterwave doesn't return a recipient code like Paystack in the same way for all endpoints, 
            // but for transfers we usually need account details directly or a beneficiary ID.
            // For consistency with IPaymentProvider which expects a string ID, we'll return the ID.
            return response.data.data.id.toString();
        } catch (error: any) {
            logger.error({ err: error }, 'Flutterwave recipient error');
            throw new Error('Failed to create recipient');
        }
    }

    async transfer(recipientCode: string, amount: number, currency: string, reason: string, reference?: string): Promise<string> {
        try {
            // Flutterwave transfers use account details stored as beneficiary
            // recipientCode can be either:
            //   1. A beneficiary ID (from createRecipient)
            //   2. A JSON string with {accountNumber, bankCode} for direct transfers
            let transferPayload: any;

            // Try to parse as JSON with account details for direct transfer
            try {
                const parsed = JSON.parse(recipientCode);
                if (parsed.accountNumber && parsed.bankCode) {
                    transferPayload = {
                        account_bank: parsed.bankCode,
                        account_number: parsed.accountNumber,
                        amount,
                        narration: reason,
                        currency: currency || 'NGN',
                        reference: reference || `BL-FLW-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                        debit_currency: currency || 'NGN'
                    };
                }
            } catch {
                // Not JSON — treat as beneficiary ID
            }

            if (!transferPayload) {
                // Use beneficiary-based transfer
                transferPayload = {
                    beneficiary: parseInt(recipientCode, 10) || recipientCode,
                    amount,
                    narration: reason,
                    currency: currency || 'NGN',
                    reference: reference || `BL-FLW-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                    debit_currency: currency || 'NGN'
                };
            }

            const response = await axios.post(
                `${this.baseUrl}/transfers`,
                transferPayload,
                { headers: { Authorization: `Bearer ${this.secretKey}` } }
            );

            const transferId = response.data?.data?.id?.toString() || response.data?.data?.reference || transferPayload.reference;
            logger.info({ transferId, amount, currency }, 'Flutterwave transfer initiated');
            return transferId;

        } catch (error: any) {
            logger.error({ err: error }, 'Flutterwave transfer error');
            throw new Error(`Flutterwave transfer failed: ${error.response?.data?.message || error.message}`);
        }
    }
}
