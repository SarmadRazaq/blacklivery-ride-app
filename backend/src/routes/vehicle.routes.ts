import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { addVehicle, getDriverVehicles } from '../controllers/vehicle.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle Management
 */

/**
 * @swagger
 * /vehicles:
 *   post:
 *     summary: Add a new vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: number
 *               licensePlate:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vehicle added
 */
router.post('/', verifyToken, addVehicle);

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Get driver vehicles
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vehicles
 */
router.get('/', verifyToken, getDriverVehicles);

export default router;
