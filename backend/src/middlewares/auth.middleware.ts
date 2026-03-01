import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
    user?: any;
}

// Simple in-memory cache for user data to avoid hitting Firestore on every request
const userCache = new Map<string, { data: any; expiresAt: number }>();
const USER_CACHE_TTL_MS = 60_000; // 1 minute

const getCachedUser = (uid: string) => {
    const cached = userCache.get(uid);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    userCache.delete(uid);
    return null;
};

const setCachedUser = (uid: string, data: any) => {
    userCache.set(uid, { data, expiresAt: Date.now() + USER_CACHE_TTL_MS });
    // Prevent unbounded cache growth
    if (userCache.size > 10_000) {
        const oldest = userCache.keys().next().value;
        if (oldest) userCache.delete(oldest);
    }
};

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.slice(7);
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const decodedToken = await auth.verifyIdToken(token, true);

        // Check cache first
        const cached = getCachedUser(decodedToken.uid);
        if (cached) {
            req.user = { ...decodedToken, ...cached };
            return next();
        }

        // Fetch user data from Firestore to get role and other info
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            const enrichment = {
                role: userData?.role,
                region: userData?.region,
                currency: userData?.currency,
                country: userData?.countryCode,
                displayName: userData?.displayName || userData?.fullName,
                driverOnboarding: userData?.driverOnboarding,
                driverDetails: userData?.driverDetails
            };
            setCachedUser(decodedToken.uid, enrichment);
            req.user = { ...decodedToken, ...enrichment };
        } else {
            // User not registered yet, just use token data
            req.user = decodedToken;
        }

        next();
    } catch (error: any) {
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.code === 'auth/id-token-revoked') {
            return res.status(401).json({ error: 'Token revoked' });
        }
        logger.error({ err: error }, 'Token verification failed');
        return res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
};
