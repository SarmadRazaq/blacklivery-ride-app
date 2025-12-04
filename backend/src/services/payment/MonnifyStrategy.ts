import axios from 'axios';
import crypto from 'crypto';
import { IPaymentStrategy, PaymentInitiateRequest, PaymentVerifyResponse } from './IPaymentStrategy';

interface PayoutRequest {
    amount: number;
    reference: string;
    narration: string;
    bankCode: string;
    accountNumber: string;
    currency: string;
    customerName: string;
    customerEmail?: string;
}

export class MonnifyStrategy implements IPaymentStrategy {
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

    async initiatePayment(request: PaymentInitiateRequest): Promise<any> {
        const token = await this.getAuthToken();
        const payload = {
            amount: request.amount,
            customerName: request.customerName,
            customerEmail: request.customerEmail,
            paymentReference: request.reference,
            paymentDescription: request.description,
            currencyCode: request.currency ?? 'NGN',
            contractCode: this.contractCode,
            redirectUrl: request.callbackUrl
        };

        const { data } = await axios.post(`${this.baseUrl}/api/v1/merchant/transactions/init-transaction`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return data?.responseBody;
    }

    async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
        const token = await this.getAuthToken();
        const { data } = await axios.get(`${this.baseUrl}/api/v1/merchant/transactions/query?paymentReference=${reference}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const response = data?.responseBody;
        return {
            status: response?.paymentStatus?.toLowerCase() === 'paid' ? 'success' : 'failed',
            reference,
            amount: Number(response?.amountPaid ?? 0),
            currency: response?.currencyCode ?? 'NGN',
            raw: response
        };
    }

    async initiatePayout(payout: PayoutRequest): Promise<any> {
        const token = await this.getAuthToken();
        const payload = {
            amount: payout.amount,
            reference: payout.reference,
            narration: payout.narration,
            destinationBankCode: payout.bankCode,
            destinationAccountNumber: payout.accountNumber,
            currency: payout.currency ?? 'NGN',
            customerName: payout.customerName,
            contractCode: this.contractCode
        };

        const { data } = await axios.post(`${this.baseUrl}/api/v2/disbursements/single`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return data?.responseBody;
    }

    async verifyPayout(reference: string): Promise<PaymentVerifyResponse> {
        const token = await this.getAuthToken();
        const { data } = await axios.get(`${this.baseUrl}/api/v2/disbursements/single/summary?reference=${reference}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const response = data?.responseBody;
        const status = response?.status?.toLowerCase();
        return {
            status: status === 'processing' || status === 'pending' ? 'pending' : status === 'success' ? 'success' : 'failed',
            reference,
            amount: Number(response?.amount ?? 0),
            currency: response?.currency ?? 'NGN',
            raw: response
        };
    }

    verifyWebhook(signature: string | undefined, payload: string | Buffer): boolean {
        if (!signature) return false;
        const raw = typeof payload === 'string' ? payload : payload.toString();
        const computed = crypto.createHmac('sha512', this.apiSecret).update(raw).digest('hex');
        return computed === signature;
    }
}

export const monnifyStrategy = new MonnifyStrategy();