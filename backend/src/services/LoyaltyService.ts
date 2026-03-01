import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { RegionCode } from '../config/region.config';
import { pricingConfigService } from './pricing/PricingConfigService';

export interface ILoyaltyAccount {
    userId: string;
    points: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    lifetimePoints: number;
    lifetimeTrips: number;
    tierUpdatedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ILoyaltyRedemption {
    id?: string;
    userId: string;
    pointsSpent: number;
    rewardType: 'ride_discount' | 'free_ride' | 'priority_pickup' | 'vehicle_upgrade';
    rewardValue: number;
    status: 'pending' | 'applied' | 'expired';
    rideId?: string;
    createdAt: Date;
    expiresAt: Date;
}

// Points per currency unit spent
const DEFAULT_POINTS_PER_CURRENCY: Record<string, number> = {
    NGN: 0.1,   // 1 point per ₦10 spent
    USD: 10     // 10 points per $1 spent
};

// Tier thresholds (lifetime points)
const DEFAULT_TIER_THRESHOLDS = {
    bronze: 0,
    silver: 500,
    gold: 2000,
    platinum: 5000
};

// Redemption costs
const REDEMPTION_COSTS = {
    ride_discount: { points: 100, valuePercent: 10 },    // 100 pts = 10% off
    free_ride: { points: 500, valuePercent: 100 },        // 500 pts = free ride
    priority_pickup: { points: 50, valuePercent: 0 },     // 50 pts = priority matching
    vehicle_upgrade: { points: 200, valuePercent: 0 }     // 200 pts = upgrade vehicle category
};

class LoyaltyService {
    private async resolveLoyaltyPolicy(currency: string): Promise<{ pointsPerCurrency: number; tiers: Record<string, number> }> {
        const upperCurrency = String(currency || '').toUpperCase();

        const config = upperCurrency === 'USD'
            ? await pricingConfigService.getChicagoConfig()
            : await pricingConfigService.getNigeriaConfig();

        return {
            pointsPerCurrency: config?.loyalty?.pointsPerCurrency ?? DEFAULT_POINTS_PER_CURRENCY[upperCurrency] ?? 1,
            tiers: config?.loyalty?.tiers ?? DEFAULT_TIER_THRESHOLDS
        };
    }

    /**
     * Award points after a completed ride
     */
    async awardPoints(userId: string, fareAmount: number, currency: string): Promise<{ pointsAwarded: number; newTotal: number; tier: string }> {
        const policy = await this.resolveLoyaltyPolicy(currency);
        const rate = policy.pointsPerCurrency;
        const pointsAwarded = Math.floor(fareAmount * rate);

        if (pointsAwarded <= 0) return { pointsAwarded: 0, newTotal: 0, tier: 'bronze' };

        const accountRef = db.collection('loyalty_accounts').doc(userId);

        const result = await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(accountRef);

            let account: ILoyaltyAccount;
            if (!doc.exists) {
                account = {
                    userId,
                    points: pointsAwarded,
                    tier: 'bronze',
                    lifetimePoints: pointsAwarded,
                    lifetimeTrips: 1,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            } else {
                account = doc.data() as ILoyaltyAccount;
                account.points += pointsAwarded;
                account.lifetimePoints += pointsAwarded;
                account.lifetimeTrips += 1;
                account.updatedAt = new Date();
            }

            // Check tier upgrade
            const newTier = this.calculateTier(account.lifetimePoints, policy.tiers);
            if (newTier !== account.tier) {
                account.tier = newTier;
                account.tierUpdatedAt = new Date();
            }

            transaction.set(accountRef, account);

            return { pointsAwarded, newTotal: account.points, tier: account.tier };
        });

        // Log points history (outside transaction — non-critical)
        await db.collection('loyalty_history').add({
            userId,
            type: 'earn',
            points: pointsAwarded,
            balance: result.newTotal,
            description: `Earned ${pointsAwarded} points from ride`,
            createdAt: new Date()
        });

        return result;
    }

    /**
     * Get loyalty account for a user
     */
    async getAccount(userId: string): Promise<ILoyaltyAccount | null> {
        const doc = await db.collection('loyalty_accounts').doc(userId).get();
        return doc.exists ? (doc.data() as ILoyaltyAccount) : null;
    }

    /**
     * Get points history
     */
    async getHistory(userId: string, limit = 20): Promise<any[]> {
        const snap = await db.collection('loyalty_history')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    /**
     * Redeem points for a reward
     */
    async redeemPoints(userId: string, rewardType: keyof typeof REDEMPTION_COSTS): Promise<ILoyaltyRedemption> {
        const reward = REDEMPTION_COSTS[rewardType];
        if (!reward) throw new Error('Invalid reward type');

        const accountRef = db.collection('loyalty_accounts').doc(userId);

        const result = await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(accountRef);

            if (!doc.exists) throw new Error('No loyalty account found');
            const account = doc.data() as ILoyaltyAccount;

            if (account.points < reward.points) {
                throw new Error(`Insufficient points. Need ${reward.points}, have ${account.points}`);
            }

            // Deduct points atomically within transaction
            const newPoints = account.points - reward.points;
            transaction.update(accountRef, { points: newPoints, updatedAt: new Date() });

            return { newPoints };
        });

        // Create redemption record (outside transaction — non-critical)
        const redemption: ILoyaltyRedemption = {
            userId,
            pointsSpent: reward.points,
            rewardType,
            rewardValue: reward.valuePercent,
            status: 'pending',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };
        const ref = await db.collection('loyalty_redemptions').add(redemption);

        // Log in history
        await db.collection('loyalty_history').add({
            userId,
            type: 'redeem',
            points: -reward.points,
            balance: result.newPoints,
            description: `Redeemed ${reward.points} points for ${rewardType}`,
            redemptionId: ref.id,
            createdAt: new Date()
        });

        return { ...redemption, id: ref.id };
    }

    /**
     * Get active (pending) redemptions for a user
     */
    async getActiveRedemptions(userId: string): Promise<ILoyaltyRedemption[]> {
        const snap = await db.collection('loyalty_redemptions')
            .where('userId', '==', userId)
            .where('status', '==', 'pending')
            .where('expiresAt', '>', new Date())
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ILoyaltyRedemption));
    }

    /**
     * Apply a redemption to a ride (mark as used)
     */
    async applyRedemption(redemptionId: string, rideId: string): Promise<void> {
        await db.collection('loyalty_redemptions').doc(redemptionId).update({
            status: 'applied',
            rideId,
            appliedAt: new Date()
        });
    }

    /**
     * Get available rewards and their costs
     */
    getAvailableRewards() {
        return Object.entries(REDEMPTION_COSTS).map(([type, config]) => ({
            type,
            pointsCost: config.points,
            valuePercent: config.valuePercent,
            description: this.getRewardDescription(type)
        }));
    }

    private calculateTier(lifetimePoints: number, tiers: Record<string, number>): ILoyaltyAccount['tier'] {
        if (lifetimePoints >= (tiers.platinum ?? DEFAULT_TIER_THRESHOLDS.platinum)) return 'platinum';
        if (lifetimePoints >= (tiers.gold ?? DEFAULT_TIER_THRESHOLDS.gold)) return 'gold';
        if (lifetimePoints >= (tiers.silver ?? DEFAULT_TIER_THRESHOLDS.silver)) return 'silver';
        return 'bronze';
    }

    private getRewardDescription(type: string): string {
        const descriptions: Record<string, string> = {
            ride_discount: '10% discount on your next ride',
            free_ride: 'A completely free ride (up to standard fare)',
            priority_pickup: 'Priority driver matching for your next ride',
            vehicle_upgrade: 'Free upgrade to next vehicle category'
        };
        return descriptions[type] || type;
    }
}

export const loyaltyService = new LoyaltyService();
