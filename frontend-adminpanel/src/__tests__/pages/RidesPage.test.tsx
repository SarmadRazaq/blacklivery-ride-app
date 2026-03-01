import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
vi.mock('../../api/client', () => ({
    default: { get: (...args: any[]) => mockGet(...args), patch: vi.fn() },
}));

vi.mock('../../context/SocketContext', () => ({
    useSocket: vi.fn(() => ({ socket: null, isConnected: false })),
}));

vi.mock('../../config/regions', () => ({
    RIDE_STATUS_BADGE: {
        finding_driver: { label: 'Finding Driver', variant: 'warning' },
        accepted: { label: 'Accepted', variant: 'info' },
        completed: { label: 'Completed', variant: 'success' },
    },
}));

vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import RidesPage from '../../pages/RidesPage';

describe('RidesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows heading', () => {
        mockGet.mockReturnValue(new Promise(() => {})); // never resolves
        render(<RidesPage />);
        expect(screen.getByText('Ride Management')).toBeInTheDocument();
    });

    it('renders rides table after fetch', async () => {
        mockGet.mockResolvedValueOnce({
            data: [
                {
                    id: 'ride1',
                    riderId: 'r1',
                    status: 'finding_driver',
                    pickupLocation: { address: '123 Main St' },
                    dropoffLocation: { address: '456 Oak Ave' },
                    pricing: { estimatedFare: 50, currency: 'USD' },
                    createdAt: '2024-01-01T00:00:00Z'
                }
            ]
        });

        render(<RidesPage />);

        await waitFor(() => {
            expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
        });
    });

    it('shows empty state when no rides', async () => {
        mockGet.mockResolvedValueOnce({ data: [] });
        render(<RidesPage />);

        await waitFor(() => {
            expect(screen.getByText('No rides found')).toBeInTheDocument();
        });
    });

    it('handles API error gracefully', async () => {
        const { toast } = await import('react-toastify');
        mockGet.mockRejectedValueOnce(new Error('Server Error'));
        render(<RidesPage />);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load rides');
        });
    });
});
