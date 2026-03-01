import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { wrap } from '../utils/errorHandler';
import { addVehicleSchema, updateVehicleSchema } from '../schemas/vehicle.schema';
import { addVehicle, getDriverVehicles, updateVehicle, deleteVehicle, listVehicleCategories } from '../controllers/vehicle.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle Management
 */

/**
 * @swagger
 * /vehicles/categories:
 *   get:
 *     summary: List valid vehicle categories for a region
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *           enum: [NG, US-CHI]
 *         description: Region code (defaults to NG)
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *           enum: [ride, delivery]
 *         description: Service type (defaults to ride)
 *     responses:
 *       200:
 *         description: List of vehicle categories
 */
router.get('/categories', verifyToken, wrap(listVehicleCategories));

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
 *             required:
 *               - name
 *               - year
 *               - plateNumber
 *               - seats
 *               - category
 *               - images
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Maruti Suzuki Swift (VXI)"
 *               year:
 *                 type: number
 *                 example: 2022
 *               plateNumber:
 *                 type: string
 *                 example: "DL 01 AB 1234"
 *               seats:
 *                 type: number
 *                 example: 5
 *               category:
 *                 type: string
 *                 enum: [motorbike, sedan, suv, xl, first_class]
 *                 example: "sedan"
 *               images:
 *                 type: object
 *                 required:
 *                   - front
 *                   - back
 *                 properties:
 *                   front:
 *                     type: string
 *                     description: URL to front image of the car
 *                   back:
 *                     type: string
 *                     description: URL to back image of the car
 *               documents:
 *                 type: object
 *                 properties:
 *                   insurance:
 *                     type: string
 *                   registration:
 *                     type: string
 *                   inspection:
 *                     type: string
 *     responses:
 *       201:
 *         description: Vehicle added successfully
 *       400:
 *         description: Missing required fields or validation error
 */
router.post('/', verifyToken, validate(addVehicleSchema), wrap(addVehicle));

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
router.get('/', verifyToken, wrap(getDriverVehicles));

/**
 * @swagger
 * /vehicles/{vehicleId}:
 *   patch:
 *     summary: Update vehicle information
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               year:
 *                 type: number
 *               plateNumber:
 *                 type: string
 *               seats:
 *                 type: number
 *               category:
 *                 type: string
 *                 enum: [motorbike, sedan, suv, xl, first_class]
 *               images:
 *                 type: object
 *                 properties:
 *                   front:
 *                     type: string
 *                   back:
 *                     type: string
 *               documents:
 *                 type: object
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Vehicle not found
 */
router.patch('/:vehicleId', verifyToken, validate(updateVehicleSchema), wrap(updateVehicle));

/**
 * @swagger
 * /vehicles/{vehicleId}:
 *   delete:
 *     summary: Delete a vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Vehicle not found
 */
router.delete('/:vehicleId', verifyToken, wrap(deleteVehicle));

export default router;
