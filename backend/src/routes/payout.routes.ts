import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/roles.middleware';
import { requestPayout, getBanks, approvePayout, monnifyWebhook, createStripeConnectAccount } from '../controllers/payout.controller';

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
router.post('/request', verifyToken, checkRole(['driver']), requestPayout);

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

export default router;
