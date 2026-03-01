import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { runDailySettlement, cleanupStaleRides, cleanupInactiveDrivers, processAutoPayouts, recalculateSurge, dispatchScheduledRides } from '../controllers/cron.controller';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Router-level middleware: verifies x-cron-secret header on ALL cron routes.
 * Ensures no cron endpoint can accidentally skip auth.
 */
const verifyCronSecret = (req: Request, res: Response, next: NextFunction): void => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        logger.error('CRON_SECRET is not configured — rejecting cron request');
        res.status(503).json({ error: 'Cron endpoint not configured' });
        return;
    }
    const authHeader = req.headers['x-cron-secret'] as string | undefined;
    if (!authHeader || authHeader.length !== cronSecret.length ||
        !crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(cronSecret))) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
    }
    next();
};

router.use(verifyCronSecret);

/**
 * @swagger
 * tags:
 *   name: Cron
 *   description: Scheduled Tasks (protected by x-cron-secret header)
 */

/**
 * @swagger
 * /cron/settle-incentives:
 *   post:
 *     summary: Run daily incentive settlement
 *     tags: [Cron]
 *     parameters:
 *       - in: header
 *         name: x-cron-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Settlement results
 */
router.post('/settle-incentives', runDailySettlement);

/**
 * @swagger
 * /cron/cleanup-stale-rides:
 *   post:
 *     summary: Cancel rides stuck in finding_driver or accepted too long
 *     tags: [Cron]
 *     parameters:
 *       - in: header
 *         name: x-cron-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cleanup results
 */
router.post('/cleanup-stale-rides', cleanupStaleRides);

/**
 * @swagger
 * /cron/cleanup-inactive-drivers:
 *   post:
 *     summary: Set drivers offline if no heartbeat for 15 minutes
 *     tags: [Cron]
 *     parameters:
 *       - in: header
 *         name: x-cron-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cleanup results
 */
router.post('/cleanup-inactive-drivers', cleanupInactiveDrivers);

/**
 * @swagger
 * /cron/process-payouts:
 *   post:
 *     summary: Process auto-payouts for eligible drivers
 *     tags: [Cron]
 *     parameters:
 *       - in: header
 *         name: x-cron-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payout results
 */
router.post('/process-payouts', processAutoPayouts);

/**
 * @swagger
 * /cron/recalculate-surge:
 *   post:
 *     summary: Trigger surge pricing recalculation
 *     tags: [Cron]
 *     parameters:
 *       - in: header
 *         name: x-cron-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Surge recalculation acknowledged
 */
router.post('/recalculate-surge', recalculateSurge);

/**
 * @swagger
 * /cron/dispatch-scheduled:
 *   post:
 *     summary: Dispatch scheduled rides whose time has arrived
 *     tags: [Cron]
 *     parameters:
 *       - in: header
 *         name: x-cron-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dispatch results
 */
router.post('/dispatch-scheduled', dispatchScheduledRides);

export default router;

