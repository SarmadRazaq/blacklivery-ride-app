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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerService = void 0;
const firebase_1 = require("../config/firebase");
class LedgerService {
    constructor() {
        this.ledgerCollection = firebase_1.db.collection('ledger');
        this.walletBalancesCollection = firebase_1.db.collection('wallet_balances');
    }
    getWalletBalance(walletId) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.ledgerCollection.where('walletId', '==', walletId).get();
            return snapshot.docs.reduce((total, doc) => {
                const entry = doc.data();
                return total + (entry.type === 'credit' ? entry.amount : -entry.amount);
            }, 0);
        });
    }
    rebuildWalletSummary(walletId) {
        return __awaiter(this, void 0, void 0, function* () {
            const balance = yield this.getWalletBalance(walletId);
            yield this.walletBalancesCollection.doc(walletId).set({
                walletId,
                available: balance,
                updatedAt: new Date()
            }, { merge: true });
        });
    }
}
exports.ledgerService = new LedgerService();
//# sourceMappingURL=LedgerService.js.map