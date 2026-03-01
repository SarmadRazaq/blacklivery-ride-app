import { Router, RequestHandler } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSupportTicketSchema, replyToTicketSchema } from '../schemas/support.schema';
import { createSupportTicket, getMyTickets, replyToTicket, adminReplyToTicket, getAllTickets, closeTicket } from '../controllers/support.controller';

const router = Router();

const wrap = (handler: any): RequestHandler => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(verifyToken);

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
router.post('/', validate(createSupportTicketSchema), wrap(createSupportTicket));

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
router.get('/', wrap(getMyTickets));

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
router.post('/:id/reply', validate(replyToTicketSchema), wrap(replyToTicket));

/**
 * @swagger
 * /support/admin/all:
 *   get:
 *     summary: Admin - Get all support tickets
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, resolved, closed]
 *     responses:
 *       200:
 *         description: List of all tickets
 */
router.get('/admin/all', checkRole(['admin']), wrap(getAllTickets));

/**
 * @swagger
 * /support/admin/{id}/reply:
 *   post:
 *     summary: Admin - Reply to a support ticket
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
 *               content:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [in_progress, resolved]
 *     responses:
 *       200:
 *         description: Admin reply added
 */
router.post('/admin/:id/reply', checkRole(['admin']), wrap(adminReplyToTicket));

/**
 * @swagger
 * /support/admin/{id}/close:
 *   post:
 *     summary: Admin - Close a support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Ticket closed
 */
router.post('/admin/:id/close', checkRole(['admin']), wrap(closeTicket));

export default router;

