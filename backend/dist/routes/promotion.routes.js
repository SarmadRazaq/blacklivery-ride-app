"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const promotion_controller_1 = require("../controllers/promotion.controller");
const router = (0, express_1.Router)();
const wrap = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};
router.use(auth_middleware_1.verifyToken);
/**
 * @swagger
 * tags:
 *   name: Promotions
 *   description: Promotion Management
 */
/**
 * @swagger
 * /promotions/apply:
 *   post:
 *     summary: Apply a promotion code
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Promotion applied
 */
router.post('/apply', wrap(promotion_controller_1.applyPromotion));
/**
 * @swagger
 * /promotions/mine:
 *   get:
 *     summary: List my promotions
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of promotions
 */
router.get('/mine', wrap(promotion_controller_1.listMyPromotions));
exports.default = router;
//# sourceMappingURL=promotion.routes.js.map