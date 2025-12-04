export interface ILedgerEntry {
    id?: string;
    transactionId: string; // Groups the debit and credit entries
    walletId: string; // The wallet being debited or credited
    type: 'debit' | 'credit';
    amount: number;
    currency: 'NGN' | 'USD';
    category: 'ride_payment' | 'driver_payout' | 'wallet_topup' | 'commission_deduction' | 'refund';
    description: string;
    reference: string; // External reference (e.g., Payment Gateway Ref, Ride ID)
    createdAt: Date;
}
