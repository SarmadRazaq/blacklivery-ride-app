"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyPromotions = exports.applyPromotion = void 0;
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
const applyPromotion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.body;
        let region = req.body.region || req.user.region;
        // Normalize
        if (region) {
            const r = region.toLowerCase().trim();
            if (r.includes('nigeria') || r === 'ng')
                region = 'NG';
            else if (r === 'chicago' || r.includes('us') || r === 'us-chi')
                region = 'US-CHI';
        }
        const userId = req.user.uid;
        const promoSnap = yield firebase_1.db.collection('promotions')
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
            const normalizedPromoRegions = promo.regions.map((r) => {
                let norm = r.toLowerCase().trim();
                if (norm.includes('nigeria') || norm === 'ng')
                    return 'NG';
                if (norm.includes('chicago') || norm.includes('us') || norm === 'us-chi')
                    return 'US-CHI';
                return norm;
            });
            if (!region || !normalizedPromoRegions.includes(region)) {
                logger_1.logger.warn({ userRegion: region, promoRegions: promo.regions, bodyRegion: req.body.region, userProfileRegion: req.user.region }, 'Promotion region mismatch debug');
                res.status(400).json({ message: `Promotion not available in this region. User region: ${region}, Allowed: ${normalizedPromoRegions.join(', ')}` });
                return;
            }
        }
        if (promo.endsAt && new Date(promo.endsAt) < new Date()) {
            res.status(400).json({ message: 'Promotion has expired' });
            return;
        }
        // Check if user already used it
        // Check if user already used it (completed ride)
        const usageSnap = yield firebase_1.db.collection('promotion_usages')
            .where('promotionId', '==', promoDoc.id)
            .where('userId', '==', userId)
            .get();
        if (!usageSnap.empty) {
            res.status(400).json({ message: 'You have already used this promotion' });
            return;
        }
        // Check if user already has it in their active wallet (applied but not used)
        const activeSnap = yield firebase_1.db.collection('user_promotions')
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
        const userPromoRef = yield firebase_1.db.collection('user_promotions').add({
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
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to apply promotion');
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.applyPromotion = applyPromotion;
const listMyPromotions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Placeholder: In future, if we have "saved" promos in user profile
    try {
        const userId = req.user.uid;
        const snapshot = yield firebase_1.db.collection('user_promotions')
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .get();
        const promotions = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.status(200).json(promotions);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to list my promotions');
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.listMyPromotions = listMyPromotions;
//# sourceMappingURL=promotion.controller.js.map