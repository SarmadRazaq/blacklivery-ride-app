
/**
 * Security Audit Tests
 */

// 1. Mock dependencies
jest.mock('../src/config/firebase', () => ({
    db: {
        collection: jest.fn(),
    }
}));

jest.mock('../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    }
}));

jest.mock('../src/services/payment/PaymentService', () => ({
    paymentService: {
        initializePayment: jest.fn(),
        verifyWebhook: jest.fn(),
    }
}));

// 2. Import SUT and Mocks
const { initiatePayment } = require('../src/controllers/payment.controller');
const { paymentService } = require('../src/services/payment/PaymentService');
const { db } = require('../src/config/firebase');

describe('Security Audit: Payment Controller', () => {
    let mockReq: any;
    let mockRes: any;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        jsonMock = jest.fn();
        const sendMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({
            json: jsonMock,
            send: sendMock
        });
        mockRes = {
            status: statusMock,
            json: jsonMock,
            send: sendMock,
        };

        // Default Firestore Mock
        const mockGet = jest.fn();
        const mockSet = jest.fn();
        const mockUpdate = jest.fn();

        (db.collection as jest.Mock).mockReturnValue({
            doc: jest.fn().mockReturnValue({
                get: mockGet,
                set: mockSet,
                update: mockUpdate,
            }),
            add: jest.fn(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        });

        // Expose mockGet for tests to manipulate
        (db as any)._mockGet = mockGet;

        // Default PaymentService
        (paymentService.initializePayment as jest.Mock).mockResolvedValue({
            authorization_url: 'https://checkout.stripe.com/test',
            reference: 'ref_123',
            access_code: 'code_123',
        });
    });

    describe('Vulnerability Check: Currency Injection', () => {
        it('SECURE: Rejects paying ₦100 (NGN) for a Chicago ride (should be USD)', async () => {
            // 1. Mock the Ride in DB
            const mockRideDoc = {
                exists: true,
                data: () => ({
                    id: 'ride_123_chi',
                    riderId: 'hacker_user', // Match the effective user
                    region: 'US-CHI',
                    pricing: { currency: 'USD', total: 100 },
                }),
            };

            // Configure db mock to return this ride
            (db as any)._mockGet.mockResolvedValue(mockRideDoc);

            // 2. Hacker's Request
            mockReq = {
                body: {
                    amount: 100, // Should be $100
                    currency: 'NGN', // ATTACK: Injected Currency (WORTHLESS compared to USD)
                    region: 'NG',    // ATTACK: Injected Region
                    rideId: 'ride_123_chi',
                    email: 'hacker@example.com',
                },
                user: { uid: 'hacker_user', email: 'hacker@example.com' },
            };

            // 3. Execute Controller
            await initiatePayment(mockReq, mockRes);

            // 4. Verification of FIX
            // The controller should REJECT the currency mismatch

            // It should NOT call paymentService
            expect(paymentService.initializePayment).not.toHaveBeenCalled();

            // It should return 400
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('Invalid currency')
            }));
        });

        it('SECURE: Rejects amount tampering for ride payment (underpay attack)', async () => {
            const mockRideDoc = {
                exists: true,
                data: () => ({
                    id: 'ride_456_amount',
                    riderId: 'hacker_user',
                    region: 'US-CHI',
                    pricing: { currency: 'USD', estimatedFare: 250 },
                }),
            };

            (db as any)._mockGet.mockResolvedValue(mockRideDoc);

            mockReq = {
                body: {
                    amount: 100,
                    currency: 'USD',
                    region: 'US-CHI',
                    rideId: 'ride_456_amount',
                    email: 'hacker@example.com',
                },
                user: { uid: 'hacker_user', email: 'hacker@example.com' },
            };

            await initiatePayment(mockReq, mockRes);

            expect(paymentService.initializePayment).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('Invalid amount')
            }));
        });
    });

    describe('Vulnerability Check: Fake Webhook', () => {
        it('SECURE: Rejects webhook without valid signature', async () => {
            // 1. Mock Request without signature
            mockReq = {
                headers: {}, // No signature header
                body: { event: 'charge.success' }
            };

            // 2. Call Webhook Handler (via Service/Controller logic)
            // Note: We need to test the Controller's webhook handler.
            // But we only imported 'initiatePayment'. 
            // We need to import 'handlePaystackWebhook' or similar.
            // Since we use 'require' in the test, we can grab it.
            const { handlePaystackWebhook } = require('../src/controllers/payment.controller');

            // 3. Execute
            await handlePaystackWebhook(mockReq, mockRes);

            // 4. Verify Rejection
            expect(statusMock).toHaveBeenCalledWith(400);
            // It sends 'Missing signature' or similar
        });
    });
});
