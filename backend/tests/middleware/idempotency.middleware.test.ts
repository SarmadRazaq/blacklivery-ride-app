const mockDocGet = jest.fn();
const mockDocSet = jest.fn();
const mockDocUpdate = jest.fn();
const mockDocRef = { get: mockDocGet, set: mockDocSet, update: mockDocUpdate };
const mockDoc = jest.fn().mockReturnValue(mockDocRef);
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

jest.mock('../../src/config/firebase', () => ({
    db: { collection: mockCollection }
}));
jest.mock('../../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import { idempotency } from '../../src/middlewares/idempotency.middleware';
import { AuthRequest } from '../../src/middlewares/auth.middleware';
import { Response, NextFunction } from 'express';

describe('Idempotency Middleware', () => {
    let req: Partial<AuthRequest>;
    let res: Partial<Response>;
    let next: jest.Mock;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        req = {
            headers: { 'idempotency-key': 'test-key-123' },
            user: { uid: 'user1' },
            path: '/api/v1/payments',
            method: 'POST',
            body: { amount: 100 }
        };
        res = { status: statusMock, json: jsonMock, statusCode: 200 } as any;
        next = jest.fn();
    });

    // ── Missing header ────────────────────────────────────────────────────

    it('returns 400 when Idempotency-Key header is missing', async () => {
        req.headers = {};
        await idempotency(req as AuthRequest, res as Response, next);
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Idempotency-Key header is required' });
        expect(next).not.toHaveBeenCalled();
    });

    // ── No authenticated user ─────────────────────────────────────────────

    it('calls next() when user is not authenticated (no uid)', async () => {
        req.user = {};
        await idempotency(req as AuthRequest, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(mockCollection).not.toHaveBeenCalled();
    });

    // ── Cache hit – previously completed request ──────────────────────────

    it('returns cached response when key has a stored response', async () => {
        mockDocGet.mockResolvedValue({
            exists: true,
            data: () => ({
                responseCode: 201,
                responseBody: { id: 'payment_123', status: 'success' },
                lockedAt: new Date()
            })
        });

        await idempotency(req as AuthRequest, res as Response, next);

        expect(mockDoc).toHaveBeenCalledWith('user1_test-key-123');
        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith({ id: 'payment_123', status: 'success' });
        expect(next).not.toHaveBeenCalled();
    });

    // ── Lock conflict – request in progress ───────────────────────────────

    it('returns 409 when key is locked (request in progress, < 30s)', async () => {
        const recentLock = new Date(Date.now() - 5000); // 5 seconds ago
        mockDocGet.mockResolvedValue({
            exists: true,
            data: () => ({
                lockedAt: recentLock,
                responseCode: undefined
            })
        });

        await idempotency(req as AuthRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(409);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Request currently in progress' });
        expect(next).not.toHaveBeenCalled();
    });

    // ── Stale lock – allows retry after 30s ───────────────────────────────

    it('allows retry when lock is stale (> 30s old)', async () => {
        const staleLock = new Date(Date.now() - 60000); // 60 seconds ago
        mockDocGet.mockResolvedValue({
            exists: true,
            data: () => ({
                lockedAt: staleLock,
                responseCode: undefined
            })
        });
        mockDocSet.mockResolvedValue(undefined);

        await idempotency(req as AuthRequest, res as Response, next);

        // Should proceed to lock and call next
        expect(mockDocSet).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    // ── New key – first request ───────────────────────────────────────────

    it('locks the key and calls next() for a new idempotency key', async () => {
        mockDocGet.mockResolvedValue({ exists: false });
        mockDocSet.mockResolvedValue(undefined);

        await idempotency(req as AuthRequest, res as Response, next);

        expect(mockDocSet).toHaveBeenCalledWith(expect.objectContaining({
            key: 'test-key-123',
            userId: 'user1',
            path: '/api/v1/payments',
            method: 'POST'
        }));
        expect(next).toHaveBeenCalled();
    });

    // ── Response hook saves result ────────────────────────────────────────

    it('hooks res.json to save response to Firestore', async () => {
        mockDocGet.mockResolvedValue({ exists: false });
        mockDocSet.mockResolvedValue(undefined);
        mockDocUpdate.mockResolvedValue(undefined);

        // Need a real json function to hook
        const originalJson = jest.fn().mockReturnThis();
        res.json = originalJson;

        await idempotency(req as AuthRequest, res as Response, next);

        // res.json should now be hooked
        expect(next).toHaveBeenCalled();

        // Simulate controller calling res.json
        (res as any).statusCode = 201;
        res.json!({ id: 'payment_456' });

        // Wait for async update
        await new Promise(r => setTimeout(r, 50));

        expect(mockDocUpdate).toHaveBeenCalledWith(expect.objectContaining({
            responseCode: 201,
            responseBody: { id: 'payment_456' },
            lockedAt: null
        }));
    });

    // ── Firestore error handling ──────────────────────────────────────────

    it('calls next(error) when Firestore throws', async () => {
        const firebaseError = new Error('Firestore connection failed');
        mockDocGet.mockRejectedValue(firebaseError);

        await idempotency(req as AuthRequest, res as Response, next);

        expect(next).toHaveBeenCalledWith(firebaseError);
    });

    // ── Firestore Timestamp lockedAt ──────────────────────────────────────

    it('handles Firestore Timestamp for lockedAt (toDate method)', async () => {
        const recentTime = Date.now() - 5000;
        mockDocGet.mockResolvedValue({
            exists: true,
            data: () => ({
                lockedAt: { toDate: () => new Date(recentTime) },
                responseCode: undefined
            })
        });

        await idempotency(req as AuthRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(409);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Request currently in progress' });
    });
});
