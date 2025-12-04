import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { createDelivery, getDeliveryQuote, getDelivery } from '../controllers/delivery.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Deliveries
 *   description: Delivery Management
 */

router.use(verifyToken);

/**
 * @swagger
 * /deliveries:
 *   post:
 *     summary: Create a new delivery
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pickupLocation:
 *                 type: object
 *               dropoffLocation:
 *                 type: object
 *               packageDetails:
 *                 type: object
 *     responses:
 *       201:
 *         description: Delivery created
 */
router.post('/', createDelivery as any);

/**
 * @swagger
 * /deliveries/quote:
 *   post:
 *     summary: Get delivery quote
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pickupLocation:
 *                 type: object
 *               dropoffLocation:
 *                 type: object
 *     responses:
 *       200:
 *         description: Delivery quote
 */
router.post('/quote', getDeliveryQuote as any);

/**
 * @swagger
 * /deliveries/{id}:
 *   get:
 *     summary: Get delivery details
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Delivery ID
 *     responses:
 *       200:
 *         description: Delivery details
 */
router.get('/:id', getDelivery as any);

export default router;
