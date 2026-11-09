// frontend/src/services/api/tenant-service.ts
export interface VerifyDomainResponse {
    isValid: boolean;
    tenantId?: string;
    allowsPublicRegistration?: boolean; // NEW: Required backend contract addition
}

export const verifyDomain = async (hostname: string): Promise<VerifyDomainResponse> => {
    if (!hostname || typeof hostname !== 'string') {
        throw new Error("Hostname is required for domain verification.");
    }
    // Note: Endpoint not implemented yet.
    throw new Error("Backend domain verification endpoint is not implemented yet.");
};