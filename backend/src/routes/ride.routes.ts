import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validate } from '../middlewares/validate.middleware';
import { rideLimiter } from '../middlewares/rateLimit.middleware';
import { createRideSchema, nearbyDriversSchema } from '../schemas/ride.schema';
import { createRide, getNearbyDrivers, updateRideStatus, getRide } from '../controllers/ride.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Rides
 *   description: Ride Management
 */

/**
 * @swagger
 * /rides:
 *   post:
 *     summary: Create a new ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pickup:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *                   address:
 *                     type: string
 *               dropoff:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *                   address:
 *                     type: string
 *               vehicleCategory:
 *                 type: string
 *                 enum: [motorbike, sedan, suv, xl, first_class]
 *               region:
 *                 type: string
 *                 enum: [nigeria, chicago]
 *               bookingType:
 *                 type: string
 *                 enum: [on_demand, hourly, delivery]
 *     responses:
 *       201:
 *         description: Ride created successfully
 */
router.post('/', verifyToken, rideLimiter, validate(createRideSchema), idempotency, createRide as any);

/**
 * @swagger
 * /rides/drivers/nearby:
 *   get:
 *     summary: Get nearby drivers
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         required: true
 *     responses:
 *       200:
 *         description: List of nearby drivers
 */
router.get('/drivers/nearby', verifyToken, validate(nearbyDriversSchema), getNearbyDrivers as any);

/**
 * @swagger
 * /rides/{id}:
 *   get:
 *     summary: Get ride details
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Ride ID
 *     responses:
 *       200:
 *         description: Ride details
 *       404:
 *         description: Ride not found
 */
router.get('/:id', verifyToken, getRide as any);

/**
 * @swagger
 * /rides/{id}/status:
 *   put:
 *     summary: Update ride status
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Ride ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ride status updated
 */
router.put('/:id/status', verifyToken, updateRideStatus as any);

export default router;
