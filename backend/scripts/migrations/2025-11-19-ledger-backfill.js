"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../src/config/firebase");
const SYSTEM_ESCROW_WALLET_ID = 'SYSTEM_ESCROW';
function backfillLedgerFromLegacyBalances() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const walletsSnapshot = yield firebase_1.db.collection('wallets').get();
        for (const walletDoc of walletsSnapshot.docs) {
            const data = walletDoc.data();
            const legacyBalance = (_b = (_a = data.balance) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : 0;
            const legacyCurrency = (_e = (_d = (_c = data.balance) === null || _c === void 0 ? void 0 : _c.currency) !== null && _d !== void 0 ? _d : data.currency) !== null && _e !== void 0 ? _e : 'NGN';
            if (!legacyBalance) {
                yield walletDoc.ref.set({
                    currency: legacyCurrency,
                    updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                continue;
            }
            const transactionId = firebase_1.db.collection('transactions').doc().id;
            const timestamp = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
            yield firebase_1.db.runTransaction((transaction) => __awaiter(this, void 0, void 0, function* () {
                const walletBalanceRef = firebase_1.db.collection('wallet_balances').doc(walletDoc.id);
                transaction.set(walletBalanceRef, {
                    walletId: walletDoc.id,
                    currency: legacyCurrency,
                    available: legacyBalance,
                    updatedAt: timestamp
                }, { merge: true });
                const systemBalanceRef = firebase_1.db.collection('wallet_balances').doc(SYSTEM_ESCROW_WALLET_ID);
                transaction.set(systemBalanceRef, {
                    walletId: SYSTEM_ESCROW_WALLET_ID,
                    currency: legacyCurrency,
                    available: firebase_admin_1.default.firestore.FieldValue.increment(-legacyBalance),
                    updatedAt: timestamp
                }, { merge: true });
                const ledgerRefCredit = firebase_1.db.collection('ledger').doc();
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
                const ledgerRefDebit = firebase_1.db.collection('ledger').doc();
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
                    balance: firebase_admin_1.default.firestore.FieldValue.delete(),
                    updatedAt: timestamp
                });
            }));
        }
    });
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
//# sourceMappingURL=2025-11-19-ledger-backfill.js.map