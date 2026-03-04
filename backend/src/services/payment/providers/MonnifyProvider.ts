import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../../utils/logger';
import { IPaymentProvider, PaymentInitResult, PaymentVerificationResult } from '../IPaymentProvider';

export class MonnifyProvider implements IPaymentProvider {
    private readonly baseUrl = process.env.MONNIFY_BASE_URL ?? 'https://api.monnify.com';
    private readonly contractCode = process.env.MONNIFY_CONTRACT_CODE ?? '';
    private readonly apiKey = process.env.MONNIFY_API_KEY ?? '';
    private readonly apiSecret = process.env.MONNIFY_SECRET_KEY ?? '';

    private async getAuthToken(): Promise<string> {
        const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
        const { data } = await axios.post(
            `${this.baseUrl}/api/v1/auth/login`,
            {},
            { headers: { Authorization: `Basic ${credentials}` } }
        );
        return data?.responseBody?.accessToken;
    }

    async initializeTransaction(email: string, amount: number, currency: string, reference: string, metadata?: any): Promise<PaymentInitResult> {
        const { sdkMode, ...cleanMeta } = metadata || {};
        try {
            const token = await this.getAuthToken();
            const payload = {
                amount,
                customerName: cleanMeta?.customerName || 'Customer',
                customerEmail: email,
                paymentReference: reference,
                paymentDescription: cleanMeta?.description || 'Blacklivery Ride',
                currencyCode: currency,
                contractCode: this.contractCode,
                redirectUrl: process.env.MONNIFY_CALLBACK_URL,
                metadata: cleanMeta
            };

            const { data } = await axios.post(`${this.baseUrl}/api/v1/merchant/transactions/init-transaction`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return {
                reference,
                authorizationUrl: data?.responseBody?.checkoutUrl
            };
        } catch (error: any) {
            logger.error({ err: error }, 'Monnify init error');
            throw new Error('Payment initialization failed');
        }
    }

    async verifyTransaction(reference: string): Promise<PaymentVerificationResult> {
        try {
            const token = await this.getAuthToken();
            const { data } = await axios.get(`${this.baseUrl}/api/v1/merchant/transactions/query?paymentReference=${reference}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const response = data?.responseBody;
            return {
                success: response?.paymentStatus?.toLowerCase() === 'paid',
                amount: Number(response?.amountPaid ?? 0),
                currency: response?.currencyCode ?? 'NGN',
                reference,
                status: response?.paymentStatus?.toLowerCase() === 'paid' ? 'success' : 'failed',
                gateway: 'monnify',
                metadata: response?.metaData
            };
        } catch (error) {
            return {
                success: false,
                amount: 0,
                currency: '',
                reference,
                status: 'failed',
                gateway: 'monnify'
            };
        }
    }

    async verifyWebhook(payload: any, signature: string): Promise<PaymentVerificationResult | null> {
        const webhookSecret = process.env.MONNIFY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('MONNIFY_WEBHOOK_SECRET is not configured');
        }
        const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const computed = crypto.createHmac('sha512', webhookSecret).update(raw).digest('hex');

        const computedBuf = Buffer.from(computed, 'hex');
        const sigBuf = Buffer.from(signature, 'hex');
        if (computedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(computedBuf, sigBuf)) return null;

        const eventData = typeof payload === 'string' ? JSON.parse(payload) : payload;
        // Monnify webhook structure might vary, assuming standard event
        if (eventData.eventType === 'SUCCESSFUL_TRANSACTION') {
            const data = eventData.eventData;
            return {
                success: true,
                amount: data.amountPaid,
                currency: data.currency,
                reference: data.paymentReference,
                status: 'success',
                gateway: 'monnify',
                metadata: data.metaData
            };
        }
        return null;
    }

    async createRecipient(name: string, accountNumber: string, bankCode: string): Promise<string> {
        if (!accountNumber || !bankCode) {
            throw new Error('accountNumber and bankCode are required');
        }
        // Validate account exists via Monnify account resolution
        try {
            const token = await this.getAuthToken();
            await axios.get(
                `${this.baseUrl}/api/v1/disbursements/account/validate?accountNumber=${accountNumber}&bankCode=${bankCode}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error: any) {
            logger.error({ err: error }, 'Monnify account validation failed');
            throw new Error('Invalid bank account details');
        }
        return JSON.stringify({ name, accountNumber, bankCode });
    }

    async transfer(recipientCode: string, amount: number, currency: string, reason: string, reference?: string): Promise<string> {
        try {
            const recipient = JSON.parse(recipientCode);
            if (!recipient.accountNumber || !recipient.bankCode || !recipient.name) {
                throw new Error('Invalid recipient data');
            }
            const token = await this.getAuthToken();

            const payload = {
                amount,
                reference: reference || `TRF-${Date.now()}`,
                narration: reason,
                destinationBankCode: recipient.bankCode,
                destinationAccountNumber: recipient.accountNumber,
                currency,
                sourceAccountNumber: process.env.MONNIFY_SOURCE_ACCOUNT,
                destinationAccountName: recipient.name
            };

            const { data } = await axios.post(`${this.baseUrl}/api/v2/disbursements/single`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return data?.responseBody?.reference;
        } catch (error: any) {
            logger.error({ err: error }, 'Monnify transfer error');
            throw new Error('Transfer failed');
        }
    }
}
