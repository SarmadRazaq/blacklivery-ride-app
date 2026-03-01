"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const idempotency_middleware_1 = require("../middlewares/idempotency.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const rateLimit_middleware_1 = require("../middlewares/rateLimit.middleware");
const ride_schema_1 = require("../schemas/ride.schema");
const ride_controller_1 = require("../controllers/ride.controller");
const router = (0, express_1.Router)();
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
router.post('/', auth_middleware_1.verifyToken, rateLimit_middleware_1.rideLimiter, (0, validate_middleware_1.validate)(ride_schema_1.createRideSchema), idempotency_middleware_1.idempotency, ride_controller_1.createRide);
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
router.post('/estimate', auth_middleware_1.verifyToken, ride_controller_1.estimateFare);
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
router.get('/history', auth_middleware_1.verifyToken, ride_controller_1.getRideHistory);
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
router.get('/drivers/nearby', auth_middleware_1.verifyToken, (0, validate_middleware_1.validate)(ride_schema_1.nearbyDriversSchema), ride_controller_1.getNearbyDrivers);
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
router.get('/:id', auth_middleware_1.verifyToken, ride_controller_1.getRide);
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
router.put('/:id/status', auth_middleware_1.verifyToken, ride_controller_1.updateRideStatus);
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
router.post('/:id/rate', auth_middleware_1.verifyToken, ride_controller_1.rateDriver);
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
router.post('/:id/rate-rider', auth_middleware_1.verifyToken, ride_controller_1.rateRider);
exports.default = router;
//# sourceMappingURL=ride.routes.js.map