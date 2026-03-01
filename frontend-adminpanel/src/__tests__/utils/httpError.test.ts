import { describe, it, expect } from 'vitest';
import axios from 'axios';
import { getHttpErrorMessage } from '../../utils/httpError';

describe('utils/httpError', () => {
    describe('getHttpErrorMessage()', () => {
        it('should extract error message from Axios response data', () => {
            const error = new axios.AxiosError(
                'Request failed',
                'ERR_BAD_REQUEST',
                undefined,
                undefined,
                {
                    status: 400,
                    statusText: 'Bad Request',
                    headers: {},
                    config: {} as any,
                    data: { error: 'Invalid email format' },
                }
            );
            expect(getHttpErrorMessage(error)).toBe('Invalid email format');
        });

        it('should extract message field from response data', () => {
            const error = new axios.AxiosError(
                'Request failed',
                'ERR_BAD_REQUEST',
                undefined,
                undefined,
                {
                    status: 400,
                    statusText: 'Bad Request',
                    headers: {},
                    config: {} as any,
                    data: { message: 'Validation failed' },
                }
            );
            expect(getHttpErrorMessage(error)).toBe('Validation failed');
        });

        it('should return network error message for ERR_NETWORK', () => {
            const error = new axios.AxiosError('Network Error', 'ERR_NETWORK');
            expect(getHttpErrorMessage(error)).toContain('Network error');
        });

        it('should return session expired for 401', () => {
            const error = new axios.AxiosError(
                'Unauthorized',
                'ERR_BAD_REQUEST',
                undefined,
                undefined,
                {
                    status: 401,
                    statusText: 'Unauthorized',
                    headers: {},
                    config: {} as any,
                    data: {},
                }
            );
            expect(getHttpErrorMessage(error)).toContain('session expired');
        });

        it('should return permission denied for 403', () => {
            const error = new axios.AxiosError(
                'Forbidden',
                'ERR_BAD_REQUEST',
                undefined,
                undefined,
                {
                    status: 403,
                    statusText: 'Forbidden',
                    headers: {},
                    config: {} as any,
                    data: {},
                }
            );
            expect(getHttpErrorMessage(error)).toContain('permission');
        });

        it('should return not found for 404', () => {
            const error = new axios.AxiosError(
                'Not Found',
                'ERR_BAD_REQUEST',
                undefined,
                undefined,
                {
                    status: 404,
                    statusText: 'Not Found',
                    headers: {},
                    config: {} as any,
                    data: {},
                }
            );
            expect(getHttpErrorMessage(error)).toContain('not found');
        });

        it('should return server error for 500+', () => {
            const error = new axios.AxiosError(
                'Internal Server Error',
                'ERR_BAD_RESPONSE',
                undefined,
                undefined,
                {
                    status: 500,
                    statusText: 'Internal',
                    headers: {},
                    config: {} as any,
                    data: {},
                }
            );
            expect(getHttpErrorMessage(error)).toContain('Server error');
        });

        it('should extract message from plain Error', () => {
            const error = new Error('Something broke');
            expect(getHttpErrorMessage(error)).toBe('Something broke');
        });

        it('should return generic message for unknown error types', () => {
            expect(getHttpErrorMessage('random string')).toContain('Something went wrong');
            expect(getHttpErrorMessage(42)).toContain('Something went wrong');
            expect(getHttpErrorMessage(null)).toContain('Something went wrong');
        });
    });
});
