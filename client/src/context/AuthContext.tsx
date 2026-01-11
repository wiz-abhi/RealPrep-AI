import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { API_BASE_URL } from '../config/api';

interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
    backendReady: boolean;
    setBackendReady: (ready: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [backendReady, setBackendReady] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (credentials: any) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const register = async (credentials: any) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        // Reloading works better in Electron - clears state and ProtectedRoute handles redirect to login
        window.location.reload();
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            register,
            logout,
            isAuthenticated: !!user,
            loading,
            backendReady,
            setBackendReady
        }}>
            {children}
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
