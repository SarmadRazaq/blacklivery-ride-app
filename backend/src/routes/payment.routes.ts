import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
    initiatePaymentSchema,
    verifyPaymentSchema,
    addWalletSchema,
    withdrawWalletSchema,
    addPaymentMethodSchema,
    walletChargeRideSchema
} from '../schemas/payment.schema';
import {
    initiatePayment,
    verifyPayment,
    chargeRideWithWallet,
    handleStripeWebhook,
    handlePaystackWebhook,
    handleFlutterwaveWebhook,
    handleMonnifyWebhook,
    getWalletBalance,
    getPaymentHistory,
    getPaymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    addToWallet,
    withdrawFromWallet,
    requestWalletRefund,
    getTransaction
} from '../controllers/payment.controller';

const router = express.Router();

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
router.post('/initiate', verifyToken, validate(initiatePaymentSchema), idempotency, initiatePayment);

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
router.post('/verify', verifyToken, validate(verifyPaymentSchema), idempotency, verifyPayment);

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
router.post('/webhooks/stripe', handleStripeWebhook);

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
router.post('/webhooks/paystack', handlePaystackWebhook);

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
router.post('/webhooks/flutterwave', handleFlutterwaveWebhook);

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
router.post('/webhooks/monnify', handleMonnifyWebhook);

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
router.get('/wallet/balance', verifyToken, getWalletBalance);

/**
 * @swagger
 * /payments/wallet/transactions:
 *   get:
 *     summary: Get wallet transaction history
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
 *         description: Wallet transaction history
 */
router.get('/wallet/transactions', verifyToken, getPaymentHistory);

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
router.get('/history', verifyToken, getPaymentHistory);

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
router.get('/methods', verifyToken, getPaymentMethods);

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
router.post('/methods', verifyToken, validate(addPaymentMethodSchema), idempotency, addPaymentMethod);

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
router.delete('/methods/:id', verifyToken, deletePaymentMethod);

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
router.post('/wallet/add', verifyToken, validate(addWalletSchema), idempotency, addToWallet);

/**
 * @swagger
 * /payments/wallet/charge-ride:
 *   post:
 *     summary: Charge rider's wallet for a completed ride (wallet payment method)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rideId, amount]
 *             properties:
 *               rideId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 enum: [NGN, USD]
 *     responses:
 *       200:
 *         description: Wallet charged, escrow hold created
 *       400:
 *         description: Insufficient balance or invalid amount
 *       404:
 *         description: Ride not found
 */
router.post('/wallet/charge-ride', verifyToken, validate(walletChargeRideSchema), idempotency, chargeRideWithWallet);

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
router.post('/wallet/withdraw', verifyToken, validate(withdrawWalletSchema), idempotency, withdrawFromWallet);

/**
 * @swagger
 * /payments/wallet/refund:
 *   post:
 *     summary: Request a refund for a wallet top-up
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reference, reason]
 *             properties:
 *               reference:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Refund request submitted
 *       400:
 *         description: Invalid request or refund window expired
 *       404:
 *         description: Transaction not found
 *       409:
 *         description: Refund request already exists
 */
router.post('/wallet/refund', verifyToken, idempotency, requestWalletRefund);

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
router.get('/transactions/:id', verifyToken, getTransaction);

export default router;
