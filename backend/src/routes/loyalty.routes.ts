import { Router, RequestHandler } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import {
    getLoyaltyAccount,
    getLoyaltyHistory,
    getAvailableRewards,
    redeemPoints,
    getActiveRedemptions
} from '../controllers/loyalty.controller';

const router = Router();

const wrap = (handler: any): RequestHandler => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Loyalty
 *   description: Loyalty Points & Rewards Program
 */

/**
 * @swagger
 * /loyalty/account:
 *   get:
 *     summary: Get loyalty account (points, tier, lifetime stats)
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loyalty account details
 */
router.get('/account', wrap(getLoyaltyAccount));

/**
 * @swagger
 * /loyalty/history:
 *   get:
 *     summary: Get loyalty points history
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Points earning/redemption history
 */
router.get('/history', wrap(getLoyaltyHistory));

/**
 * @swagger
 * /loyalty/rewards:
 *   get:
 *     summary: Get available rewards and their point costs
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available rewards
 */
router.get('/rewards', wrap(getAvailableRewards));

/**
 * @swagger
 * /loyalty/redeem:
 *   post:
 *     summary: Redeem points for a reward
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rewardType]
 *             properties:
 *               rewardType:
 *                 type: string
 *                 enum: [ride_discount, free_ride, priority_pickup, vehicle_upgrade]
 *     responses:
 *       201:
 *         description: Redemption created
 *       400:
 *         description: Insufficient points
 */
router.post('/redeem', wrap(redeemPoints));

/**
 * @swagger
 * /loyalty/redemptions:
 *   get:
 *     summary: Get active (pending) redemptions
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active redemptions
 */
router.get('/redemptions', wrap(getActiveRedemptions));

export default router;
