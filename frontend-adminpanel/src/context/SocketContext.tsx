import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { ENV } from '../config/env';
import { STORAGE_KEYS, SOCKET_RECONNECTION_ATTEMPTS, SOCKET_RECONNECTION_DELAY_MS, SHORT_ID_LENGTH } from '../config/constants';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const socketRef = useRef<Socket | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user } = useAuth();

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
                setSocket(newSocket);
                setIsConnected(true);
                newSocket.emit('join:admin');
            });

            newSocket.on('disconnect', () => {
                setIsConnected(false);
                setSocket((prev) => (prev === newSocket ? null : prev));
                if (socketRef.current === newSocket) {
                    socketRef.current = null;
                }
            });

            newSocket.on('ride:created', (data) => {
                const rideId = data?.id ? data.id.substring(0, SHORT_ID_LENGTH) : 'unknown';
                toast.info(`New ride request: ${rideId}`);
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
        <SocketContext.Provider value={{ socket, isConnected }}>
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
