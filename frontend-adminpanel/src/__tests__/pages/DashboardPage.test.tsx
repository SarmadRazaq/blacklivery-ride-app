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

vi.mock('../../components/LiveMap', () => ({
    default: () => <div data-testid="live-map">LiveMap</div>,
}));

vi.mock('../../config/regions', () => ({
    formatCurrency: (n: number) => `$${n.toFixed(2)}`,
}));

import DashboardPage from '../../pages/DashboardPage';

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGet.mockResolvedValue({ data: {} });
    });

    it('renders heading and stat cards', async () => {
        mockGet
            .mockResolvedValueOnce({ data: { rideRevenue: 1234 } })
            .mockResolvedValueOnce({ data: [1, 2, 3] })
            .mockResolvedValueOnce({ data: [1] });

        render(<DashboardPage />);

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        expect(screen.getByText('Active Drivers')).toBeInTheDocument();
        expect(screen.getByText('Active Rides')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('$1234.00')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
            expect(screen.getByText('1')).toBeInTheDocument();
        });
    });

    it('handles API failure gracefully', async () => {
        mockGet.mockRejectedValue(new Error('Network error'));

        render(<DashboardPage />);

        await waitFor(() => {
            // Stats should stay at defaults
            expect(screen.getByText('$0.00')).toBeInTheDocument();
        });
    });

    it('renders the live map', () => {
        render(<DashboardPage />);
        expect(screen.getByTestId('live-map')).toBeInTheDocument();
        expect(screen.getByText('Live Fleet Tracking')).toBeInTheDocument();
    });
});
