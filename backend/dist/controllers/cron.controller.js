"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDailySettlement = void 0;
const firebase_1 = require("../config/firebase");
const IncentiveService_1 = require("../services/driver/IncentiveService");
const logger_1 = require("../utils/logger");
const runDailySettlement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Protect with a secret header (simple auth for cron jobs)
    const authHeader = req.headers['x-cron-secret'];
    if (authHeader !== process.env.CRON_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        logger_1.logger.info('Starting daily incentive settlement...');
        // Get all drivers with pending incentives
        // This query might be expensive in production; better to keep a list of "active" drivers
        // For now, querying recent active drivers or just iterating incentives
        const activeIncentives = yield firebase_1.db.collection('incentives')
            .where('isPaid', '==', false)
            .where('totalEarned', '>', 0)
            .get();
        const driverIds = new Set();
        activeIncentives.docs.forEach(doc => driverIds.add(doc.data().driverId));
        logger_1.logger.info({ count: driverIds.size }, 'Found drivers with pending incentives');
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };
        for (const driverId of Array.from(driverIds)) {
            try {
                yield IncentiveService_1.incentiveService.settleIncentives(driverId);
                results.success++;
            }
            catch (error) {
                results.failed++;
                results.errors.push({ driverId, error: error.message });
                logger_1.logger.error({ err: error, driverId }, 'Failed to settle incentives for driver');
            }
        }
        logger_1.logger.info(results, 'Daily settlement completed');
        res.status(200).json(results);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Daily settlement job failed');
        res.status(500).json({ error: error.message });
    }
});
exports.runDailySettlement = runDailySettlement;
//# sourceMappingURL=cron.controller.js.map