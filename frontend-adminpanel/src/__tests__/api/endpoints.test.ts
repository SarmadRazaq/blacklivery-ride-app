import { describe, it, expect } from 'vitest';
import {
    AUTH_PROFILE,
    ADMIN_ANALYTICS_EARNINGS,
    ADMIN_ANALYTICS_TIMESERIES,
    ADMIN_RIDES,
    ADMIN_RIDES_ACTIVE,
    adminRideCancel,
    ADMIN_USERS,
    ADMIN_USERS_DRIVERS,
    adminUserStatus,
    adminUserDocuments,
    ADMIN_PAYOUTS,
    approvePayout,
    ADMIN_DISPUTES,
    resolveDispute,
    ADMIN_PROMOTIONS,
    adminPromotionById,
    SUPPORT_ADMIN_ALL,
    supportAdminReply,
    supportAdminClose,
    ADMIN_LOYALTY_AWARD,
    ADMIN_PRICING_NIGERIA,
    ADMIN_PRICING_CHICAGO,
    ADMIN_PRICING_DELIVERY,
    ADMIN_PRICING_HISTORY,
} from '../../api/endpoints';

describe('api/endpoints', () => {
    describe('Static endpoints', () => {
        it('should start with /v1/', () => {
            const staticEndpoints = [
                AUTH_PROFILE,
                ADMIN_ANALYTICS_EARNINGS,
                ADMIN_ANALYTICS_TIMESERIES,
                ADMIN_RIDES,
                ADMIN_RIDES_ACTIVE,
                ADMIN_USERS,
                ADMIN_USERS_DRIVERS,
                ADMIN_PAYOUTS,
                ADMIN_DISPUTES,
                ADMIN_PROMOTIONS,
                SUPPORT_ADMIN_ALL,
                ADMIN_LOYALTY_AWARD,
                ADMIN_PRICING_NIGERIA,
                ADMIN_PRICING_CHICAGO,
                ADMIN_PRICING_DELIVERY,
                ADMIN_PRICING_HISTORY,
            ];

            for (const endpoint of staticEndpoints) {
                expect(endpoint).toMatch(/^\/v1\//);
            }
        });

        it('should not contain double slashes', () => {
            const all = [
                AUTH_PROFILE,
                ADMIN_ANALYTICS_EARNINGS,
                ADMIN_RIDES,
                ADMIN_USERS,
                ADMIN_PAYOUTS,
                ADMIN_DISPUTES,
                ADMIN_PROMOTIONS,
                SUPPORT_ADMIN_ALL,
            ];
            for (const endpoint of all) {
                expect(endpoint).not.toMatch(/\/\//);
            }
        });
    });

    describe('Parameterized endpoint helpers', () => {
        it('adminRideCancel should interpolate ride ID', () => {
            const url = adminRideCancel('ride-123');
            expect(url).toBe('/v1/admin/rides/ride-123/cancel');
            expect(url).toContain('ride-123');
        });

        it('adminUserStatus should interpolate user ID', () => {
            const url = adminUserStatus('user-abc');
            expect(url).toBe('/v1/admin/users/user-abc/status');
        });

        it('adminUserDocuments should interpolate user ID', () => {
            const url = adminUserDocuments('user-xyz');
            expect(url).toBe('/v1/admin/users/user-xyz/documents');
        });

        it('approvePayout should interpolate payout ID', () => {
            const url = approvePayout('payout-456');
            expect(url).toBe('/v1/payouts/payout-456/approve');
        });

        it('resolveDispute should interpolate dispute ID', () => {
            const url = resolveDispute('dispute-789');
            expect(url).toBe('/v1/admin/disputes/dispute-789/resolve');
        });

        it('adminPromotionById should interpolate promo ID', () => {
            const url = adminPromotionById('promo-001');
            expect(url).toBe('/v1/admin/promotions/promo-001');
        });

        it('supportAdminReply should interpolate ticket ID', () => {
            const url = supportAdminReply('ticket-10');
            expect(url).toBe('/v1/support/admin/ticket-10/reply');
        });

        it('supportAdminClose should interpolate ticket ID', () => {
            const url = supportAdminClose('ticket-20');
            expect(url).toBe('/v1/support/admin/ticket-20/close');
        });

        it('should handle special characters in IDs', () => {
            const url = adminRideCancel('ride-with-dashes-123');
            expect(url).toContain('ride-with-dashes-123');
        });

        it('ADMIN_USERS_DRIVERS should filter by driver role', () => {
            expect(ADMIN_USERS_DRIVERS).toContain('role=driver');
        });
    });
});
