export interface IWalletBalance {
    walletId: string;
    available: number;
    currency: 'NGN' | 'USD';
    updatedAt: Date;
}