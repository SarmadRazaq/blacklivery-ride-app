"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const payout_controller_1 = require("../controllers/payout.controller");
const router = (0, express_1.Router)();
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
router.post('/webhooks/monnify', payout_controller_1.monnifyWebhook);
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
router.post('/request', auth_middleware_1.verifyToken, (0, roles_middleware_1.checkRole)(['driver']), payout_controller_1.requestPayout);
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
router.post('/onboarding/stripe', auth_middleware_1.verifyToken, (0, roles_middleware_1.checkRole)(['driver']), payout_controller_1.createStripeConnectAccount);
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
router.get('/banks', auth_middleware_1.verifyToken, payout_controller_1.getBanks);
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
router.post('/:id/approve', auth_middleware_1.verifyToken, (0, roles_middleware_1.checkRole)(['admin']), payout_controller_1.approvePayout);
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
router.get('/', auth_middleware_1.verifyToken, (0, roles_middleware_1.checkRole)(['driver']), payout_controller_1.getPayoutHistory);
exports.default = router;
//# sourceMappingURL=payout.routes.js.map