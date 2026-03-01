"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const driver_controller_1 = require("../controllers/driver.controller");
const driver_schema_1 = require("../schemas/driver.schema");
const router = (0, express_1.Router)();
const wrap = (handler) => {
    return (req, res, next) => {
        Promise.resolve(handler(req, res))
            .then(() => void 0)
            .catch(next);
    };
};
router.use(auth_middleware_1.verifyToken);
/**
 * @swagger
 * tags:
 *   name: Drivers
 *   description: Driver Management
 */
// Driver endpoints
/**
 * @swagger
 * /driver/documents:
 *   post:
 *     summary: Upload driver documents
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Documents uploaded
 */
router.post('/documents', (0, roles_middleware_1.checkRole)(['driver']), (0, validate_middleware_1.validate)(driver_schema_1.driverDocumentUploadSchema), wrap(driver_controller_1.uploadDriverDocuments));
/**
 * @swagger
 * /driver/bank:
 *   post:
 *     summary: Update driver bank info
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Bank info updated
 */
router.post('/bank', (0, roles_middleware_1.checkRole)(['driver']), (0, validate_middleware_1.validate)(driver_schema_1.driverBankInfoSchema), wrap(driver_controller_1.updateDriverBankInfo));
/**
 * @swagger
 * /driver/application:
 *   get:
 *     summary: Get driver application
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver application
 */
router.get('/application', (0, roles_middleware_1.checkRole)(['driver']), wrap(driver_controller_1.getDriverApplication));
/**
 * @swagger
 * /driver/availability:
 *   post:
 *     summary: Update driver availability
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isOnline:
 *                 type: boolean
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *                   heading:
 *                     type: number
 *     responses:
 *       200:
 *         description: Availability updated
 */
router.post('/availability', (0, roles_middleware_1.checkRole)(['driver']), (0, validate_middleware_1.validate)(driver_schema_1.driverAvailabilitySchema), wrap(driver_controller_1.updateDriverAvailability));
/**
 * @swagger
 * /driver/heartbeat:
 *   post:
 *     summary: Record driver heartbeat
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Heartbeat recorded
 */
router.post('/heartbeat', (0, roles_middleware_1.checkRole)(['driver']), (0, validate_middleware_1.validate)(driver_schema_1.driverHeartbeatSchema), wrap(driver_controller_1.recordDriverHeartbeat));
// Admin endpoints
/**
 * @swagger
 * /driver/applications:
 *   get:
 *     summary: List driver applications
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applications
 */
router.get('/applications', (0, roles_middleware_1.checkRole)(['admin']), (0, validate_middleware_1.validate)(driver_schema_1.listDriverApplicationsSchema), wrap(driver_controller_1.adminListDriverApplications));
/**
 * @swagger
 * /driver/applications/{driverId}:
 *   get:
 *     summary: Get driver application details
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Application details
 */
router.get('/applications/:driverId', (0, roles_middleware_1.checkRole)(['admin']), wrap(driver_controller_1.adminGetDriverApplication));
/**
 * @swagger
 * /driver/applications/{driverId}/review:
 *   post:
 *     summary: Review driver application
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
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
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application reviewed
 */
router.post('/applications/:driverId/review', (0, roles_middleware_1.checkRole)(['admin']), (0, validate_middleware_1.validate)(driver_schema_1.adminReviewDriverApplicationSchema), wrap(driver_controller_1.adminReviewDriverApplication));
/**
 * @swagger
 * /driver/applications/{driverId}/resubmit:
 *   post:
 *     summary: Request document resubmission
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Resubmission requested
 */
router.post('/applications/:driverId/resubmit', (0, roles_middleware_1.checkRole)(['admin']), (0, validate_middleware_1.validate)(driver_schema_1.adminRequestDriverDocumentsSchema), wrap(driver_controller_1.adminRequestDocumentResubmission));
/**
 * @swagger
 * /driver/earnings:
 *   get:
 *     summary: Get driver earnings summary
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: week
 *     responses:
 *       200:
 *         description: Earnings summary
 */
router.get('/earnings', (0, roles_middleware_1.checkRole)(['driver']), wrap(driver_controller_1.getDriverEarnings));
/**
 * @swagger
 * /driver/rides:
 *   get:
 *     summary: Get driver ride history
 *     tags: [Drivers]
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
 *     responses:
 *       200:
 *         description: List of rides
 */
router.get('/rides', (0, roles_middleware_1.checkRole)(['driver']), wrap(driver_controller_1.getDriverRideHistory));
/**
 * @swagger
 * /driver/active-ride:
 *   get:
 *     summary: Get driver's current active ride
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active ride details or null
 */
router.get('/active-ride', (0, roles_middleware_1.checkRole)(['driver']), wrap(driver_controller_1.getDriverActiveRide));
exports.default = router;
//# sourceMappingURL=driver.routes.js.map