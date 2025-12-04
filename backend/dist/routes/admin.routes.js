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
// Pricing & surge
router.get('/pricing/:region', wrap(admin_controller_1.getPricingConfig));
router.put('/pricing/:region', idempotency_middleware_1.idempotency, wrap(admin_controller_1.updatePricingConfig));
router.get('/history/pricing', wrap(admin_controller_1.getPricingHistory));
router.get('/surge/:region', wrap(admin_controller_1.getSurgeConfig));
router.put('/surge/:region', idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateSurgeConfig));
// Users & rides
router.get('/users', wrap(admin_controller_1.listUsers));
router.patch('/users/:userId/status', (0, validate_middleware_1.validate)(admin_schema_1.updateUserStatusSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateUserStatus));
router.patch('/users/:userId/documents', idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateUserDocuments));
router.patch('/vehicles/:vehicleId/status', idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateVehicleStatus));
router.get('/rides/active', wrap(admin_controller_1.listActiveRides));
router.get('/rides', wrap(admin_controller_1.listAllRides));
router.get('/rides/:id', wrap(admin_controller_1.getRideDetails));
router.post('/rides/:id/cancel', idempotency_middleware_1.idempotency, wrap(admin_controller_1.adminCancelRide));
// Disputes & refunds
router.get('/disputes', wrap(admin_controller_1.listDisputes));
router.post('/disputes', (0, validate_middleware_1.validate)(admin_schema_1.createDisputeSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.createDispute));
router.post('/disputes/:id/resolve', (0, validate_middleware_1.validate)(admin_schema_1.resolveDisputeSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.resolveDispute));
// Promotions & bonuses
router.post('/promotions', (0, validate_middleware_1.validate)(admin_schema_1.createPromotionSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.createPromotion));
router.put('/promotions/:id', (0, validate_middleware_1.validate)(admin_schema_1.updatePromotionSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.updatePromotion));
router.get('/promotions', wrap(admin_controller_1.listPromotions));
router.post('/bonuses', (0, validate_middleware_1.validate)(admin_schema_1.createBonusSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.createBonusProgram));
router.put('/bonuses/:id', (0, validate_middleware_1.validate)(admin_schema_1.updateBonusSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateBonusProgram));
router.get('/bonuses', wrap(admin_controller_1.listBonusPrograms));
// Analytics
router.get('/analytics/earnings', wrap(admin_controller_1.getEarningsAnalytics));
// Support tickets
router.get('/support-tickets', wrap(admin_controller_1.listSupportTickets));
router.post('/support-tickets', (0, validate_middleware_1.validate)(admin_schema_1.createSupportTicketSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.createSupportTicket));
router.patch('/support-tickets/:id', (0, validate_middleware_1.validate)(admin_schema_1.updateSupportTicketSchema), idempotency_middleware_1.idempotency, wrap(admin_controller_1.updateSupportTicket));
exports.default = router;
//# sourceMappingURL=admin.routes.js.map