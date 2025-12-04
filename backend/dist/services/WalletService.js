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
exports.walletService = exports.WalletService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../config/firebase");
const LedgerService_1 = require("./LedgerService");
const PLATFORM_ESCROW_USERS = {
    NGN: 'PLATFORM_ESCROW_NGN',
    USD: 'PLATFORM_ESCROW_USD'
};
const EXTERNAL_PROCESSOR_WALLET_ID = 'EXTERNAL_PROCESSOR_POOL';
class WalletService {
    constructor() {
        this.walletsCollection = firebase_1.db.collection('wallets');
        this.walletBalancesCollection = firebase_1.db.collection('wallet_balances');
        this.transactionsCollection = firebase_1.db.collection('transactions');
        this.ledgerCollection = firebase_1.db.collection('ledger');
        this.walletHoldsCollection = firebase_1.db.collection('wallet_holds');
    }
    getWallet(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, preferredCurrency = 'NGN') {
            const snapshot = yield this.walletsCollection.where('userId', '==', userId).limit(1).get();
            if (snapshot.empty) {
                return this.createWallet(userId, preferredCurrency);
            }
            const byCurrency = yield this.walletsCollection
                .where('userId', '==', userId)
                .where('currency', '==', preferredCurrency)
                .limit(1)
                .get();
            let walletDoc = byCurrency.docs[0];
            if (!walletDoc) {
                const fallback = yield this.walletsCollection.where('userId', '==', userId).limit(1).get();
                walletDoc = fallback.docs[0];
            }
            if (!walletDoc) {
                return this.createWallet(userId, preferredCurrency);
            }
            const wallet = Object.assign({ id: walletDoc.id }, walletDoc.data());
            const balanceAmount = yield LedgerService_1.ledgerService.getWalletBalance(wallet.id);
            return Object.assign(Object.assign({}, wallet), { balance: {
                    amount: balanceAmount,
                    currency: wallet.currency
                } });
        });
    }
    createWallet(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, currency = 'NGN') {
            const timestamp = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
            const wallet = {
                userId,
                currency,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const ref = yield this.walletsCollection.add(Object.assign(Object.assign({}, wallet), { createdAt: timestamp, updatedAt: timestamp }));
            yield this.walletBalancesCollection.doc(ref.id).set({
                walletId: ref.id,
                currency,
                available: 0,
                updatedAt: timestamp
            });
            return Object.assign(Object.assign({ id: ref.id }, wallet), { balance: { amount: 0, currency } });
        });
    }
    processTransaction(userId_1, amount_1, type_1, category_1, description_1, reference_1) {
        return __awaiter(this, arguments, void 0, function* (userId, amount, type, category, description, reference, options = {}) {
            var _a, _b;
            const wallet = yield this.getWallet(userId, (_a = options.walletCurrency) !== null && _a !== void 0 ? _a : 'NGN');
            const counterpartyWalletId = (_b = options.counterpartyWalletId) !== null && _b !== void 0 ? _b : EXTERNAL_PROCESSOR_WALLET_ID;
            const timestamp = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
            const runTx = (transaction) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f;
                const walletBalanceRef = this.walletBalancesCollection.doc(wallet.id);
                const walletBalanceSnapshot = yield transaction.get(walletBalanceRef);
                const currentBalance = walletBalanceSnapshot.exists
                    ? (_b = (_a = walletBalanceSnapshot.data()) === null || _a === void 0 ? void 0 : _a.available) !== null && _b !== void 0 ? _b : 0
                    : 0;
                if (type === 'debit' && currentBalance < amount) {
                    throw new Error('Insufficient funds');
                }
                transaction.set(walletBalanceRef, {
                    walletId: wallet.id,
                    currency: wallet.currency,
                    available: firebase_admin_1.default.firestore.FieldValue.increment(type === 'credit' ? amount : -amount),
                    updatedAt: timestamp
                }, { merge: true });
                const counterpartyCurrency = (_c = options.counterpartyCurrency) !== null && _c !== void 0 ? _c : wallet.currency;
                const counterpartyBalanceRef = this.walletBalancesCollection.doc(counterpartyWalletId);
                transaction.set(counterpartyBalanceRef, {
                    walletId: counterpartyWalletId,
                    currency: counterpartyCurrency,
                    available: firebase_admin_1.default.firestore.FieldValue.increment(type === 'credit' ? -amount : amount),
                    updatedAt: timestamp
                }, { merge: true });
                const transactionId = this.transactionsCollection.doc().id;
                transaction.set(this.transactionsCollection.doc(transactionId), {
                    walletId: wallet.id,
                    userId,
                    amount,
                    type,
                    status: 'success',
                    category,
                    reference,
                    description,
                    metadata: (_d = options.metadata) !== null && _d !== void 0 ? _d : {},
                    createdAt: timestamp
                });
                [
                    {
                        transactionId,
                        walletId: wallet.id,
                        type,
                        amount,
                        currency: wallet.currency,
                        category,
                        description,
                        reference,
                        metadata: (_e = options.metadata) !== null && _e !== void 0 ? _e : {},
                        createdAt: timestamp
                    },
                    {
                        transactionId,
                        walletId: counterpartyWalletId,
                        type: type === 'credit' ? 'debit' : 'credit',
                        amount,
                        currency: counterpartyCurrency,
                        category,
                        description: `Counter-entry for ${description}`,
                        reference,
                        metadata: (_f = options.metadata) !== null && _f !== void 0 ? _f : {},
                        createdAt: timestamp
                    }
                ].forEach((entry) => {
                    const ledgerRef = this.ledgerCollection.doc();
                    transaction.set(ledgerRef, entry);
                });
            });
            if (options.transaction) {
                yield runTx(options.transaction);
            }
            else {
                yield firebase_1.db.runTransaction(runTx);
            }
        });
    }
    recordEscrowDeposit(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const holdDoc = this.walletHoldsCollection.doc(input.reference);
            const existing = yield holdDoc.get();
            if (existing.exists) {
                return;
            }
            const platformWallet = yield this.ensurePlatformWallet(input.currency);
            yield this.processTransaction(platformWallet.userId, input.amount, 'credit', 'escrow_deposit', `Escrow deposit (${input.purpose})`, input.reference, {
                counterpartyWalletId: EXTERNAL_PROCESSOR_WALLET_ID,
                metadata: Object.assign({ gateway: input.gateway }, input.metadata)
            });
            yield holdDoc.set(Object.assign(Object.assign({}, input), { status: 'held', platformWalletId: platformWallet.id, createdAt: new Date(), updatedAt: new Date() }));
        });
    }
    captureEscrowHold(reference_1) {
        return __awaiter(this, arguments, void 0, function* (reference, options = {}) {
            return firebase_1.db.runTransaction((transaction) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                const holdRef = this.walletHoldsCollection.doc(reference);
                const holdSnap = yield transaction.get(holdRef);
                if (!holdSnap.exists) {
                    throw new Error('Escrow hold not found');
                }
                const hold = holdSnap.data();
                if (hold.status !== 'held') {
                    return (_a = hold.split) !== null && _a !== void 0 ? _a : { driverAmount: 0, commissionAmount: hold.amount };
                }
                const driverId = (_b = options.driverId) !== null && _b !== void 0 ? _b : hold.driverId;
                if (!driverId) {
                    throw new Error('DriverId required to capture escrow');
                }
                const micro = ((_c = options.microDeductions) !== null && _c !== void 0 ? _c : (_d = hold.metadata) === null || _d === void 0 ? void 0 : _d.microDeductions);
                const microFlat = (_e = micro === null || micro === void 0 ? void 0 : micro.flatFee) !== null && _e !== void 0 ? _e : 0;
                const microPercent = (_f = micro === null || micro === void 0 ? void 0 : micro.percentage) !== null && _f !== void 0 ? _f : 0;
                let microAmount = this.roundCurrency(microFlat + hold.amount * microPercent);
                if (microAmount > hold.amount) {
                    microAmount = hold.amount;
                }
                const netAfterMicro = this.roundCurrency(hold.amount - microAmount);
                const commissionRate = (_h = (_g = options.commissionRate) !== null && _g !== void 0 ? _g : hold.commissionRate) !== null && _h !== void 0 ? _h : 0.2;
                const commissionAmount = this.roundCurrency(netAfterMicro * commissionRate);
                const driverAmount = this.roundCurrency(netAfterMicro - commissionAmount);
                if (driverAmount < 0) {
                    throw new Error('Driver amount cannot be negative after deductions');
                }
                const platformWallet = yield this.ensurePlatformWallet(hold.currency);
                yield this.processTransaction(driverId, driverAmount, 'credit', 'driver_payout', `Ride payout ${(_k = (_j = options.rideId) !== null && _j !== void 0 ? _j : hold.rideId) !== null && _k !== void 0 ? _k : reference}`, reference, {
                    counterpartyWalletId: platformWallet.id,
                    metadata: Object.assign(Object.assign({ holdReference: reference, microDeductions: micro, subscription: options.subscriptionSnapshot }, hold.metadata), options.metadata),
                    transaction // Pass the transaction!
                });
                transaction.update(holdRef, {
                    status: 'captured',
                    capturedAt: new Date(),
                    split: { driverAmount, commissionAmount, microAmount },
                    updatedAt: new Date()
                });
                return { driverAmount, commissionAmount, microAmount };
            }));
        });
    }
    releaseEscrowHold(reference, reason, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const holdSnap = yield this.walletHoldsCollection.doc(reference).get();
            if (!holdSnap.exists) {
                return;
            }
            const hold = holdSnap.data();
            if (hold.status !== 'held') {
                return;
            }
            const platformWallet = yield this.ensurePlatformWallet(hold.currency);
            yield this.processTransaction(platformWallet.userId, hold.amount, 'debit', 'escrow_release', reason !== null && reason !== void 0 ? reason : `Escrow release for ${reference}`, reference, {
                counterpartyWalletId: EXTERNAL_PROCESSOR_WALLET_ID,
                metadata: Object.assign(Object.assign(Object.assign({}, hold.metadata), metadata), { releaseReason: reason })
            });
            yield this.walletHoldsCollection.doc(reference).update({
                status: 'released',
                releasedAt: new Date(),
                releaseReason: reason !== null && reason !== void 0 ? reason : 'refunded',
                updatedAt: new Date()
            });
        });
    }
    ensurePlatformWallet(currency) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = PLATFORM_ESCROW_USERS[currency];
            return this.getWallet(userId, currency);
        });
    }
    roundCurrency(amount) {
        return Math.round(amount * 100) / 100;
    }
}
exports.WalletService = WalletService;
exports.walletService = new WalletService();
//# sourceMappingURL=WalletService.js.map