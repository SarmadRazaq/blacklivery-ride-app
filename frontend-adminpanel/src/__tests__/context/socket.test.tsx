import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock('socket.io-client', () => ({
    io: vi.fn(() => ({
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
    })),
}));

vi.mock('react-toastify', () => ({
    toast: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { SocketProvider, useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

describe('SocketContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('useSocket throws when used outside provider', () => {
        expect(() => {
            renderHook(() => useSocket());
        }).toThrow('useSocket must be used within a SocketProvider');
    });

    it('provides null socket when no user', () => {
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SocketProvider>{children}</SocketProvider>
        );

        const { result } = renderHook(() => useSocket(), { wrapper });
        expect(result.current.socket).toBeNull();
        expect(result.current.isConnected).toBe(false);
    });

    it('provides null socket for non-admin user', () => {
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
            user: { uid: 'u1', role: 'rider' },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SocketProvider>{children}</SocketProvider>
        );

        const { result } = renderHook(() => useSocket(), { wrapper });
        expect(result.current.socket).toBeNull();
    });

    it('creates socket for admin user', async () => {
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
            user: { uid: 'admin1', role: 'admin' },
        });

        const { io } = await import('socket.io-client');

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SocketProvider>{children}</SocketProvider>
        );

        renderHook(() => useSocket(), { wrapper });
        expect(io).toHaveBeenCalled();
    });
});
