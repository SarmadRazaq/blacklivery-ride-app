import { describe, it, expect } from 'vitest';
import { ENV } from '../../config/env';

describe('config/env', () => {
    it('should expose API_URL from VITE_API_URL', () => {
        expect(ENV.API_URL).toBe('http://localhost:3000/api');
    });

    it('should expose SOCKET_URL from VITE_SOCKET_URL', () => {
        expect(ENV.SOCKET_URL).toBe('http://localhost:3000');
    });

    it('should expose GOOGLE_MAPS_API_KEY', () => {
        expect(ENV.GOOGLE_MAPS_API_KEY).toBe('test-maps-key');
    });

    it('ENV properties should be defined and typed', () => {
        // `as const` is compile-time only; at runtime the object is not frozen.
        // Instead verify all expected keys are present.
        expect(ENV).toHaveProperty('API_URL');
        expect(ENV).toHaveProperty('SOCKET_URL');
        expect(ENV).toHaveProperty('GOOGLE_MAPS_API_KEY');
        expect(Object.keys(ENV).length).toBe(3);
    });
});
