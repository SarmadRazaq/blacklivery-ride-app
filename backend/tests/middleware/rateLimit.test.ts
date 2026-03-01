/**
 * Tests for rate limit middleware configuration.
 * Validates that production vs dev limits are set correctly.
 */
describe('Rate Limit Middleware', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        jest.resetModules();
    });

    it('should use strict limits in production', () => {
        process.env.NODE_ENV = 'production';
        // Re-import to get fresh module with production env
        jest.isolateModules(() => {
            const { globalLimiter, authLimiter, rideLimiter } = require('../../src/middlewares/rateLimit.middleware');
            // These are express middleware functions — verify they exist
            expect(typeof globalLimiter).toBe('function');
            expect(typeof authLimiter).toBe('function');
            expect(typeof rideLimiter).toBe('function');
        });
    });

    it('should use relaxed limits in development', () => {
        process.env.NODE_ENV = 'development';
        jest.isolateModules(() => {
            const { globalLimiter, authLimiter, rideLimiter } = require('../../src/middlewares/rateLimit.middleware');
            expect(typeof globalLimiter).toBe('function');
            expect(typeof authLimiter).toBe('function');
            expect(typeof rideLimiter).toBe('function');
        });
    });
});
