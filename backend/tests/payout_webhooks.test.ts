/**
 * Payout Webhook Tests
 *
 * Tests Monnify and Stripe Connect webhook handlers.
 */

import crypto from 'crypto';

// ─── Firestore mock ───────────────────────────────────────────────────────────

const mockPayoutDocRef = {
    update: jest.fn().mockResolvedValue(undefined),
};

const mockPayoutDoc = {
    exists: true,
    id: 'payout-doc-id',
    ref: mockPayoutDocRef,
    data: jest.fn().mockReturnValue({
        userId: 'user-123',
        amount: 5000,
        currency: 'NGN',
        reference: 'PAYOUT-REF-001',
        statusHistory: [],
        retryCount: 0,
    }),
};

const mockUserDocRef = {
    update: jest.fn().mockResolvedValue(undefined),
};

const mockUserDoc = {
    exists: true,
    id: 'user-123',
    ref: mockUserDocRef,
    data: jest.fn().mockReturnValue({ stripeConnectAccountId: 'acct_test123' }),
};

const mockEmptySnap = { empty: true, docs: [] };

const mockPayoutSnap = { empty: false, docs: [mockPayoutDoc] };
const mockUserSnap = { empty: false, docs: [mockUserDoc] };

const mockCollectionRef = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
    add: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
};

const mockCollection = jest.fn().mockReturnValue(mockCollectionRef);

jest.mock('../src/config/firebase', () => ({
    db: {
        collection: (name: string) => mockCollection(name),
        runTransaction: jest.fn(),
    },
}));

jest.mock('../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockProcessTransaction = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/services/WalletService', () => ({
    walletService: { processTransaction: (...args: any[]) => mockProcessTransaction(...args) },
}));

const mockConstructEvent = jest.fn();
jest.mock('stripe', () => {
    function MockStripe() {
        return {
            webhooks: {
                constructEvent: (...args: any[]) => mockConstructEvent(...args),
            },
        };
    }
    return { __esModule: true, default: MockStripe };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import { monnifyWebhook, stripeConnectWebhook } from '../src/controllers/payout.controller';
import { Request, Response } from 'express';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res as Response);
    res.json = jest.fn().mockReturnValue(res as Response);
    return res as Response;
};

const MONNIFY_SECRET = 'test-monnify-secret';

const makeMonnifyReq = (body: object, overrideSignature?: string) => {
    const signature = overrideSignature ??
        crypto.createHmac('sha512', MONNIFY_SECRET).update(JSON.stringify(body)).digest('hex');
    return {
        headers: { 'monnify-signature': signature },
        body,
    } as unknown as Request;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    process.env.MONNIFY_WEBHOOK_SECRET = MONNIFY_SECRET;
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

    // Default: payout found
    mockCollectionRef.get.mockResolvedValue(mockPayoutSnap);
});

// ─── Monnify tests ────────────────────────────────────────────────────────────

describe('monnifyWebhook', () => {
    const eventBody = {
        eventType: 'SUCCESSFUL_DISBURSEMENT',
        eventData: { transactionReference: 'PAYOUT-REF-001' },
    };

    it('1. SUCCESSFUL_DISBURSEMENT + valid HMAC → 200, status completed', async () => {
        const req = makeMonnifyReq(eventBody);
        const res = makeRes();

        await (monnifyWebhook as any)(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockPayoutDocRef.update).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'completed' })
        );
    });

    it('2. FAILED_DISBURSEMENT + valid HMAC → 200, status failed, wallet refunded', async () => {
        const failBody = {
            eventType: 'FAILED_DISBURSEMENT',
            eventData: { transactionReference: 'PAYOUT-REF-001', failureReason: 'Insufficient funds' },
        };
        const req = makeMonnifyReq(failBody);
        const res = makeRes();

        await (monnifyWebhook as any)(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockPayoutDocRef.update).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'failed' })
        );
        expect(mockProcessTransaction).toHaveBeenCalledWith(
            'user-123',
            5000,
            'credit',
            'refund',
            expect.any(String),
            expect.any(String),
            expect.any(Object)
        );
    });

    it('3. Missing/wrong signature → 403', async () => {
        const req = makeMonnifyReq(eventBody, 'bad-signature');
        const res = makeRes();

        await (monnifyWebhook as any)(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(mockPayoutDocRef.update).not.toHaveBeenCalled();
    });

    it('4. Unknown event type → 200, no update', async () => {
        const unknownBody = {
            eventType: 'UNKNOWN_EVENT',
            eventData: { transactionReference: 'PAYOUT-REF-001' },
        };
        const req = makeMonnifyReq(unknownBody);
        const res = makeRes();

        await (monnifyWebhook as any)(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockPayoutDocRef.update).not.toHaveBeenCalled();
    });
});

// ─── Stripe Connect tests ─────────────────────────────────────────────────────

describe('stripeConnectWebhook', () => {
    const makeStripeReq = (body: Buffer | object, sig = 'stripe-sig-valid') => {
        const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
        return {
            headers: { 'stripe-signature': sig },
            body: typeof body === 'object' && !Buffer.isBuffer(body) ? body : {},
            rawBody,
        } as unknown as Request;
    };

    it('5. account.updated → 200, user stripeConnect fields updated', async () => {
        const event = {
            type: 'account.updated',
            id: 'evt_001',
            data: { object: { id: 'acct_test123', charges_enabled: true, payouts_enabled: true, details_submitted: true } },
        };
        mockConstructEvent.mockReturnValue(event);
        mockCollectionRef.get.mockResolvedValue(mockUserSnap);

        const req = makeStripeReq({});
        const res = makeRes();

        await (stripeConnectWebhook as any)(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockUserDocRef.update).toHaveBeenCalledWith(
            expect.objectContaining({ 'stripeConnect.chargesEnabled': true })
        );
    });

    it('6. transfer.reversed → 200, wallet refunded', async () => {
        const event = {
            type: 'transfer.reversed',
            id: 'evt_002',
            data: { object: { id: 'tr_test123', reversals: { data: [{ id: 'trr_001' }] } } },
        };
        mockConstructEvent.mockReturnValue(event);
        mockCollectionRef.get.mockResolvedValue(mockPayoutSnap);

        const req = makeStripeReq({});
        const res = makeRes();

        await (stripeConnectWebhook as any)(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockProcessTransaction).toHaveBeenCalledWith(
            'user-123',
            5000,
            'credit',
            'refund',
            expect.any(String),
            expect.any(String),
            expect.any(Object)
        );
    });

    it('7. constructEvent throws (bad signature) → 401', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('No signatures found matching the expected signature for payload');
        });

        const req = makeStripeReq({});
        const res = makeRes();

        await (stripeConnectWebhook as any)(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(mockPayoutDocRef.update).not.toHaveBeenCalled();
    });

    it('8. Missing stripe-signature header → 400', async () => {
        const req = {
            headers: {},
            body: {},
            rawBody: Buffer.from('{}'),
        } as unknown as Request;
        const res = makeRes();

        await (stripeConnectWebhook as any)(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });
});
