"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const promotion_controller_1 = require("../controllers/promotion.controller");
const router = (0, express_1.Router)();
const wrap = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};
router.use(auth_middleware_1.verifyToken);
router.post('/apply', wrap(promotion_controller_1.applyPromotion));
router.get('/mine', wrap(promotion_controller_1.listMyPromotions));
exports.default = router;
//# sourceMappingURL=promotion.routes.js.map