import { Router, RequestHandler } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idempotency } from '../middlewares/idempotency.middleware';
import { AuthRequest } from '../types/express';
import {
    updatePricingConfig,
    getPricingConfig,
    updateSurgeConfig,
    getSurgeConfig,
    getPricingHistory,
    listUsers,
    updateUserStatus,
    updateUserDocuments,
    listActiveRides,
    listAllRides,
    getRideDetails,
    adminCancelRide,
    createDispute,
    resolveDispute,
    listDisputes,
    createPromotion,
    updatePromotion,
    listPromotions,
    createBonusProgram,
    updateBonusProgram,
    listBonusPrograms,
    getEarningsAnalytics,
    getAnalyticsCounts,
    getEarningsTimeSeries,
    listAllPayouts,
    listSupportTickets,
    updateSupportTicket,
    createSupportTicket,
    updateVehicleStatus,
    awardLoyaltyPoints
} from '../controllers/admin.controller';
import {
    updateUserStatusSchema,
    createDisputeSchema,
    resolveDisputeSchema,
    createPromotionSchema,
    updatePromotionSchema,
    createBonusSchema,
    updateBonusSchema,
    createSupportTicketSchema,
    updateSupportTicketSchema
} from '../schemas/admin.schema';

const router = Router();

const wrap = (handler: (req: AuthRequest, res: Parameters<RequestHandler>[1]) => Promise<void> | void): RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(handler(req as AuthRequest, res))
            .then(() => void 0)
            .catch(next);
    };
};

router.use(verifyToken, checkRole(['admin']));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Operations
 */

// Pricing & surge
/**
 * @swagger
 * /admin/pricing/{region}:
 *   get:
 *     summary: Get pricing config for region
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: region
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Pricing config
 */
router.get('/pricing/:region', wrap(getPricingConfig));

/**
 * @swagger
 * /admin/pricing/{region}:
 *   put:
 *     summary: Update pricing config
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: region
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
 *         description: Pricing updated
 */
router.put('/pricing/:region', idempotency, wrap(updatePricingConfig));

/**
 * @swagger
 * /admin/history/pricing:
 *   get:
 *     summary: Get pricing history
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pricing history
 */
router.get('/history/pricing', wrap(getPricingHistory));

/**
 * @swagger
 * /admin/surge/{region}:
 *   get:
 *     summary: Get surge config
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: region
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Surge config
 */
router.get('/surge/:region', wrap(getSurgeConfig));

/**
 * @swagger
 * /admin/surge/{region}:
 *   put:
 *     summary: Update surge config
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: region
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
 *         description: Surge updated
 */
router.put('/surge/:region', idempotency, wrap(updateSurgeConfig));

// Users & rides
/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', wrap(listUsers));

/**
 * @swagger
 * /admin/users/{userId}/status:
 *   patch:
 *     summary: Update user status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: User status updated
 */
router.patch('/users/:userId/status', validate(updateUserStatusSchema), idempotency, wrap(updateUserStatus));

/**
 * @swagger
 * /admin/users/{userId}/documents:
 *   patch:
 *     summary: Update user documents
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: Documents updated
 */
router.patch('/users/:userId/documents', idempotency, wrap(updateUserDocuments));

/**
 * @swagger
 * /admin/vehicles/{vehicleId}/status:
 *   patch:
 *     summary: Update vehicle status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
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
 *         description: Vehicle status updated
 */
router.patch('/vehicles/:vehicleId/status', idempotency, wrap(updateVehicleStatus));

/**
 * @swagger
 * /admin/rides/active:
 *   get:
 *     summary: List active rides
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active rides
 */
router.get('/rides/active', wrap(listActiveRides));

/**
 * @swagger
 * /admin/rides:
 *   get:
 *     summary: List all rides
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All rides
 */
router.get('/rides', wrap(listAllRides));

/**
 * @swagger
 * /admin/rides/{id}:
 *   get:
 *     summary: Get ride details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Ride details
 */
router.get('/rides/:id', wrap(getRideDetails));

/**
 * @swagger
 * /admin/rides/{id}/cancel:
 *   post:
 *     summary: Cancel ride
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Ride cancelled
 */
router.post('/rides/:id/cancel', idempotency, wrap(adminCancelRide));

// Disputes & refunds
/**
 * @swagger
 * /admin/disputes:
 *   get:
 *     summary: List disputes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of disputes
 */
router.get('/disputes', wrap(listDisputes));

/**
 * @swagger
 * /admin/disputes:
 *   post:
 *     summary: Create dispute
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Dispute created
 */
router.post('/disputes', validate(createDisputeSchema), idempotency, wrap(createDispute));

/**
 * @swagger
 * /admin/disputes/{id}/resolve:
 *   post:
 *     summary: Resolve dispute
 *     tags: [Admin]
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
 *     responses:
 *       200:
 *         description: Dispute resolved
 */
router.post('/disputes/:id/resolve', validate(resolveDisputeSchema), idempotency, wrap(resolveDispute));

// Promotions & bonuses
/**
 * @swagger
 * /admin/promotions:
 *   post:
 *     summary: Create promotion
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Promotion created
 */
router.post('/promotions', validate(createPromotionSchema), idempotency, wrap(createPromotion));

/**
 * @swagger
 * /admin/promotions/{id}:
 *   put:
 *     summary: Update promotion
 *     tags: [Admin]
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
 *     responses:
 *       200:
 *         description: Promotion updated
 */
router.put('/promotions/:id', validate(updatePromotionSchema), idempotency, wrap(updatePromotion));

/**
 * @swagger
 * /admin/promotions:
 *   get:
 *     summary: List promotions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of promotions
 */
router.get('/promotions', wrap(listPromotions));

/**
 * @swagger
 * /admin/bonuses:
 *   post:
 *     summary: Create bonus program
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Bonus program created
 */
router.post('/bonuses', validate(createBonusSchema), idempotency, wrap(createBonusProgram));

/**
 * @swagger
 * /admin/bonuses/{id}:
 *   put:
 *     summary: Update bonus program
 *     tags: [Admin]
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
 *     responses:
 *       200:
 *         description: Bonus program updated
 */
router.put('/bonuses/:id', validate(updateBonusSchema), idempotency, wrap(updateBonusProgram));

/**
 * @swagger
 * /admin/bonuses:
 *   get:
 *     summary: List bonus programs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bonus programs
 */
router.get('/bonuses', wrap(listBonusPrograms));

// ── Loyalty ──
router.post('/loyalty/award', idempotency, wrap(awardLoyaltyPoints));

// Analytics
/**
 * @swagger
 * /admin/analytics/earnings:
 *   get:
 *     summary: Get earnings analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings analytics
 */
router.get('/analytics/earnings', wrap(getEarningsAnalytics));

/**
 * @swagger
 * /admin/analytics/counts:
 *   get:
 *     summary: Get lightweight aggregate counts for the dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ride and user counts
 */
router.get('/analytics/counts', wrap(getAnalyticsCounts));

// Support tickets
/**
 * @swagger
 * /admin/support-tickets:
 *   get:
 *     summary: List support tickets
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of support tickets
 */
router.get('/support-tickets', wrap(listSupportTickets));

/**
 * @swagger
 * /admin/support-tickets:
 *   post:
 *     summary: Create support ticket
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Ticket created
 */
router.post('/support-tickets', validate(createSupportTicketSchema), idempotency, wrap(createSupportTicket));

/**
 * @swagger
 * /admin/support-tickets/{id}:
 *   patch:
 *     summary: Update support ticket
 *     tags: [Admin]
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
 *     responses:
 *       200:
 *         description: Ticket updated
 */
router.patch('/support-tickets/:id', validate(updateSupportTicketSchema), idempotency, wrap(updateSupportTicket));

/**
 * @swagger
 * /admin/payouts:
 *   get:
 *     summary: List all payout requests (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, completed, failed]
 *     responses:
 *       200:
 *         description: List of payout requests
 */
router.get('/payouts', wrap(listAllPayouts));

/**
 * @swagger
 * /admin/analytics/earnings/timeseries:
 *   get:
 *     summary: Get daily earnings time-series data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Daily earnings breakdown
 */
router.get('/analytics/earnings/timeseries', wrap(getEarningsTimeSeries));

// ── B2B Accounts ──
import { b2bPricingService } from '../services/pricing/B2BPricingService';

router.get('/b2b/accounts', wrap(async (req, res) => {
    const accounts = await b2bPricingService.listAccounts({
        activeOnly: req.query.activeOnly !== 'false',
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
    });
    res.json({ data: accounts });
}));

router.post('/b2b/accounts', idempotency, wrap(async (req, res) => {
    const { userId, businessName, contactEmail, contactPhone, tier, customDiscount, customCommission } = req.body;
    if (!userId || !businessName || !contactEmail) {
        res.status(400).json({ message: 'userId, businessName, and contactEmail are required' });
        return;
    }
    const account = await b2bPricingService.createAccount({
        userId, businessName, contactEmail, contactPhone, tier, customDiscount, customCommission
    });
    res.status(201).json({ data: account });
}));

router.put('/b2b/accounts/:id', idempotency, wrap(async (req, res) => {
    const account = await b2bPricingService.updateAccount(req.params.id, req.body);
    if (!account) {
        res.status(404).json({ message: 'B2B account not found' });
        return;
    }
    res.json({ data: account });
}));

router.get('/b2b/accounts/:id', wrap(async (req, res) => {
    const account = await b2bPricingService.getAccountById(req.params.id);
    if (!account) {
        res.status(404).json({ message: 'B2B account not found' });
        return;
    }
    res.json({ data: account });
}));

export default router;
