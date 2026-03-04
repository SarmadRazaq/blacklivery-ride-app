import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { loyaltyService } from '../services/LoyaltyService';
import { db } from '../config/firebase';
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

/**
 * Backfill loyalty points for completed rides that were missed.
 * Scans the user's completed rides and awards points for any not yet recorded.
 */
export const backfillPoints = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.uid;

        // Get all completed rides for this user
        const ridesSnap = await db.collection('rides')
            .where('riderId', '==', userId)
            .where('status', '==', 'completed')
            .orderBy('completedAt', 'desc')
            .limit(50)
            .get();

        if (ridesSnap.empty) {
            res.status(200).json({ message: 'No completed rides found', pointsAwarded: 0, ridesProcessed: 0 });
            return;
        }

        // Get existing loyalty history to find already-awarded ride IDs
        const historySnap = await db.collection('loyalty_history')
            .where('userId', '==', userId)
            .where('type', '==', 'earn')
            .get();

        const awardedDescriptions = new Set(historySnap.docs.map(d => d.data().description as string));

        let totalPointsAwarded = 0;
        let ridesProcessed = 0;

        for (const rideDoc of ridesSnap.docs) {
            const ride = rideDoc.data();
            const rideId = rideDoc.id;

            // Check if already awarded (description pattern: "Earned X points from ride")
            const alreadyAwarded = historySnap.docs.some(d => {
                const data = d.data();
                return data.rideId === rideId || (data.description && data.description.includes(rideId));
            }) || awardedDescriptions.has(`Earned points from ride ${rideId}`);

            if (alreadyAwarded) continue;

            const fare = ride.pricing?.finalFare ?? ride.pricing?.estimatedFare ?? 0;
            const currency = ride.pricing?.currency ?? 'USD';

            if (fare <= 0) continue;

            try {
                const result = await loyaltyService.awardPoints(userId, fare, currency);
                // Tag the history entry with rideId for dedup
                await db.collection('loyalty_history')
                    .where('userId', '==', userId)
                    .where('type', '==', 'earn')
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get()
                    .then(snap => {
                        if (!snap.empty) {
                            snap.docs[0].ref.update({ rideId });
                        }
                    });

                totalPointsAwarded += result.pointsAwarded;
                ridesProcessed++;
                logger.info({ rideId, pointsAwarded: result.pointsAwarded }, 'Backfilled loyalty points');
            } catch (err) {
                logger.warn({ err, rideId }, 'Failed to backfill points for ride');
            }
        }

        const account = await loyaltyService.getAccount(userId);

        res.status(200).json({
            message: `Backfilled ${ridesProcessed} ride(s)`,
            pointsAwarded: totalPointsAwarded,
            ridesProcessed,
            currentPoints: account?.points ?? 0,
            tier: account?.tier ?? 'bronze'
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to backfill loyalty points');
        res.status(500).json({ error: 'Failed to backfill loyalty points' });
    }
};
