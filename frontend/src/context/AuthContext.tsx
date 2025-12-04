import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';

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
                    // FIX: Get the token and save it to localStorage
                    const token = await firebaseUser.getIdToken();
                    localStorage.setItem('token', token);

                    // Mocking user data (or fetch from backend profile endpoint)
                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email!,
                        role: 'admin', 
                        displayName: firebaseUser.displayName || 'Admin'
                    });
                } catch (error) {
                    console.error("Failed to fetch user profile", error);
                    localStorage.removeItem('token'); // Clear if error
                    setUser(null);
                }
            } else {
                localStorage.removeItem('token'); // Clear on logout
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await firebaseSignOut(auth);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
