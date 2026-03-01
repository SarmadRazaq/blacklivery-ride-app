// src/routes/chat.routes.ts
import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { wrap } from '../utils/errorHandler';
import {
    sendMessage,
    getMessages,
    markMessagesAsRead,
    getChatStatus
} from '../controllers/chat.controller';
import {
    sendChatMessageSchema,
    getChatMessagesSchema,
    markMessagesReadSchema
} from '../schemas/chat.schema';

const router = Router();

// All routes require authentication
router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Ride Chat
 *   description: In-ride chat between driver and rider
 */

/**
 * @swagger
 * /chat/rides/{rideId}/messages:
 *   post:
 *     summary: Send a chat message in a ride
 *     tags: [Ride Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "I'm on my way"
 *               messageType:
 *                 type: string
 *                 enum: [text, location, system]
 *                 default: text
 *               metadata:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Chat not available for this ride status
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Ride not found
 */
router.post('/rides/:rideId/messages', validate(sendChatMessageSchema), wrap(sendMessage));

/**
 * @swagger
 * /chat/rides/{rideId}/messages:
 *   get:
 *     summary: Get chat messages for a ride
 *     tags: [Ride Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of messages
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Ride not found
 */
router.get('/rides/:rideId/messages', validate(getChatMessagesSchema), wrap(getMessages));

/**
 * @swagger
 * /chat/rides/{rideId}/read:
 *   post:
 *     summary: Mark messages as read
 *     tags: [Ride Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Ride not found
 */
router.post('/rides/:rideId/read', validate(markMessagesReadSchema), wrap(markMessagesAsRead));

/**
 * @swagger
 * /chat/rides/{rideId}/status:
 *   get:
 *     summary: Get chat status for a ride
 *     tags: [Ride Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat status information
 */
router.get('/rides/:rideId/status', wrap(getChatStatus));

export default router;