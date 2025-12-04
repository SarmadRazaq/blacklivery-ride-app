export interface IWallet {
    id?: string;
    userId: string;
    currency: 'NGN' | 'USD';
    createdAt: Date;
    updatedAt: Date;
}

export interface IWalletWithBalance extends IWallet {
    balance: {
        amount: number;
        currency: 'NGN' | 'USD';
    };
}
