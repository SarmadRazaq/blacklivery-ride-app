import axios from 'axios';
import crypto from 'crypto';
import { IPaymentProvider, PaymentInitResult, PaymentVerificationResult } from '../IPaymentProvider';

export class MonnifyProvider implements IPaymentProvider {
    private readonly baseUrl = process.env.MONNIFY_BASE_URL ?? 'https://api.monnify.com';
    private readonly contractCode = process.env.MONNIFY_CONTRACT_CODE ?? '';
    private readonly apiKey = process.env.MONNIFY_API_KEY ?? '';
    private readonly apiSecret = process.env.MONNIFY_API_SECRET ?? '';

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
        try {
            const token = await this.getAuthToken();
            const payload = {
                amount,
                customerName: metadata?.customerName || 'Customer',
                customerEmail: email,
                paymentReference: reference,
                paymentDescription: metadata?.description || 'Blacklivery Ride',
                currencyCode: currency,
                contractCode: this.contractCode,
                redirectUrl: process.env.MONNIFY_CALLBACK_URL,
                metadata
            };

            const { data } = await axios.post(`${this.baseUrl}/api/v1/merchant/transactions/init-transaction`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return {
                reference,
                authorizationUrl: data?.responseBody?.checkoutUrl
            };
        } catch (error: any) {
            console.error('Monnify init error:', error.response?.data || error.message);
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
        const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const computed = crypto.createHmac('sha512', this.apiSecret).update(raw).digest('hex');

        if (computed !== signature) return null;

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
        // Monnify doesn't strictly use "recipient codes" like Paystack.
        // We can return a JSON string of the details to be used in transfer
        return JSON.stringify({ name, accountNumber, bankCode });
    }

    async transfer(recipientCode: string, amount: number, currency: string, reason: string): Promise<string> {
        try {
            const recipient = JSON.parse(recipientCode);
            const token = await this.getAuthToken();

            const payload = {
                amount,
                reference: `TRF-${Date.now()}`, // Generate a unique ref
                narration: reason,
                destinationBankCode: recipient.bankCode,
                destinationAccountNumber: recipient.accountNumber,
                currency,
                sourceAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT_NUMBER, // Required for Monnify disbursements
                destinationAccountName: recipient.name
            };

            const { data } = await axios.post(`${this.baseUrl}/api/v2/disbursements/single`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return data?.responseBody?.reference;
        } catch (error: any) {
            console.error('Monnify transfer error:', error.response?.data || error.message);
            throw new Error('Transfer failed');
        }
    }
}
