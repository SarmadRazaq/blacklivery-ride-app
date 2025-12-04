import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import {
    initiatePayment,
    verifyPayment,
    handleStripeWebhook,
    handlePaystackWebhook,
    handleFlutterwaveWebhook,
    handleMonnifyWebhook
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
router.post('/initiate', verifyToken, initiatePayment);

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
router.post('/verify', verifyToken, verifyPayment);

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

export default router;
