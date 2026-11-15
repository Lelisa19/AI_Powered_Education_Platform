// frontend/src/types/tenant.types.ts
import type { SchoolBranding } from './school.types';

export type DomainClassification =
    | 'PLATFORM'
    | 'PLATFORM_ADMIN'
    | 'PENDING_RESOLUTION'
    | 'SCHOOL'
    | 'UNKNOWN';

export interface TenantContextState {
    hostname: string;
    classification: DomainClassification;
    tenantId: string | null;
    schoolName: string | null;
    schoolLogoUrl: string | null;
    schoolFaviconUrl: string | null;
    schoolBranding: SchoolBranding | null;
    isResolving: boolean;
    allowsPublicRegistration: boolean; // NEW: Strict boolean flag
}