import { Response } from 'express';
import { AuthRequest } from '../../src/middlewares/auth.middleware';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockCreateRideRequest = jest.fn();
const mockStartDriverMatching = jest.fn();

jest.mock('../../src/services/RideService', () => ({
    rideService: {
        createRideRequest: (...a: any[]) => mockCreateRideRequest(...a),
        startDriverMatching: (...a: any[]) => mockStartDriverMatching(...a),
    }
}));

const mockCalculateFare = jest.fn();
jest.mock('../../src/services/pricing/PricingService', () => ({
    pricingService: {
        calculateFare: (...a: any[]) => mockCalculateFare(...a)
    }
}));

const mockGetDistanceAndDuration = jest.fn();
jest.mock('../../src/services/GoogleMapsService', () => ({
    googleMapsService: {
        getDistanceAndDuration: (...a: any[]) => mockGetDistanceAndDuration(...a)
    }
}));

const mockNotifyRider = jest.fn();
jest.mock('../../src/services/SocketService', () => ({
    socketService: {
        notifyRider: (...a: any[]) => mockNotifyRider(...a)
    }
}));

const mockGetAccount = jest.fn();
const mockApplyBusinessDiscount = jest.fn();
jest.mock('../../src/services/pricing/B2BPricingService', () => ({
    b2bPricingService: {
        getAccount: (...a: any[]) => mockGetAccount(...a),
        applyBusinessDiscount: (...a: any[]) => mockApplyBusinessDiscount(...a)
    }
}));

const mockDocGet = jest.fn();
const mockDocUpdate = jest.fn();
const mockRef = { update: mockDocUpdate };
const mockDoc = jest.fn(() => ({ get: mockDocGet, update: mockDocUpdate, ref: mockRef }));
const mockCollectionAdd = jest.fn().mockResolvedValue({ id: 'notif1' });
const mockQueryGet = jest.fn();
const mockWhere = jest.fn().mockReturnThis();
const mockOrderBy = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockStartAfter = jest.fn().mockReturnThis();

const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    add: mockCollectionAdd,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    startAfter: mockStartAfter,
    get: mockQueryGet
}));

jest.mock('../../src/config/firebase', () => ({
    db: { collection: mockCollection }
}));

const mockBucketFile = jest.fn(() => ({
    save: jest.fn().mockResolvedValue(undefined),
    getSignedUrl: jest.fn().mockResolvedValue(['https://storage.example.com/proof.jpg'])
}));

jest.mock('firebase-admin', () => ({
    default: {
        storage: () => ({ bucket: () => ({ file: mockBucketFile }) }),
        firestore: { FieldValue: { arrayUnion: (...args: any[]) => args } }
    },
    __esModule: true
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

const VALID_DELIVERY_BODY = {
    pickup: { lat: 6.5, lng: 3.3, address: '123 Lagos St' },
    dropoff: { lat: 6.6, lng: 3.4, address: '456 Ikeja Ave' },
    deliveryDetails: {
        packageType: 'parcel',
        weightKg: 2.5,
        serviceType: 'instant',
        dropoffContact: { name: 'John', phone: '08012345678' }
    }
};

// ── Tests ─────────────────────────────────────────────────────────────────

import {
    createDelivery,
    getDeliveryQuote,
    uploadProofOfDelivery,
    getDelivery,
    getDeliveryHistory
} from '../../src/controllers/delivery.controller';

describe('delivery.controller', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetDistanceAndDuration.mockResolvedValue({
            distanceMeters: 10000, // 10km
            durationSeconds: 1200  // 20min
        });
        mockCalculateFare.mockResolvedValue({ totalFare: 3500, breakdown: {} });
        mockCreateRideRequest.mockResolvedValue({ id: 'del1' });
        mockStartDriverMatching.mockResolvedValue(undefined);
    });

    // ── createDelivery ────────────────────────────────────────────────

    describe('createDelivery', () => {
        it('creates delivery and returns 201', async () => {
            const req = mockReq({ body: VALID_DELIVERY_BODY });
            const res = mockRes();
            await createDelivery(req, res);

            expect(mockCreateRideRequest).toHaveBeenCalled();
            expect(mockStartDriverMatching).toHaveBeenCalledWith('del1');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ delivery: { id: 'del1' } }));
        });

        it('returns 400 for Zod validation failure', async () => {
            const req = mockReq({ body: { pickup: {} } }); // missing required fields
            const res = mockRes();
            await createDelivery(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('passes requiresReturn flag to increase distance', async () => {
            const body = {
                ...VALID_DELIVERY_BODY,
                deliveryDetails: {
                    ...VALID_DELIVERY_BODY.deliveryDetails,
                    requiresReturn: true
                }
            };
            const req = mockReq({ body });
            const res = mockRes();
            await createDelivery(req, res);

            // calculateFare should be called with ~18km (10*1.8) and ~40min (20*2)
            const [, distKm, durMin] = mockCalculateFare.mock.calls[0];
            expect(distKm).toBeCloseTo(18, 0);
            expect(durMin).toBeCloseTo(40, 0);
        });
    });

    // ── getDeliveryQuote ──────────────────────────────────────────────

    describe('getDeliveryQuote', () => {
        it('returns fare estimate without B2B discount', async () => {
            mockGetAccount.mockResolvedValueOnce(null);

            const req = mockReq({ body: VALID_DELIVERY_BODY });
            const res = mockRes();
            await getDeliveryQuote(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                estimatedFare: 3500,
                currency: 'NGN'
            }));
        });

        it('applies B2B discount when account exists', async () => {
            mockGetAccount.mockResolvedValueOnce({ id: 'b2b1', tier: 'gold' });
            mockApplyBusinessDiscount.mockReturnValueOnce({
                discount: 350, discountedFare: 3150, discountRate: 0.1, tier: 'gold'
            });

            const req = mockReq({ body: VALID_DELIVERY_BODY });
            const res = mockRes();
            await getDeliveryQuote(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                estimatedFare: 3150
            }));
        });

        it('returns 400 for invalid body', async () => {
            const req = mockReq({ body: {} });
            const res = mockRes();
            await getDeliveryQuote(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    // ── uploadProofOfDelivery ─────────────────────────────────────────

    describe('uploadProofOfDelivery', () => {
        it('returns 400 when neither photo nor signature provided', async () => {
            const req = mockReq({ params: { rideId: 'r1' }, body: {} } as any);
            const res = mockRes();
            await uploadProofOfDelivery(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 404 when ride not found', async () => {
            mockDocGet.mockResolvedValueOnce({ exists: false });
            const req = mockReq({
                params: { rideId: 'r1' },
                body: { photoBase64: 'abc' }
            } as any);
            const res = mockRes();
            await uploadProofOfDelivery(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 400 when ride is not a delivery', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ bookingType: 'standard', driverId: 'rider1' }),
                ref: mockRef
            });
            const req = mockReq({
                params: { rideId: 'r1' },
                body: { photoBase64: 'abc' }
            } as any);
            const res = mockRes();
            await uploadProofOfDelivery(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 403 for unauthorized user', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ bookingType: 'delivery', driverId: 'd1', riderId: 'r2' }),
                ref: mockRef
            });
            const req = mockReq({
                params: { rideId: 'r1' },
                body: { photoBase64: 'abc' }
            } as any);
            const res = mockRes();
            await uploadProofOfDelivery(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('uploads photo proof and completes delivery', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    bookingType: 'delivery',
                    driverId: 'rider1',
                    riderId: 'rider1',
                    status: 'in_progress',
                    deliveryDetails: { proofRequired: 'photo' }
                }),
                ref: mockRef
            });
            mockDocUpdate.mockResolvedValueOnce(undefined);

            const req = mockReq({
                params: { rideId: 'r1' },
                body: { photoBase64: Buffer.from('test-image').toString('base64') }
            } as any);
            const res = mockRes();
            await uploadProofOfDelivery(req, res);

            expect(mockBucketFile).toHaveBeenCalled();
            expect(mockDocUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ── getDelivery ───────────────────────────────────────────────────

    describe('getDelivery', () => {
        it('returns 404 when ride not found', async () => {
            mockDocGet.mockResolvedValueOnce({ exists: false });
            const req = mockReq({ params: { id: 'r1' } } as any);
            const res = mockRes();
            await getDelivery(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 404 if ride is not a delivery', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ bookingType: 'standard' }),
                id: 'r1'
            });
            const req = mockReq({ params: { id: 'r1' } } as any);
            const res = mockRes();
            await getDelivery(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 403 for unauthorized user', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ bookingType: 'delivery', riderId: 'other', driverId: 'other2' }),
                id: 'r1'
            });
            const req = mockReq({ params: { id: 'r1' } } as any);
            const res = mockRes();
            await getDelivery(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('returns delivery for participant', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ bookingType: 'delivery', riderId: 'rider1', status: 'in_progress' }),
                id: 'r1'
            });
            const req = mockReq({ params: { id: 'r1' } } as any);
            const res = mockRes();
            await getDelivery(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('allows admin to view delivery', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ bookingType: 'delivery', riderId: 'other', driverId: 'other2' }),
                id: 'r1'
            });
            const req = mockReq({
                user: { uid: 'admin1', role: 'admin' },
                params: { id: 'r1' }
            } as any);
            const res = mockRes();
            await getDelivery(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ── getDeliveryHistory ────────────────────────────────────────────

    describe('getDeliveryHistory', () => {
        it('returns paginated delivery list', async () => {
            mockQueryGet.mockResolvedValueOnce({
                docs: [{ id: 'del1', data: () => ({ status: 'completed' }) }]
            });
            const req = mockReq({ query: { page: '1', limit: '10' } } as any);
            const res = mockRes();
            await getDeliveryHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: [expect.objectContaining({ id: 'del1' })]
            }));
        });
    });
});
