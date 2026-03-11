import { Router, RequestHandler, Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '../types/express';
import { verifyToken } from '../middlewares/auth.middleware';
import { checkRole, requireApprovedDriver } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
    uploadDriverDocuments,
    getDriverDocuments,
    refreshDocumentSignedUrl,
    adminRefreshDocumentSignedUrl,
    updateDriverVerificationDetails,
    updateDriverBankInfo,
    getDriverApplication,
    adminListDriverApplications,
    adminGetDriverApplication,
    adminReviewDriverApplication,
    adminRequestDocumentResubmission,
    updateDriverAvailability,
    recordDriverHeartbeat,
    getDriverEarnings,
    getDriverRideHistory,
    getDriverActiveRide,
    getDriverRatingDistribution,
    getDriverNotifications,
    markAllDriverNotificationsRead,
    markDriverNotificationRead,
    getDriverLoyaltyOverview,
    getDriverDemandZones
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
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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
router.post('/documents', checkRole(['driver']), upload.single('file'), wrap(uploadDriverDocuments));
router.get('/documents', checkRole(['driver']), wrap(getDriverDocuments));
// Refresh a 15-min signed URL for a specific document type (driver self-service)
router.get('/documents/:docType/signed-url', checkRole(['driver']), wrap(refreshDocumentSignedUrl));
router.patch('/verification-details', checkRole(['driver']), wrap(updateDriverVerificationDetails));

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
router.post('/availability', checkRole(['driver']), requireApprovedDriver, validate(driverAvailabilitySchema), wrap(updateDriverAvailability));

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
router.post('/heartbeat', checkRole(['driver']), requireApprovedDriver, validate(driverHeartbeatSchema), wrap(recordDriverHeartbeat));

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

// Refresh a 15-min signed URL for a driver's document (admin use — document review)
router.get('/applications/:driverId/documents/:docType/signed-url', checkRole(['admin']), wrap(adminRefreshDocumentSignedUrl));

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
router.get('/earnings', checkRole(['driver']), requireApprovedDriver, wrap(getDriverEarnings));

/**
 * @swagger
 * /driver/earnings/dashboard:
 *   get:
 *     summary: Get driver earnings dashboard (redesign)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings dashboard data
 */
import { getEarningsDashboard, getPayouts, updateEarningsGoal } from '../controllers/earnings.controller';
router.get('/earnings/dashboard', checkRole(['driver']), requireApprovedDriver, wrap(getEarningsDashboard));
router.patch('/earnings/goal', checkRole(['driver']), requireApprovedDriver, wrap(updateEarningsGoal));
router.get('/payouts', checkRole(['driver']), requireApprovedDriver, wrap(getPayouts));

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
router.get('/rides', checkRole(['driver']), requireApprovedDriver, wrap(getDriverRideHistory));

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
router.get('/active-ride', checkRole(['driver']), requireApprovedDriver, wrap(getDriverActiveRide));

/**
 * @swagger
 * /driver/ratings:
 *   get:
 *     summary: Get driver rating distribution
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rating distribution and recent feedback
 */
router.get('/ratings', checkRole(['driver']), requireApprovedDriver, wrap(getDriverRatingDistribution));
// notifications and loyalty are available to all drivers regardless of approval status
router.get('/notifications', checkRole(['driver']), wrap(getDriverNotifications));
router.patch('/notifications/read-all', checkRole(['driver']), wrap(markAllDriverNotificationsRead));
router.patch('/notifications/:id/read', checkRole(['driver']), wrap(markDriverNotificationRead));
router.get('/loyalty', checkRole(['driver']), requireApprovedDriver, wrap(getDriverLoyaltyOverview));
router.get('/demand-zones', checkRole(['driver']), requireApprovedDriver, wrap(getDriverDemandZones));

export default router;