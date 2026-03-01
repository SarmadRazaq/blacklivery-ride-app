import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        login: mockLogin,
        logout: vi.fn(),
        loading: false,
    }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

import LoginPage from '../../pages/LoginPage';
import { APP_NAME, APP_LOGIN_SUBTITLE, APP_LOGIN_PLACEHOLDER_EMAIL } from '../../config/constants';

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderLogin = () =>
        render(
            <MemoryRouter initialEntries={['/login']}>
                <LoginPage />
            </MemoryRouter>
        );

    it('should render branding from config', () => {
        renderLogin();
        expect(screen.getByText(APP_NAME)).toBeInTheDocument();
        expect(screen.getByText(APP_LOGIN_SUBTITLE)).toBeInTheDocument();
    });

    it('should render email and password fields', () => {
        renderLogin();
        expect(screen.getByPlaceholderText(APP_LOGIN_PLACEHOLDER_EMAIL)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('should render a Sign In button', () => {
        renderLogin();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should show validation errors when submitting empty form', async () => {
        renderLogin();
        const user = userEvent.setup();

        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument();
        });
    });

    it('should call login with email and password on valid submit', async () => {
        mockLogin.mockResolvedValueOnce(undefined);
        renderLogin();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText(APP_LOGIN_PLACEHOLDER_EMAIL), 'admin@test.com');
        await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'secret123');
        });
    });

    it('should navigate to / on successful login', async () => {
        mockLogin.mockResolvedValueOnce(undefined);
        renderLogin();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText(APP_LOGIN_PLACEHOLDER_EMAIL), 'admin@test.com');
        await user.type(screen.getByPlaceholderText('••••••••'), 'password');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('should show error toast when login fails', async () => {
        mockLogin.mockRejectedValueOnce(new Error('Wrong password'));
        renderLogin();
        const user = userEvent.setup();
        const { toast } = await import('react-toastify');

        await user.type(screen.getByPlaceholderText(APP_LOGIN_PLACEHOLDER_EMAIL), 'admin@test.com');
        await user.type(screen.getByPlaceholderText('••••••••'), 'badpass');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Wrong password');
        });
    });

    it('should disable button while submitting', async () => {
        // Make login hang so we can observe the disabled state
        mockLogin.mockImplementation(() => new Promise(() => {}));
        renderLogin();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText(APP_LOGIN_PLACEHOLDER_EMAIL), 'admin@test.com');
        await user.type(screen.getByPlaceholderText('••••••••'), 'password');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
        });
    });
});
