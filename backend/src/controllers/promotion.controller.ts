import { Response } from 'express';
import { db } from '../config/firebase';
import { AuthRequest } from '../types/express';
import { logger } from '../utils/logger';

export const applyPromotion = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { code } = req.body;
        let region = req.body.region || req.user.region;

        // Normalize
        if (region) {
            const r = region.toLowerCase().trim();
            if (r.includes('nigeria') || r === 'ng') region = 'NG';
            else if (r === 'chicago' || r.includes('us') || r === 'us-chi') region = 'US-CHI';
        }

        const userId = req.user.uid;

        const promoSnap = await db.collection('promotions')
            .where('code', '==', code)
            .where('active', '==', true)
            .limit(1)
            .get();

        if (promoSnap.empty) {
            res.status(404).json({ message: 'Invalid or expired promotion code' });
            return;
        }

        const promoDoc = promoSnap.docs[0];
        const promo = promoDoc.data();

        // Checks
        if (promo.regions && promo.regions.length > 0) {
            // Normalize stored regions for comparison to handle legacy data
            const normalizedPromoRegions = promo.regions.map((r: string) => {
                let norm = r.toLowerCase().trim();
                if (norm.includes('nigeria') || norm === 'ng') return 'NG';
                if (norm.includes('chicago') || norm.includes('us') || norm === 'us-chi') return 'US-CHI';
                return norm;
            });

            if (!region || !normalizedPromoRegions.includes(region)) {
                logger.warn({ userRegion: region, promoRegions: promo.regions, bodyRegion: req.body.region, userProfileRegion: req.user.region }, 'Promotion region mismatch debug');
                res.status(400).json({ message: `Promotion not available in this region. User region: ${region}, Allowed: ${normalizedPromoRegions.join(', ')}` });
                return;
            }
        }


        if (promo.endsAt && new Date(promo.endsAt) < new Date()) {
            res.status(400).json({ message: 'Promotion has expired' });
            return;
        }

        // Check if promotion hasn't started yet
        if (promo.startsAt && new Date(promo.startsAt) > new Date()) {
            res.status(400).json({ message: 'Promotion has not started yet' });
            return;
        }

        // Check maxRedemptions limit
        if (promo.maxRedemptions) {
            const totalUsageSnap = await db.collection('promotion_usages')
                .where('promotionId', '==', promoDoc.id)
                .count()
                .get();
            const totalUsages = totalUsageSnap.data().count;
            if (totalUsages >= promo.maxRedemptions) {
                res.status(400).json({ message: 'Promotion has reached its maximum number of redemptions' });
                return;
            }
        }

        // Check if user already used it
        // Check if user already used it (completed ride)
        const usageSnap = await db.collection('promotion_usages')
            .where('promotionId', '==', promoDoc.id)
            .where('userId', '==', userId)
            .get();

        if (!usageSnap.empty) {
            res.status(400).json({ message: 'You have already used this promotion' });
            return;
        }

        // Check if user already has it in their active wallet (applied but not used)
        const activeSnap = await db.collection('user_promotions')
            .where('promotionId', '==', promoDoc.id)
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .get();

        if (!activeSnap.empty) {
            res.status(400).json({ message: 'You already have this promotion active' });
            return;
        }

        // Determine discount value for display
        const valueDisplay = promo.discountType === 'percentage' ? `${promo.amount}%` : `${promo.amount}`;

        // Return details and SAVE to user's wallet of promotions
        const userPromoRef = await db.collection('user_promotions').add({
            userId,
            promotionId: promoDoc.id,
            code: promo.code,
            discountType: promo.discountType,
            amount: promo.amount,
            description: promo.description,
            appliedAt: new Date(),
            status: 'active', // active, used, expired
            expiresAt: promo.endsAt ? new Date(promo.endsAt) : null
        });

        res.status(200).json({
            message: 'Promotion applied',
            promotion: {
                id: promoDoc.id,
                userPromotionId: userPromoRef.id,
                code: promo.code,
                discountType: promo.discountType,
                amount: promo.amount,
                description: promo.description
            }
        });

    } catch (error) {
        logger.error({ err: error }, 'Failed to apply promotion');
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const listMyPromotions = async (req: AuthRequest, res: Response): Promise<void> => {
    // Placeholder: In future, if we have "saved" promos in user profile
    try {
        const userId = req.user.uid;
        const snapshot = await db.collection('user_promotions')
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .get();

        const promotions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json(promotions);
    } catch (error) {
        logger.error({ err: error }, 'Failed to list my promotions');
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAvailablePromotions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const snapshot = await db.collection('promotions')
            .where('active', '==', true)
            .get();

        const promotions = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((promo: any) => {
                if (promo.endsAt && new Date(promo.endsAt) < now) return false;
                if (promo.startsAt && new Date(promo.startsAt) > now) return false;
                return true;
            });

        res.status(200).json({ data: promotions });
    } catch (error) {
        logger.error({ err: error }, 'Failed to list available promotions');
        res.status(500).json({ message: 'Internal server error' });
    }
};

