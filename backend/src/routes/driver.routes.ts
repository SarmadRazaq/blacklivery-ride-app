import { Router, RequestHandler, Response } from 'express';
import { AuthRequest } from '../types/express';
import { verifyToken } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
    uploadDriverDocuments,
    updateDriverBankInfo,
    getDriverApplication,
    adminListDriverApplications,
    adminGetDriverApplication,
    adminReviewDriverApplication,
    adminRequestDocumentResubmission,
    updateDriverAvailability,
    recordDriverHeartbeat
} from '../controllers/driver.controller';
import {
    driverDocumentUploadSchema,
    driverBankInfoSchema,
    listDriverApplicationsSchema,
    adminReviewDriverApplicationSchema,
    adminRequestDriverDocumentsSchema,
    driverAvailabilitySchema,
    driverHeartbeatSchema
} from '../schemas/driver.schema';

const router = Router();

const wrap = (handler: (req: AuthRequest, res: Response) => Promise<void> | void): RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(handler(req as AuthRequest, res))
            .then(() => void 0)
            .catch(next);
    };
};

router.use(verifyToken);

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
router.post('/documents', checkRole(['driver']), validate(driverDocumentUploadSchema), wrap(uploadDriverDocuments));

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
router.post('/bank', checkRole(['driver']), validate(driverBankInfoSchema), wrap(updateDriverBankInfo));

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
router.get('/application', checkRole(['driver']), wrap(getDriverApplication));

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
router.post('/availability', checkRole(['driver']), validate(driverAvailabilitySchema), wrap(updateDriverAvailability));

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
router.post('/heartbeat', checkRole(['driver']), validate(driverHeartbeatSchema), wrap(recordDriverHeartbeat));

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
router.get('/applications', checkRole(['admin']), validate(listDriverApplicationsSchema), wrap(adminListDriverApplications));

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
router.get('/applications/:driverId', checkRole(['admin']), wrap(adminGetDriverApplication));

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
router.post(
    '/applications/:driverId/review',
    checkRole(['admin']),
    validate(adminReviewDriverApplicationSchema),
    wrap(adminReviewDriverApplication)
);

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
router.post(
    '/applications/:driverId/resubmit',
    checkRole(['admin']),
    validate(adminRequestDriverDocumentsSchema),
    wrap(adminRequestDocumentResubmission)
);

export default router;