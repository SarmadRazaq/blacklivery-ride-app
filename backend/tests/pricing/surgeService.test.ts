import { SurgeService } from '../../src/services/pricing/SurgeService';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockQueryGet = jest.fn();

jest.mock('../../src/config/firebase', () => ({
    db: {
        collection: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            get: mockQueryGet
        }))
    }
}));

jest.mock('../../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

const mockGetNigeriaConfig = jest.fn().mockResolvedValue(null);
const mockGetChicagoConfig = jest.fn().mockResolvedValue(null);

jest.mock('../../src/services/pricing/PricingConfigService', () => ({
    pricingConfigService: {
        getNigeriaConfig: (...args: any[]) => mockGetNigeriaConfig(...args),
        getChicagoConfig: (...args: any[]) => mockGetChicagoConfig(...args)
    }
}));

jest.mock('../../src/utils/geohash', () => ({
    encodeGeohash: jest.fn(() => 'dp3wq')
}));

const mockGetWeather = jest.fn().mockResolvedValue({ surgeMultiplier: 1.0 });

jest.mock('../../src/services/WeatherService', () => ({
    weatherService: {
        getWeather: (...args: any[]) => mockGetWeather(...args)
    }
}));

// ── Helpers ───────────────────────────────────────────────────────────────

function setDemandSupply(demand: number, supply: number) {
    mockQueryGet
        .mockResolvedValueOnce({ size: demand })   // rides query
        .mockResolvedValueOnce({ size: supply });   // drivers query
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('SurgeService', () => {
    let service: SurgeService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new SurgeService();
    });

    // ── Admin override ────────────────────────────────────────────────

    describe('Admin override (forceActive)', () => {
        it('returns forced peak surge for Nigeria', async () => {
            mockGetNigeriaConfig.mockResolvedValueOnce({
                surge: { forceActive: true, peak: 1.8 }
            });

            const result = await service.getMultiplier(6.5, 3.3, 'NG');
            expect(result).toBe(1.8);
            expect(mockQueryGet).not.toHaveBeenCalled();
        });

        it('defaults to 1.5 when peak not set', async () => {
            mockGetChicagoConfig.mockResolvedValueOnce({
                surge: { forceActive: true }
            });

            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(1.5);
        });
    });

    // ── Cache ─────────────────────────────────────────────────────────

    describe('Cache', () => {
        it('returns cached value when valid', async () => {
            setDemandSupply(0, 5);
            const first = await service.getMultiplier(41.8, -87.6, 'US-CHI');

            const second = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(second).toBe(first);
            // Only 2 Firestore calls for the first invocation
            expect(mockQueryGet).toHaveBeenCalledTimes(2);
        });

        it('recalculates after clearCache()', async () => {
            setDemandSupply(0, 5);
            await service.getMultiplier(41.8, -87.6, 'US-CHI');

            service.clearCache();

            setDemandSupply(0, 5);
            await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(mockQueryGet).toHaveBeenCalledTimes(4);
        });
    });

    // ── Demand / Supply ratio ─────────────────────────────────────────

    describe('Demand / Supply ratio', () => {
        it('returns 1.0 when no demand', async () => {
            setDemandSupply(0, 5);
            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(1.0);
        });

        it('returns high (1.5) when supply is 0', async () => {
            setDemandSupply(3, 0);
            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(1.5);
        });

        it('returns extreme (2.0) when ratio > 2.0', async () => {
            setDemandSupply(10, 3); // ratio 3.33
            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(2.0);
        });

        it('returns high (1.5) when ratio > 1.5', async () => {
            setDemandSupply(5, 3); // ratio 1.67
            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(1.5);
        });

        it('returns 1.0 when balanced supply/demand', async () => {
            setDemandSupply(3, 10); // ratio 0.3
            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(1.0);
        });
    });

    // ── Weather multiplier ────────────────────────────────────────────

    describe('Weather multiplier', () => {
        it('uses weather surge when higher than demand surge', async () => {
            setDemandSupply(0, 5);   // demand=1.0
            mockGetWeather.mockResolvedValueOnce({ surgeMultiplier: 1.7 });

            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(1.7);
        });

        it('falls back to 1.0 when weather service fails', async () => {
            setDemandSupply(0, 5);
            mockGetWeather.mockRejectedValueOnce(new Error('API down'));

            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(1.0);
        });
    });

    // ── Max cap ───────────────────────────────────────────────────────

    describe('Max cap', () => {
        it('caps at 3.0 by default', async () => {
            setDemandSupply(10, 0); // supply=0 → high=1.5
            mockGetWeather.mockResolvedValueOnce({ surgeMultiplier: 5.0 });

            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(3.0);
        });

        it('caps at config maxMultiplier when set', async () => {
            mockGetChicagoConfig.mockResolvedValueOnce({
                surge: { maxMultiplier: 2.0 }
            });
            setDemandSupply(0, 5);
            mockGetWeather.mockResolvedValueOnce({ surgeMultiplier: 2.5 });

            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(2.0);
        });
    });

    // ── Region normalization ──────────────────────────────────────────

    describe('Region normalization', () => {
        it('normalizes "nigeria" to NG', async () => {
            mockGetNigeriaConfig.mockResolvedValueOnce(null);
            setDemandSupply(0, 5);
            await service.getMultiplier(6.5, 3.3, 'nigeria' as any);
            expect(mockGetNigeriaConfig).toHaveBeenCalled();
        });

        it('normalizes unknown to US-CHI', async () => {
            mockGetChicagoConfig.mockResolvedValueOnce(null);
            setDemandSupply(0, 5);
            await service.getMultiplier(41.8, -87.6, '' as any);
            expect(mockGetChicagoConfig).toHaveBeenCalled();
        });
    });

    // ── Error handling ────────────────────────────────────────────────

    describe('Error handling', () => {
        it('returns 1.0 when Firestore query fails', async () => {
            mockQueryGet.mockRejectedValueOnce(new Error('Firestore down'));

            const result = await service.getMultiplier(41.8, -87.6, 'US-CHI');
            expect(result).toBe(1.0);
        });
    });
});
