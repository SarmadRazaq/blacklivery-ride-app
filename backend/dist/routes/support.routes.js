"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const support_controller_1 = require("../controllers/support.controller");
const router = (0, express_1.Router)();
const wrap = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};
router.use(auth_middleware_1.verifyToken);
router.post('/', wrap(support_controller_1.createSupportTicket));
router.get('/', wrap(support_controller_1.getMyTickets));
router.post('/:id/reply', wrap(support_controller_1.replyToTicket));
exports.default = router;
//# sourceMappingURL=support.routes.js.map