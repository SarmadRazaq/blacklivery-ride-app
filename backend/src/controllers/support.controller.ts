import { Response } from 'express';
import { db } from '../config/firebase';
import { AuthRequest } from '../types/express';
import { logger } from '../utils/logger';

export const createSupportTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { subject, description, category, priority } = req.body;
        
        const ticket = {
            userId: req.user.uid,
            userEmail: req.user.email,
            userRole: req.user.role,
            subject,
            description,
            category: category || 'general',
            priority: priority || 'normal',
            status: 'open',
            messages: [
                {
                    senderId: req.user.uid,
                    role: 'user',
                    content: description,
                    createdAt: new Date()
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const ref = await db.collection('support_tickets').add(ticket);
        res.status(201).json({ id: ref.id, ...ticket });
    } catch (error) {
        logger.error({ err: error }, 'Failed to create support ticket');
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getMyTickets = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const snapshot = await db.collection('support_tickets')
            .where('userId', '==', req.user.uid)
            .orderBy('createdAt', 'desc')
            .get();
            
        const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(tickets);
    } catch (error) {
        logger.error({ err: error }, 'Failed to list tickets');
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const replyToTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const ticketRef = db.collection('support_tickets').doc(id);
        const doc = await ticketRef.get();

        if (!doc.exists) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        if (doc.data()?.userId !== req.user.uid) {
            res.status(403).json({ message: 'Unauthorized' });
            return;
        }

        const message = {
            senderId: req.user.uid,
            role: 'user',
            content,
            createdAt: new Date()
        };

        await ticketRef.update({
            messages: admin.firestore.FieldValue.arrayUnion(message),
            updatedAt: new Date(),
            status: 'open' // Re-open if it was resolved?
        });

        res.status(200).json(message);
    } catch (error) {
        logger.error({ err: error }, 'Failed to reply to ticket');
        res.status(500).json({ message: 'Internal server error' });
    }
};

import * as admin from 'firebase-admin';

