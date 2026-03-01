/**
 * B2B Delivery Pricing Service
 *
 * Provides tiered discounts for business accounts based on monthly delivery volume.
 * Tiers:
 *   0–200   deliveries/month → 0% discount, 25% commission
 *   201–500 deliveries/month → 10% discount, 20% commission
 *   501–2000 deliveries/month → 15% discount, 18% commission
 *   2000+  deliveries/month → Custom (default 20% discount, 15% commission)
 */

import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';

export type B2BTier = 'starter' | 'growth' | 'enterprise' | 'custom';

export interface B2BAccount {
    id?: string;
    userId: string;
    businessName: string;
    contactEmail: string;
    contactPhone?: string;
    tier: B2BTier;
    customDiscount?: number;       // Custom discount rate for 'custom' tier
    customCommission?: number;     // Custom commission rate for 'custom' tier
    monthlyDeliveryCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface TierConfig {
    minDeliveries: number;
    maxDeliveries: number;
    discountRate: number;      // Discount on base fare (0.10 = 10% off)
    commissionRate: number;    // Platform commission (0.25 = 25%)
}

const TIER_CONFIG: Record<B2BTier, TierConfig> = {
    starter: {
        minDeliveries: 0,
        maxDeliveries: 200,
        discountRate: 0,
        commissionRate: 0.25,
    },
    growth: {
        minDeliveries: 201,
        maxDeliveries: 500,
        discountRate: 0.10,
        commissionRate: 0.20,
    },
    enterprise: {
        minDeliveries: 501,
        maxDeliveries: 2000,
        discountRate: 0.15,
        commissionRate: 0.18,
    },
    custom: {
        minDeliveries: 2001,
        maxDeliveries: Infinity,
        discountRate: 0.20,   // Default, overridden per account
        commissionRate: 0.15, // Default, overridden per account
    },
};

class B2BPricingService {
    private readonly collection = db.collection('b2b_accounts');

    /**
     * Get a B2B account by userId
     */
    async getAccount(userId: string): Promise<B2BAccount | null> {
        const snap = await this.collection
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (snap.empty) return null;
        const doc = snap.docs[0];
        return { id: doc.id, ...doc.data() } as B2BAccount;
    }

    /**
     * Get a B2B account by its document ID
     */
    async getAccountById(accountId: string): Promise<B2BAccount | null> {
        const doc = await this.collection.doc(accountId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as B2BAccount;
    }

    /**
     * Create a new B2B account
     */
    async createAccount(input: {
        userId: string;
        businessName: string;
        contactEmail: string;
        contactPhone?: string;
        tier?: B2BTier;
        customDiscount?: number;
        customCommission?: number;
    }): Promise<B2BAccount> {
        const now = new Date();
        const account: Omit<B2BAccount, 'id'> = {
            userId: input.userId,
            businessName: input.businessName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            tier: input.tier ?? 'starter',
            ...(input.customDiscount !== undefined && { customDiscount: input.customDiscount }),
            ...(input.customCommission !== undefined && { customCommission: input.customCommission }),
            monthlyDeliveryCount: 0,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await this.collection.add(account);
        return { id: docRef.id, ...account };
    }

    /**
     * Update an existing B2B account
     */
    async updateAccount(
        accountId: string,
        updates: Partial<Pick<B2BAccount, 'businessName' | 'contactEmail' | 'contactPhone' | 'tier' | 'customDiscount' | 'customCommission' | 'isActive'>>
    ): Promise<B2BAccount | null> {
        const docRef = this.collection.doc(accountId);
        const doc = await docRef.get();
        if (!doc.exists) return null;

        await docRef.update({ ...updates, updatedAt: new Date() });
        const updated = await docRef.get();
        return { id: updated.id, ...updated.data() } as B2BAccount;
    }

    /**
     * List all B2B accounts (for admin)
     */
    async listAccounts(options: { activeOnly?: boolean; limit?: number; offset?: number } = {}): Promise<B2BAccount[]> {
        let query: FirebaseFirestore.Query = this.collection;

        if (options.activeOnly !== false) {
            query = query.where('isActive', '==', true);
        }

        query = query.orderBy('createdAt', 'desc');

        if (options.offset) {
            query = query.offset(options.offset);
        }

        query = query.limit(options.limit ?? 50);

        const snap = await query.get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as B2BAccount));
    }

    /**
     * Determine the tier for a given monthly delivery count
     */
    getTierForVolume(monthlyDeliveries: number): B2BTier {
        if (monthlyDeliveries > 2000) return 'custom';
        if (monthlyDeliveries > 500) return 'enterprise';
        if (monthlyDeliveries > 200) return 'growth';
        return 'starter';
    }

    /**
     * Get the discount rate for a B2B account
     */
    getDiscountRate(account: B2BAccount): number {
        const tierConfig = TIER_CONFIG[account.tier];
        if (account.tier === 'custom' && account.customDiscount !== undefined) {
            return account.customDiscount;
        }
        return tierConfig.discountRate;
    }

    /**
     * Get the commission rate for a B2B account
     */
    getCommissionRate(account: B2BAccount): number {
        const tierConfig = TIER_CONFIG[account.tier];
        if (account.tier === 'custom' && account.customCommission !== undefined) {
            return account.customCommission;
        }
        return tierConfig.commissionRate;
    }

    /**
     * Apply B2B discount to a base delivery fare
     * Returns the discounted fare and metadata
     */
    applyBusinessDiscount(baseFare: number, account: B2BAccount): {
        discountedFare: number;
        discount: number;
        discountRate: number;
        commissionRate: number;
        tier: B2BTier;
    } {
        const discountRate = this.getDiscountRate(account);
        const commissionRate = this.getCommissionRate(account);
        const discount = Math.round(baseFare * discountRate * 100) / 100;
        const discountedFare = Math.round((baseFare - discount) * 100) / 100;

        return {
            discountedFare,
            discount,
            discountRate,
            commissionRate,
            tier: account.tier,
        };
    }

    /**
     * Increment the monthly delivery count for a B2B account.
     * Called after a delivery is completed.
     * Also auto-upgrades tier if volume threshold is crossed.
     */
    async recordDeliveryCompletion(userId: string): Promise<void> {
        try {
            const account = await this.getAccount(userId);
            if (!account || !account.id) return;

            const newCount = (account.monthlyDeliveryCount ?? 0) + 1;
            const newTier = this.getTierForVolume(newCount);

            const updates: Record<string, any> = {
                monthlyDeliveryCount: newCount,
                updatedAt: new Date(),
            };

            // Auto-upgrade tier (but never downgrade from custom)
            if (account.tier !== 'custom' && newTier !== account.tier) {
                updates.tier = newTier;
                logger.info({
                    accountId: account.id,
                    oldTier: account.tier,
                    newTier,
                    monthlyCount: newCount
                }, 'B2B account auto-upgraded tier');
            }

            await this.collection.doc(account.id).update(updates);
        } catch (error) {
            logger.error({ err: error, userId }, 'Failed to record B2B delivery completion');
        }
    }

    /**
     * Reset monthly delivery counts (run monthly via cron)
     */
    async resetMonthlyCounts(): Promise<void> {
        const snap = await this.collection.where('isActive', '==', true).get();
        const batch = db.batch();

        for (const doc of snap.docs) {
            batch.update(doc.ref, {
                monthlyDeliveryCount: 0,
                updatedAt: new Date(),
            });
        }

        await batch.commit();
        logger.info({ count: snap.size }, 'Reset monthly delivery counts for B2B accounts');
    }
}

export const b2bPricingService = new B2BPricingService();
