import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock api client before importing AuthContext
vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    },
}));

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
    io: vi.fn(() => ({
        on: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
        off: vi.fn(),
    })),
}));

import { AuthProvider, useAuth } from '../../context/AuthContext';
import { SocketProvider } from '../../context/SocketContext';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Helper: renders a consumer component that exposes auth state
function AuthConsumer() {
    const { user, loading, login, logout } = useAuth();
    return (
        <div>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="user">{user ? JSON.stringify(user) : 'null'}</span>
            <button data-testid="login-btn" onClick={() => login('test@test.com', 'pass')}>
                Login
            </button>
            <button data-testid="logout-btn" onClick={logout}>
                Logout
            </button>
        </div>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should provide loading=true initially and then resolve', async () => {
        // onAuthStateChanged is mocked in setup.ts to call callback(null)
        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        // After the callback fires, loading should be false
        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });
    });

    it('should have null user when no firebase user is signed in', async () => {
        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('user').textContent).toBe('null');
        });
    });

    it('should call signInWithEmailAndPassword on login()', async () => {
        const mockSignIn = signInWithEmailAndPassword as ReturnType<typeof vi.fn>;
        mockSignIn.mockResolvedValueOnce({
            user: {
                uid: 'u1',
                email: 'test@test.com',
                getIdToken: vi.fn().mockResolvedValue('mock-token'),
            },
        });

        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });

        const user = userEvent.setup();
        await user.click(screen.getByTestId('login-btn'));

        expect(mockSignIn).toHaveBeenCalledWith(expect.anything(), 'test@test.com', 'pass');
    });

    it('should call firebaseSignOut on logout()', async () => {
        const mockSignOut = signOut as ReturnType<typeof vi.fn>;

        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });

        const user = userEvent.setup();
        await user.click(screen.getByTestId('logout-btn'));

        expect(mockSignOut).toHaveBeenCalled();
    });

    it('useAuth() should throw when used outside AuthProvider', () => {
        // Suppress console.error for the expected error
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => {
            render(<AuthConsumer />);
        }).toThrow('useAuth must be used within an AuthProvider');

        spy.mockRestore();
    });
});

describe('SocketContext', () => {
    it('should render children without crashing', async () => {
        render(
            <AuthProvider>
                <SocketProvider>
                    <span data-testid="child">hello</span>
                </SocketProvider>
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('child').textContent).toBe('hello');
        });
    });
});
