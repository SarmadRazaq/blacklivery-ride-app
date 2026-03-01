"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cron_controller_1 = require("../controllers/cron.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Cron
 *   description: Scheduled Tasks
 */
/**
 * @swagger
 * /cron/settle-incentives:
 *   post:
 *     summary: Run daily settlement
 *     tags: [Cron]
 *     responses:
 *       200:
 *         description: Settlement run
 */
router.post('/settle-incentives', cron_controller_1.runDailySettlement);
exports.default = router;
//# sourceMappingURL=cron.routes.js.map