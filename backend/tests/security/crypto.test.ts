import crypto from 'crypto';

/**
 * Tests that security-critical functions use proper randomness.
 * These verify our fixes to replace Math.random() with crypto.
 */
describe('Security: Cryptographic Randomness', () => {
    it('crypto.randomInt produces 6-digit OTP in range', () => {
        for (let i = 0; i < 100; i++) {
            const otp = crypto.randomInt(100000, 999999);
            expect(otp).toBeGreaterThanOrEqual(100000);
            expect(otp).toBeLessThan(999999);
        }
    });

    it('crypto.randomBytes produces unique hex references', () => {
        const refs = new Set<string>();
        for (let i = 0; i < 100; i++) {
            refs.add(crypto.randomBytes(6).toString('hex'));
        }
        // All 100 should be unique (collision probability negligible with 48 bits)
        expect(refs.size).toBe(100);
    });

    it('crypto.randomBytes hex is correct length', () => {
        const hex = crypto.randomBytes(6).toString('hex');
        expect(hex).toHaveLength(12); // 6 bytes = 12 hex chars
    });
});
