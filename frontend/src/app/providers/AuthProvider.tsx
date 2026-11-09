// frontend/src/app/providers/AuthProvider.tsx
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import {
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
    getCurrentUser,
} from '../../services/auth-service';
import type { LoginRequest, RegisterRequest } from '../../services/auth-service';
import type { AuthenticatedUser } from '../../types/auth';
import { useTenantContext } from './TenantProvider';

export interface AuthContextType {
    user: AuthenticatedUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    authError: unknown | null;
    login: (credentials: LoginRequest) => Promise<AuthenticatedUser>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { classification, tenantId } = useTenantContext();
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [authError, setAuthError] = useState<unknown | null>(null);

    const isMounted = useRef(true);
    const isOperating = useRef(false);
    const opVersion = useRef(0);

    // Cross-check user profile against the current domain context
    const validateUserContext = useCallback((userData: AuthenticatedUser) => {
        if (classification === 'PLATFORM' || classification === 'PLATFORM_ADMIN') {
            if (userData.accountType !== 'PLATFORM') {
                throw new Error("Access Denied: This account is not a platform administration account.");
            }
        } else if (classification === 'SCHOOL') {
            if (userData.accountType !== 'SCHOOL') {
                throw new Error("Access Denied: Platform accounts cannot access school environments.");
            }
            if (userData.tenantId !== tenantId) {
                throw new Error("Access Denied: This account does not belong to this school's domain.");
            }
        }
    }, [classification, tenantId]);

    useEffect(() => {
        isMounted.current = true;
        let isActive = true;
        const currentVersion = ++opVersion.current;

        const initAuth = async () => {
            try {
                const userData = await getCurrentUser();
                if (isActive && currentVersion === opVersion.current) {
                    validateUserContext(userData);
                    setUser(userData);
                    setAuthError(null);
                }
            } catch (error: unknown) {
                if (isActive && currentVersion === opVersion.current) {
                    setUser(null);
                    setAuthError(error);
                }
            } finally {
                if (isActive && currentVersion === opVersion.current) {
                    setIsLoading(false);
                }
            }
        };

        // Only attempt to restore session if domain is resolved
        if (classification !== 'PENDING_RESOLUTION' && classification !== 'UNKNOWN') {
            initAuth();
        } else {
            setIsLoading(false);
        }

        return () => {
            isActive = false;
            isMounted.current = false;
        };
    }, [classification, tenantId, validateUserContext]);

    const login = useCallback(async (credentials: LoginRequest) => {
        if (isOperating.current) throw new Error('An authentication operation is already in progress.');
        isOperating.current = true;
        opVersion.current++;

        if (isMounted.current) {
            setIsLoading(true);
            setAuthError(null);
        }

        try {
            await apiLogin(credentials);
            const userData = await getCurrentUser();

            // Validate before updating state
            validateUserContext(userData);

            if (isMounted.current) {
                setUser(userData);
                setAuthError(null);
            }
            return userData;
        } catch (error: unknown) {
            // Attempt to clean up backend session if frontend validation fails
            if (error instanceof Error && error.message.startsWith('Access Denied')) {
                await apiLogout().catch(() => { });
            }
            if (isMounted.current) {
                setAuthError(error);
            }
            throw error;
        } finally {
            isOperating.current = false;
            if (isMounted.current) setIsLoading(false);
        }
    }, [validateUserContext]);

    // Register and logout remain largely unchanged, just relying on apiRegister/apiLogout
    const register = useCallback(async (data: RegisterRequest) => {
        if (isOperating.current) throw new Error('An authentication operation is already in progress.');
        isOperating.current = true;
        try {
            await apiRegister(data);
        } finally {
            isOperating.current = false;
        }
    }, []);

    const logout = useCallback(async () => {
        if (isOperating.current) throw new Error('An authentication operation is already in progress.');
        isOperating.current = true;
        opVersion.current++;
        try {
            await apiLogout();
            if (isMounted.current) {
                setUser(null);
                setAuthError(null);
            }
        } finally {
            isOperating.current = false;
        }
    }, []);

    const isAuthenticated = user !== null;

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, authError, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};