// frontend/src/app/providers/TenantProvider.tsx
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { classifyConfiguredDomain, normalizeDomainHostname } from '../../config/app-config';
import { verifyDomain } from '../../services/api/tenant-service';
import type { SchoolBranding } from '../../types/school.types';
import type { TenantContextState } from '../../types/tenant.types';
import { sanitizeBrandHexColor, sanitizeSchoolAssetUrl } from '../../utils/branding';

const TenantContext = createContext<TenantContextState | undefined>(undefined);

function sanitizeOptionalName(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function sanitizeOptionalBranding(raw: unknown): SchoolBranding | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return null;
    }

    const candidate = raw as { primaryColor?: unknown; secondaryColor?: unknown };
    const primaryColor = sanitizeBrandHexColor(candidate.primaryColor);
    if (!primaryColor) {
        return null;
    }

    const secondaryColor = sanitizeBrandHexColor(candidate.secondaryColor);
    return {
        primaryColor,
        ...(secondaryColor ? { secondaryColor } : {}),
    };
}

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<TenantContextState>(() => {
        const hostname = normalizeDomainHostname(window.location.hostname);
        const classification = classifyConfiguredDomain(hostname);
        const isResolving = classification === 'PENDING_RESOLUTION';

        return {
            hostname,
            classification,
            tenantId: null,
            schoolName: null,
            schoolLogoUrl: null,
            schoolFaviconUrl: null,
            schoolBranding: null,
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
                            schoolName: sanitizeOptionalName(response.schoolName),
                            schoolLogoUrl: sanitizeSchoolAssetUrl(response.schoolLogoUrl),
                            schoolFaviconUrl: sanitizeSchoolAssetUrl(response.schoolFaviconUrl),
                            schoolBranding: sanitizeOptionalBranding(response.branding),
                            allowsPublicRegistration: response.allowsPublicRegistration ?? false,
                            isResolving: false
                        }));
                    } else {
                        setState(prev => ({
                            ...prev,
                            classification: 'UNKNOWN',
                            tenantId: null,
                            schoolName: null,
                            schoolLogoUrl: null,
                            schoolFaviconUrl: null,
                            schoolBranding: null,
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
                        schoolName: null,
                        schoolLogoUrl: null,
                        schoolFaviconUrl: null,
                        schoolBranding: null,
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
