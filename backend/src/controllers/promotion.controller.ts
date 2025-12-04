import { Response } from 'express';
import { db } from '../config/firebase';
import { AuthRequest } from '../types/express';
import { logger } from '../utils/logger';

export const applyPromotion = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { code, region } = req.body;
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
        if (promo.regions && !promo.regions.includes(region)) {
            res.status(400).json({ message: 'Promotion not available in this region' });
            return;
        }
        
        if (promo.endsAt && new Date(promo.endsAt) < new Date()) {
             res.status(400).json({ message: 'Promotion has expired' });
             return;
        }

        // Check if user already used it
        const usageSnap = await db.collection('promotion_usages')
            .where('promotionId', '==', promoDoc.id)
            .where('userId', '==', userId)
            .get();

        if (!usageSnap.empty) {
            res.status(400).json({ message: 'You have already used this promotion' });
            return;
        }

        // Determine discount value for display
        const valueDisplay = promo.discountType === 'percentage' ? `${promo.amount}%` : `${promo.amount}`;

        // Return details (Frontend will store this to send with Ride Request)
        res.status(200).json({
            message: 'Promotion applied',
            promotion: {
                id: promoDoc.id,
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
    res.status(200).json([]); 
};

