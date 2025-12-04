
import axios from 'axios';
import crypto from 'crypto';
import { IPaymentStrategy, PaymentInitiateRequest, PaymentVerifyResponse } from './IPaymentStrategy';

interface MonnifyTransferRequest {
    amount: number;
    reference: string;
    narration: string;
    currencyCode: string;
    destinationAccountNumber: string;
    destinationBankCode: string;
    destinationAccountName?: string;
    customerName?: string;
    customerEmail?: string;
}

export class MonnifyStrategy implements IPaymentStrategy {
    // ...existing fields...
    private readonly disbursementUrl = 'https://sandbox.monnify.com/api/v2/disbursements/single';
    private webhookSecret: string;

    constructor() {
        // ...existing ctor...
        this.webhookSecret = process.env.MONNIFY_WEBHOOK_SECRET || '';
    }

    // ...existing initiatePayment/verifyPayment...

    async initiateTransfer(payload: MonnifyTransferRequest) {
        const token = await this.getAuthToken();
        const response = await axios.post(
            this.disbursementUrl,
            {
                amount: payload.amount,
                reference: payload.reference,
                narration: payload.narration,
                destinationAccountNumber: payload.destinationAccountNumber,
                destinationBankCode: payload.destinationBankCode,
                destinationAccountName: payload.destinationAccountName,
                currency: payload.currencyCode,
                sourceAccountNumber: process.env.MONNIFY_SOURCE_ACCOUNT,
                customerName: payload.customerName,
                customerEmail: payload.customerEmail
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    }

    private async getAuthToken(): Promise<string> {
        if (!this.apiKey || !this.apiSecret) throw new Error('Monnify API credentials missing');
        const base64 = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
        const response = await axios.post(
            'https://sandbox.monnify.com/api/v1/auth/login',
            {},
            { headers: { Authorization: `Basic ${base64}` } }
        );
        return response.data.responseBody.accessToken;
    }

    verifyWebhook(signature: string | undefined, payload: string | Buffer): boolean {
        if (!signature || !this.webhookSecret) return false;
        const raw = typeof payload === 'string' ? payload : payload.toString();
        const computed = crypto.createHmac('sha512', this.webhookSecret).update(raw).digest('hex');
        return computed === signature;
    }
}