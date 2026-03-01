import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { incentiveService } from '../services/driver/IncentiveService';
import { surgeService } from '../services/pricing/SurgeService';
import { logger } from '../utils/logger';

// Auth is handled by verifyCronSecret middleware at the router level (cron.routes.ts)

export const runDailySettlement = async (req: Request, res: Response) => {

    try {
        logger.info('Starting daily incentive settlement...');
        
        const activeIncentives = await db.collection('incentives')
            .where('isPaid', '==', false)
            .where('totalEarned', '>', 0)
            .get();

        const driverIds = new Set<string>();
        activeIncentives.docs.forEach(doc => driverIds.add(doc.data().driverId));

        logger.info({ count: driverIds.size }, 'Found drivers with pending incentives');

        const results = { success: 0, failed: 0, errors: [] as any[] };

        for (const driverId of Array.from(driverIds)) {
            try {
                await incentiveService.settleIncentives(driverId);
                results.success++;
            } catch (error: any) {
                results.failed++;
                results.errors.push({ driverId, error: error.message });
                logger.error({ err: error, driverId }, 'Failed to settle incentives for driver');
            }
        }

        logger.info(results, 'Daily settlement completed');
        res.status(200).json(results);
    } catch (error: any) {
        logger.error({ err: error }, 'Daily settlement job failed');
        res.status(500).json({ error: error.message });
    }
};

/**
 * Clean up stale rides stuck in finding_driver or accepted for too long
 * Should run every 5–10 minutes
 */
export const cleanupStaleRides = async (req: Request, res: Response) => {

    try {
        logger.info('Starting stale ride cleanup...');
        const now = new Date();

        // Rides stuck in "finding_driver" for more than 10 minutes
        const findingCutoff = new Date(now.getTime() - 10 * 60 * 1000);
        const staleFindings = await db.collection('rides')
            .where('status', '==', 'finding_driver')
            .where('createdAt', '<', findingCutoff)
            .get();

        // Rides stuck in "accepted" for more than 30 minutes (driver never arrived)
        const acceptedCutoff = new Date(now.getTime() - 30 * 60 * 1000);
        const staleAccepted = await db.collection('rides')
            .where('status', '==', 'accepted')
            .where('updatedAt', '<', acceptedCutoff)
            .get();

        let cancelled = 0;
        const allDocs = [
            ...staleFindings.docs.map(d => ({ ref: d.ref, reason: 'system_timeout_no_driver' })),
            ...staleAccepted.docs.map(d => ({ ref: d.ref, reason: 'system_timeout_driver_no_show' }))
        ];

        // Firestore batches are limited to 500 ops — chunk accordingly
        const BATCH_LIMIT = 500;
        for (let i = 0; i < allDocs.length; i += BATCH_LIMIT) {
            const chunk = allDocs.slice(i, i + BATCH_LIMIT);
            const batch = db.batch();
            for (const item of chunk) {
                batch.update(item.ref, {
                    status: 'cancelled',
                    cancellationReason: item.reason,
                    cancelledBy: 'system',
                    updatedAt: now
                });
                cancelled++;
            }
            await batch.commit();
        }

        logger.info({ cancelled, staleFindings: staleFindings.size, staleAccepted: staleAccepted.size }, 'Stale ride cleanup completed');
        res.status(200).json({ cancelled, staleFindings: staleFindings.size, staleAccepted: staleAccepted.size });
    } catch (error: any) {
        logger.error({ err: error }, 'Stale ride cleanup failed');
        res.status(500).json({ error: error.message });
    }
};

/**
 * Mark drivers offline if no heartbeat in 15 minutes
 * Should run every 5 minutes
 */
export const cleanupInactiveDrivers = async (req: Request, res: Response) => {

    try {
        logger.info('Starting inactive driver cleanup...');
        const cutoffTime = new Date(Date.now() - 15 * 60 * 1000);

        const inactiveDrivers = await db.collection('users')
            .where('role', '==', 'driver')
            .where('driverStatus.isOnline', '==', true)
            .where('driverStatus.lastHeartbeat', '<', cutoffTime)
            .get();

        let offlined = 0;
        const BATCH_LIMIT = 500;
        const docs = inactiveDrivers.docs;

        for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
            const chunk = docs.slice(i, i + BATCH_LIMIT);
            const batch = db.batch();
            for (const doc of chunk) {
                batch.update(doc.ref, {
                    'driverStatus.isOnline': false,
                    'driverStatus.offlineReason': 'heartbeat_timeout',
                    'driverStatus.updatedAt': new Date()
                });
                offlined++;
            }
            await batch.commit();
        }

        logger.info({ offlined }, 'Inactive driver cleanup completed');
        res.status(200).json({ offlined });
    } catch (error: any) {
        logger.error({ err: error }, 'Inactive driver cleanup failed');
        res.status(500).json({ error: error.message });
    }
};

/**
 * Process pending auto-payouts for drivers with balance above threshold
 * Should run daily or on-demand
 */
export const processAutoPayouts = async (req: Request, res: Response) => {

    try {
        logger.info('Starting auto payout processing...');

        // Find drivers who have enabled auto-payout and have sufficient balance
        const driversSnap = await db.collection('users')
            .where('role', '==', 'driver')
            .where('driverProfile.autoPayoutEnabled', '==', true)
            .get();

        const results = { processed: 0, skipped: 0, failed: 0, errors: [] as any[] };

        for (const doc of driversSnap.docs) {
            try {
                const driver = doc.data();
                const threshold = driver.driverProfile?.autoPayoutThreshold || 10000; // default ₦10,000 / $100

                // Get driver wallet balance
                const walletSnap = await db.collection('wallets').doc(doc.id).get();
                const balance = walletSnap.exists ? (walletSnap.data()?.available || walletSnap.data()?.balance?.amount || 0) : 0;

                if (balance < threshold) {
                    results.skipped++;
                    continue;
                }

                // Create a payout request
                await db.collection('payout_requests').add({
                    driverId: doc.id,
                    amount: balance,
                    currency: driver.region === 'US-CHI' ? 'USD' : 'NGN',
                    status: 'pending',
                    type: 'auto',
                    bankDetails: driver.driverProfile?.bankDetails || null,
                    createdAt: new Date()
                });

                results.processed++;
            } catch (error: any) {
                results.failed++;
                results.errors.push({ driverId: doc.id, error: error.message });
            }
        }

        logger.info(results, 'Auto payout processing completed');
        res.status(200).json(results);
    } catch (error: any) {
        logger.error({ err: error }, 'Auto payout processing failed');
        res.status(500).json({ error: error.message });
    }
};

/**
 * Recalculate surge pricing zones
 * Should run every 2–5 minutes in production
 */
export const recalculateSurge = async (req: Request, res: Response) => {

    try {
        logger.info('Manual surge recalculation triggered');

        // Clear the cache so next pricing requests recalculate fresh
        surgeService.clearCache();

        // Pre-warm surge for zones with active rides
        const activeRides = await db.collection('rides')
            .where('status', 'in', ['finding_driver', 'accepted', 'en_route'])
            .limit(50)
            .get();

        const processedZones = new Set<string>();
        let recalculated = 0;

        for (const doc of activeRides.docs) {
            const ride = doc.data();
            const lat = ride.pickupLocation?.lat ?? ride.pickup?.coordinates?.lat;
            const lng = ride.pickupLocation?.lng ?? ride.pickup?.coordinates?.lng;
            const region = ride.region || 'NG';
            if (!lat || !lng) continue;

            const zoneKey = `${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
            if (processedZones.has(zoneKey)) continue;
            processedZones.add(zoneKey);

            const multiplier = await surgeService.getMultiplier(lat, lng, region);
            recalculated++;
        }

        res.status(200).json({ message: 'Surge recalculated', zones: recalculated });
    } catch (error: any) {
        logger.error({ err: error }, 'Surge recalculation failed');
        res.status(500).json({ error: error.message });
    }
};

/**
 * Dispatch scheduled rides whose scheduled time has arrived.
 * Finds rides with scheduledAt <= now + 5min that are still in 'requested' status
 * and kicks off driver matching for each.
 */
export const dispatchScheduledRides = async (req: Request, res: Response) => {
    try {
        logger.info('Starting scheduled ride dispatch...');
        const now = new Date();
        const dispatchWindow = new Date(now.getTime() + 5 * 60 * 1000); // 5 min ahead

        const scheduledRides = await db.collection('rides')
            .where('status', '==', 'requested')
            .where('scheduledAt', '<=', dispatchWindow)
            .where('scheduledAt', '>=', new Date(now.getTime() - 30 * 60 * 1000)) // not older than 30 min
            .limit(50)
            .get();

        const results = { dispatched: 0, failed: 0, errors: [] as any[] };

        for (const doc of scheduledRides.docs) {
            try {
                const ride = doc.data();
                // Skip if already being matched
                if (ride.matchingStarted) continue;

                // Mark as being dispatched to avoid double-dispatch
                await doc.ref.update({
                    status: 'finding_driver',
                    matchingStarted: true,
                    updatedAt: now
                });

                // Lazy-import to avoid circular dependency
                const { rideService } = require('../services/RideService');
                await rideService.startDriverMatching(doc.id);
                results.dispatched++;
            } catch (error: any) {
                results.failed++;
                results.errors.push({ rideId: doc.id, error: error.message });
                logger.error({ err: error, rideId: doc.id }, 'Failed to dispatch scheduled ride');
            }
        }

        logger.info(results, 'Scheduled ride dispatch completed');
        res.status(200).json(results);
    } catch (error: any) {
        logger.error({ err: error }, 'Scheduled ride dispatch failed');
        res.status(500).json({ error: error.message });
    }
};

