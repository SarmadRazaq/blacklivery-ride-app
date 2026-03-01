import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createDeliverySchema, deliveryQuoteSchema, proofOfDeliverySchema } from '../schemas/delivery.schema';
import { createDelivery, getDeliveryQuote, getDelivery, uploadProofOfDelivery, getDeliveryHistory } from '../controllers/delivery.controller';

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
router.post('/', validate(createDeliverySchema), createDelivery as any);

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
router.post('/quote', validate(deliveryQuoteSchema), getDeliveryQuote as any);

/**
 * @swagger
 * /deliveries/history:
 *   get:
 *     summary: Get delivery history for current user
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of past deliveries
 */
router.get('/history', getDeliveryHistory as any);

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

/**
 * @swagger
 * /deliveries/{rideId}/proof:
 *   post:
 *     summary: Upload proof of delivery (photo or signature)
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               photoBase64:
 *                 type: string
 *               signatureBase64:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Proof uploaded
 */
router.post('/:rideId/proof', validate(proofOfDeliverySchema), uploadProofOfDelivery as any);

export default router;

