export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'pending' | 'success' | 'failed';
export type TransactionCategory =
    // Active categories (written by WalletService)
    | 'ride_payment'
    | 'delivery_payment'
    | 'airport_payment'
    | 'driver_payout'
    | 'wallet_topup'
    | 'card_setup'
    | 'withdrawal'
    | 'commission_deduction'
    | 'refund'
    | 'escrow_deposit'
    | 'escrow_release'
    | 'micro_deduction'
    | 'subscription_fee'
    | 'cancellation_fee'
    // Legacy categories (kept for backward-compat with old records)
    | 'commission'
    | 'payout'
    | 'topup'
    | 'bonus';

export interface ITransaction {
    id?: string;
    walletId: string;
    userId?: string;
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
