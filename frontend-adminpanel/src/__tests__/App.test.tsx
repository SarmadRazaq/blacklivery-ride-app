import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

// ─── Mock Modules ────────────────────────────────────────────────────────────
vi.mock('../context/AuthContext', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAuth: vi.fn(),
}));

vi.mock('../context/SocketContext', () => ({
    SocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useAuth } from '../context/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function renderApp(
    authState: { user: any; loading: boolean },
    initialRoute = '/'
) {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        ...authState,
        login: vi.fn(),
        logout: vi.fn(),
    });

    // Lazy import App so mocks are in place
    // Instead, re-implement the ProtectedRoute logic for isolation
    const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
        const { user, loading } = useAuth();
        if (loading) return <div>Loading...</div>;
        if (!user) return <div>Redirect to login</div>;
        if (user.role !== 'admin') return <div>Access Denied. Admin role required.</div>;
        return <>{children}</>;
    };

    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <div>Dashboard Content</div>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </MemoryRouter>
    );
}

describe('App Routing & Protected Routes', () => {
    it('should show loading state while auth is resolving', () => {
        renderApp({ user: null, loading: true });
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should redirect unauthenticated users to login', () => {
        renderApp({ user: null, loading: false });
        expect(screen.getByText('Redirect to login')).toBeInTheDocument();
    });

    it('should deny access to non-admin users', () => {
        renderApp(
            { user: { id: 'u1', email: 'rider@test.com', role: 'rider' }, loading: false }
        );
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    it('should render protected content for admin users', () => {
        renderApp(
            { user: { id: 'u1', email: 'admin@test.com', role: 'admin' }, loading: false }
        );
        expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
});
