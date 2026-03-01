import { Router, RequestHandler } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { applyPromotionSchema } from '../schemas/promotion.schema';
import { applyPromotion, listMyPromotions, getAvailablePromotions } from '../controllers/promotion.controller';

const router = Router();

const wrap = (handler: any): RequestHandler => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Promotions
 *   description: Promotion Management
 */

/**
 * @swagger
 * /promotions/apply:
 *   post:
 *     summary: Apply a promotion code
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Promotion applied
 */
router.post('/apply', validate(applyPromotionSchema), wrap(applyPromotion));

/**
 * @swagger
 * /promotions/mine:
 *   get:
 *     summary: List my promotions
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of promotions
 */
router.get('/mine', wrap(listMyPromotions));

/**
 * @swagger
 * /promotions/available:
 *   get:
 *     summary: Get currently available promotions
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available promotions
 */
router.get('/available', wrap(getAvailablePromotions));

export default router;

