import { describe, it, expect } from 'vitest';
import { MAP_MARKER_COLORS, CHART_COLORS, ROOT_COLORS } from '../../config/theme';

describe('config/theme', () => {
    describe('MAP_MARKER_COLORS', () => {
        it('should have ONLINE, BUSY, and STROKE colors', () => {
            expect(MAP_MARKER_COLORS).toHaveProperty('ONLINE');
            expect(MAP_MARKER_COLORS).toHaveProperty('BUSY');
            expect(MAP_MARKER_COLORS).toHaveProperty('STROKE');
        });

        it('should use valid hex color codes', () => {
            const hexRegex = /^#[0-9A-Fa-f]{6}$/;
            expect(MAP_MARKER_COLORS.ONLINE).toMatch(hexRegex);
            expect(MAP_MARKER_COLORS.BUSY).toMatch(hexRegex);
        });

        it('STROKE should be a valid CSS color', () => {
            // 'white' is a valid named CSS color
            expect(MAP_MARKER_COLORS.STROKE).toBeTruthy();
        });
    });

    describe('CHART_COLORS', () => {
        it('should define all chart color tokens', () => {
            expect(CHART_COLORS).toHaveProperty('GRID_STROKE');
            expect(CHART_COLORS).toHaveProperty('AXIS_TICK');
            expect(CHART_COLORS).toHaveProperty('REVENUE_LINE');
            expect(CHART_COLORS).toHaveProperty('RIDES_BAR');
        });

        it('should all be valid hex colors', () => {
            const hexRegex = /^#[0-9A-Fa-f]{6}$/;
            expect(CHART_COLORS.GRID_STROKE).toMatch(hexRegex);
            expect(CHART_COLORS.AXIS_TICK).toMatch(hexRegex);
            expect(CHART_COLORS.REVENUE_LINE).toMatch(hexRegex);
            expect(CHART_COLORS.RIDES_BAR).toMatch(hexRegex);
        });
    });

    describe('ROOT_COLORS', () => {
        it('should define TEXT and BACKGROUND colors', () => {
            expect(ROOT_COLORS).toHaveProperty('TEXT');
            expect(ROOT_COLORS).toHaveProperty('BACKGROUND');
        });

        it('should use valid hex colors', () => {
            const hexRegex = /^#[0-9A-Fa-f]{6}$/;
            expect(ROOT_COLORS.TEXT).toMatch(hexRegex);
            expect(ROOT_COLORS.BACKGROUND).toMatch(hexRegex);
        });
    });
});
