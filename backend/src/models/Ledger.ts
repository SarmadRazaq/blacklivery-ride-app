export type LedgerCategory =
    | 'ride_payment'
    | 'driver_payout'
    | 'wallet_topup'
    | 'commission_deduction'
    | 'refund'
    | 'escrow_deposit'
    | 'escrow_release'
    | 'micro_deduction'
    | 'subscription_fee';

export interface ILedgerEntry {
    id?: string;
    transactionId: string;
    walletId: string;
    type: 'debit' | 'credit';
    amount: number;
    currency: 'NGN' | 'USD';
    category: LedgerCategory;
    description: string;
    reference: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}
