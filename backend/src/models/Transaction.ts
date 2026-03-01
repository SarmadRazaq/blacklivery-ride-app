export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'pending' | 'success' | 'failed';
export type TransactionCategory =
    | 'ride_payment'
    | 'commission'
    | 'payout'
    | 'topup'
    | 'bonus'
    | 'driver_payout'
    | 'wallet_topup'
    | 'commission_deduction'
    | 'refund'
    | 'escrow_deposit'
    | 'escrow_release'
    | 'micro_deduction'
    | 'subscription_fee';

export interface ITransaction {
    id?: string;
    walletId: string;
    amount: number;
    currency: 'NGN' | 'USD';
    type: TransactionType;
    status: TransactionStatus;
    category: TransactionCategory;
    reference?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt?: Date;
}
