import { Response } from 'express';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';
import { AuthRequest } from '../types/express';
import { logger } from '../utils/logger';

export const createSupportTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Frontend sends 'message', backend previously expected 'description'
        const { subject, description, message, category, priority } = req.body;

        const ticketContent = description || message;

        if (!subject || !ticketContent) {
            res.status(400).json({ message: 'Subject and message are required' });
            return;
        }

        const ticket = {
            userId: req.user.uid,
            userEmail: req.user.email,
            userRole: req.user.role,
            subject,
            description: ticketContent,
            category: category || 'general',
            priority: priority || 'normal',
            status: 'open',
            messages: [
                {
                    senderId: req.user.uid,
                    role: 'user',
                    content: ticketContent,
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

/**
 * Get a single support ticket by ID (owner only)
 */
export const getTicketById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const doc = await db.collection('support_tickets').doc(id).get();

        if (!doc.exists) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        const data = doc.data()!;
        // Only the ticket owner or an admin can view
        if (data.userId !== req.user.uid && req.user.role !== 'admin') {
            res.status(403).json({ message: 'Unauthorized' });
            return;
        }

        res.status(200).json({ id: doc.id, ...data });
    } catch (error) {
        logger.error({ err: error }, 'Failed to get ticket by ID');
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const replyToTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        // Schema validates 'message'; accept both 'message' and 'content' for backward compat
        const replyContent = req.body.message || req.body.content;

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
            content: replyContent,
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

/**
 * Admin replies to a support ticket. Updates status to 'in_progress'.
 */
export const adminReplyToTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { content, status } = req.body;

        if (!content || content.trim().length === 0) {
            res.status(400).json({ message: 'Content is required' });
            return;
        }

        const ticketRef = db.collection('support_tickets').doc(id);
        const doc = await ticketRef.get();

        if (!doc.exists) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        const message = {
            senderId: req.user.uid,
            role: 'admin',
            content: content.trim(),
            createdAt: new Date()
        };

        const newStatus = status || 'in_progress';

        await ticketRef.update({
            messages: admin.firestore.FieldValue.arrayUnion(message),
            updatedAt: new Date(),
            status: newStatus,
            assignedTo: req.user.uid,
            lastAdminReply: new Date()
        });

        res.status(200).json({ ...message, ticketStatus: newStatus });
    } catch (error) {
        logger.error({ err: error }, 'Admin failed to reply to ticket');
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Admin: Get all support tickets (with optional status filter)
 */
export const getAllTickets = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const status = req.query.status as string | undefined;
        let query: any = db.collection('support_tickets').orderBy('createdAt', 'desc');

        if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
            query = db.collection('support_tickets')
                .where('status', '==', status)
                .orderBy('createdAt', 'desc');
        }

        const snapshot = await query.limit(100).get();
        const tickets = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(tickets);
    } catch (error) {
        logger.error({ err: error }, 'Failed to list all tickets');
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Admin: Close a support ticket
 */
export const closeTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const ticketRef = db.collection('support_tickets').doc(id);
        const doc = await ticketRef.get();

        if (!doc.exists) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        await ticketRef.update({
            status: 'closed',
            closedBy: req.user.uid,
            closedAt: new Date(),
            updatedAt: new Date()
        });

        res.status(200).json({ message: 'Ticket closed' });
    } catch (error) {
        logger.error({ err: error }, 'Failed to close ticket');
        res.status(500).json({ message: 'Internal server error' });
    }
};

