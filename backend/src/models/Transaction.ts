export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'pending' | 'success' | 'failed';
export type TransactionCategory = 'ride_payment' | 'commission' | 'payout' | 'topup' | 'bonus';

export interface ITransaction {
    id?: string;
    walletId: string;
    amount: number;
    currency: 'NGN' | 'USD';
    type: TransactionType;
    status: TransactionStatus;
    category: TransactionCategory;
    reference?: string; // External payment reference
    description?: string;
    metadata?: any;
    createdAt: Date;
}
