// Mock firebase BEFORE imports
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

jest.mock('../../src/config/firebase', () => ({
    auth: { verifyIdToken: mockVerifyIdToken },
    db: { collection: mockCollection }
}));
jest.mock('../../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import { verifyToken, AuthRequest } from '../../src/middlewares/auth.middleware';
import { Response, NextFunction } from 'express';

describe('Auth Middleware – verifyToken', () => {
    let req: Partial<AuthRequest>;
    let res: Partial<Response>;
    let next: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        req = { headers: {} };
        res = { status: statusMock, json: jsonMock };
        next = jest.fn();
    });

    // ── Missing / malformed Authorization header ──────────────────────────

    it('returns 401 when Authorization header is missing', async () => {
        await verifyToken(req as AuthRequest, res as Response, next);
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized: No token provided' });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header does not start with Bearer', async () => {
        req.headers = { authorization: 'Basic abc123' };
        await verifyToken(req as AuthRequest, res as Response, next);
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized: No token provided' });
    });

    it('returns 401 when Bearer token is empty', async () => {
        req.headers = { authorization: 'Bearer ' };
        await verifyToken(req as AuthRequest, res as Response, next);
        expect(statusMock).toHaveBeenCalledWith(401);
    });

    // ── Firebase token verification errors ────────────────────────────────

    it('returns 401 when Firebase token is expired', async () => {
        req.headers = { authorization: 'Bearer expired-token' };
        mockVerifyIdToken.mockRejectedValue({ code: 'auth/id-token-expired' });

        await verifyToken(req as AuthRequest, res as Response, next);
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Token expired' });
    });

    it('returns 401 when Firebase token is revoked', async () => {
        req.headers = { authorization: 'Bearer revoked-token' };
        mockVerifyIdToken.mockRejectedValue({ code: 'auth/id-token-revoked' });

        await verifyToken(req as AuthRequest, res as Response, next);
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Token revoked' });
    });

    it('returns 403 for any other auth error', async () => {
        req.headers = { authorization: 'Bearer bad-token' };
        mockVerifyIdToken.mockRejectedValue({ code: 'auth/argument-error' });

        await verifyToken(req as AuthRequest, res as Response, next);
        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized: Invalid token' });
    });

    // ── Successful verification – user in Firestore ───────────────────────

    it('enriches req.user with Firestore role/region when user exists', async () => {
        req.headers = { authorization: 'Bearer valid-token' };
        const decodedToken = { uid: 'user123', email: 'test@example.com' };
        mockVerifyIdToken.mockResolvedValue(decodedToken);

        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({
                role: 'rider',
                region: 'NG',
                currency: 'NGN',
                countryCode: 'NG',
                displayName: 'Test User'
            })
        });

        await verifyToken(req as AuthRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toMatchObject({
            uid: 'user123',
            role: 'rider',
            region: 'NG',
            currency: 'NGN',
            displayName: 'Test User'
        });
    });

    it('uses decodedToken data when user doc does not exist in Firestore', async () => {
        req.headers = { authorization: 'Bearer valid-token' };
        const decodedToken = { uid: 'new-user', email: 'new@example.com' };
        mockVerifyIdToken.mockResolvedValue(decodedToken);
        mockGet.mockResolvedValue({ exists: false, data: () => undefined });

        await verifyToken(req as AuthRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual(decodedToken);
    });

    // ── User cache ────────────────────────────────────────────────────────

    it('uses cached user data on second request (avoids Firestore call)', async () => {
        req.headers = { authorization: 'Bearer valid-token' };
        const decodedToken = { uid: 'cached-user', email: 'cached@example.com' };
        mockVerifyIdToken.mockResolvedValue(decodedToken);

        // First call – fills cache
        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({ role: 'driver', region: 'US-CHI', currency: 'USD' })
        });
        await verifyToken(req as AuthRequest, res as Response, next);
        expect(mockCollection).toHaveBeenCalledWith('users');
        expect(mockGet).toHaveBeenCalledTimes(1);

        // Second call – should use cache, NOT call Firestore again
        jest.clearAllMocks();
        mockVerifyIdToken.mockResolvedValue(decodedToken);
        const req2: Partial<AuthRequest> = { headers: { authorization: 'Bearer valid-token' } };
        await verifyToken(req2 as AuthRequest, res as Response, next);

        expect(mockGet).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
        expect(req2.user).toMatchObject({ uid: 'cached-user', role: 'driver', region: 'US-CHI' });
    });

    // ── Includes driverOnboarding/driverDetails ───────────────────────────

    it('enriches req.user with driverOnboarding and driverDetails', async () => {
        req.headers = { authorization: 'Bearer valid-token' };
        const decodedToken = { uid: 'driver-user', email: 'driver@example.com' };
        mockVerifyIdToken.mockResolvedValue(decodedToken);

        const driverOnboarding = { status: 'approved', documentsVerified: true };
        const driverDetails = { vehicleCategory: 'sedan', licensePlate: 'ABC-123' };

        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({
                role: 'driver',
                region: 'NG',
                currency: 'NGN',
                driverOnboarding,
                driverDetails
            })
        });

        await verifyToken(req as AuthRequest, res as Response, next);

        expect(req.user?.driverOnboarding).toEqual(driverOnboarding);
        expect(req.user?.driverDetails).toEqual(driverDetails);
    });
});
