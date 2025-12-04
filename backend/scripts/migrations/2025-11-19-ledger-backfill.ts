import admin from 'firebase-admin';
import { db } from '../../src/config/firebase';

const SYSTEM_ESCROW_WALLET_ID = 'SYSTEM_ESCROW';

async function backfillLedgerFromLegacyBalances(): Promise<void> {
    const walletsSnapshot = await db.collection('wallets').get();

    for (const walletDoc of walletsSnapshot.docs) {
        const data = walletDoc.data() as any;
        const legacyBalance = data.balance?.amount ?? 0;
        const legacyCurrency = data.balance?.currency ?? data.currency ?? 'NGN';

        if (!legacyBalance) {
            await walletDoc.ref.set(
                {
                    currency: legacyCurrency,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                },
                { merge: true }
            );
            continue;
        }

        const transactionId = db.collection('transactions').doc().id;
        const timestamp = admin.firestore.FieldValue.serverTimestamp();

        await db.runTransaction(async (transaction) => {
            const walletBalanceRef = db.collection('wallet_balances').doc(walletDoc.id);
            transaction.set(
                walletBalanceRef,
                {
                    walletId: walletDoc.id,
                    currency: legacyCurrency,
                    available: legacyBalance,
                    updatedAt: timestamp
                },
                { merge: true }
            );

            const systemBalanceRef = db.collection('wallet_balances').doc(SYSTEM_ESCROW_WALLET_ID);
            transaction.set(
                systemBalanceRef,
                {
                    walletId: SYSTEM_ESCROW_WALLET_ID,
                    currency: legacyCurrency,
                    available: admin.firestore.FieldValue.increment(-legacyBalance),
                    updatedAt: timestamp
                },
                { merge: true }
            );

            const ledgerRefCredit = db.collection('ledger').doc();
            transaction.set(ledgerRefCredit, {
                transactionId,
                walletId: walletDoc.id,
                type: 'credit',
                amount: legacyBalance,
                currency: legacyCurrency,
                category: 'wallet_topup',
                description: 'Opening balance migration',
                reference: `migration_${walletDoc.id}`,
                createdAt: timestamp
            });

            const ledgerRefDebit = db.collection('ledger').doc();
            transaction.set(ledgerRefDebit, {
                transactionId,
                walletId: SYSTEM_ESCROW_WALLET_ID,
                type: 'debit',
                amount: legacyBalance,
                currency: legacyCurrency,
                category: 'wallet_topup',
                description: `Counter-entry for migration_${walletDoc.id}`,
                reference: `migration_${walletDoc.id}`,
                createdAt: timestamp
            });

            transaction.update(walletDoc.ref, {
                currency: legacyCurrency,
                legacyBalance: data.balance,
                balance: admin.firestore.FieldValue.delete(),
                updatedAt: timestamp
            });
        });
    }
}

backfillLedgerFromLegacyBalances()
    .then(() => {
        console.log('Ledger migration complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Ledger migration failed', error);
        process.exit(1);
    });