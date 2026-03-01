import { Router, RequestHandler } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import {
    getEmergencyContacts,
    addEmergencyContact,
    removeEmergencyContact,
    getAllContacts
} from '../controllers/contacts.controller';

const router = Router();

const wrap = (handler: any): RequestHandler => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Contacts
 *   description: Emergency Contacts Management
 */

/**
 * @swagger
 * /contacts:
 *   get:
 *     summary: Get all contacts
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of contacts
 */
router.get('/', wrap(getAllContacts));

/**
 * @swagger
 * /contacts/emergency:
 *   get:
 *     summary: Get emergency contacts
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of emergency contacts
 */
router.get('/emergency', wrap(getEmergencyContacts));

/**
 * @swagger
 * /contacts/emergency:
 *   post:
 *     summary: Add an emergency contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               relationship:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contact added
 */
router.post('/emergency', wrap(addEmergencyContact));

/**
 * @swagger
 * /contacts/emergency/{contactId}:
 *   delete:
 *     summary: Remove an emergency contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact removed
 */
router.delete('/emergency/:contactId', wrap(removeEmergencyContact));

export default router;
