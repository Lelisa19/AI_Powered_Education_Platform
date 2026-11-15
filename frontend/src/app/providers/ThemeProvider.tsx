import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    DEFAULT_SCHOOL_BRANDING,
    type SchoolBranding,
    type SchoolIdentity,
} from '../../types/school.types';
import {
    getReadableContrastColor,
    hexToRgba,
    sanitizeBrandHexColor,
    sanitizeSchoolAssetUrl,
} from '../../utils/branding';
import { useAuth } from '../../hooks/useAuth';
import { useTenantContext } from './TenantProvider';

export interface ActiveSchoolTheme {
    schoolName: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string;
    primaryForegroundColor: '#FFFFFF' | '#0F172A';
    primarySoftColor: string;
    secondaryColor: string;
    secondaryForegroundColor: '#FFFFFF' | '#0F172A';
    hasCustomBranding: boolean;
}

export interface ThemeContextValue {
    isSchoolThemeActive: boolean;
    schoolTheme: ActiveSchoolTheme;
    brandCssVariables: React.CSSProperties;
    applyVerifiedSchoolTheme: (
        tenantId: string,
        payload: {
            identity?: Partial<SchoolIdentity> | null;
            branding?: Partial<SchoolBranding> | null;
        }
    ) => void;
    clearSchoolThemeOverrides: () => void;
}

interface VerifiedTenantThemeOverride {
    tenantId: string;
    schoolName: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
}

const DEFAULT_ACTIVE_THEME: ActiveSchoolTheme = {
    schoolName: null,
    logoUrl: null,
    faviconUrl: null,
    primaryColor: DEFAULT_SCHOOL_BRANDING.primaryColor,
    primaryForegroundColor: '#FFFFFF',
    primarySoftColor: hexToRgba(DEFAULT_SCHOOL_BRANDING.primaryColor, 0.1),
    secondaryColor: DEFAULT_SCHOOL_BRANDING.secondaryColor,
    secondaryForegroundColor: '#FFFFFF',
    hasCustomBranding: false,
};

const DYNAMIC_FAVICON_ATTR = 'data-school-theme-favicon';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyFaviconToDocument(faviconUrl: string | null): void {
    if (typeof document === 'undefined' || !document.head) return;

    const existingDynamic = document.head.querySelector<HTMLLinkElement>(
        `link[${DYNAMIC_FAVICON_ATTR}="true"]`
    );

    if (!faviconUrl) {
        if (existingDynamic) {
            existingDynamic.remove();
        }
        return;
    }

    if (existingDynamic) {
        if (existingDynamic.getAttribute('href') !== faviconUrl) {
            existingDynamic.setAttribute('href', faviconUrl);
        }
        return;
    }

    const link = document.createElement('link');
    link.rel = 'icon';
    link.setAttribute(DYNAMIC_FAVICON_ATTR, 'true');
    link.href = faviconUrl;
    document.head.appendChild(link);
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const {
        classification,
        tenantId,
        schoolName: tenantSchoolName,
        schoolLogoUrl: tenantLogoUrl,
        schoolFaviconUrl: tenantFaviconUrl,
        schoolBranding: tenantBranding,
    } = useTenantContext();
    const { user } = useAuth();

    const [override, setOverride] = useState<VerifiedTenantThemeOverride | null>(null);

    const isVerifiedSchoolDomain = classification === 'SCHOOL' && Boolean(tenantId);
    const hasCrossDomainUserConflict =
        Boolean(user) &&
        (user?.accountType !== 'SCHOOL' || (Boolean(tenantId) && user.tenantId !== tenantId));

    const isSchoolThemeActive = isVerifiedSchoolDomain && !hasCrossDomainUserConflict;

    const activeOverride =
        isSchoolThemeActive && override && override.tenantId === tenantId ? override : null;

    const schoolTheme = useMemo<ActiveSchoolTheme>(() => {
        if (!isSchoolThemeActive) {
            return DEFAULT_ACTIVE_THEME;
        }

        const primaryCandidate =
            activeOverride?.primaryColor ??
            sanitizeBrandHexColor(tenantBranding?.primaryColor) ??
            null;
        const secondaryCandidate =
            activeOverride?.secondaryColor ??
            sanitizeBrandHexColor(tenantBranding?.secondaryColor) ??
            null;

        const resolvedPrimary = primaryCandidate ?? DEFAULT_SCHOOL_BRANDING.primaryColor;
        const resolvedSecondary = secondaryCandidate ?? DEFAULT_SCHOOL_BRANDING.secondaryColor;

        const resolvedSchoolName = activeOverride?.schoolName ?? tenantSchoolName ?? null;
        const resolvedLogoUrl =
            activeOverride !== null ? activeOverride.logoUrl : tenantLogoUrl ?? null;
        const resolvedFaviconUrl =
            activeOverride !== null ? activeOverride.faviconUrl : tenantFaviconUrl ?? null;

        return {
            schoolName: resolvedSchoolName,
            logoUrl: resolvedLogoUrl,
            faviconUrl: resolvedFaviconUrl,
            primaryColor: resolvedPrimary,
            primaryForegroundColor: getReadableContrastColor(resolvedPrimary),
            primarySoftColor: hexToRgba(resolvedPrimary, 0.1),
            secondaryColor: resolvedSecondary,
            secondaryForegroundColor: getReadableContrastColor(resolvedSecondary),
            hasCustomBranding: Boolean(
                primaryCandidate || secondaryCandidate || resolvedLogoUrl || resolvedFaviconUrl
            ),
        };
    }, [
        isSchoolThemeActive,
        activeOverride,
        tenantBranding,
        tenantSchoolName,
        tenantLogoUrl,
        tenantFaviconUrl,
    ]);

    const brandCssVariables = useMemo<React.CSSProperties>(() => {
        if (!isSchoolThemeActive) {
            return {};
        }

        return {
            '--school-primary': schoolTheme.primaryColor,
            '--school-primary-foreground': schoolTheme.primaryForegroundColor,
            '--school-primary-soft': schoolTheme.primarySoftColor,
            '--school-secondary': schoolTheme.secondaryColor,
            '--school-secondary-foreground': schoolTheme.secondaryForegroundColor,
        } as React.CSSProperties;
    }, [isSchoolThemeActive, schoolTheme]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;

        if (!isSchoolThemeActive) {
            root.style.removeProperty('--school-primary');
            root.style.removeProperty('--school-primary-foreground');
            root.style.removeProperty('--school-primary-soft');
            root.style.removeProperty('--school-secondary');
            root.style.removeProperty('--school-secondary-foreground');
            applyFaviconToDocument(null);
            return;
        }

        root.style.setProperty('--school-primary', schoolTheme.primaryColor);
        root.style.setProperty('--school-primary-foreground', schoolTheme.primaryForegroundColor);
        root.style.setProperty('--school-primary-soft', schoolTheme.primarySoftColor);
        root.style.setProperty('--school-secondary', schoolTheme.secondaryColor);
        root.style.setProperty(
            '--school-secondary-foreground',
            schoolTheme.secondaryForegroundColor
        );
        applyFaviconToDocument(schoolTheme.faviconUrl);
    }, [isSchoolThemeActive, schoolTheme]);

    const applyVerifiedSchoolTheme = useCallback(
        (
            targetTenantId: string,
            payload: {
                identity?: Partial<SchoolIdentity> | null;
                branding?: Partial<SchoolBranding> | null;
            }
        ) => {
            // Strictly reject unverified tenant contexts or cross-tenant branding updates.
            if (classification !== 'SCHOOL' || !tenantId || targetTenantId !== tenantId) {
                return;
            }

            setOverride((prev) => {
                const baseName =
                    prev && prev.tenantId === targetTenantId
                        ? prev.schoolName
                        : tenantSchoolName ?? null;
                const baseLogo =
                    prev && prev.tenantId === targetTenantId
                        ? prev.logoUrl
                        : tenantLogoUrl ?? null;
                const baseFavicon =
                    prev && prev.tenantId === targetTenantId
                        ? prev.faviconUrl
                        : tenantFaviconUrl ?? null;
                const basePrimary =
                    prev && prev.tenantId === targetTenantId
                        ? prev.primaryColor
                        : sanitizeBrandHexColor(tenantBranding?.primaryColor);
                const baseSecondary =
                    prev && prev.tenantId === targetTenantId
                        ? prev.secondaryColor
                        : sanitizeBrandHexColor(tenantBranding?.secondaryColor);

                const nextName =
                    payload.identity && 'name' in payload.identity
                        ? payload.identity.name?.trim() || null
                        : baseName;

                const nextLogo =
                    payload.identity && 'logoUrl' in payload.identity
                        ? sanitizeSchoolAssetUrl(payload.identity.logoUrl)
                        : baseLogo;

                const nextFavicon =
                    payload.identity && 'faviconUrl' in payload.identity
                        ? sanitizeSchoolAssetUrl(payload.identity.faviconUrl)
                        : baseFavicon;

                const nextPrimary =
                    payload.branding && 'primaryColor' in payload.branding
                        ? sanitizeBrandHexColor(payload.branding.primaryColor)
                        : basePrimary;

                const nextSecondary =
                    payload.branding && 'secondaryColor' in payload.branding
                        ? sanitizeBrandHexColor(payload.branding.secondaryColor)
                        : baseSecondary;

                return {
                    tenantId: targetTenantId,
                    schoolName: nextName,
                    logoUrl: nextLogo,
                    faviconUrl: nextFavicon,
                    primaryColor: nextPrimary,
                    secondaryColor: nextSecondary,
                };
            });
        },
        [classification, tenantId, tenantSchoolName, tenantLogoUrl, tenantFaviconUrl, tenantBranding]
    );

    const clearSchoolThemeOverrides = useCallback(() => {
        setOverride(null);
    }, []);

    return (
        <ThemeContext.Provider
            value={{
                isSchoolThemeActive,
                schoolTheme,
                brandCssVariables,
                applyVerifiedSchoolTheme,
                clearSchoolThemeOverrides,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
