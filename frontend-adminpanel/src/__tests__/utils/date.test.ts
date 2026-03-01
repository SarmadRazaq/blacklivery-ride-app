import { describe, it, expect } from 'vitest';
import { toDateSafe, formatDateSafe, formatDateTimeSafe } from '../../utils/date';

describe('utils/date', () => {
    describe('toDateSafe()', () => {
        it('should return null for falsy values', () => {
            expect(toDateSafe(null)).toBeNull();
            expect(toDateSafe(undefined)).toBeNull();
            expect(toDateSafe('')).toBeNull();
            expect(toDateSafe(0)).toBeNull();
        });

        it('should return a Date instance for a valid Date', () => {
            const d = new Date('2024-06-15');
            expect(toDateSafe(d)).toEqual(d);
        });

        it('should return null for invalid Date objects', () => {
            expect(toDateSafe(new Date('bad'))).toBeNull();
        });

        it('should parse Firestore _seconds timestamps', () => {
            const ts = { _seconds: 1718400000, _nanoseconds: 0 };
            const result = toDateSafe(ts);
            expect(result).toBeInstanceOf(Date);
            expect(result!.getTime()).toBe(1718400000 * 1000);
        });

        it('should parse Firestore seconds timestamps', () => {
            const ts = { seconds: 1718400000, nanoseconds: 0 };
            const result = toDateSafe(ts);
            expect(result).toBeInstanceOf(Date);
            expect(result!.getTime()).toBe(1718400000 * 1000);
        });

        it('should handle objects with toDate() method', () => {
            const ts = { toDate: () => new Date('2024-06-15T00:00:00Z') };
            const result = toDateSafe(ts);
            expect(result).toBeInstanceOf(Date);
        });

        it('should parse valid ISO string', () => {
            const result = toDateSafe('2024-06-15T12:00:00Z');
            expect(result).toBeInstanceOf(Date);
        });

        it('should parse numeric timestamps', () => {
            const result = toDateSafe(1718400000000);
            expect(result).toBeInstanceOf(Date);
        });

        it('should return null for unparseable strings', () => {
            expect(toDateSafe('not-a-date')).toBeNull();
        });
    });

    describe('formatDateSafe()', () => {
        it('should format a valid date', () => {
            const d = new Date('2024-06-15T12:00:00Z');
            const result = formatDateSafe(d);
            expect(result).not.toBe('N/A');
            expect(typeof result).toBe('string');
        });

        it('should return fallback for null/undefined', () => {
            expect(formatDateSafe(null)).toBe('N/A');
            expect(formatDateSafe(undefined)).toBe('N/A');
        });

        it('should use custom fallback if provided', () => {
            expect(formatDateSafe(null, '-')).toBe('-');
        });
    });

    describe('formatDateTimeSafe()', () => {
        it('should format a valid date with time', () => {
            const d = new Date('2024-06-15T14:30:00Z');
            const result = formatDateTimeSafe(d);
            expect(result).not.toBe('N/A');
        });

        it('should return fallback for null', () => {
            expect(formatDateTimeSafe(null)).toBe('N/A');
        });
    });
});
