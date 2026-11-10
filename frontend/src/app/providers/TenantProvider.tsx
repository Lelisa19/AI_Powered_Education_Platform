// frontend/src/app/providers/TenantProvider.tsx
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { classifyConfiguredDomain, normalizeDomainHostname } from '../../config/app-config';
import { verifyDomain } from '../../services/api/tenant-service';
import type { TenantContextState } from '../../types/tenant.types';

const TenantContext = createContext<TenantContextState | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<TenantContextState>(() => {
        const hostname = normalizeDomainHostname(window.location.hostname);
        const classification = classifyConfiguredDomain(hostname);
        const isResolving = classification === 'PENDING_RESOLUTION';

        return {
            hostname,
            classification,
            tenantId: null,
            isResolving,
            allowsPublicRegistration: false, // Default to fail-closed
        };
    });

    useEffect(() => {
        if (state.classification !== 'PENDING_RESOLUTION') return;
        let isActive = true;

        const resolveTenantDomain = async () => {
            try {
                const response = await verifyDomain(state.hostname);
                if (isActive) {
                    const verifiedTenantId = response.tenantId?.trim();
                    if (response.isValid && verifiedTenantId) {
                        setState(prev => ({
                            ...prev,
                            classification: 'SCHOOL',
                            tenantId: verifiedTenantId,
                            allowsPublicRegistration: response.allowsPublicRegistration ?? false,
                            isResolving: false
                        }));
                    } else {
                        setState(prev => ({
                            ...prev,
                            classification: 'UNKNOWN',
                            tenantId: null,
                            isResolving: false
                        }));
                    }
                }
            } catch {
                if (isActive) {
                    setState(prev => ({
                        ...prev,
                        classification: 'UNKNOWN',
                        tenantId: null,
                        isResolving: false
                    }));
                }
            }
        };

        resolveTenantDomain();

        return () => { isActive = false; };
    }, [state.classification, state.hostname]);

    return (
        <TenantContext.Provider value={state}>
            {children}
        </TenantContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTenantContext = (): TenantContextState => {
    const context = useContext(TenantContext);
    if (!context) throw new Error('useTenantContext must be used within a TenantProvider');
    return context;
};
