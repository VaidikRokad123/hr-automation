import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import apiClient, { setApiToken } from '../api/client';

const AuthContext = createContext(null);

const STORAGE_KEY = 'hr_auth_state';

function readStoredAuth() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : { token: null, user: null };
    } catch {
        return { token: null, user: null };
    }
}

export function AuthProvider({ children }) {
    const [token, setTokenState] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = readStoredAuth();
        if (stored.token) {
            setTokenState(stored.token);
            setUser(stored.user);
            setApiToken(stored.token);
        }

        const validateSession = async () => {
            if (!stored.token) {
                setLoading(false);
                return;
            }

            try {
                const response = await apiClient.get('/api/users/me');
                setUser(response.data.user);
                const nextState = { token: stored.token, user: response.data.user };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
            } catch {
                localStorage.removeItem(STORAGE_KEY);
                setTokenState(null);
                setUser(null);
                setApiToken(null);
            } finally {
                setLoading(false);
            }
        };

        validateSession();
    }, []);

    const login = (authToken, authUser) => {
        setTokenState(authToken);
        setUser(authUser);
        setApiToken(authToken);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: authToken, user: authUser }));
    };

    const logout = () => {
        setTokenState(null);
        setUser(null);
        setApiToken(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    const value = useMemo(() => ({
        token,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        logout
    }), [token, user, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
