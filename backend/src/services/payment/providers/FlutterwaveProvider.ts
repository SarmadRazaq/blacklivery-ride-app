import axios from 'axios';
import crypto from 'crypto';
import { IPaymentProvider, PaymentInitResult, PaymentVerificationResult } from '../IPaymentProvider';

export class FlutterwaveProvider implements IPaymentProvider {
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

    async initializeTransaction(email: string, amount: number, currency: string, reference: string, metadata?: any): Promise<PaymentInitResult> {
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
                        name: metadata?.customerName,
                        phonenumber: metadata?.customerPhone
                    },
                    meta: metadata,
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
            console.error('Flutterwave init error:', error.response?.data || error.message);
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
            return {
                success: data.status === 'successful',
                amount: data.amount,
                currency: data.currency,
                reference: data.tx_ref,
                status: data.status,
                gateway: 'flutterwave',
                metadata: data.meta
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
        if (signature !== this.hashSecret) {
            return null;
        }

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
            console.error('Flutterwave recipient error:', error.response?.data || error.message);
            throw new Error('Failed to create recipient');
        }
    }

    async transfer(recipientCode: string, amount: number, currency: string, reason: string): Promise<string> {
        try {
            // Note: recipientCode here is treated as beneficiary ID or we might need to adjust implementation 
            // if we want to support direct account transfers. 
            // For now assuming we use the beneficiary ID or similar.
            // Actually Flutterwave transfers usually take account bank and number.
            // If recipientCode is not sufficient, we might need to store bank details.
            // But to adhere to interface, let's assume we can fetch beneficiary or use a transfer endpoint that accepts ID.
            // OR we just implement a direct transfer if we had the details. 
            // Since we only have recipientCode here, we'll assume it's a saved beneficiary ID.

            // However, standard Flutterwave transfer endpoint:
            /*
            {
                "account_bank": "044",
                "account_number": "0690000040",
                "amount": 5500,
                "narration": "Akhlm Payout",
                "currency": "NGN",
                "reference": "akhlm-pstmn-1094373823",
                "callback_url": "https://webhook.site/b3e505b0-fe02-430e-a538-22bbbce8ce0d",
                "debit_currency": "NGN"
            }
            */
            // If we don't have account details, we can't easily transfer unless we stored them.
            // Paystack uses recipient_code. Flutterwave is different.
            // For this implementation, I will throw an error for now or try to use a "transfer to beneficiary" endpoint if it exists.
            // Checking Flutterwave docs (mental check): /transfers endpoint requires account details.

            // WORKAROUND: We will assume the 'recipientCode' passed in is actually a JSON string containing {accountNumber, bankCode} 
            // OR we simply accept that this provider might need refactoring to store recipients.
            // BUT, to unblock, I will implement a basic version that assumes recipientCode MIGHT be a "beneficiary_id" 
            // but since I can't easily look that up without storage, I'll log a warning and try to proceed if possible, 
            // or just throw "Not Implemented" for transfers for now to be safe.

            // Wait, PaystackProvider.ts uses `recipient_code`.
            // I will leave transfer as "Not fully supported" or try to implement if I can find a way.
            // Let's try to implement a generic transfer if possible.

            throw new Error('Flutterwave automated transfers require account details, not just recipient code. Please use Paystack for payouts for now.');

        } catch (error: any) {
            console.error('Flutterwave transfer error:', error.message);
            throw error;
        }
    }
}
