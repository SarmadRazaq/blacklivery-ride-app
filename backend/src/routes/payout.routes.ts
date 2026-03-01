import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/roles.middleware';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validate } from '../middlewares/validate.middleware';
import { requestPayoutSchema } from '../schemas/payout.schema';
import { requestPayout, getBanks, approvePayout, retryPayout, monnifyWebhook, stripeConnectWebhook, createStripeConnectAccount, getPayoutHistory, verifyAccount } from '../controllers/payout.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payouts
 *   description: Driver Payout Management
 */

/**
 * @swagger
 * /payouts/webhooks/monnify:
 *   post:
 *     summary: Monnify Payout Webhook
 *     tags: [Payouts]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhooks/monnify', monnifyWebhook);

/**
 * @swagger
 * /payouts/webhooks/stripe:
 *   post:
 *     summary: Stripe Connect Webhook
 *     tags: [Payouts]
 *     description: Handles Stripe Connect events (account.updated, transfer.reversed, payout.failed)
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhooks/stripe', stripeConnectWebhook);

/**
 * @swagger
 * /payouts/request:
 *   post:
 *     summary: Request a payout
 *     tags: [Payouts]
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
 *     responses:
 *       200:
 *         description: Payout requested
 */
router.post('/request', verifyToken, checkRole(['driver']), validate(requestPayoutSchema), idempotency, requestPayout);

/**
 * @swagger
 * /payouts/onboarding/stripe:
 *   post:
 *     summary: Create Stripe Connect Account
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stripe account created
 */
router.post('/onboarding/stripe', verifyToken, checkRole(['driver']), createStripeConnectAccount);

/**
 * @swagger
 * /payouts/banks:
 *   get:
 *     summary: Get available banks
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of banks
 */
router.get('/banks', verifyToken, getBanks);

/**
 * @swagger
 * /payouts/account/verify:
 *   post:
 *     summary: Verify bank account details
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountNumber:
 *                 type: string
 *               bankCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account details resolved
 */
router.post('/account/verify', verifyToken, verifyAccount);

/**
 * @swagger
 * /payouts/{id}/approve:
 *   post:
 *     summary: Approve a payout request
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Payout ID
 *     responses:
 *       200:
 *         description: Payout approved
 */
router.post('/:id/approve', verifyToken, checkRole(['admin']), approvePayout);

/**
 * @swagger
 * /payouts/{id}/retry:
 *   post:
 *     summary: Retry a failed payout (admin only, max 3 retries)
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Payout ID
 *     responses:
 *       200:
 *         description: Payout retry initiated
 *       400:
 *         description: Not failed or max retries reached
 *       404:
 *         description: Payout not found
 */
router.post('/:id/retry', verifyToken, checkRole(['admin']), retryPayout);

/**
 * @swagger
 * /payouts:
 *   get:
 *     summary: Get payout history for driver
 *     tags: [Payouts]
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
 *         description: Payout history
 */
router.get('/', verifyToken, checkRole(['driver']), getPayoutHistory);

export default router;
