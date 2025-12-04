"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cron_controller_1 = require("../controllers/cron.controller");
const router = (0, express_1.Router)();
router.post('/settle-incentives', cron_controller_1.runDailySettlement);
exports.default = router;
//# sourceMappingURL=cron.routes.js.map