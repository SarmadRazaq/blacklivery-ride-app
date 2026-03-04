import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validate } from '../middlewares/validate.middleware';
import { validateRideStatusTransition } from '../middlewares/rideStatusTransition.middleware';
import { rideLimiter } from '../middlewares/rateLimit.middleware';
import { createRideSchema, nearbyDriversSchema, updateRideStatusSchema } from '../schemas/ride.schema';
import { createRide, getNearbyDrivers, updateRideStatus, getRide, estimateFare, getRideHistory, rateDriver, rateRider, getScheduledRides, addTip, sosAlert } from '../controllers/ride.controller';
import { checkRole } from '../middlewares/roles.middleware';

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
router.post('/', verifyToken, checkRole(['rider']), rideLimiter, validate(createRideSchema), idempotency, createRide as any);

/**
 * @swagger
 * /rides/estimate:
 *   post:
 *     summary: Get fare estimate without creating a ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickup
 *               - dropoff
 *               - vehicleCategory
 *               - region
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
 *     responses:
 *       200:
 *         description: Fare estimate
 */
router.post('/estimate', verifyToken, estimateFare as any);

/**
 * @swagger
 * /rides/history:
 *   get:
 *     summary: Get ride history for authenticated user
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of rides
 */
router.get('/history', verifyToken, getRideHistory as any);

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
 * /rides/scheduled:
 *   get:
 *     summary: Get scheduled rides for current user
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of scheduled rides
 */
router.get('/scheduled', verifyToken, getScheduledRides as any);

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
router.put(
	'/:id/status',
	verifyToken,
	validate(updateRideStatusSchema),
	validateRideStatusTransition,
	idempotency,
	updateRideStatus as any
);

/**
 * @swagger
 * /rides/{id}/rate:
 *   post:
 *     summary: Rate the driver after ride completion (by rider)
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver rated successfully
 */
router.post('/:id/rate', verifyToken, checkRole(['rider']), rateDriver as any);

/**
 * @swagger
 * /rides/{id}/rate-rider:
 *   post:
 *     summary: Rate the rider after ride completion (by driver)
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rider rated successfully
 */
router.post('/:id/rate-rider', verifyToken, checkRole(['driver']), rateRider as any);

/**
 * @swagger
 * /rides/{id}/tip:
 *   post:
 *     summary: Add tip to a completed ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Tip added successfully
 */
router.post('/:id/tip', verifyToken, checkRole(['rider']), addTip as any);

/**
 * @swagger
 * /rides/{id}/sos:
 *   post:
 *     summary: Trigger SOS emergency alert during a ride (driver only)
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       200:
 *         description: SOS received
 */
router.post('/:id/sos', verifyToken, checkRole(['driver']), sosAlert as any);

export default router;

