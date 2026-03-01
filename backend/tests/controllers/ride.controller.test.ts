import { Request, Response } from 'express';
import { AuthRequest } from '../../src/types/express';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockCreateRideRequest = jest.fn();
const mockStartDriverMatching = jest.fn();
const mockGetRide = jest.fn();
const mockFindNearbyDrivers = jest.fn();
const mockTransitionRideStatus = jest.fn();
const mockEstimateFare = jest.fn();
const mockGetRideHistory = jest.fn();
const mockRateDriver = jest.fn();
const mockRateRider = jest.fn();

jest.mock('../../src/services/RideService', () => ({
    rideService: {
        createRideRequest: (...a: any[]) => mockCreateRideRequest(...a),
        startDriverMatching: (...a: any[]) => mockStartDriverMatching(...a),
        getRide: (...a: any[]) => mockGetRide(...a),
        findNearbyDrivers: (...a: any[]) => mockFindNearbyDrivers(...a),
        transitionRideStatus: (...a: any[]) => mockTransitionRideStatus(...a),
        estimateFare: (...a: any[]) => mockEstimateFare(...a),
        getRideHistory: (...a: any[]) => mockGetRideHistory(...a),
        rateDriver: (...a: any[]) => mockRateDriver(...a),
        rateRider: (...a: any[]) => mockRateRider(...a),
    }
}));

const mockDocGet = jest.fn();
const mockDocUpdate = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockDocGet, update: mockDocUpdate }));
const mockCollectionAdd = jest.fn();
const mockQueryGet = jest.fn();
const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    add: mockCollectionAdd,
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: mockQueryGet
}));

jest.mock('../../src/config/firebase', () => ({
    db: { collection: mockCollection }
}));

const mockNotifyAdmin = jest.fn();
jest.mock('../../src/services/SocketService', () => ({
    socketService: { notifyAdmin: (...a: any[]) => mockNotifyAdmin(...a) }
}));

jest.mock('../../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

// ── Helpers ───────────────────────────────────────────────────────────────

function mockRes(): Response {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function mockReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
    return {
        user: { uid: 'rider1', role: 'rider' },
        params: {},
        query: {},
        body: {},
        ...overrides
    } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────

import {
    createRide,
    getRide,
    getNearbyDrivers,
    updateRideStatus,
    estimateFare,
    getRideHistory,
    rateDriver,
    rateRider,
    addTip,
    sosAlert
} from '../../src/controllers/ride.controller';

describe('ride.controller', () => {

    beforeEach(() => jest.clearAllMocks());

    // ── createRide ────────────────────────────────────────────────────

    describe('createRide', () => {
        it('returns 201 with created ride', async () => {
            const ride = { id: 'ride1', status: 'finding_driver' };
            mockCreateRideRequest.mockResolvedValueOnce(ride);
            mockStartDriverMatching.mockResolvedValueOnce(undefined);

            const req = mockReq({ body: { pickup: {}, dropoff: {} } });
            const res = mockRes();
            await createRide(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(ride);
        });

        it('returns 500 on service error', async () => {
            mockCreateRideRequest.mockRejectedValueOnce(new Error('fail'));

            const res = mockRes();
            await createRide(mockReq(), res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── getRide ───────────────────────────────────────────────────────

    describe('getRide', () => {
        it('returns 404 when ride not found', async () => {
            mockGetRide.mockResolvedValueOnce(null);
            const req = mockReq({ params: { id: 'x' } } as any);
            const res = mockRes();

            await getRide(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 403 for unauthorized user', async () => {
            mockGetRide.mockResolvedValueOnce({ riderId: 'other', driverId: 'driverX' });
            const req = mockReq({ params: { id: 'ride1' } } as any);
            const res = mockRes();

            await getRide(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('allows ride participant to view', async () => {
            const ride = { riderId: 'rider1', driverId: 'd1' };
            mockGetRide.mockResolvedValueOnce(ride);
            const req = mockReq({ params: { id: 'r1' } } as any);
            const res = mockRes();

            await getRide(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(ride);
        });

        it('allows admin to view any ride', async () => {
            const ride = { riderId: 'someone', driverId: 'other' };
            mockGetRide.mockResolvedValueOnce(ride);
            const req = mockReq({
                user: { uid: 'admin1', role: 'admin' },
                params: { id: 'r1' }
            } as any);
            const res = mockRes();

            await getRide(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ── getNearbyDrivers ──────────────────────────────────────────────

    describe('getNearbyDrivers', () => {
        it('returns 400 for missing lat/lng', async () => {
            const req = mockReq({ query: {} } as any);
            const res = mockRes();
            await getNearbyDrivers(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for out-of-range coordinates', async () => {
            const req = mockReq({ query: { lat: '100', lng: '200' } } as any);
            const res = mockRes();
            await getNearbyDrivers(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns drivers with default radius', async () => {
            const drivers = [{ id: 'd1' }];
            mockFindNearbyDrivers.mockResolvedValueOnce(drivers);
            const req = mockReq({ query: { lat: '41.8', lng: '-87.6' } } as any);
            const res = mockRes();

            await getNearbyDrivers(req, res);
            expect(mockFindNearbyDrivers).toHaveBeenCalledWith(41.8, -87.6, 5, expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ── updateRideStatus ──────────────────────────────────────────────

    describe('updateRideStatus', () => {
        it('returns 200 with updated ride', async () => {
            const ride = { id: 'r1', status: 'accepted' };
            mockTransitionRideStatus.mockResolvedValueOnce(ride);

            const req = mockReq({
                params: { id: 'r1' },
                body: { status: 'accepted' }
            } as any);
            const res = mockRes();

            await updateRideStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('returns 400 on invalid transition', async () => {
            mockTransitionRideStatus.mockRejectedValueOnce(new Error('Invalid transition'));
            const req = mockReq({ params: { id: 'r1' }, body: { status: 'completed' } } as any);
            const res = mockRes();

            await updateRideStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    // ── estimateFare ──────────────────────────────────────────────────

    describe('estimateFare', () => {
        it('returns 400 for missing fields', async () => {
            const req = mockReq({ body: { pickup: {} } });
            const res = mockRes();
            await estimateFare(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns fare estimate', async () => {
            const estimate = { fare: 55, surge: 1.0 };
            mockEstimateFare.mockResolvedValueOnce(estimate);
            const req = mockReq({
                body: { pickup: {}, dropoff: {}, vehicleCategory: 'business_sedan', region: 'US-CHI' }
            });
            const res = mockRes();

            await estimateFare(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: estimate });
        });
    });

    // ── getRideHistory ────────────────────────────────────────────────

    describe('getRideHistory', () => {
        it('returns paginated ride history', async () => {
            const result = { rides: [{ id: 'r1' }], total: 1, page: 1, limit: 20 };
            mockGetRideHistory.mockResolvedValueOnce(result);
            const req = mockReq({ query: {} } as any);
            const res = mockRes();

            await getRideHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    // ── rateDriver ────────────────────────────────────────────────────

    describe('rateDriver', () => {
        it('returns 400 for invalid rating', async () => {
            const req = mockReq({ params: { id: 'r1' }, body: { rating: 6 } } as any);
            const res = mockRes();
            await rateDriver(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('submits valid rating', async () => {
            mockRateDriver.mockResolvedValueOnce({ id: 'r1' });
            const req = mockReq({ params: { id: 'r1' }, body: { rating: 5, feedback: 'great' } } as any);
            const res = mockRes();

            await rateDriver(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ── rateRider ─────────────────────────────────────────────────────

    describe('rateRider', () => {
        it('returns 400 for rating < 1', async () => {
            const req = mockReq({ params: { id: 'r1' }, body: { rating: 0 } } as any);
            const res = mockRes();
            await rateRider(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('submits valid rating', async () => {
            mockRateRider.mockResolvedValueOnce({ id: 'r1' });
            const req = mockReq({
                user: { uid: 'driver1', role: 'driver' },
                params: { id: 'r1' },
                body: { rating: 4 }
            } as any);
            const res = mockRes();

            await rateRider(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ── addTip ────────────────────────────────────────────────────────

    describe('addTip', () => {
        it('returns 400 for zero tip', async () => {
            const req = mockReq({ params: { id: 'r1' }, body: { amount: 0 } } as any);
            const res = mockRes();
            await addTip(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for tip exceeding max', async () => {
            const req = mockReq({ params: { id: 'r1' }, body: { amount: 60000 } } as any);
            const res = mockRes();
            await addTip(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 404 when ride not found', async () => {
            mockDocGet.mockResolvedValueOnce({ exists: false });
            const req = mockReq({ params: { id: 'r1' }, body: { amount: 10 } } as any);
            const res = mockRes();
            await addTip(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 403 for non-rider user', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ riderId: 'someone_else', status: 'completed' })
            });
            const req = mockReq({ params: { id: 'r1' }, body: { amount: 10 } } as any);
            const res = mockRes();
            await addTip(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('returns 400 for non-completed ride', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ riderId: 'rider1', status: 'in_progress' })
            });
            const req = mockReq({ params: { id: 'r1' }, body: { amount: 10 } } as any);
            const res = mockRes();
            await addTip(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for duplicate tip', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ riderId: 'rider1', status: 'completed', tip: 5 })
            });
            const req = mockReq({ params: { id: 'r1' }, body: { amount: 10 } } as any);
            const res = mockRes();
            await addTip(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('adds tip successfully', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ riderId: 'rider1', status: 'completed', driverId: 'd1', pricing: { currency: 'USD' } })
            });
            mockDocUpdate.mockResolvedValueOnce(undefined);

            const req = mockReq({ params: { id: 'r1' }, body: { amount: 10 } } as any);
            const res = mockRes();
            await addTip(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, tip: 10 }));
        });
    });

    // ── sosAlert ──────────────────────────────────────────────────────

    describe('sosAlert', () => {
        it('returns 404 when ride not found', async () => {
            mockDocGet.mockResolvedValueOnce({ exists: false });
            const req = mockReq({
                user: { uid: 'driver1', role: 'driver' },
                params: { id: 'r1' },
                body: {}
            } as any);
            const res = mockRes();
            await sosAlert(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 403 for unauthorized driver', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ driverId: 'otherDriver' })
            });
            const req = mockReq({
                user: { uid: 'driver1', role: 'driver' },
                params: { id: 'r1' },
                body: {}
            } as any);
            const res = mockRes();
            await sosAlert(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('creates SOS incident and notifies admin', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ driverId: 'driver1' })
            });
            mockCollectionAdd.mockResolvedValueOnce({ id: 'sos1' });

            const req = mockReq({
                user: { uid: 'driver1', role: 'driver' },
                params: { id: 'r1' },
                body: { location: { lat: 41.8, lng: -87.6 } }
            } as any);
            const res = mockRes();
            await sosAlert(req, res);

            expect(mockCollectionAdd).toHaveBeenCalled();
            expect(mockNotifyAdmin).toHaveBeenCalledWith('sos:alert', expect.objectContaining({ rideId: 'r1' }));
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
