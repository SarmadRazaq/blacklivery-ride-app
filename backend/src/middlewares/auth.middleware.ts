import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export interface AuthRequest extends Request {
    user?: any;
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // BACKDOOR FOR TESTING (Active in development or if NODE_ENV is unset)
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    if (isDev && token.startsWith('TEST_TOKEN_')) {
        console.log(`[Auth] Accepting Test Token: ${token}`);
        const uid = token.replace('TEST_TOKEN_', '');
        // Mock a decoded token structure
        req.user = {
            uid,
            email: 'test@example.com',
            email_verified: true,
            role: 'driver' // Default role, but controller checks DB usually
        };

        // We need to fetch the real role from DB to be safe, 
        // but for now let's trust the test flow or let the controller handle it.
        // Better: Fetch user from DB to get the real role.
        const { db } = require('../config/firebase');
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            req.user = { ...req.user, ...userDoc.data() };
        }

        return next();
    }

    try {
        // Verify token and check if it has been revoked
        const decodedToken = await auth.verifyIdToken(token, true);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
};
