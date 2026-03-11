import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { earningsService } from '../services/EarningsService';
import { logger } from '../utils/logger';

export const getEarningsDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const dashboardData = await earningsService.getDriverDashboard(uid);
        res.status(200).json(dashboardData);
    } catch (error) {
        logger.error({ err: error }, 'getEarningsDashboard failed');
        res.status(500).json({ error: 'Unable to fetch earnings dashboard' });
    }
};

export const updateEarningsGoal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { goal } = req.body;
        if (typeof goal !== 'number' || goal <= 0) {
            res.status(400).json({ error: 'Goal must be a positive number' });
            return;
        }
        await earningsService.updateEarningsGoal(uid, goal);
        res.status(200).json({ success: true, goal });
    } catch (error) {
        logger.error({ err: error }, 'updateEarningsGoal failed');
        res.status(500).json({ error: 'Unable to update earnings goal' });
    }
};

export const getPayouts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const payouts = await earningsService.getPayoutHistory(uid);
        res.status(200).json({ payouts });
    } catch (error) {
        logger.error({ err: error }, 'getPayouts failed');
        res.status(500).json({ error: 'Unable to fetch payouts' });
    }
};
