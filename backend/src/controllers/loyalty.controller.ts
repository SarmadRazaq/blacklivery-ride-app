import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { loyaltyService } from '../services/LoyaltyService';
import { logger } from '../utils/logger';

/**
 * Get the authenticated user's loyalty account
 */
export const getLoyaltyAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const account = await loyaltyService.getAccount(req.user.uid);
        if (!account) {
            res.status(200).json({
                userId: req.user.uid,
                points: 0,
                tier: 'bronze',
                lifetimePoints: 0,
                lifetimeTrips: 0,
                message: 'No loyalty activity yet. Complete a ride to start earning!'
            });
            return;
        }
        res.status(200).json(account);
    } catch (error) {
        logger.error({ err: error }, 'Failed to get loyalty account');
        res.status(500).json({ error: 'Failed to get loyalty account' });
    }
};

/**
 * Get loyalty points history
 */
export const getLoyaltyHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const history = await loyaltyService.getHistory(req.user.uid, limit);
        res.status(200).json(history);
    } catch (error) {
        logger.error({ err: error }, 'Failed to get loyalty history');
        res.status(500).json({ error: 'Failed to get loyalty history' });
    }
};

/**
 * Get available rewards
 */
export const getAvailableRewards = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const rewards = loyaltyService.getAvailableRewards();
        res.status(200).json(rewards);
    } catch (error) {
        logger.error({ err: error }, 'Failed to get rewards');
        res.status(500).json({ error: 'Failed to get rewards' });
    }
};

/**
 * Redeem points for a reward
 */
export const redeemPoints = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rewardType } = req.body;
        if (!rewardType) {
            res.status(400).json({ error: 'rewardType is required' });
            return;
        }

        const redemption = await loyaltyService.redeemPoints(req.user.uid, rewardType);
        res.status(201).json(redemption);
    } catch (error: any) {
        if (error.message.includes('Insufficient points')) {
            res.status(400).json({ error: error.message });
            return;
        }
        logger.error({ err: error }, 'Failed to redeem points');
        res.status(500).json({ error: 'Redemption failed' });
    }
};

/**
 * Get active (unused) redemptions
 */
export const getActiveRedemptions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const redemptions = await loyaltyService.getActiveRedemptions(req.user.uid);
        res.status(200).json(redemptions);
    } catch (error) {
        logger.error({ err: error }, 'Failed to get active redemptions');
        res.status(500).json({ error: 'Failed to get active redemptions' });
    }
};
