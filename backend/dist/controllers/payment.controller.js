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
exports.getTransaction = exports.withdrawFromWallet = exports.addToWallet = exports.deletePaymentMethod = exports.addPaymentMethod = exports.getPaymentMethods = exports.getPaymentHistory = exports.getWalletBalance = exports.handleMonnifyWebhook = exports.handleFlutterwaveWebhook = exports.handlePaystackWebhook = exports.handleStripeWebhook = exports.verifyPayment = exports.initiatePayment = void 0;
const PaymentService_1 = require("../services/payment/PaymentService");
const WalletService_1 = require("../services/WalletService");
// Webhooks not yet implemented in PaymentService
/*
const forwardWebhook = async (gateway: string, req: Request, res: Response) => {
    try {
        // Stub
        res.status(200).json({ received: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
};
*/
const initiatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { amount, currency, metadata = {}, description, callbackUrl, captureNow = true, purpose, region, rideId } = req.body;
    const { uid, email, name, phone_number } = req.user; // Standard Firebase token claims
    try {
        const reference = (_a = req.body.reference) !== null && _a !== void 0 ? _a : `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const mergedMetadata = Object.assign(Object.assign({}, metadata), { userId: uid, riderId: uid, rideId: rideId || metadata.rideId, purpose: (_b = purpose !== null && purpose !== void 0 ? purpose : metadata.purpose) !== null && _b !== void 0 ? _b : 'wallet_topup', captureMode: captureNow ? 'auto' : 'manual' });
        const targetRegion = region || 'NG';
        const result = yield PaymentService_1.paymentService.initializePayment(targetRegion, email, // Token email
        amount, currency, reference, mergedMetadata);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error initiating payment:', error);
        res.status(500).json({ error: 'Payment initiation failed' });
    }
});
exports.initiatePayment = initiatePayment;
const verifyPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { reference, transactionId, currency, purpose, region } = req.body;
    const { uid } = req.user;
    const paymentReference = reference || transactionId;
    if (!paymentReference) {
        res.status(400).json({ error: 'Payment reference or transactionId is required' });
        return;
    }
    try {
        const targetRegion = region || 'NG';
        const verification = yield PaymentService_1.paymentService.verifyPayment(targetRegion, paymentReference);
        if (verification.success) {
            // TODO: Credit wallet or update ride status here
            // For now, just return success
        }
        res.status(200).json(verification);
    }
    catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});
exports.verifyPayment = verifyPayment;
const handleStripeWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        return res.status(400).send('Missing signature');
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
        return res.status(400).send('Raw body missing');
    }
    const result = yield PaymentService_1.paymentService.verifyWebhook('stripe', rawBody, signature);
    if (!result) {
        return res.status(400).send('Webhook Error');
    }
    if (result.success && result.status === 'success') {
        const { userId, rideId, purpose } = result.metadata || {};
        if (userId) {
            try {
                yield WalletService_1.walletService.recordEscrowDeposit({
                    reference: result.reference,
                    amount: result.amount,
                    currency: result.currency,
                    riderId: userId,
                    rideId,
                    purpose: purpose || 'wallet_topup',
                    gateway: 'stripe',
                    metadata: result.metadata
                });
            }
            catch (e) {
                console.error('Wallet deposit failed', e);
            }
        }
    }
    res.json({ received: true });
});
exports.handleStripeWebhook = handleStripeWebhook;
const handlePaystackWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const signature = req.headers['x-paystack-signature'];
    if (!signature) {
        return res.status(400).send('Missing signature');
    }
    const result = yield PaymentService_1.paymentService.verifyWebhook('paystack', req.body, signature);
    if (!result) {
        return res.status(400).send('Webhook Error');
    }
    if (result.success && result.status === 'success') {
        const { userId, rideId, purpose } = result.metadata || {};
        if (userId) {
            try {
                yield WalletService_1.walletService.recordEscrowDeposit({
                    reference: result.reference,
                    amount: result.amount,
                    currency: result.currency,
                    riderId: userId,
                    rideId,
                    purpose: purpose || 'wallet_topup',
                    gateway: 'paystack',
                    metadata: result.metadata
                });
            }
            catch (e) {
                console.error('Wallet deposit failed', e);
            }
        }
    }
    res.json({ received: true });
});
exports.handlePaystackWebhook = handlePaystackWebhook;
const handleFlutterwaveWebhook = (req, res) => res.json({ received: true }); // forwardWebhook('flutterwave', req, res);
exports.handleFlutterwaveWebhook = handleFlutterwaveWebhook;
const handleMonnifyWebhook = (req, res) => res.json({ received: true }); // forwardWebhook('monnify', req, res);
exports.handleMonnifyWebhook = handleMonnifyWebhook;
/**
 * Get wallet balance for authenticated user
 */
const getWalletBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid } = req.user;
        const currency = req.query.currency || 'NGN';
        const wallet = yield WalletService_1.walletService.getWallet(uid, currency);
        res.status(200).json({
            success: true,
            data: {
                balance: wallet.balance,
                currency: wallet.currency,
                lifetimeEarnings: wallet.lifetimeEarnings || 0,
                pendingWithdrawals: wallet.pendingWithdrawals || 0
            }
        });
    }
    catch (error) {
        console.error('Error getting wallet balance:', error);
        res.status(500).json({ error: 'Failed to get wallet balance' });
    }
});
exports.getWalletBalance = getWalletBalance;
/**
 * Get payment/transaction history
 */
const getPaymentHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid } = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { db } = require('../config/firebase');
        const countSnap = yield db.collection('transactions')
            .where('userId', '==', uid)
            .count()
            .get();
        const total = countSnap.data().count;
        const snapshot = yield db.collection('transactions')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit)
            .get();
        const transactions = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        res.status(200).json({
            success: true,
            data: transactions,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (error) {
        console.error('Error getting payment history:', error);
        res.status(500).json({ error: 'Failed to get payment history' });
    }
});
exports.getPaymentHistory = getPaymentHistory;
/**
 * Get saved payment methods
 */
const getPaymentMethods = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid } = req.user;
        const { db } = require('../config/firebase');
        const snapshot = yield db.collection('payment_methods')
            .where('userId', '==', uid)
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .get();
        const methods = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        res.status(200).json({ success: true, data: methods });
    }
    catch (error) {
        console.error('Error getting payment methods:', error);
        res.status(500).json({ error: 'Failed to get payment methods' });
    }
});
exports.getPaymentMethods = getPaymentMethods;
/**
 * Add a new payment method
 */
const addPaymentMethod = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid } = req.user;
        const { type, details, isDefault } = req.body;
        const { db } = require('../config/firebase');
        if (!type || !details) {
            res.status(400).json({ error: 'type and details are required' });
            return;
        }
        // If setting as default, unset other defaults
        if (isDefault) {
            const existing = yield db.collection('payment_methods')
                .where('userId', '==', uid)
                .where('isDefault', '==', true)
                .get();
            const batch = db.batch();
            existing.docs.forEach((doc) => {
                batch.update(doc.ref, { isDefault: false });
            });
            yield batch.commit();
        }
        const methodRef = yield db.collection('payment_methods').add({
            userId: uid,
            type,
            details,
            isDefault: isDefault || false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        res.status(201).json({
            success: true,
            data: { id: methodRef.id, type, details, isDefault: isDefault || false }
        });
    }
    catch (error) {
        console.error('Error adding payment method:', error);
        res.status(500).json({ error: 'Failed to add payment method' });
    }
});
exports.addPaymentMethod = addPaymentMethod;
/**
 * Delete a payment method
 */
const deletePaymentMethod = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid } = req.user;
        const { id } = req.params;
        const { db } = require('../config/firebase');
        const methodRef = db.collection('payment_methods').doc(id);
        const doc = yield methodRef.get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Payment method not found' });
            return;
        }
        if (doc.data().userId !== uid) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }
        yield methodRef.update({ isActive: false, deletedAt: new Date() });
        res.status(200).json({ success: true, message: 'Payment method deleted' });
    }
    catch (error) {
        console.error('Error deleting payment method:', error);
        res.status(500).json({ error: 'Failed to delete payment method' });
    }
});
exports.deletePaymentMethod = deletePaymentMethod;
/**
 * Add money to wallet
 */
const addToWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, currency, paymentMethod } = req.body;
        const { uid, email } = req.user;
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Invalid amount' });
            return;
        }
        const reference = `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        // Default to NG region for now, or infer from currency
        const region = currency === 'USD' ? 'US-CHI' : 'NG';
        const result = yield PaymentService_1.paymentService.initializePayment(region, email, amount, currency, reference, {
            purpose: 'wallet_topup',
            userId: uid,
            paymentMethod,
            captureMode: 'auto'
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        console.error('Error adding to wallet:', error);
        res.status(500).json({ error: error.message || 'Failed to add money to wallet' });
    }
});
exports.addToWallet = addToWallet;
/**
 * Withdraw from wallet
 */
const withdrawFromWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { amount, currency, bankAccountId } = req.body;
        const { uid } = req.user;
        const { db } = require('../config/firebase');
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Invalid amount' });
            return;
        }
        const wallet = yield WalletService_1.walletService.getWallet(uid, currency);
        if (wallet.balance.amount < amount) {
            res.status(400).json({ error: 'Insufficient balance' });
            return;
        }
        // Get bank details if bankAccountId provided
        let accountNumber, bankCode;
        if (bankAccountId) {
            const methodDoc = yield db.collection('payment_methods').doc(bankAccountId).get();
            if (!methodDoc.exists) {
                res.status(404).json({ error: 'Bank account not found' });
                return;
            }
            const method = methodDoc.data();
            if (method.userId !== uid) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }
            accountNumber = (_a = method.details) === null || _a === void 0 ? void 0 : _a.accountNumber;
            bankCode = (_b = method.details) === null || _b === void 0 ? void 0 : _b.bankCode;
        }
        else {
            // If no ID, expect details in body (not supported by mobile app yet but good for backend)
            accountNumber = req.body.accountNumber;
            bankCode = req.body.bankCode;
        }
        if (!accountNumber || !bankCode) {
            res.status(400).json({ error: 'Bank account details required' });
            return;
        }
        const reference = `WITHDRAW-${Date.now()}`;
        // Debit wallet immediately
        yield WalletService_1.walletService.processTransaction(uid, amount, 'debit', 'wallet_topup', // Reusing category or add 'withdrawal'
        'Wallet Withdrawal', reference, {
            walletCurrency: currency,
            metadata: { withdrawalReference: reference, bankAccountId }
        });
        // Create payout request record (reusing payout_requests collection for consistency)
        const now = new Date();
        yield db.collection('payout_requests').add({
            userId: uid,
            amount,
            currency,
            accountNumber,
            bankCode,
            reference,
            status: 'pending',
            gateway: null,
            createdAt: now,
            updatedAt: now,
            statusHistory: [{ status: 'pending', at: now, actor: uid, notes: 'Wallet withdrawal requested' }],
            metadata: { bankAccountId, source: 'wallet_withdraw' },
            payoutChannel: 'bank_transfer',
            walletCurrency: currency,
            walletId: wallet.id
        });
        res.status(200).json({ success: true, data: { reference, status: 'pending' } });
    }
    catch (error) {
        console.error('Error withdrawing from wallet:', error);
        res.status(500).json({ error: error.message || 'Failed to withdraw from wallet' });
    }
});
exports.withdrawFromWallet = withdrawFromWallet;
/**
 * Get transaction details
 */
const getTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { uid } = req.user;
        const { db } = require('../config/firebase');
        const doc = yield db.collection('transactions').doc(id).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Transaction not found' });
            return;
        }
        const data = doc.data();
        if (data.userId !== uid) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }
        res.status(200).json({ success: true, data: Object.assign({ id: doc.id }, data) });
    }
    catch (error) {
        console.error('Error getting transaction:', error);
        res.status(500).json({ error: 'Failed to get transaction' });
    }
});
exports.getTransaction = getTransaction;
//# sourceMappingURL=payment.controller.js.map