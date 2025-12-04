"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const driver_controller_1 = require("../controllers/driver.controller");
const driver_schema_1 = require("../schemas/driver.schema");
const router = (0, express_1.Router)();
const wrap = (handler) => {
    return (req, res, next) => {
        Promise.resolve(handler(req, res))
            .then(() => void 0)
            .catch(next);
    };
};
router.use(auth_middleware_1.verifyToken);
// Driver endpoints
router.post('/documents', (0, roles_middleware_1.checkRole)(['driver']), (0, validate_middleware_1.validate)(driver_schema_1.driverDocumentUploadSchema), wrap(driver_controller_1.uploadDriverDocuments));
router.post('/bank', (0, roles_middleware_1.checkRole)(['driver']), (0, validate_middleware_1.validate)(driver_schema_1.driverBankInfoSchema), wrap(driver_controller_1.updateDriverBankInfo));
router.get('/application', (0, roles_middleware_1.checkRole)(['driver']), wrap(driver_controller_1.getDriverApplication));
router.post('/availability', (0, roles_middleware_1.checkRole)(['driver']), (0, validate_middleware_1.validate)(driver_schema_1.driverAvailabilitySchema), wrap(driver_controller_1.updateDriverAvailability));
router.post('/heartbeat', (0, roles_middleware_1.checkRole)(['driver']), (0, validate_middleware_1.validate)(driver_schema_1.driverHeartbeatSchema), wrap(driver_controller_1.recordDriverHeartbeat));
// Admin endpoints
router.get('/applications', (0, roles_middleware_1.checkRole)(['admin']), (0, validate_middleware_1.validate)(driver_schema_1.listDriverApplicationsSchema), wrap(driver_controller_1.adminListDriverApplications));
router.get('/applications/:driverId', (0, roles_middleware_1.checkRole)(['admin']), wrap(driver_controller_1.adminGetDriverApplication));
router.post('/applications/:driverId/review', (0, roles_middleware_1.checkRole)(['admin']), (0, validate_middleware_1.validate)(driver_schema_1.adminReviewDriverApplicationSchema), wrap(driver_controller_1.adminReviewDriverApplication));
router.post('/applications/:driverId/resubmit', (0, roles_middleware_1.checkRole)(['admin']), (0, validate_middleware_1.validate)(driver_schema_1.adminRequestDriverDocumentsSchema), wrap(driver_controller_1.adminRequestDocumentResubmission));
exports.default = router;
//# sourceMappingURL=driver.routes.js.map