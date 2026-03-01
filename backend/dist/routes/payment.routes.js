"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const payment_controller_1 = require("../controllers/payment.controller");
const router = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment Processing
 */
/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment initiated
 */
router.post('/initiate', auth_middleware_1.verifyToken, payment_controller_1.initiatePayment);
/**
 * @swagger
 * /payments/verify:
 *   post:
 *     summary: Verify a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified
 */
router.post('/verify', auth_middleware_1.verifyToken, payment_controller_1.verifyPayment);
// public webhooks
/**
 * @swagger
 * /payments/webhooks/stripe:
 *   post:
 *     summary: Stripe Webhook
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhooks/stripe', payment_controller_1.handleStripeWebhook);
/**
 * @swagger
 * /payments/webhooks/paystack:
 *   post:
 *     summary: Paystack Webhook
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhooks/paystack', payment_controller_1.handlePaystackWebhook);
/**
 * @swagger
 * /payments/webhooks/flutterwave:
 *   post:
 *     summary: Flutterwave Webhook
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhooks/flutterwave', payment_controller_1.handleFlutterwaveWebhook);
/**
 * @swagger
 * /payments/webhooks/monnify:
 *   post:
 *     summary: Monnify Webhook
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhooks/monnify', payment_controller_1.handleMonnifyWebhook);
/**
 * @swagger
 * /payments/wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [NGN, USD]
 *     responses:
 *       200:
 *         description: Wallet balance
 */
router.get('/wallet/balance', auth_middleware_1.verifyToken, payment_controller_1.getWalletBalance);
/**
 * @swagger
 * /payments/history:
 *   get:
 *     summary: Get payment/transaction history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Transaction history
 */
router.get('/history', auth_middleware_1.verifyToken, payment_controller_1.getPaymentHistory);
/**
 * @swagger
 * /payments/methods:
 *   get:
 *     summary: Get saved payment methods
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment methods
 */
router.get('/methods', auth_middleware_1.verifyToken, payment_controller_1.getPaymentMethods);
/**
 * @swagger
 * /payments/methods:
 *   post:
 *     summary: Add a new payment method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               details:
 *                 type: object
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Payment method added
 */
router.post('/methods', auth_middleware_1.verifyToken, payment_controller_1.addPaymentMethod);
/**
 * @swagger
 * /payments/methods/{id}:
 *   delete:
 *     summary: Delete a payment method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Payment method deleted
 */
router.delete('/methods/:id', auth_middleware_1.verifyToken, payment_controller_1.deletePaymentMethod);
/**
 * @swagger
 * /payments/wallet/add:
 *   post:
 *     summary: Add money to wallet
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment initiated
 */
router.post('/wallet/add', auth_middleware_1.verifyToken, payment_controller_1.addToWallet);
/**
 * @swagger
 * /payments/wallet/withdraw:
 *   post:
 *     summary: Withdraw from wallet
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               bankAccountId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal requested
 */
router.post('/wallet/withdraw', auth_middleware_1.verifyToken, payment_controller_1.withdrawFromWallet);
/**
 * @swagger
 * /payments/transactions/{id}:
 *   get:
 *     summary: Get transaction details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Transaction details
 */
router.get('/transactions/:id', auth_middleware_1.verifyToken, payment_controller_1.getTransaction);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map