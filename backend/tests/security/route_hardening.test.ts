import fs from 'fs';
import path from 'path';

describe('Route hardening checks', () => {
    it('enforces validate + idempotency on wallet/payment-method routes', () => {
        const filePath = path.join(__dirname, '../../src/routes/payment.routes.ts');
        const source = fs.readFileSync(filePath, 'utf8');

        expect(source).toContain("router.post('/methods', verifyToken, validate(addPaymentMethodSchema), idempotency, addPaymentMethod);");
        expect(source).toContain("router.post('/wallet/add', verifyToken, validate(addWalletSchema), idempotency, addToWallet);");
        expect(source).toContain("router.post('/wallet/withdraw', verifyToken, validate(withdrawWalletSchema), idempotency, withdrawFromWallet);");
    });

    it('enforces strict validation and idempotency on ride status updates', () => {
        const filePath = path.join(__dirname, '../../src/routes/ride.routes.ts');
        const source = fs.readFileSync(filePath, 'utf8');

        expect(source).toContain('validate(updateRideStatusSchema)');
        expect(source).toContain('validateRideStatusTransition');
        expect(source).toContain('idempotency');
    });
});
