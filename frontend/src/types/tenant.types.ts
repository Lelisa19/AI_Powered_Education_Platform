// frontend/src/types/tenant.types.ts
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
    isResolving: boolean;
    allowsPublicRegistration: boolean; // NEW: Strict boolean flag
}