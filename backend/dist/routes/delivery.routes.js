"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const delivery_controller_1 = require("../controllers/delivery.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.verifyToken);
router.post('/', delivery_controller_1.createDelivery);
router.post('/quote', delivery_controller_1.getDeliveryQuote);
router.get('/:id', delivery_controller_1.getDelivery);
exports.default = router;
//# sourceMappingURL=delivery.routes.js.map