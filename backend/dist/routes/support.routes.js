"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const support_controller_1 = require("../controllers/support.controller");
const router = (0, express_1.Router)();
const wrap = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};
router.use(auth_middleware_1.verifyToken);
/**
 * @swagger
 * tags:
 *   name: Support
 *   description: Support Ticket Management
 */
/**
 * @swagger
 * /support:
 *   post:
 *     summary: Create a support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ticket created
 */
router.post('/', wrap(support_controller_1.createSupportTicket));
/**
 * @swagger
 * /support:
 *   get:
 *     summary: Get my support tickets
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tickets
 */
router.get('/', wrap(support_controller_1.getMyTickets));
/**
 * @swagger
 * /support/{id}/reply:
 *   post:
 *     summary: Reply to a support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reply added
 */
router.post('/:id/reply', wrap(support_controller_1.replyToTicket));
exports.default = router;
//# sourceMappingURL=support.routes.js.map