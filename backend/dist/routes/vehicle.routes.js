"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const vehicle_controller_1 = require("../controllers/vehicle.controller");
const router = (0, express_1.Router)();
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
router.post('/', auth_middleware_1.verifyToken, vehicle_controller_1.addVehicle);
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
router.get('/', auth_middleware_1.verifyToken, vehicle_controller_1.getDriverVehicles);
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
router.patch('/:vehicleId', auth_middleware_1.verifyToken, vehicle_controller_1.updateVehicle);
exports.default = router;
//# sourceMappingURL=vehicle.routes.js.map