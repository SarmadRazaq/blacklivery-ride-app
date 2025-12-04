"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const idempotency_middleware_1 = require("../middlewares/idempotency.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const rateLimit_middleware_1 = require("../middlewares/rateLimit.middleware");
const ride_schema_1 = require("../schemas/ride.schema");
const ride_controller_1 = require("../controllers/ride.controller");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.verifyToken, rateLimit_middleware_1.rideLimiter, (0, validate_middleware_1.validate)(ride_schema_1.createRideSchema), idempotency_middleware_1.idempotency, ride_controller_1.createRide);
router.get('/drivers/nearby', auth_middleware_1.verifyToken, (0, validate_middleware_1.validate)(ride_schema_1.nearbyDriversSchema), ride_controller_1.getNearbyDrivers);
router.put('/:id/status', auth_middleware_1.verifyToken, ride_controller_1.updateRideStatus);
exports.default = router;
//# sourceMappingURL=ride.routes.js.map