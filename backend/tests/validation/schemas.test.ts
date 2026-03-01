import { validate } from '../../src/middlewares/validate.middleware';
import { signupStartSchema, loginSchema, phoneVerificationSchema } from '../../src/schemas/auth.schema';
import {
    initiatePaymentSchema,
    verifyPaymentSchema,
    addWalletSchema,
    withdrawWalletSchema,
    addPaymentMethodSchema,
} from '../../src/schemas/payment.schema';
import { requestPayoutSchema } from '../../src/schemas/payout.schema';
import { updateRideStatusSchema } from '../../src/schemas/ride.schema';

// Helper to create mock req/res/next
const mockReqResNext = (body: any, query: any = {}, params: any = {}) => {
    const req = { body, query, params } as any;
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    } as any;
    const next = jest.fn();
    return { req, res, next };
};

describe('Input Validation Schemas', () => {
    describe('signupStartSchema', () => {
        it('should pass with valid data', () => {
            const { req, res, next } = mockReqResNext({
                email: 'test@example.com',
                password: 'SecurePass123!',
                fullName: 'John Doe',
                phoneNumber: '+2348012345678',
            });
            validate(signupStartSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject missing email', () => {
            const { req, res, next } = mockReqResNext({
                password: 'SecurePass123!',
                fullName: 'John Doe',
                phoneNumber: '+2348012345678',
            });
            validate(signupStartSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject invalid email', () => {
            const { req, res, next } = mockReqResNext({
                email: 'not-an-email',
                password: 'SecurePass123!',
                fullName: 'John Doe',
                phoneNumber: '+2348012345678',
            });
            validate(signupStartSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject short password', () => {
            const { req, res, next } = mockReqResNext({
                email: 'test@example.com',
                password: '123',
                fullName: 'John Doe',
                phoneNumber: '+2348012345678',
            });
            validate(signupStartSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('phoneVerificationSchema', () => {
        it('should pass with valid phone number', () => {
            const { req, res, next } = mockReqResNext({
                phoneNumber: '+2348012345678',
            });
            validate(phoneVerificationSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should reject missing phone number', () => {
            const { req, res, next } = mockReqResNext({});
            validate(phoneVerificationSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('initiatePaymentSchema', () => {
        it('should pass with valid payment data', () => {
            const { req, res, next } = mockReqResNext({
                amount: 5000,
                currency: 'NGN',
            });
            validate(initiatePaymentSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should reject negative amount', () => {
            const { req, res, next } = mockReqResNext({
                amount: -100,
                currency: 'NGN',
            });
            validate(initiatePaymentSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject zero amount', () => {
            const { req, res, next } = mockReqResNext({
                amount: 0,
                currency: 'NGN',
            });
            validate(initiatePaymentSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject invalid currency', () => {
            const { req, res, next } = mockReqResNext({
                amount: 5000,
                currency: 'EU', // too short (min 3)
            });
            validate(initiatePaymentSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('verifyPaymentSchema', () => {
        it('should pass with reference', () => {
            const { req, res, next } = mockReqResNext({
                reference: 'REF-12345',
            });
            validate(verifyPaymentSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should pass with transactionId', () => {
            const { req, res, next } = mockReqResNext({
                transactionId: 'TXN-12345',
            });
            validate(verifyPaymentSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('requestPayoutSchema', () => {
        it('should pass with valid payout data', () => {
            const { req, res, next } = mockReqResNext({
                amount: 10000,
                currency: 'NGN',
                bankCode: '044',
                accountNumber: '1234567890',
            });
            validate(requestPayoutSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should reject missing amount', () => {
            const { req, res, next } = mockReqResNext({
                currency: 'NGN',
                accountNumber: '1234567890',
                bankCode: '044',
            });
            validate(requestPayoutSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('addWalletSchema', () => {
        it('should pass with valid wallet topup data', () => {
            const { req, res, next } = mockReqResNext({ amount: 2500, currency: 'NGN' });
            validate(addWalletSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should reject negative amount', () => {
            const { req, res, next } = mockReqResNext({ amount: -10, currency: 'NGN' });
            validate(addWalletSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('withdrawWalletSchema', () => {
        it('should pass with valid withdrawal data', () => {
            const { req, res, next } = mockReqResNext({ amount: 1000, currency: 'NGN', bankCode: '058', accountNumber: '1234567890' });
            validate(withdrawWalletSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should reject invalid amount', () => {
            const { req, res, next } = mockReqResNext({ amount: 0, currency: 'USD' });
            validate(withdrawWalletSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('addPaymentMethodSchema', () => {
        it('should pass with valid payment method payload', () => {
            const { req, res, next } = mockReqResNext({
                type: 'bank_account',
                details: { accountNumber: '1234567890', bankCode: '058' },
                isDefault: true,
            });
            validate(addPaymentMethodSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should reject missing details', () => {
            const { req, res, next } = mockReqResNext({ type: 'bank_account' });
            validate(addPaymentMethodSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('updateRideStatusSchema', () => {
        it('should pass with a valid status transition payload', () => {
            const { req, res, next } = mockReqResNext(
                { status: 'arrived' },
                {},
                { id: 'ride_123' }
            );
            validate(updateRideStatusSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should reject cancelled status without reason', () => {
            const { req, res, next } = mockReqResNext(
                { status: 'cancelled' },
                {},
                { id: 'ride_123' }
            );
            validate(updateRideStatusSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
