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
exports.handleMonnifyWebhook = exports.handleFlutterwaveWebhook = exports.handlePaystackWebhook = exports.handleStripeWebhook = exports.verifyPayment = exports.initiatePayment = void 0;
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
    const { amount, currency, metadata = {}, description, callbackUrl, captureNow = true, purpose, region } = req.body;
    const { uid, email, name, phone_number } = req.user; // Standard Firebase token claims
    try {
        const reference = (_a = req.body.reference) !== null && _a !== void 0 ? _a : `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const mergedMetadata = Object.assign(Object.assign({}, metadata), { userId: uid, riderId: uid, purpose: (_b = purpose !== null && purpose !== void 0 ? purpose : metadata.purpose) !== null && _b !== void 0 ? _b : 'wallet_topup', captureMode: captureNow ? 'auto' : 'manual' });
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
    const { reference, currency, purpose, region } = req.body;
    const { uid } = req.user;
    try {
        const targetRegion = region || 'NG';
        const verification = yield PaymentService_1.paymentService.verifyPayment(targetRegion, reference);
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
//# sourceMappingURL=payment.controller.js.map