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
exports.getPayoutHistory = exports.monnifyWebhook = exports.getBanks = exports.approvePayout = exports.createStripeConnectAccount = exports.requestPayout = void 0;
const WalletService_1 = require("../services/WalletService");
const PaymentService_1 = require("../services/payment/PaymentService");
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
let paymentsConfigCache = null;
const getPaymentsConfig = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (paymentsConfigCache && paymentsConfigCache.expiresAt > Date.now()) {
        return paymentsConfigCache.data;
    }
    const snapshot = yield firebase_1.db.collection('config').doc('payments').get();
    const data = (_a = snapshot.data()) !== null && _a !== void 0 ? _a : {};
    paymentsConfigCache = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
    return data;
});
const appendHistory = (history, entry) => [...(history !== null && history !== void 0 ? history : []), entry];
const requestPayout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const { uid } = req.user;
    const rawCurrency = ((_a = req.body.currency) !== null && _a !== void 0 ? _a : 'NGN').toString().toUpperCase();
    const currency = (['NGN', 'USD'].includes(rawCurrency) ? rawCurrency : 'NGN');
    const amount = Number(req.body.amount);
    let accountNumber = req.body.accountNumber;
    let bankCode = req.body.bankCode;
    const bankAccountId = req.body.bankAccountId;
    if (bankAccountId) {
        const methodDoc = yield firebase_1.db.collection('payment_methods').doc(bankAccountId).get();
        if (methodDoc.exists && ((_b = methodDoc.data()) === null || _b === void 0 ? void 0 : _b.userId) === uid) {
            const details = (_c = methodDoc.data()) === null || _c === void 0 ? void 0 : _c.details;
            accountNumber = details === null || details === void 0 ? void 0 : details.accountNumber;
            bankCode = details === null || details === void 0 ? void 0 : details.bankCode;
        }
    }
    try {
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid payout amount' });
        }
        const config = yield getPaymentsConfig();
        const minimum = (_e = (_d = config.payoutMinimums) === null || _d === void 0 ? void 0 : _d[currency]) !== null && _e !== void 0 ? _e : 0;
        if (amount < minimum) {
            return res.status(400).json({ error: `Minimum payout for ${currency} is ${minimum}` });
        }
        const wallet = yield WalletService_1.walletService.getWallet(uid, currency);
        if (wallet.balance.amount < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        const userDoc = yield firebase_1.db.collection('users').doc(uid).get();
        const userData = (_f = userDoc.data()) !== null && _f !== void 0 ? _f : {};
        const stripeConnectAccountId = (_l = (_j = (_g = userData.stripeConnectAccountId) !== null && _g !== void 0 ? _g : (_h = userData.payouts) === null || _h === void 0 ? void 0 : _h.stripeConnectAccountId) !== null && _j !== void 0 ? _j : (_k = userData.driverProfile) === null || _k === void 0 ? void 0 : _k.stripeConnectAccountId) !== null && _l !== void 0 ? _l : null;
        if (currency === 'USD' && !stripeConnectAccountId) {
            return res.status(400).json({ error: 'Stripe Connect account required for USD payouts' });
        }
        if (currency === 'NGN' && (!accountNumber || !bankCode)) {
            return res.status(400).json({ error: 'Bank account number and bank code are required' });
        }
        const reference = `PAYOUT-${Date.now()}`;
        yield WalletService_1.walletService.processTransaction(uid, amount, 'debit', 'driver_payout', 'Payout Request Hold', reference, {
            walletCurrency: currency,
            metadata: { payoutReference: reference, payoutChannel: currency === 'USD' ? 'stripe_connect' : 'bank_transfer' }
        });
        const now = new Date();
        const payoutRequest = {
            userId: uid,
            amount,
            currency,
            accountNumber: currency === 'USD' ? null : accountNumber,
            bankCode: currency === 'USD' ? null : bankCode,
            reference,
            status: 'pending',
            gateway: null,
            retryCount: 0,
            createdAt: now,
            updatedAt: now,
            statusHistory: [
                {
                    status: 'pending',
                    at: now,
                    actor: uid,
                    notes: 'Payout requested'
                }
            ],
            metadata: {
                accountName: req.body.accountName,
                minimumPayout: minimum
            },
            payoutChannel: currency === 'USD' ? 'stripe_connect' : 'bank_transfer',
            stripeConnectAccountId: stripeConnectAccountId !== null && stripeConnectAccountId !== void 0 ? stripeConnectAccountId : null,
            walletCurrency: currency,
            walletId: wallet.id
        };
        const docRef = yield firebase_1.db.collection('payout_requests').add(payoutRequest);
        res.status(201).json({
            message: 'Payout request submitted for approval',
            requestId: docRef.id,
            reference
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Payout request failed');
        res.status(500).json({ error: 'Payout failed', details: error.message });
    }
});
exports.requestPayout = requestPayout;
const createStripeConnectAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid, displayName } = req.user;
    try {
        const userDoc = yield firebase_1.db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        let accountId = userData === null || userData === void 0 ? void 0 : userData.stripeConnectAccountId;
        if (!accountId) {
            // Create account
            accountId = yield PaymentService_1.paymentService.createRecipient('US-CHI', displayName || 'Driver', '', '');
            // Save account ID
            yield userDoc.ref.update({ stripeConnectAccountId: accountId });
        }
        // Generate link
        // Hardcoded return URLs for now, should be from config
        const link = yield PaymentService_1.paymentService.generateOnboardingLink('US-CHI', accountId, `${process.env.FRONTEND_URL}/payouts/refresh`, `${process.env.FRONTEND_URL}/payouts/success`);
        res.status(200).json({ url: link });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Stripe Connect onboarding failed');
        res.status(500).json({ error: error.message });
    }
});
exports.createStripeConnectAccount = createStripeConnectAccount;
const approvePayout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params; // Payout Request ID (or Transaction Reference)
    const { approved } = req.body; // true to approve, false to reject
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
    }
    try {
        const payoutRef = firebase_1.db.collection('payout_requests').doc(id);
        const payoutDoc = yield payoutRef.get();
        if (!payoutDoc.exists) {
            return res.status(404).json({ error: 'Payout request not found' });
        }
        const payout = payoutDoc.data();
        if (!payout || payout.status !== 'pending') {
            return res.status(400).json({ error: 'Payout already processed' });
        }
        const currency = ((_a = payout.currency) !== null && _a !== void 0 ? _a : 'NGN').toUpperCase();
        if (currency === 'USD' && !payout.stripeConnectAccountId) {
            return res.status(400).json({ error: 'Missing Stripe Connect account for USD payout' });
        }
        if (!approved) {
            yield WalletService_1.walletService.processTransaction(payout.userId, payout.amount, 'credit', 'refund', 'Payout Rejected Refund', `REF-${payout.reference}`, {
                walletCurrency: currency,
                metadata: { payoutReference: payout.reference, action: 'rejected' }
            });
            yield payoutRef.update({
                status: 'rejected',
                rejectedAt: new Date(),
                rejectedBy: req.user.uid,
                updatedAt: new Date(),
                statusHistory: appendHistory(payout.statusHistory, {
                    status: 'rejected',
                    at: new Date(),
                    actor: req.user.uid,
                    notes: 'Payout rejected'
                })
            });
            return res.status(200).json({ message: 'Payout rejected and refunded' });
        }
        const userDoc = yield firebase_1.db.collection('users').doc(payout.userId).get();
        const userData = userDoc.data();
        const fullName = (_b = userData === null || userData === void 0 ? void 0 : userData.displayName) !== null && _b !== void 0 ? _b : 'Blacklivery Driver';
        try {
            const region = currency === 'USD' ? 'US-CHI' : 'NG';
            let recipientCode = payout.recipientCode;
            if (!recipientCode) {
                if (currency === 'NGN' && payout.accountNumber && payout.bankCode) {
                    recipientCode = yield PaymentService_1.paymentService.createRecipient(region, fullName, payout.accountNumber, payout.bankCode);
                }
                else if (currency === 'USD' && payout.stripeConnectAccountId) {
                    recipientCode = payout.stripeConnectAccountId;
                }
                else {
                    throw new Error('Missing recipient details');
                }
            }
            const transferId = yield PaymentService_1.paymentService.transferFunds(region, recipientCode, payout.amount, currency, 'Payout');
            yield payoutRef.update({
                status: 'processing',
                gateway: currency === 'USD' ? 'stripe' : 'paystack',
                processingStartedAt: new Date(),
                approvedAt: new Date(),
                approvedBy: req.user.uid,
                updatedAt: new Date(),
                recipientCode,
                gatewayResponse: { id: transferId },
                statusHistory: appendHistory(payout.statusHistory, {
                    status: 'processing',
                    at: new Date(),
                    actor: req.user.uid,
                    notes: `Payout initiated: ${transferId}`
                })
            });
            return res.status(200).json({ message: 'Payout approved; transfer initiated', transferId });
        }
        catch (error) {
            logger_1.logger.error({ err: error, payoutId: id }, 'Failed to initiate payout');
            yield WalletService_1.walletService.processTransaction(payout.userId, payout.amount, 'credit', 'refund', 'Payout initiation refund', `REF-${payout.reference}`, {
                walletCurrency: currency,
                metadata: { payoutReference: payout.reference, action: 'gateway_failed' }
            });
            yield payoutRef.update({
                status: 'failed',
                failedAt: new Date(),
                failureReason: error.message,
                updatedAt: new Date(),
                statusHistory: appendHistory(payout.statusHistory, {
                    status: 'failed',
                    at: new Date(),
                    actor: req.user.uid,
                    notes: `Gateway initiation failed: ${error.message}`
                })
            });
            return res.status(500).json({ error: 'Payout initiation failed', details: error.message });
        }
    }
    catch (error) {
        logger_1.logger.error({ err: error, payoutId: req.params.id }, 'Payout approval error');
        res.status(500).json({ error: 'Failed to approve payout', details: error.message });
    }
});
exports.approvePayout = approvePayout;
const getBanks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json([
        { code: '044', name: 'Access Bank' },
        { code: '058', name: 'GTBank' },
        { code: '033', name: 'UBA' }
    ]);
});
exports.getBanks = getBanks;
const monnifyWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    const signature = req.headers['monnify-signature'];
    if (!signature || signature !== process.env.MONNIFY_WEBHOOK_SECRET) {
        return res.status(403).json({ message: 'Invalid signature' });
    }
    const event = req.body;
    const reference = (_a = event === null || event === void 0 ? void 0 : event.eventData) === null || _a === void 0 ? void 0 : _a.transactionReference;
    if (!reference) {
        return res.status(400).json({ message: 'Missing reference' });
    }
    const payoutSnapshot = yield firebase_1.db.collection('payout_requests').where('reference', '==', reference).limit(1).get();
    if (payoutSnapshot.empty) {
        return res.status(404).json({ message: 'Payout not found' });
    }
    const payoutDoc = payoutSnapshot.docs[0];
    const payout = payoutDoc.data();
    const history = (_b = payout === null || payout === void 0 ? void 0 : payout.statusHistory) !== null && _b !== void 0 ? _b : [];
    const now = new Date();
    if (event.eventType === 'SUCCESSFUL_DISBURSEMENT') {
        yield payoutDoc.ref.update({
            status: 'completed',
            completedAt: now,
            updatedAt: now,
            gatewayResponse: event,
            statusHistory: appendHistory(history, {
                status: 'completed',
                at: now,
                actor: 'monnify_webhook',
                notes: 'Payout completed'
            })
        });
        logger_1.logger.info({ reference }, 'Payout completed via Monnify');
    }
    else if (event.eventType === 'FAILED_DISBURSEMENT') {
        const retryCount = ((_c = payout.retryCount) !== null && _c !== void 0 ? _c : 0) + 1;
        yield payoutDoc.ref.update({
            status: 'failed',
            failedAt: now,
            failureReason: (_d = event.eventData) === null || _d === void 0 ? void 0 : _d.failureReason,
            retryCount,
            needsAttention: true,
            updatedAt: now,
            gatewayResponse: event,
            statusHistory: appendHistory(history, {
                status: 'failed',
                at: now,
                actor: 'monnify_webhook',
                notes: `Gateway failure: ${(_e = event.eventData) === null || _e === void 0 ? void 0 : _e.failureReason}`
            })
        });
        yield WalletService_1.walletService.processTransaction(payout.userId, payout.amount, 'credit', 'refund', 'Payout failure refund', `REF-${reference}`, {
            walletCurrency: ((_f = payout.currency) !== null && _f !== void 0 ? _f : 'NGN').toUpperCase(),
            metadata: { payoutReference: reference, action: 'webhook_failed' }
        });
        logger_1.logger.error({
            reference,
            failureReason: (_g = event.eventData) === null || _g === void 0 ? void 0 : _g.failureReason,
            retryCount
        }, 'Monnify payout failed; wallet refunded');
    }
    res.status(200).json({ received: true });
});
exports.monnifyWebhook = monnifyWebhook;
/**
 * Get payout history for authenticated driver
 */
const getPayoutHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid } = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const countSnap = yield firebase_1.db.collection('payouts')
            .where('driverId', '==', uid)
            .count()
            .get();
        const total = countSnap.data().count;
        const snapshot = yield firebase_1.db.collection('payouts')
            .where('driverId', '==', uid)
            .orderBy('requestedAt', 'desc')
            .offset(offset)
            .limit(limit)
            .get();
        const payouts = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        res.status(200).json({
            success: true,
            data: payouts,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Error getting payout history');
        res.status(500).json({ error: 'Failed to get payout history' });
    }
});
exports.getPayoutHistory = getPayoutHistory;
//# sourceMappingURL=payout.controller.js.map