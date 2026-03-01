"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const delivery_controller_1 = require("../controllers/delivery.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Deliveries
 *   description: Delivery Management
 */
router.use(auth_middleware_1.verifyToken);
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
router.post('/', delivery_controller_1.createDelivery);
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
router.post('/quote', delivery_controller_1.getDeliveryQuote);
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
router.get('/:id', delivery_controller_1.getDelivery);
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
router.post('/:rideId/proof', delivery_controller_1.uploadProofOfDelivery);
exports.default = router;
//# sourceMappingURL=delivery.routes.js.map