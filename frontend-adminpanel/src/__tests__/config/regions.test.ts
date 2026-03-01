import { describe, it, expect } from 'vitest';
import {
    REGIONS,
    DEFAULT_REGION_CODE,
    DEFAULT_CURRENCY,
    DEFAULT_CURRENCY_SYMBOL,
    NIGERIA_DEFAULT_CITY,
    getRegion,
    getCurrencySymbol,
    formatCurrency,
    DEFAULT_MAP_CENTER,
    VEHICLE_CATEGORIES,
    NIGERIA_VEHICLE_CATEGORIES,
    CHICAGO_VEHICLE_CATEGORIES,
    DELIVERY_VEHICLE_CATEGORIES,
    CHICAGO_AIRPORTS,
    PRICING_REGIONS,
    LOYALTY_TIERS,
    TIER_BADGE_VARIANTS,
    DELIVERY_STATUSES,
    RIDE_STATUS_REFRESH_TRIGGERS,
    RIDE_STATUS_BADGE,
} from '../../config/regions';

describe('config/regions', () => {
    describe('REGIONS array', () => {
        it('should have at least 2 regions', () => {
            expect(REGIONS.length).toBeGreaterThanOrEqual(2);
        });

        it('should include Nigeria (NG) and Chicago (US-CHI)', () => {
            const codes = REGIONS.map((r) => r.code);
            expect(codes).toContain('NG');
            expect(codes).toContain('US-CHI');
        });

        it('should have proper structure for each region', () => {
            for (const region of REGIONS) {
                expect(region).toHaveProperty('code');
                expect(region).toHaveProperty('label');
                expect(region).toHaveProperty('currency');
                expect(region).toHaveProperty('currencySymbol');
                expect(region.code.length).toBeGreaterThan(0);
                expect(region.label.length).toBeGreaterThan(0);
                expect(region.currency.length).toBe(3); // ISO 4217
            }
        });

        it('Nigeria should have cities defined', () => {
            const ng = REGIONS.find((r) => r.code === 'NG');
            expect(ng?.cities).toBeDefined();
            expect(ng!.cities!.length).toBeGreaterThan(0);
            const cityCodes = ng!.cities!.map((c) => c.code);
            expect(cityCodes).toContain('lagos');
            expect(cityCodes).toContain('abuja');
        });
    });

    describe('Defaults', () => {
        it('should have sensible defaults', () => {
            expect(DEFAULT_REGION_CODE).toBe('NG');
            expect(DEFAULT_CURRENCY).toBe('NGN');
            expect(DEFAULT_CURRENCY_SYMBOL).toBe('₦');
            expect(NIGERIA_DEFAULT_CITY).toBe('lagos');
        });
    });

    describe('getRegion()', () => {
        it('should find Nigeria by code', () => {
            const ng = getRegion('NG');
            expect(ng.code).toBe('NG');
            expect(ng.currency).toBe('NGN');
        });

        it('should find Chicago by code', () => {
            const chi = getRegion('US-CHI');
            expect(chi.code).toBe('US-CHI');
            expect(chi.currency).toBe('USD');
        });

        it('should fallback to first region for unknown code', () => {
            const fallback = getRegion('UNKNOWN');
            expect(fallback).toBe(REGIONS[0]);
        });
    });

    describe('getCurrencySymbol()', () => {
        it('should return ₦ for NGN', () => {
            expect(getCurrencySymbol('NGN')).toBe('₦');
        });

        it('should return $ for USD', () => {
            expect(getCurrencySymbol('USD')).toBe('$');
        });

        it('should return default symbol when no code given', () => {
            expect(getCurrencySymbol()).toBe(DEFAULT_CURRENCY_SYMBOL);
            expect(getCurrencySymbol(undefined)).toBe(DEFAULT_CURRENCY_SYMBOL);
        });

        it('should return the raw code for unknown currency', () => {
            expect(getCurrencySymbol('EUR')).toBe('EUR');
            expect(getCurrencySymbol('GBP')).toBe('GBP');
        });
    });

    describe('formatCurrency()', () => {
        it('should format NGN amounts with ₦ symbol', () => {
            expect(formatCurrency(1500, 'NGN')).toBe('₦1,500');
        });

        it('should format USD amounts with $ symbol', () => {
            expect(formatCurrency(25, 'USD')).toBe('$25');
        });

        it('should format with default currency when none specified', () => {
            const result = formatCurrency(1000);
            expect(result).toBe('₦1,000');
        });

        it('should handle zero', () => {
            expect(formatCurrency(0, 'NGN')).toBe('₦0');
        });

        it('should handle large numbers with commas', () => {
            expect(formatCurrency(1000000, 'NGN')).toBe('₦1,000,000');
        });
    });

    describe('DEFAULT_MAP_CENTER', () => {
        it('should have valid lat/lng coordinates', () => {
            expect(DEFAULT_MAP_CENTER.lat).toBeGreaterThanOrEqual(-90);
            expect(DEFAULT_MAP_CENTER.lat).toBeLessThanOrEqual(90);
            expect(DEFAULT_MAP_CENTER.lng).toBeGreaterThanOrEqual(-180);
            expect(DEFAULT_MAP_CENTER.lng).toBeLessThanOrEqual(180);
        });
    });

    describe('Vehicle Categories', () => {
        it('should have general vehicle categories', () => {
            expect(VEHICLE_CATEGORIES.length).toBeGreaterThan(0);
            for (const cat of VEHICLE_CATEGORIES) {
                expect(cat).toHaveProperty('value');
                expect(cat).toHaveProperty('label');
            }
        });

        it('should have Nigeria-specific categories', () => {
            expect(NIGERIA_VEHICLE_CATEGORIES.length).toBe(3);
            const keys = NIGERIA_VEHICLE_CATEGORIES.map((c) => c.key);
            expect(keys).toContain('sedan');
            expect(keys).toContain('suv');
            expect(keys).toContain('xl');
        });

        it('should have Chicago-specific categories', () => {
            expect(CHICAGO_VEHICLE_CATEGORIES.length).toBe(3);
            const keys = CHICAGO_VEHICLE_CATEGORIES.map((c) => c.key);
            expect(keys).toContain('business_sedan');
            expect(keys).toContain('business_suv');
            expect(keys).toContain('first_class');
        });

        it('should have delivery-specific categories', () => {
            expect(DELIVERY_VEHICLE_CATEGORIES.length).toBe(4);
            const keys = DELIVERY_VEHICLE_CATEGORIES.map((c) => c.key);
            expect(keys).toContain('motorbike');
            expect(keys).toContain('van');
        });
    });

    describe('Chicago Airports', () => {
        it('should include ORD and MDW', () => {
            const codes = CHICAGO_AIRPORTS.map((a) => a.code);
            expect(codes).toContain('ORD');
            expect(codes).toContain('MDW');
        });
    });

    describe('Pricing Regions', () => {
        it('should have all three pricing regions', () => {
            expect(PRICING_REGIONS).toContain('nigeria');
            expect(PRICING_REGIONS).toContain('chicago');
            expect(PRICING_REGIONS).toContain('nigeria_delivery');
        });
    });

    describe('Loyalty Tiers', () => {
        it('should define 4 tiers in ascending order', () => {
            expect(LOYALTY_TIERS.length).toBe(4);
            const keys = LOYALTY_TIERS.map((t) => t.key);
            expect(keys).toEqual(['bronze', 'silver', 'gold', 'platinum']);
        });

        it('should have color classes for each tier', () => {
            for (const tier of LOYALTY_TIERS) {
                expect(tier.colorClass).toMatch(/^text-/);
            }
        });

        it('should have badge variants for all tiers', () => {
            for (const tier of LOYALTY_TIERS) {
                expect(TIER_BADGE_VARIANTS).toHaveProperty(tier.key);
            }
        });
    });

    describe('Delivery Statuses', () => {
        it('should define a status pipeline', () => {
            expect(DELIVERY_STATUSES.length).toBeGreaterThanOrEqual(3);
            expect(DELIVERY_STATUSES).toContain('finding_driver');
            expect(DELIVERY_STATUSES).toContain('delivered');
        });
    });

    describe('Ride Status Config', () => {
        it('should define refresh triggers', () => {
            expect(RIDE_STATUS_REFRESH_TRIGGERS).toContain('completed');
            expect(RIDE_STATUS_REFRESH_TRIGGERS).toContain('cancelled');
        });

        it('should map statuses to badge variants', () => {
            expect(RIDE_STATUS_BADGE.completed).toBe('success');
            expect(RIDE_STATUS_BADGE.cancelled).toBe('danger');
            expect(RIDE_STATUS_BADGE.in_progress).toBe('info');
        });
    });
});
