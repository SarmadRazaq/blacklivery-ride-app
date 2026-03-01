// ─── Application Constants ───────────────────────────────────────────────────
// Centralized configuration for all magic numbers, strings, and defaults.
// Nothing here should be hardcoded elsewhere in the app.

// ─── Branding ────────────────────────────────────────────────────────────────
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Blacklivery';
export const APP_SUBTITLE = 'Admin Panel';
export const APP_LOGIN_SUBTITLE = 'Admin Portal Access';
export const APP_LOGIN_PLACEHOLDER_EMAIL = 'admin@company.com';

// ─── Roles ───────────────────────────────────────────────────────────────────
export const DEFAULT_ROLE = 'rider';
export const ADMIN_ROLE = 'admin';
export const DEFAULT_DISPLAY_NAME = 'Admin';

// ─── Storage Keys ────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
    TOKEN: 'token',
} as const;

// ─── Routes ──────────────────────────────────────────────────────────────────
export const ROUTES = {
    LOGIN: '/login',
} as const;

// ─── Timing (milliseconds) ──────────────────────────────────────────────────
export const DEBOUNCE_MS = 500;
export const TOAST_AUTO_CLOSE_MS = 3000;
export const MAP_POLL_INTERVAL_MS = 15000;

// ─── Socket ──────────────────────────────────────────────────────────────────
export const SOCKET_RECONNECTION_ATTEMPTS = 10;
export const SOCKET_RECONNECTION_DELAY_MS = 1000;

// ─── Pagination ──────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = '20';

// ─── Analytics ───────────────────────────────────────────────────────────────
export const ANALYTICS_TIMESERIES_DAYS = 30;
export const ANALYTICS_COUNT_ONLY_LIMIT = 1;
export const CHART_X_AXIS_INTERVAL = 4;

// ─── Map ─────────────────────────────────────────────────────────────────────
export const MAP_CONTAINER_HEIGHT = '400px';
export const MAP_DEFAULT_ZOOM = 12;
export const MAP_MARKER_SCALE = 7;
export const MAP_MARKER_STROKE_WEIGHT = 2;
export const MAP_LOADER_ID = 'google-map-script';

// ─── ID Display ──────────────────────────────────────────────────────────────
export const SHORT_ID_LENGTH = 8;

// ─── Admin Actions ───────────────────────────────────────────────────────────
export const ADMIN_CANCEL_REASON = 'Admin cancelled';

// ─── Locale ──────────────────────────────────────────────────────────────────
export const DEFAULT_LOCALE = 'en-GB';
export const CHART_LOCALE = 'en';

// ─── Layout ──────────────────────────────────────────────────────────────────
export const SIDEBAR_WIDTH_CLASS = 'w-64';
export const MAIN_CONTENT_MARGIN_CLASS = 'ml-64';
export const CHAT_BUBBLE_MAX_WIDTH = 'max-w-[80%]';
