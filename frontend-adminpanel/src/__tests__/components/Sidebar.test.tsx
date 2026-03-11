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
        // Renders in both mobile and desktop sidebars
        const names = screen.getAllByText(APP_NAME);
        expect(names.length).toBeGreaterThanOrEqual(1);
        const subtitles = screen.getAllByText(APP_SUBTITLE);
        expect(subtitles.length).toBeGreaterThanOrEqual(1);
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
            // Each label appears in both mobile and desktop sidebars
            expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
        }
    });

    it('should render navigation links with correct hrefs', () => {
        renderSidebar();

        const dashLink = screen.getAllByText('Dashboard')[0].closest('a');
        expect(dashLink).toHaveAttribute('href', '/');

        const ridesLink = screen.getAllByText('Rides')[0].closest('a');
        expect(ridesLink).toHaveAttribute('href', '/rides');

        const usersLink = screen.getAllByText('Users')[0].closest('a');
        expect(usersLink).toHaveAttribute('href', '/users');

        const analyticsLink = screen.getAllByText('Analytics')[0].closest('a');
        expect(analyticsLink).toHaveAttribute('href', '/analytics');
    });

    it('should render a Logout button', () => {
        renderSidebar();
        expect(screen.getAllByText('Logout').length).toBeGreaterThanOrEqual(1);
    });

    it('should call logout when Logout button is clicked', async () => {
        renderSidebar();
        const user = userEvent.setup();
        await user.click(screen.getAllByText('Logout')[0]);
        expect(mockLogout).toHaveBeenCalledOnce();
    });

    it('should have exactly 12 nav links per sidebar', () => {
        renderSidebar();
        // Both mobile and desktop sidebars have <nav> elements
        const navs = screen.getAllByRole('navigation');
        expect(navs.length).toBeGreaterThanOrEqual(1);
        // Each nav should have 12 links
        const links = navs[0].querySelectorAll('a');
        expect(links.length).toBe(12);
    });
});
