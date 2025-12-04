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
        const { code, region } = req.body;
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
        if (promo.regions && !promo.regions.includes(region)) {
            res.status(400).json({ message: 'Promotion not available in this region' });
            return;
        }
        if (promo.endsAt && new Date(promo.endsAt) < new Date()) {
            res.status(400).json({ message: 'Promotion has expired' });
            return;
        }
        // Check if user already used it
        const usageSnap = yield firebase_1.db.collection('promotion_usages')
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
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to apply promotion');
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.applyPromotion = applyPromotion;
const listMyPromotions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Placeholder: In future, if we have "saved" promos in user profile
    res.status(200).json([]);
});
exports.listMyPromotions = listMyPromotions;
//# sourceMappingURL=promotion.controller.js.map