import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import api from '../api/client';
import { toast } from 'react-toastify';
import { STORAGE_KEYS, DEFAULT_ROLE, DEFAULT_DISPLAY_NAME, ADMIN_ROLE } from '../config/constants';
import { AUTH_PROFILE } from '../api/endpoints';

interface User {
    id: string;
    email: string;
    role: string;
    displayName?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const token = await firebaseUser.getIdToken();
                    localStorage.setItem(STORAGE_KEYS.TOKEN, token);

                    // Fetch actual user profile from backend to verify role
                    try {
                        const response = await api.get(AUTH_PROFILE);
                        const profile = response.data;

                        if (profile.role !== ADMIN_ROLE) {
                            console.error('Access denied: user is not an admin');
                            toast.error('Access denied: admin privileges required');
                            await firebaseSignOut(auth);
                            localStorage.removeItem(STORAGE_KEYS.TOKEN);
                            setUser(null);
                            setLoading(false);
                            return;
                        }

                        setUser({
                            id: firebaseUser.uid,
                            email: firebaseUser.email!,
                            role: profile.role,
                            displayName: profile.displayName || firebaseUser.displayName || DEFAULT_DISPLAY_NAME
                        });
                    } catch {
                        // Fallback: check Firebase custom claims
                        const tokenResult = await firebaseUser.getIdTokenResult();
                        const role = tokenResult.claims.role as string || DEFAULT_ROLE;

                        if (role !== ADMIN_ROLE) {
                            console.error('Access denied: user is not an admin (claims check)');
                            toast.error('Access denied: admin privileges required');
                            await firebaseSignOut(auth);
                            localStorage.removeItem(STORAGE_KEYS.TOKEN);
                            setUser(null);
                            setLoading(false);
                            return;
                        }

                        setUser({
                            id: firebaseUser.uid,
                            email: firebaseUser.email!,
                            role,
                            displayName: firebaseUser.displayName || DEFAULT_DISPLAY_NAME
                        });
                    }
                } catch (error) {
                    console.error('Failed to authenticate user', error);
                    localStorage.removeItem(STORAGE_KEYS.TOKEN);
                    setUser(null);
                }
            } else {
                localStorage.removeItem(STORAGE_KEYS.TOKEN);
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        // Let onAuthStateChanged handle setting user state to avoid race conditions.
        // Just ensure the token is stored for the listener to use.
        const firebaseUser = credential.user;
        if (firebaseUser) {
            const token = await firebaseUser.getIdToken();
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        }
    };

    const logout = async () => {
        await firebaseSignOut(auth);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
