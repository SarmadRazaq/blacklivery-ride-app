import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { ENV } from '../config/env';
import { STORAGE_KEYS, SOCKET_RECONNECTION_ATTEMPTS, SOCKET_RECONNECTION_DELAY_MS, SHORT_ID_LENGTH } from '../config/constants';

export interface SosAlert {
    id: string;
    userId: string;
    userName?: string;
    role?: string;
    rideId?: string;
    location?: { lat: number; lng: number };
    message?: string;
    timestamp: string;
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    sosAlerts: SosAlert[];
    dismissSosAlert: (id: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const socketRef = useRef<Socket | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
    const wasConnectedRef = useRef(false);
    const { user } = useAuth();

    const dismissSosAlert = useCallback((id: string) => {
        setSosAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    useEffect(() => {
        if (user && user.role === 'admin') {
            const socketUrl = ENV.SOCKET_URL;
            const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

            const newSocket = io(socketUrl, {
                auth: { token },
                reconnection: true,
                reconnectionAttempts: SOCKET_RECONNECTION_ATTEMPTS,
                reconnectionDelay: SOCKET_RECONNECTION_DELAY_MS
            });
            socketRef.current = newSocket;

            newSocket.on('connect', () => {
                if (wasConnectedRef.current) {
                    toast.success('Live updates reconnected');
                }
                wasConnectedRef.current = true;
                setSocket(newSocket);
                setIsConnected(true);
                newSocket.emit('join:admin');
            });

            newSocket.on('disconnect', () => {
                setIsConnected(false);
                toast.warn('Live updates disconnected. Data may be stale.');
                setSocket((prev) => (prev === newSocket ? null : prev));
                if (socketRef.current === newSocket) {
                    socketRef.current = null;
                }
            });

            newSocket.on('ride:created', (data) => {
                const rideId = data?.id ? data.id.substring(0, SHORT_ID_LENGTH) : 'unknown';
                toast.info(`New ride request: ${rideId}`);
            });

            newSocket.on('sos:alert', (data) => {
                const alert: SosAlert = {
                    id: data?.id || data?.rideId || `sos-${Date.now()}`,
                    userId: data?.userId || 'unknown',
                    userName: data?.userName || data?.name,
                    role: data?.role,
                    rideId: data?.rideId,
                    location: data?.location,
                    message: data?.message,
                    timestamp: data?.timestamp || new Date().toISOString(),
                };
                setSosAlerts(prev => [alert, ...prev]);
                toast.error(`🚨 SOS ALERT from ${alert.userName || alert.userId}`, { autoClose: false });
            });

            return () => {
                newSocket.disconnect();
                setSocket((prev) => (prev === newSocket ? null : prev));
                setIsConnected(false);
                if (socketRef.current === newSocket) {
                    socketRef.current = null;
                }
            };
        } else {
            // User logged out or not admin — clean up socket
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, sosAlerts, dismissSosAlert }}>
            {children}
        </SocketContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
