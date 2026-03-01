import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { db } from '../config/firebase';
import { IIdempotencyKey } from '../models/IdempotencyKey';
import { logger } from '../utils/logger';

export const idempotency = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string;

    if (!key) {
        return res.status(400).json({ error: 'Idempotency-Key header is required' });
    }

    if (!req.user?.uid) {
        // Idempotency requires authenticated user context
        return next();
    }

    const { uid } = req.user;
    const docRef = db.collection('idempotency_keys').doc(`${uid}_${key}`);

    try {
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data() as IIdempotencyKey;

            // Check if locked (request in progress)
            if (data.lockedAt && !data.responseCode) {
                // Simple retry mechanism or conflict error
                const now = Date.now();
                // Handle both Firestore Timestamp objects and plain Date objects
                const lockedAt = data.lockedAt as any;
                const lockedTime = lockedAt.toDate ? lockedAt.toDate().getTime() : new Date(lockedAt).getTime();

                // If locked for more than 30 seconds, assume crash and allow retry
                if (now - lockedTime < 30000) {
                    return res.status(409).json({ error: 'Request currently in progress' });
                }
            }

            if (data.responseCode) {
                logger.debug({ key }, 'Idempotency cache hit');
                return res.status(data.responseCode).json(data.responseBody);
            }
        }

        // Lock the key
        await docRef.set({
            key,
            userId: uid,
            path: req.path,
            method: req.method,
            params: req.body,
            createdAt: new Date(),
            lockedAt: new Date()
        });

        // Hook into response to save result
        const originalJson = res.json;

        res.json = function (body: any): Response {
            // Restore original to prevent infinite loop if called internally
            res.json = originalJson;

            // Save to Firestore asynchronously (fire and forget or await)
            docRef.update({
                responseCode: res.statusCode,
                responseBody: body,
                lockedAt: null // Release lock implicitly by having a response
            }).catch(err => logger.error({ err }, 'Failed to save idempotency response'));

            return originalJson.call(this, body);
        };

        next();
    } catch (error) {
        logger.error({ err: error }, 'Idempotency middleware error');
        next(error);
    }
};
