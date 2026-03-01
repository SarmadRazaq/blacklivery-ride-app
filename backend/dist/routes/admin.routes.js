"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const idempotency_middleware_1 = require("../middlewares/idempotency.middleware");
const admin_controller_1 = require("../controllers/admin.controller");
const admin_schema_1 = require("../schemas/admin.schema");
const router = (0, express_1.Router)();
const wrap = (handler) => {
    return (req, res, next) => {
        Promise.resolve(handler(req, res))
            .then(() => void 0)
            .catch(next);
    };
};
router.use(auth_middleware_1.verifyToken, (0, roles_middleware_1.checkRole)(['admin']));
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
router.get('/pricing/:region', wrap(admin_controller_1.getPricingConfig));
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
router.put('/pricing/:region', idempotency_middleware_1.idempotency, wrap(admin_controller_1.updatePricingConfig));
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
router.get('/history/pricing', wrap(admin_controller_1.getPricingHistory));
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
router.get('/surge/:region', wrap(admin_controller_1.getSurgeConfig));
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
router.put('/surge/:region', idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateSurgeConfig));
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
router.get('/users', wrap(admin_controller_1.listUsers));
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
router.patch('/users/:userId/status', (0, validate_middleware_1.validate)(admin_schema_1.updateUserStatusSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateUserStatus));
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
router.patch('/users/:userId/documents', idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateUserDocuments));
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
router.patch('/vehicles/:vehicleId/status', idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateVehicleStatus));
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
router.get('/rides/active', wrap(admin_controller_1.listActiveRides));
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
router.get('/rides', wrap(admin_controller_1.listAllRides));
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
router.get('/rides/:id', wrap(admin_controller_1.getRideDetails));
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
router.post('/rides/:id/cancel', idempotency_middleware_1.idempotency, wrap(admin_controller_1.adminCancelRide));
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
router.get('/disputes', wrap(admin_controller_1.listDisputes));
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
router.post('/disputes', (0, validate_middleware_1.validate)(admin_schema_1.createDisputeSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.createDispute));
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
router.post('/disputes/:id/resolve', (0, validate_middleware_1.validate)(admin_schema_1.resolveDisputeSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.resolveDispute));
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
router.post('/promotions', (0, validate_middleware_1.validate)(admin_schema_1.createPromotionSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.createPromotion));
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
router.put('/promotions/:id', (0, validate_middleware_1.validate)(admin_schema_1.updatePromotionSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.updatePromotion));
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
router.get('/promotions', wrap(admin_controller_1.listPromotions));
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
router.post('/bonuses', (0, validate_middleware_1.validate)(admin_schema_1.createBonusSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.createBonusProgram));
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
router.put('/bonuses/:id', (0, validate_middleware_1.validate)(admin_schema_1.updateBonusSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateBonusProgram));
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
router.get('/bonuses', wrap(admin_controller_1.listBonusPrograms));
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
router.get('/analytics/earnings', wrap(admin_controller_1.getEarningsAnalytics));
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
router.get('/support-tickets', wrap(admin_controller_1.listSupportTickets));
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
router.post('/support-tickets', (0, validate_middleware_1.validate)(admin_schema_1.createSupportTicketSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.createSupportTicket));
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
router.patch('/support-tickets/:id', (0, validate_middleware_1.validate)(admin_schema_1.updateSupportTicketSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateSupportTicket));
exports.default = router;
//# sourceMappingURL=admin.routes.js.map