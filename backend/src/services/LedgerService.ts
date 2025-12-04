import { db } from '../config/firebase';
import { ILedgerEntry } from '../models/Ledger';

class LedgerService {
    private readonly ledgerCollection = db.collection('ledger');
    private readonly walletBalancesCollection = db.collection('wallet_balances');

    async getWalletBalance(walletId: string): Promise<number> {
        const snapshot = await this.ledgerCollection.where('walletId', '==', walletId).get();
        return snapshot.docs.reduce((total, doc) => {
            const entry = doc.data() as ILedgerEntry;
            return total + (entry.type === 'credit' ? entry.amount : -entry.amount);
        }, 0);
    }

    async rebuildWalletSummary(walletId: string): Promise<void> {
        const balance = await this.getWalletBalance(walletId);
        await this.walletBalancesCollection.doc(walletId).set(
            {
                walletId,
                available: balance,
                updatedAt: new Date()
            },
            { merge: true }
        );
    }
}

export const ledgerService = new LedgerService();