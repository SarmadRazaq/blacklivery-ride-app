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
exports.startDriverStatusMonitor = void 0;
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
const DRIVER_AUTO_OFFLINE_MS = 12 * 60 * 60 * 1000; // 12 hours
const DRIVER_STATUS_SCAN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const enforceDriverOffline = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cutoff = new Date(Date.now() - DRIVER_AUTO_OFFLINE_MS);
        const snapshot = yield firebase_1.db
            .collection('users')
            .where('role', '==', 'driver')
            .where('driverStatus.isOnline', '==', true)
            .where('driverStatus.lastHeartbeat', '<=', cutoff)
            .limit(200)
            .get();
        if (snapshot.empty) {
            return;
        }
        const batch = firebase_1.db.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                'driverStatus.isOnline': false,
                'driverStatus.state': 'offline',
                'driverStatus.autoOfflineAt': new Date()
            });
            firebase_1.rtdb.ref(`drivers/${doc.id}/status`).update({
                isOnline: false,
                state: 'offline',
                updatedAt: new Date().toISOString()
            });
        });
        yield batch.commit();
        logger_1.logger.info({ count: snapshot.size }, 'Auto-offlined inactive drivers');
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Driver auto-offline monitor failed');
    }
});
const startDriverStatusMonitor = () => {
    enforceDriverOffline().catch((err) => logger_1.logger.error({ err }, 'Initial driver monitor run failed'));
    const interval = setInterval(() => {
        enforceDriverOffline().catch((err) => logger_1.logger.error({ err }, 'Driver monitor run failed'));
    }, DRIVER_STATUS_SCAN_INTERVAL_MS);
    if (typeof interval.unref === 'function') {
        interval.unref();
    }
};
exports.startDriverStatusMonitor = startDriverStatusMonitor;
//# sourceMappingURL=DriverStatusService.js.map