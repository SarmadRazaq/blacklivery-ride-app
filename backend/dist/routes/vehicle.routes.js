"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const vehicle_controller_1 = require("../controllers/vehicle.controller");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.verifyToken, vehicle_controller_1.addVehicle);
router.get('/', auth_middleware_1.verifyToken, vehicle_controller_1.getDriverVehicles);
exports.default = router;
//# sourceMappingURL=vehicle.routes.js.map