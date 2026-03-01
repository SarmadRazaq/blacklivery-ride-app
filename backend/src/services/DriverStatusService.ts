import { db, rtdb } from '../config/firebase';
import { logger } from '../utils/logger';

const DRIVER_AUTO_OFFLINE_MS = 5 * 60 * 1000; // 5 minutes
const DRIVER_STATUS_SCAN_INTERVAL_MS = 1 * 60 * 1000; // 1 minute

const enforceDriverOffline = async () => {
    try {
        const cutoff = new Date(Date.now() - DRIVER_AUTO_OFFLINE_MS);

        const snapshot = await db
            .collection('users')
            .where('role', '==', 'driver')
            .where('driverStatus.isOnline', '==', true)
            .where('driverStatus.lastHeartbeat', '<=', cutoff)
            .limit(200)
            .get();

        if (snapshot.empty) {
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                'driverStatus.isOnline': false,
                'driverStatus.state': 'offline',
                'driverStatus.autoOfflineAt': new Date()
            });

            rtdb.ref(`drivers/${doc.id}/status`).update({
                isOnline: false,
                state: 'offline',
                updatedAt: new Date().toISOString()
            });
        });

        await batch.commit();
        logger.info({ count: snapshot.size }, 'Auto-offlined inactive drivers');
    } catch (error) {
        logger.error({ err: error }, 'Driver auto-offline monitor failed');
    }
};

export const startDriverStatusMonitor = (): void => {
    enforceDriverOffline().catch((err) => logger.error({ err }, 'Initial driver monitor run failed'));

    const interval = setInterval(() => {
        enforceDriverOffline().catch((err) => logger.error({ err }, 'Driver monitor run failed'));
    }, DRIVER_STATUS_SCAN_INTERVAL_MS);

    if (typeof interval.unref === 'function') {
        interval.unref();
    }
};