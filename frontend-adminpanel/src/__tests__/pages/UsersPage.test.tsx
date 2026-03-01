import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPatch = vi.fn();
vi.mock('../../api/client', () => ({
    default: {
        get: (...args: any[]) => mockGet(...args),
        patch: (...args: any[]) => mockPatch(...args),
    },
}));

vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import UsersPage from '../../pages/UsersPage';

describe('UsersPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders User Management heading', async () => {
        mockGet.mockResolvedValue({ data: [] });
        render(<UsersPage />);
        expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    it('fetches and renders user list', async () => {
        mockGet.mockResolvedValueOnce({
            data: [
                {
                    id: 'u1',
                    email: 'rider@test.com',
                    displayName: 'Test Rider',
                    role: 'rider',
                    isActive: true,
                    createdAt: '2024-01-01'
                },
                {
                    id: 'u2',
                    email: 'driver@test.com',
                    displayName: 'Test Driver',
                    role: 'driver',
                    isActive: false,
                    createdAt: '2024-02-01'
                }
            ]
        });

        render(<UsersPage />);

        await waitFor(() => {
            expect(screen.getByText('rider@test.com')).toBeInTheDocument();
            expect(screen.getByText('driver@test.com')).toBeInTheDocument();
        });
    });

    it('handles API error with toast', async () => {
        const { toast } = await import('react-toastify');
        mockGet.mockRejectedValueOnce(new Error('API down'));
        render(<UsersPage />);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load users');
        });
    });
});
