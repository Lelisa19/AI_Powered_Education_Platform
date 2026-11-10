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
import { env } from '../../config/env';
import { isPlatformAdmin } from '../../utils/authorization';
import { useTenantContext } from './TenantProvider';

export interface AuthContextType {
    user: AuthenticatedUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    authError: unknown | null;
    suppressReturnRedirect: boolean;
    login: (credentials: LoginRequest) => Promise<AuthenticatedUser>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthSessionState {
    contextKey: string | null;
    user: AuthenticatedUser | null;
    authError: unknown | null;
    suppressReturnRedirect: boolean;
}

async function loadDevPlatformAdminAuth() {
    if (!import.meta.env.DEV || !env.ENABLE_PLATFORM_ADMIN_DEV_AUTH) {
        return null;
    }
    return import('../../modules/platform-admin/dev/platform-admin-dev-auth');
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { classification, tenantId, isResolving } = useTenantContext();
    const [sessionState, setSessionState] = useState<AuthSessionState>({
        contextKey: null,
        user: null,
        authError: null,
        suppressReturnRedirect: false,
    });

    const isMounted = useRef(true);
    const isOperating = useRef(false);
    const opVersion = useRef(0);

    const isPendingResolution = isResolving || classification === 'PENDING_RESOLUTION';
    const isDevPlatformAuthActive =
        import.meta.env.DEV &&
        env.ENABLE_PLATFORM_ADMIN_DEV_AUTH &&
        classification === 'PLATFORM_ADMIN';

    const targetContextKey = isPendingResolution
        ? null
        : classification === 'PLATFORM_ADMIN'
          ? classification
          : classification === 'SCHOOL' && tenantId
            ? `SCHOOL:${tenantId}`
            : null;

    // Cross-check user profile against the current domain context
    const validateUserContext = useCallback((userData: AuthenticatedUser) => {
        if (classification === 'PLATFORM_ADMIN') {
            if (userData.accountType !== 'PLATFORM') {
                throw new Error("Access Denied: This account is not a platform administration account.");
            }
            if (!userData.roles.includes('PLATFORM_ADMIN')) {
                throw new Error("Access Denied: Missing required Platform Admin role.");
            }
            if (!isPlatformAdmin(userData)) {
                throw new Error("Access Denied: Invalid platform administrator profile or permission configuration.");
            }
        } else if (classification === 'SCHOOL' && tenantId) {
            if (userData.accountType !== 'SCHOOL') {
                throw new Error("Access Denied: Platform accounts cannot access school environments.");
            }
            if (userData.tenantId !== tenantId) {
                throw new Error("Access Denied: This account does not belong to this school's domain.");
            }
        } else {
            throw new Error("Access Denied: Domain context is not verified for authentication.");
        }
    }, [classification, tenantId]);

    useEffect(() => {
        isMounted.current = true;
        let isActive = true;
        const currentVersion = ++opVersion.current;

        if (!targetContextKey) {
            return () => {
                isActive = false;
                isMounted.current = false;
            };
        }

        const initAuth = async () => {
            try {
                let userData: AuthenticatedUser | null;

                if (import.meta.env.DEV && isDevPlatformAuthActive) {
                    const devAuth = await loadDevPlatformAdminAuth();
                    userData = devAuth ? devAuth.getStoredDevPlatformAdminSession() : null;
                } else {
                    userData = await getCurrentUser();
                }

                if (isActive && currentVersion === opVersion.current) {
                    if (userData) {
                        validateUserContext(userData);
                    }
                    setSessionState({
                        contextKey: targetContextKey,
                        user: userData,
                        authError: null,
                        suppressReturnRedirect: false,
                    });
                }
            } catch (error: unknown) {
                if (isActive && currentVersion === opVersion.current) {
                    setSessionState({
                        contextKey: targetContextKey,
                        user: null,
                        authError: error,
                        suppressReturnRedirect: false,
                    });
                }
            }
        };

        initAuth();

        return () => {
            isActive = false;
            isMounted.current = false;
        };
    }, [targetContextKey, isDevPlatformAuthActive, validateUserContext]);

    const login = useCallback(async (credentials: LoginRequest) => {
        if (isOperating.current) throw new Error('An authentication operation is already in progress.');
        isOperating.current = true;
        const currentVersion = ++opVersion.current;
        const loginContextKey = targetContextKey;

        if (isMounted.current) {
            setSessionState(prev => ({
                contextKey: loginContextKey,
                user: prev.contextKey === loginContextKey ? prev.user : null,
                authError: null,
                suppressReturnRedirect: false,
            }));
        }

        try {
            let userData: AuthenticatedUser;

            if (import.meta.env.DEV && isDevPlatformAuthActive) {
                const devAuth = await loadDevPlatformAdminAuth();
                if (!devAuth) {
                    throw new Error('Development authentication module is unavailable.');
                }
                userData = devAuth.authenticateDevPlatformAdmin(credentials);
            } else {
                await apiLogin(credentials);
                userData = await getCurrentUser();
            }

            // Validate before updating state
            validateUserContext(userData);

            if (isMounted.current && currentVersion === opVersion.current) {
                setSessionState({
                    contextKey: loginContextKey,
                    user: userData,
                    authError: null,
                    suppressReturnRedirect: false,
                });
            }
            return userData;
        } catch (error: unknown) {
            // Attempt to clean up backend session if frontend validation fails (real auth only)
            if (
                !(import.meta.env.DEV && isDevPlatformAuthActive) &&
                error instanceof Error &&
                error.message.startsWith('Access Denied')
            ) {
                await apiLogout().catch(() => { });
            }
            if (isMounted.current && currentVersion === opVersion.current) {
                setSessionState(prev => ({
                    contextKey: loginContextKey,
                    user: prev.contextKey === loginContextKey ? prev.user : null,
                    authError: error,
                    suppressReturnRedirect: prev.suppressReturnRedirect,
                }));
            }
            throw error;
        } finally {
            isOperating.current = false;
        }
    }, [targetContextKey, isDevPlatformAuthActive, validateUserContext]);

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
        const currentVersion = ++opVersion.current;
        try {
            if (import.meta.env.DEV && isDevPlatformAuthActive) {
                const devAuth = await loadDevPlatformAdminAuth();
                devAuth?.clearDevPlatformAdminSession();
            } else {
                await apiLogout();
            }
            if (isMounted.current && currentVersion === opVersion.current) {
                setSessionState({
                    contextKey: targetContextKey,
                    user: null,
                    authError: null,
                    suppressReturnRedirect: true,
                });
            }
        } finally {
            isOperating.current = false;
        }
    }, [targetContextKey, isDevPlatformAuthActive]);

    const user =
        targetContextKey !== null && sessionState.contextKey === targetContextKey
            ? sessionState.user
            : null;
    const authError = sessionState.contextKey === targetContextKey ? sessionState.authError : null;
    const suppressReturnRedirect =
        sessionState.contextKey === targetContextKey ? sessionState.suppressReturnRedirect : false;
    const isInitializing = targetContextKey !== null && sessionState.contextKey !== targetContextKey;
    const isLoading = isPendingResolution || isInitializing;
    const isAuthenticated = user !== null;

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                isLoading,
                authError,
                suppressReturnRedirect,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};