/**
 * Loyalty Service Tests
 *
 * Tests awardPoints and redeemPoints critical paths.
 */

// ─── Firestore mock ───────────────────────────────────────────────────────────

const mockAccountDocRef = { set: jest.fn(), update: jest.fn() };

let _accountExists = false;
let _accountData: any = null;

const mockAccountDoc = {
    get exists() { return _accountExists; },
    data: () => _accountData,
};

const mockTransaction = {
    get: jest.fn().mockResolvedValue(mockAccountDoc),
    set: jest.fn(),
    update: jest.fn(),
};

const mockRunTransaction = jest.fn(async (fn: (t: any) => Promise<any>) => fn(mockTransaction));

const mockHistoryRef = { add: jest.fn().mockResolvedValue({ id: 'hist-id' }) };
const mockRedemptionRef = { add: jest.fn().mockResolvedValue({ id: 'redemption-id' }) };
const mockAccountDocContainer = {
    get: jest.fn().mockResolvedValue(mockAccountDoc),
};

const mockCollection = jest.fn((name: string) => {
    if (name === 'loyalty_accounts') {
        return {
            doc: jest.fn().mockReturnValue(mockAccountDocContainer),
        };
    }
    if (name === 'loyalty_history') return mockHistoryRef;
    if (name === 'loyalty_redemptions') return mockRedemptionRef;
    return { doc: jest.fn(), where: jest.fn().mockReturnThis(), get: jest.fn() };
});

jest.mock('../src/config/firebase', () => ({
    db: {
        collection: (name: string) => mockCollection(name),
        runTransaction: (fn: any) => mockRunTransaction(fn),
    },
}));

jest.mock('../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: () => new Date('2026-01-01T00:00:00Z'),
        increment: (n: number) => n,
        delete: () => '__DELETE__',
    },
}));

jest.mock('firebase-admin', () => ({
    firestore: {
        FieldValue: {
            serverTimestamp: () => new Date('2026-01-01T00:00:00Z'),
            increment: (n: number) => n,
        },
    },
}));

const mockGetNigeriaConfig = jest.fn().mockResolvedValue({
    loyalty: { pointsPerCurrency: 0.1, tiers: { bronze: 0, silver: 500, gold: 2000, platinum: 5000 } },
});
const mockGetChicagoConfig = jest.fn().mockResolvedValue({
    loyalty: { pointsPerCurrency: 10, tiers: { bronze: 0, silver: 500, gold: 2000, platinum: 5000 } },
});

jest.mock('../src/services/pricing/PricingConfigService', () => ({
    pricingConfigService: {
        getNigeriaConfig: () => mockGetNigeriaConfig(),
        getChicagoConfig: () => mockGetChicagoConfig(),
    },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { loyaltyService } from '../src/services/LoyaltyService';

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    _accountExists = false;
    _accountData = null;

    // Re-wire transaction mock to use the latest mockAccountDoc
    mockTransaction.get.mockResolvedValue(mockAccountDoc);
    mockRunTransaction.mockImplementation(async (fn: (t: any) => Promise<any>) => fn(mockTransaction));

    // Re-wire collection mock
    mockCollection.mockImplementation((name: string) => {
        if (name === 'loyalty_accounts') {
            return { doc: jest.fn().mockReturnValue(mockAccountDocContainer) };
        }
        if (name === 'loyalty_history') return mockHistoryRef;
        if (name === 'loyalty_redemptions') return mockRedemptionRef;
        return { doc: jest.fn(), where: jest.fn().mockReturnThis(), get: jest.fn() };
    });
});

describe('LoyaltyService.awardPoints', () => {
    it('1. new user: creates loyalty_accounts doc with correct points', async () => {
        _accountExists = false;
        // 500 NGN * 0.1 = 50 points
        const result = await loyaltyService.awardPoints('user-new', 500, 'NGN');

        expect(result.pointsAwarded).toBe(50);
        expect(result.newTotal).toBe(50);
        expect(result.tier).toBe('bronze');
        expect(mockTransaction.set).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ userId: 'user-new', points: 50, lifetimePoints: 50 })
        );
    });

    it('2. existing user: increments points, upgrades tier at 500 lifetime', async () => {
        _accountExists = true;
        // Existing account just below silver threshold
        _accountData = {
            userId: 'user-existing',
            points: 450,
            tier: 'bronze',
            lifetimePoints: 450,
            lifetimeTrips: 10,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // 600 NGN * 0.1 = 60 points → lifetimePoints becomes 510 → silver
        const result = await loyaltyService.awardPoints('user-existing', 600, 'NGN');

        expect(result.pointsAwarded).toBe(60);
        expect(result.newTotal).toBe(510);
        expect(result.tier).toBe('silver');
        expect(mockTransaction.set).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ tier: 'silver', lifetimePoints: 510 })
        );
    });
});

describe('LoyaltyService.redeemPoints', () => {
    it('3. ride_discount: deducts 100 points, creates redemption with 10% valuePercent', async () => {
        _accountExists = true;
        _accountData = {
            userId: 'user-redeem',
            points: 500,
            tier: 'silver',
            lifetimePoints: 600,
            lifetimeTrips: 15,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const redemption = await loyaltyService.redeemPoints('user-redeem', 'ride_discount');

        expect(redemption.pointsSpent).toBe(100);
        expect(redemption.rewardValue).toBe(10);
        expect(redemption.rewardType).toBe('ride_discount');
        expect(mockTransaction.update).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ points: 400 })
        );
    });

    it('4. insufficient points: throws with message containing "Insufficient points"', async () => {
        _accountExists = true;
        _accountData = {
            userId: 'user-poor',
            points: 50,
            tier: 'bronze',
            lifetimePoints: 50,
            lifetimeTrips: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await expect(loyaltyService.redeemPoints('user-poor', 'ride_discount')).rejects.toThrow(
            /Insufficient points/i
        );
    });

    it('5. free_ride: deducts 500 points, valuePercent = 100', async () => {
        _accountExists = true;
        _accountData = {
            userId: 'user-rich',
            points: 600,
            tier: 'silver',
            lifetimePoints: 600,
            lifetimeTrips: 20,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const redemption = await loyaltyService.redeemPoints('user-rich', 'free_ride');

        expect(redemption.pointsSpent).toBe(500);
        expect(redemption.rewardValue).toBe(100);
        expect(redemption.rewardType).toBe('free_ride');
        expect(mockTransaction.update).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ points: 100 })
        );
    });
});
