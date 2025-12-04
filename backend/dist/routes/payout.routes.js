"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const payout_controller_1 = require("../controllers/payout.controller");
const router = (0, express_1.Router)();
router.post('/webhooks/monnify', payout_controller_1.monnifyWebhook);
router.post('/request', auth_middleware_1.verifyToken, (0, roles_middleware_1.checkRole)(['driver']), payout_controller_1.requestPayout);
router.post('/onboarding/stripe', auth_middleware_1.verifyToken, (0, roles_middleware_1.checkRole)(['driver']), payout_controller_1.createStripeConnectAccount);
router.get('/banks', auth_middleware_1.verifyToken, payout_controller_1.getBanks);
router.post('/:id/approve', auth_middleware_1.verifyToken, (0, roles_middleware_1.checkRole)(['admin']), payout_controller_1.approvePayout);
exports.default = router;
//# sourceMappingURL=payout.routes.js.map