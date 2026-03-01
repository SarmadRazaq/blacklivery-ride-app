import { Response } from 'express';
import { db } from '../config/firebase';
import { AuthRequest } from '../types/express';
import { logger } from '../utils/logger';

/**
 * Get emergency contacts for the authenticated user.
 */
export const getEmergencyContacts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const snapshot = await db.collection('users').doc(uid).collection('emergency_contacts')
            .orderBy('createdAt', 'desc')
            .get();

        const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ data: contacts });
    } catch (error) {
        logger.error({ err: error }, 'Failed to get emergency contacts');
        res.status(500).json({ error: 'Failed to fetch emergency contacts' });
    }
};

/**
 * Add an emergency contact for the authenticated user.
 */
export const addEmergencyContact = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { name, phone, relationship } = req.body;

        if (!name || !phone) {
            res.status(400).json({ error: 'Name and phone are required' });
            return;
        }

        const contact = {
            name,
            phone,
            relationship: relationship || 'other',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const ref = await db.collection('users').doc(uid).collection('emergency_contacts').add(contact);
        res.status(201).json({ data: { id: ref.id, ...contact } });
    } catch (error) {
        logger.error({ err: error }, 'Failed to add emergency contact');
        res.status(500).json({ error: 'Failed to add emergency contact' });
    }
};

/**
 * Remove an emergency contact.
 */
export const removeEmergencyContact = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { contactId } = req.params;

        const ref = db.collection('users').doc(uid).collection('emergency_contacts').doc(contactId);
        const doc = await ref.get();

        if (!doc.exists) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }

        await ref.delete();
        res.status(200).json({ message: 'Contact removed' });
    } catch (error) {
        logger.error({ err: error }, 'Failed to remove emergency contact');
        res.status(500).json({ error: 'Failed to remove emergency contact' });
    }
};

/**
 * Get all contacts (same as emergency contacts for now).
 */
export const getAllContacts = async (req: AuthRequest, res: Response): Promise<void> => {
    return getEmergencyContacts(req, res);
};
