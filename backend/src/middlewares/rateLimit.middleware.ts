import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// 1. Global Limiter (IP Based) - Generous
// Protects against basic DDoS and bot scraping
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

// 2. Auth Limiter (IP Based) - Strict
// Protects login/register endpoints from brute-force attacks
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Limit each IP to 5 login/register attempts per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        error: 'Too many login attempts, please try again after 15 minutes'
    }
});

// 3. Ride Creation Limiter (User ID Based) - Specific
// Prevents spamming ride requests
export const rideLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 3, // Limit each User ID to 3 ride requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
    keyGenerator: (req: Request) => {
        // Use the user's UID from the auth middleware
        // Fallback to IP if user is not authenticated (shouldn't happen on protected routes)
        return (req as any).user?.uid || req.ip || '127.0.0.1';
    },
    message: {
        error: 'You are creating rides too quickly. Please wait a moment.'
    }
});
