import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/client';
import safeLocalStorage from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => safeLocalStorage.getItem('token'));
    const [user, setUser] = useState(() => {
        const userJson = safeLocalStorage.getItem('user');
        return userJson ? JSON.parse(userJson) : null;
    });

    // Derive isAuthenticated from token to avoid state sync issues
    const isAuthenticatedDerived = !!token;

    // Update localStorage when token changes
    useEffect(() => {
        if (token) {
            safeLocalStorage.setItem('token', token);
        } else {
            safeLocalStorage.removeItem('token');
        }
    }, [token]);

    // Update localStorage when user changes
    useEffect(() => {
        if (user) {
            safeLocalStorage.setItem('user', JSON.stringify(user));
        } else {
            safeLocalStorage.removeItem('user');
        }
    }, [user]);

    const logout = React.useCallback(async () => {
        // Prevent concurrent logout calls
        if (logout.inProgress) return;
        logout.inProgress = true;

        try {
            // Only attempt logout if we have a token
            if (token) {
                await api.post('/auth/logout');
            }
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            setToken(null);
            setUser(null);
            // Explicitly clear to avoid edge cases
            safeLocalStorage.removeItem('token');
            safeLocalStorage.removeItem('user');
            logout.inProgress = false;
        }
    }, [token]);

    // Check token expiration and logout if expired
    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                // If token is expired, logout
                if (decoded.exp < currentTime) {
                    logout();
                }
            } catch (err) {
                // If token is invalid, logout
                console.error('Invalid token:', err);
                logout();
            }
        }
    }, [token, logout]);

    // Listen for 401 events fired by the API interceptor
    useEffect(() => {
        const handleUnauthorized = () => {
            logout();
        };
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [logout]);

    const updateUser = (updatedUser) => {
        // Standardize user object from backend to ensure 'id' is always present
        const normalizedUser = {
            ...updatedUser,
            id: updatedUser.id || updatedUser.user_id,
        };
        setUser(normalizedUser);
    };

    const login = (newToken, newUser) => {
        // Standardize user object from backend to ensure 'id' is always present
        const normalizedUser = {
            ...newUser,
            id: newUser.id || newUser.user_id,
        };
        setToken(newToken);
        setUser(normalizedUser);
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                isAuthenticated: isAuthenticatedDerived,
                login,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
