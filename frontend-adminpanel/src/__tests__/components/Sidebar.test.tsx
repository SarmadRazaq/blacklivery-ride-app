import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockLogout = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'u1', email: 'admin@test.com', role: 'admin', displayName: 'Admin' },
        login: vi.fn(),
        logout: mockLogout,
        loading: false,
    }),
}));

import Sidebar from '../../components/Sidebar';
import { APP_NAME, APP_SUBTITLE } from '../../config/constants';

describe('Sidebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderSidebar = () =>
        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

    it('should render the app name and subtitle from config', () => {
        renderSidebar();
        expect(screen.getByText(APP_NAME)).toBeInTheDocument();
        expect(screen.getByText(APP_SUBTITLE)).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
        renderSidebar();
        const expectedLabels = [
            'Dashboard',
            'Users',
            'Rides',
            'Deliveries',
            'Vehicles',
            'Pricing & Surge',
            'Disputes',
            'Promotions',
            'Loyalty',
            'Analytics',
            'Payouts',
            'Support',
        ];

        for (const label of expectedLabels) {
            expect(screen.getByText(label)).toBeInTheDocument();
        }
    });

    it('should render navigation links with correct hrefs', () => {
        renderSidebar();

        const dashLink = screen.getByText('Dashboard').closest('a');
        expect(dashLink).toHaveAttribute('href', '/');

        const ridesLink = screen.getByText('Rides').closest('a');
        expect(ridesLink).toHaveAttribute('href', '/rides');

        const usersLink = screen.getByText('Users').closest('a');
        expect(usersLink).toHaveAttribute('href', '/users');

        const analyticsLink = screen.getByText('Analytics').closest('a');
        expect(analyticsLink).toHaveAttribute('href', '/analytics');
    });

    it('should render a Logout button', () => {
        renderSidebar();
        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('should call logout when Logout button is clicked', async () => {
        renderSidebar();
        const user = userEvent.setup();
        await user.click(screen.getByText('Logout'));
        expect(mockLogout).toHaveBeenCalledOnce();
    });

    it('should have exactly 12 nav links', () => {
        renderSidebar();
        // All NavLinks render as <a> tags
        const nav = screen.getByRole('navigation');
        const links = nav.querySelectorAll('a');
        expect(links.length).toBe(12);
    });
});
