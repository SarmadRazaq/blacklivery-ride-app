import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
vi.mock('../../api/client', () => ({
    default: { get: (...args: any[]) => mockGet(...args) },
}));

vi.mock('../../context/SocketContext', () => ({
    useSocket: vi.fn(() => ({ socket: null, isConnected: false })),
}));

vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../../config/regions', () => ({
    DELIVERY_STATUSES: ['finding_driver', 'accepted', 'picked_up', 'in_transit', 'delivered'],
}));

import DeliveriesPage from '../../pages/DeliveriesPage';

describe('DeliveriesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders heading', async () => {
        mockGet.mockResolvedValue({ data: { rides: [] } });
        render(<DeliveriesPage />);
        expect(screen.getByText('Delivery Tracking')).toBeInTheDocument();
    });

    it('displays delivery rides from API', async () => {
        mockGet.mockResolvedValueOnce({
            data: {
                rides: [
                    {
                        id: 'del1',
                        riderId: 'r1',
                        status: 'completed',
                        type: 'delivery',
                        pickupLocation: { address: '100 Main St' },
                        dropoffLocation: { address: '200 Oak St' },
                        pricing: { finalFare: 2500, currency: 'NGN' },
                        createdAt: '2024-06-01T00:00:00Z'
                    },
                    {
                        id: 'ride1',
                        riderId: 'r2',
                        status: 'completed',
                        type: 'standard', // Not a delivery
                        pickupLocation: { address: '300 Elm St' },
                        dropoffLocation: { address: '400 Pine St' },
                        createdAt: '2024-06-02T00:00:00Z'
                    }
                ]
            }
        });

        render(<DeliveriesPage />);

        await waitFor(() => {
            expect(screen.getByText(/100 Main St/)).toBeInTheDocument();
        });
    });

    it('shows empty state when no deliveries', async () => {
        mockGet.mockResolvedValueOnce({ data: { rides: [] } });
        render(<DeliveriesPage />);

        await waitFor(() => {
            expect(screen.getByText('No deliveries found')).toBeInTheDocument();
        });
    });

    it('handles API error with toast', async () => {
        const { toast } = await import('react-toastify');
        mockGet.mockRejectedValueOnce(new Error('Fail'));
        render(<DeliveriesPage />);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load deliveries');
        });
    });
});
