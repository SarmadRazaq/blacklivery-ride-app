import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { incentiveService } from '../services/driver/IncentiveService';
import { logger } from '../utils/logger';

export const runDailySettlement = async (req: Request, res: Response) => {
    // Protect with a secret header (simple auth for cron jobs)
    const authHeader = req.headers['x-cron-secret'];
    if (authHeader !== process.env.CRON_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        logger.info('Starting daily incentive settlement...');
        
        // Get all drivers with pending incentives
        // This query might be expensive in production; better to keep a list of "active" drivers
        // For now, querying recent active drivers or just iterating incentives
        const activeIncentives = await db.collection('incentives')
            .where('isPaid', '==', false)
            .where('totalEarned', '>', 0)
            .get();

        const driverIds = new Set<string>();
        activeIncentives.docs.forEach(doc => driverIds.add(doc.data().driverId));

        logger.info({ count: driverIds.size }, 'Found drivers with pending incentives');

        const results = {
            success: 0,
            failed: 0,
            errors: [] as any[]
        };

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

