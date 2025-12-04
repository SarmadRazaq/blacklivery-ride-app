"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rideLimiter = exports.authLimiter = exports.globalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// 1. Global Limiter (IP Based) - Generous
// Protects against basic DDoS and bot scraping
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes'
    }
});
// 2. Auth Limiter (IP Based) - Strict
// Protects login/register endpoints from brute-force attacks
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Limit each IP to 5 login/register attempts per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many login attempts, please try again after 15 minutes'
    }
});
// 3. Ride Creation Limiter (User ID Based) - Specific
// Prevents spamming ride requests
exports.rideLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 3, // Limit each User ID to 3 ride requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        var _a;
        // Use the user's UID from the auth middleware
        // Fallback to IP if user is not authenticated (shouldn't happen on protected routes)
        return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) || req.ip || '127.0.0.1';
    },
    message: {
        error: 'You are creating rides too quickly. Please wait a moment.'
    }
});
//# sourceMappingURL=rateLimit.middleware.js.map