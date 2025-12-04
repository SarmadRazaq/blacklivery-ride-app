import { Router } from 'express';
import { runDailySettlement } from '../controllers/cron.controller';

const router = Router();

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
router.post('/settle-incentives', runDailySettlement);

export default router;

