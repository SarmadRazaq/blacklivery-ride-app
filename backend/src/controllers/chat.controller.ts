// src/controllers/chat.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { db, rtdb } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../utils/logger';
import { socketService } from '../services/SocketService';
import { IChatMessage, IRideChat } from '../models/RideChat';

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rideId } = req.params;
        const { message, messageType, metadata } = req.body;
        const { uid, role } = req.user;

        // Validate message content
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            res.status(400).json({ error: 'Message cannot be empty' });
            return;
        }
        if (message.length > 2000) {
            res.status(400).json({ error: 'Message too long. Maximum 2000 characters.' });
            return;
        }

        // Verify ride exists and user is part of it
        const rideRef = db.collection('rides').doc(rideId);
        const rideSnap = await rideRef.get();

        if (!rideSnap.exists) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const rideData = rideSnap.data();
        const isRider = rideData?.riderId === uid;
        const isDriver = rideData?.driverId === uid;

        if (!isRider && !isDriver) {
            res.status(403).json({ error: 'Not authorized to send messages in this ride' });
            return;
        }

        // Ensure ride is active or in-progress
        const allowedStatuses = ['accepted', 'arrived', 'in_progress'];
        if (!allowedStatuses.includes(rideData?.status)) {
            res.status(400).json({ error: 'Chat is only available during active rides' });
            return;
        }

        // Create chat message
        const chatMessage: IChatMessage = {
            rideId,
            senderId: uid,
            senderRole: isRider ? 'rider' : 'driver',
            message,
            messageType: messageType || 'text',
            metadata: metadata || {},
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Save to Firestore
        const messageRef = await db.collection('ride_chats').doc(rideId).collection('messages').add(chatMessage);
        const savedMessage = { id: messageRef.id, ...chatMessage };

        // Update chat metadata
        const chatRef = db.collection('ride_chats').doc(rideId);
        const chatSnap = await chatRef.get();

        if (!chatSnap.exists) {
            // Create new chat
            const newChat: IRideChat = {
                rideId,
                riderId: rideData.riderId,
                driverId: rideData.driverId,
                lastMessage: message,
                lastMessageAt: new Date(),
                unreadCountRider: isDriver ? 1 : 0,
                unreadCountDriver: isRider ? 1 : 0,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await chatRef.set(newChat);
        } else {
            // Update existing chat
            const updates: Partial<IRideChat> = {
                lastMessage: message,
                lastMessageAt: new Date(),
                updatedAt: new Date()
            };

            if (isRider) {
                updates.unreadCountDriver = FieldValue.increment(1) as any;
            } else {
                updates.unreadCountRider = FieldValue.increment(1) as any;
            }

            await chatRef.update(updates);
        }

        // Store in RTDB for real-time updates
        await rtdb.ref(`ride_chats/${rideId}/messages`).push({
            ...savedMessage,
            createdAt: savedMessage.createdAt.toISOString()
        });

        // Emit via Socket.io
        const recipientId = isRider ? rideData.driverId : rideData.riderId;
        const recipientRole = isRider ? 'driver' : 'rider';
        
        socketService.emitChatMessage(rideId, savedMessage, recipientId, recipientRole);

        res.status(201).json(savedMessage);
    } catch (error) {
        logger.error({ err: error }, 'Failed to send chat message');
        res.status(500).json({ error: 'Unable to send message' });
    }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rideId } = req.params;
        const { limit = '50', before } = req.query as { limit?: string; before?: string };
        const { uid } = req.user;

        // Verify ride exists and user is part of it
        const rideRef = db.collection('rides').doc(rideId);
        const rideSnap = await rideRef.get();

        if (!rideSnap.exists) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const rideData = rideSnap.data();
        if (rideData?.riderId !== uid && rideData?.driverId !== uid) {
            res.status(403).json({ error: 'Not authorized to view this chat' });
            return;
        }

        // Get messages
        let query = db.collection('ride_chats')
            .doc(rideId)
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit));

        if (before) {
            const beforeDate = new Date(before);
            query = query.where('createdAt', '<', beforeDate);
        }

        const snapshot = await query.get();
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({ messages: messages.reverse() });
    } catch (error) {
        logger.error({ err: error }, 'Failed to get chat messages');
        res.status(500).json({ error: 'Unable to retrieve messages' });
    }
};

export const markMessagesAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rideId } = req.params;
        const { messageIds } = req.body;
        const { uid, role } = req.user;

        // Verify ride exists and user is part of it
        const rideRef = db.collection('rides').doc(rideId);
        const rideSnap = await rideRef.get();

        if (!rideSnap.exists) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const rideData = rideSnap.data();
        const isRider = rideData?.riderId === uid;
        const isDriver = rideData?.driverId === uid;

        if (!isRider && !isDriver) {
            res.status(403).json({ error: 'Not authorized' });
            return;
        }

        // Validate messageIds if provided
        if (messageIds && (!Array.isArray(messageIds) || messageIds.length > 500)) {
            res.status(400).json({ error: 'messageIds must be an array with at most 500 items' });
            return;
        }

        // Collect all refs to update
        const refsToUpdate: FirebaseFirestore.DocumentReference[] = [];

        if (messageIds && messageIds.length > 0) {
            messageIds.forEach((msgId: string) => {
                refsToUpdate.push(db.collection('ride_chats').doc(rideId).collection('messages').doc(msgId));
            });
        } else {
            const messagesSnapshot = await db.collection('ride_chats')
                .doc(rideId)
                .collection('messages')
                .where('isRead', '==', false)
                .where('senderId', '!=', uid)
                .limit(500) // safety cap
                .get();

            messagesSnapshot.docs.forEach(doc => {
                refsToUpdate.push(doc.ref);
            });
        }

        // Chunk into batches of 500 (Firestore limit)
        const BATCH_LIMIT = 500;
        for (let i = 0; i < refsToUpdate.length; i += BATCH_LIMIT) {
            const chunk = refsToUpdate.slice(i, i + BATCH_LIMIT);
            const batch = db.batch();
            chunk.forEach(ref => {
                batch.update(ref, { isRead: true, updatedAt: new Date() });
            });
            await batch.commit();
        }

        // Reset unread count
        const chatRef = db.collection('ride_chats').doc(rideId);
        const updateField = isRider ? 'unreadCountRider' : 'unreadCountDriver';
        await chatRef.update({
            [updateField]: 0,
            updatedAt: new Date()
        });

        res.status(200).json({ message: 'Messages marked as read' });
    } catch (error) {
        logger.error({ err: error }, 'Failed to mark messages as read');
        res.status(500).json({ error: 'Unable to mark messages as read' });
    }
};

export const getChatStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rideId } = req.params;
        const { uid } = req.user;

        // Verify ride exists and user is part of it
        const rideRef = db.collection('rides').doc(rideId);
        const rideSnap = await rideRef.get();

        if (!rideSnap.exists) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const rideData = rideSnap.data();
        if (rideData?.riderId !== uid && rideData?.driverId !== uid) {
            res.status(403).json({ error: 'Not authorized' });
            return;
        }

        const chatSnap = await db.collection('ride_chats').doc(rideId).get();
        
        if (!chatSnap.exists) {
            res.status(200).json({
                exists: false,
                unreadCount: 0
            });
            return;
        }

        const chatData = chatSnap.data() as IRideChat;
        const isRider = rideData.riderId === uid;
        const unreadCount = isRider ? chatData.unreadCountRider : chatData.unreadCountDriver;

        res.status(200).json({
            exists: true,
            unreadCount,
            lastMessage: chatData.lastMessage,
            lastMessageAt: chatData.lastMessageAt,
            isActive: chatData.isActive
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to get chat status');
        res.status(500).json({ error: 'Unable to get chat status' });
    }
};