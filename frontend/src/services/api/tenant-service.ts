// frontend/src/services/api/tenant-service.ts
import { env } from '../../config/env';
import type { SchoolBranding } from '../../types/school.types';

export interface VerifyDomainResponse {
    isValid: boolean;
    tenantId?: string;
    schoolName?: string | null;
    schoolLogoUrl?: string | null;
    schoolFaviconUrl?: string | null;
    branding?: SchoolBranding | null;
    allowsPublicRegistration?: boolean; // NEW: Required backend contract addition
}

export const DEV_SCHOOL_TENANT_ID = 'dev-school-tenant-001';

export const verifyDomain = async (hostname: string): Promise<VerifyDomainResponse> => {
    if (!hostname || typeof hostname !== 'string') {
        throw new Error("Hostname is required for domain verification.");
    }

    const normalizedHostname = hostname.trim().toLowerCase().replace(/\.+$/, '');

    // Strictly development-only resolution for the configured School Admin development domain
    if (
        import.meta.env.DEV &&
        env.ENABLE_SCHOOL_DEV_AUTH &&
        env.DEV_SCHOOL_DOMAIN &&
        normalizedHostname === env.DEV_SCHOOL_DOMAIN.toLowerCase()
    ) {
        return {
            isValid: true,
            tenantId: DEV_SCHOOL_TENANT_ID,
            schoolName: 'Greenwood Academy (Dev)',
            allowsPublicRegistration: false,
        };
    }

    // Note: Endpoint not implemented yet.
    throw new Error("Backend domain verification endpoint is not implemented yet.");
};
