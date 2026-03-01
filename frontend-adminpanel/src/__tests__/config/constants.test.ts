import { describe, it, expect } from 'vitest';
import {
    APP_NAME,
    APP_SUBTITLE,
    APP_LOGIN_SUBTITLE,
    APP_LOGIN_PLACEHOLDER_EMAIL,
    DEFAULT_ROLE,
    ADMIN_ROLE,
    DEFAULT_DISPLAY_NAME,
    STORAGE_KEYS,
    ROUTES,
    DEBOUNCE_MS,
    TOAST_AUTO_CLOSE_MS,
    MAP_POLL_INTERVAL_MS,
    SOCKET_RECONNECTION_ATTEMPTS,
    SOCKET_RECONNECTION_DELAY_MS,
    DEFAULT_PAGE_SIZE,
    ANALYTICS_TIMESERIES_DAYS,
    ANALYTICS_COUNT_ONLY_LIMIT,
    CHART_X_AXIS_INTERVAL,
    MAP_CONTAINER_HEIGHT,
    MAP_DEFAULT_ZOOM,
    MAP_MARKER_SCALE,
    MAP_MARKER_STROKE_WEIGHT,
    MAP_LOADER_ID,
    SHORT_ID_LENGTH,
    ADMIN_CANCEL_REASON,
    DEFAULT_LOCALE,
    CHART_LOCALE,
    SIDEBAR_WIDTH_CLASS,
    MAIN_CONTENT_MARGIN_CLASS,
    CHAT_BUBBLE_MAX_WIDTH,
} from '../../config/constants';

describe('config/constants', () => {
    describe('Branding', () => {
        it('should have an app name (from env or fallback)', () => {
            expect(APP_NAME).toBeTruthy();
            expect(typeof APP_NAME).toBe('string');
        });

        it('should have subtitle and login text', () => {
            expect(APP_SUBTITLE).toBe('Admin Panel');
            expect(APP_LOGIN_SUBTITLE).toBe('Admin Portal Access');
            expect(APP_LOGIN_PLACEHOLDER_EMAIL).toContain('@');
        });
    });

    describe('Roles', () => {
        it('should define rider and admin roles', () => {
            expect(DEFAULT_ROLE).toBe('rider');
            expect(ADMIN_ROLE).toBe('admin');
            expect(DEFAULT_DISPLAY_NAME).toBe('Admin');
        });
    });

    describe('Storage Keys', () => {
        it('should define token storage key', () => {
            expect(STORAGE_KEYS).toHaveProperty('TOKEN');
            expect(STORAGE_KEYS.TOKEN).toBe('token');
        });

        it('should be a readonly object with expected keys', () => {
            expect(Object.keys(STORAGE_KEYS)).toContain('TOKEN');
            expect(Object.keys(STORAGE_KEYS).length).toBe(1);
        });
    });

    describe('Routes', () => {
        it('should define login route', () => {
            expect(ROUTES.LOGIN).toBe('/login');
        });
    });

    describe('Timing constants', () => {
        it('should have reasonable debounce and toast timings', () => {
            expect(DEBOUNCE_MS).toBeGreaterThan(0);
            expect(DEBOUNCE_MS).toBeLessThanOrEqual(2000);
            expect(TOAST_AUTO_CLOSE_MS).toBeGreaterThan(0);
            expect(MAP_POLL_INTERVAL_MS).toBeGreaterThanOrEqual(5000);
        });

        it('should have reasonable socket reconnection settings', () => {
            expect(SOCKET_RECONNECTION_ATTEMPTS).toBeGreaterThan(0);
            expect(SOCKET_RECONNECTION_DELAY_MS).toBeGreaterThan(0);
        });
    });

    describe('Pagination', () => {
        it('should have a default page size as a string number', () => {
            expect(DEFAULT_PAGE_SIZE).toBe('20');
            expect(Number(DEFAULT_PAGE_SIZE)).toBeGreaterThan(0);
        });
    });

    describe('Analytics', () => {
        it('should have reasonable analytics defaults', () => {
            expect(ANALYTICS_TIMESERIES_DAYS).toBe(30);
            expect(ANALYTICS_COUNT_ONLY_LIMIT).toBe(1);
            expect(CHART_X_AXIS_INTERVAL).toBeGreaterThan(0);
        });
    });

    describe('Map settings', () => {
        it('should have valid map configuration', () => {
            expect(MAP_CONTAINER_HEIGHT).toMatch(/^\d+px$/);
            expect(MAP_DEFAULT_ZOOM).toBeGreaterThan(0);
            expect(MAP_DEFAULT_ZOOM).toBeLessThanOrEqual(22);
            expect(MAP_MARKER_SCALE).toBeGreaterThan(0);
            expect(MAP_MARKER_STROKE_WEIGHT).toBeGreaterThan(0);
            expect(MAP_LOADER_ID).toBeTruthy();
        });
    });

    describe('ID Display', () => {
        it('should truncate IDs to a reasonable length', () => {
            expect(SHORT_ID_LENGTH).toBeGreaterThan(4);
            expect(SHORT_ID_LENGTH).toBeLessThanOrEqual(16);
        });
    });

    describe('Admin Actions', () => {
        it('should have a cancel reason string', () => {
            expect(ADMIN_CANCEL_REASON).toBeTruthy();
            expect(typeof ADMIN_CANCEL_REASON).toBe('string');
        });
    });

    describe('Locale', () => {
        it('should define valid locale strings', () => {
            expect(DEFAULT_LOCALE).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
            expect(CHART_LOCALE).toMatch(/^[a-z]{2}$/);
        });
    });

    describe('Layout', () => {
        it('should define Tailwind width/margin classes', () => {
            expect(SIDEBAR_WIDTH_CLASS).toMatch(/^w-\d+$/);
            expect(MAIN_CONTENT_MARGIN_CLASS).toMatch(/^ml-\d+$/);
            expect(CHAT_BUBBLE_MAX_WIDTH).toContain('max-w-');
        });
    });
});
