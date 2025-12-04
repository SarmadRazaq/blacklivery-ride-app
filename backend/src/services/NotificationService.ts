import * as admin from 'firebase-admin';
import { db } from '../config/firebase';
import { logger } from '../utils/logger';

export class NotificationService {
    async sendPush(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            const fcmTokens = userDoc.data()?.fcmTokens as string[] | undefined;

            if (fcmTokens && fcmTokens.length > 0) {
                const message: admin.messaging.MulticastMessage = {
                    tokens: fcmTokens,
                    notification: { title, body },
                    data: data ?? {},
                    android: { priority: 'high' },
                    apns: { payload: { aps: { 'content-available': true } } }
                };

                const response = await admin.messaging().sendEachForMulticast(message);
                
                if (response.failureCount > 0) {
                    const invalidTokens: string[] = [];
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success && (
                            resp.error?.code === 'messaging/invalid-registration-token' ||
                            resp.error?.code === 'messaging/registration-token-not-registered'
                        )) {
                            invalidTokens.push(fcmTokens[idx]);
                        }
                    });

                    if (invalidTokens.length > 0) {
                        await userDoc.ref.update({
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
                        });
                    }
                }
            }

            await db.collection('notifications').add({
                userId,
                title,
                body,
                metadata: data,
                read: false,
                createdAt: new Date()
            });

        } catch (error) {
            logger.error({ err: error, userId }, 'Failed to send push notification');
        }
    }
}

export const notificationService = new NotificationService();

