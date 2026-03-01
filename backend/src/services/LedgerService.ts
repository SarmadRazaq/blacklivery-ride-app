import { db } from '../config/firebase';
import { ILedgerEntry } from '../models/Ledger';
import { logger } from '../utils/logger';

class LedgerService {
    private readonly ledgerCollection = db.collection('ledger');
    private readonly walletBalancesCollection = db.collection('wallet_balances');

    /**
     * Get wallet balance from the cached wallet_balances collection.
     * Falls back to full ledger scan only if cached balance is missing.
     */
    async getWalletBalance(walletId: string): Promise<number> {
        // Fast path: read from the pre-computed balance document
        const balanceDoc = await this.walletBalancesCollection.doc(walletId).get();
        if (balanceDoc.exists) {
            return (balanceDoc.data()?.available as number) ?? 0;
        }

        // Slow path fallback: compute from ledger entries
        logger.warn({ walletId }, 'No cached balance found, computing from ledger (slow)');
        const computed = await this.computeBalanceFromLedger(walletId);

        // Persist computed balance for future reads
        await this.walletBalancesCollection.doc(walletId).set(
            { walletId, available: computed, updatedAt: new Date() },
            { merge: true }
        );

        return computed;
    }

    private async computeBalanceFromLedger(walletId: string): Promise<number> {
        // Paginate to avoid OOM on high-volume wallets
        const PAGE_SIZE = 500;
        let total = 0;
        let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

        while (true) {
            let query = this.ledgerCollection
                .where('walletId', '==', walletId)
                .orderBy('createdAt')
                .limit(PAGE_SIZE);

            if (lastDoc) {
                query = query.startAfter(lastDoc);
            }

            const snapshot = await query.get();
            if (snapshot.empty) break;

            for (const doc of snapshot.docs) {
                const entry = doc.data() as ILedgerEntry;
                total += entry.type === 'credit' ? entry.amount : -entry.amount;
            }

            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            if (snapshot.docs.length < PAGE_SIZE) break;
        }

        return total;
    }

    async rebuildWalletSummary(walletId: string): Promise<void> {
        const balance = await this.computeBalanceFromLedger(walletId);
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