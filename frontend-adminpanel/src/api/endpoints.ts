// ─── API Endpoint Registry ───────────────────────────────────────────────────
// Single source of truth for all backend API paths.
// Changing an endpoint here updates it across the entire app.

// ─── Auth ────────────────────────────────────────────────────────────────────
export const AUTH_PROFILE = '/v1/auth/profile';

// ─── Admin Analytics ─────────────────────────────────────────────────────────
export const ADMIN_ANALYTICS_EARNINGS = '/v1/admin/analytics/earnings';
export const ADMIN_ANALYTICS_TIMESERIES = '/v1/admin/analytics/earnings/timeseries';
export const ADMIN_ANALYTICS_COUNTS = '/v1/admin/analytics/counts';

// ─── Admin Rides ─────────────────────────────────────────────────────────────
export const ADMIN_RIDES = '/v1/admin/rides';
export const ADMIN_RIDES_ACTIVE = '/v1/admin/rides/active';
export const adminRideCancel = (rideId: string) => `/v1/admin/rides/${rideId}/cancel`;

// ─── Admin Users ─────────────────────────────────────────────────────────────
export const ADMIN_USERS = '/v1/admin/users';
export const ADMIN_USERS_DRIVERS = '/v1/admin/users?role=driver';
export const adminUserStatus = (userId: string) => `/v1/admin/users/${userId}/status`;
export const adminUserDocuments = (userId: string) => `/v1/admin/users/${userId}/documents`;

// ─── Admin Payouts ───────────────────────────────────────────────────────────
export const ADMIN_PAYOUTS = '/v1/admin/payouts';
export const approvePayout = (payoutId: string) => `/v1/payouts/${payoutId}/approve`;

// ─── Admin Disputes ──────────────────────────────────────────────────────────
export const ADMIN_DISPUTES = '/v1/admin/disputes';
export const resolveDispute = (id: string) => `/v1/admin/disputes/${id}/resolve`;

// ─── Admin Promotions ────────────────────────────────────────────────────────
export const ADMIN_PROMOTIONS = '/v1/admin/promotions';
export const adminPromotionById = (id: string) => `/v1/admin/promotions/${id}`;

// ─── Support ─────────────────────────────────────────────────────────────────
export const SUPPORT_ADMIN_ALL = '/v1/support/admin/all';
export const supportAdminReply = (id: string) => `/v1/support/admin/${id}/reply`;
export const supportAdminClose = (id: string) => `/v1/support/admin/${id}/close`;

// ─── Admin Loyalty ───────────────────────────────────────────────────────────
export const ADMIN_LOYALTY_AWARD = '/v1/admin/loyalty/award';

// ─── Admin Pricing ───────────────────────────────────────────────────────────
export const ADMIN_PRICING_NIGERIA = '/v1/admin/pricing/nigeria';
export const ADMIN_PRICING_CHICAGO = '/v1/admin/pricing/chicago';
export const ADMIN_PRICING_DELIVERY = '/v1/admin/pricing/nigeria_delivery';
export const ADMIN_PRICING_HISTORY = '/v1/admin/history/pricing';
