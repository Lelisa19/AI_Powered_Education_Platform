export type PlatformRole = 'PLATFORM_SUPER_ADMIN';
export type SchoolRole = 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'SCHOOL_ACCOUNTANT';
export type Permission = string;

export interface BaseAuthenticatedUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    permissions: Permission[];
}

export interface PlatformAuthenticatedUser extends BaseAuthenticatedUser {
    accountType: 'PLATFORM';
    tenantId: null;
    roles: PlatformRole[];
}

export interface SchoolAuthenticatedUser extends BaseAuthenticatedUser {
    accountType: 'SCHOOL';
    tenantId: string;
    roles: SchoolRole[];
}

export type AuthenticatedUser = PlatformAuthenticatedUser | SchoolAuthenticatedUser;

// --- Runtime Validation ---

function isPlainObject(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isValidPermission(item: unknown): item is string {
    return typeof item === 'string' && item.trim() !== '' && !/\s/.test(item);
}

function hasDuplicates(arr: string[]): boolean {
    return new Set(arr).size !== arr.length;
}

export function parseAuthenticatedUser(data: unknown): AuthenticatedUser {
    if (!isPlainObject(data)) {
        throw new Error('Authentication Error: User profile data is malformed (expected an object).');
    }

    const { id, email, firstName, lastName, accountType, tenantId, roles, permissions } = data;

    // 1. Validate identity fields (reject empty or whitespace-only strings)
    if (
        typeof id !== 'string' || id.trim() === '' ||
        typeof email !== 'string' || email.trim() === '' ||
        typeof firstName !== 'string' || firstName.trim() === '' ||
        typeof lastName !== 'string' || lastName.trim() === ''
    ) {
        throw new Error('Authentication Error: Missing or invalid identity fields in user profile.');
    }

    // 2. Validate permissions (reject whitespace-only, malformed, or duplicate permissions)
    if (!Array.isArray(permissions) || !permissions.every(isValidPermission)) {
        throw new Error('Authentication Error: Permissions must be an array of non-empty strings without whitespace.');
    }

    if (hasDuplicates(permissions)) {
        throw new Error('Authentication Error: Duplicate permissions detected in user profile.');
    }

    // 3. Validate Account Type and Tenant constraints
    if (accountType === 'PLATFORM') {
        if (tenantId !== null) {
            throw new Error('Authentication Security Violation: Platform accounts must not be bound to a tenant ID.');
        }
        if (!Array.isArray(roles) || roles.length !== 1 || roles[0] !== 'PLATFORM_SUPER_ADMIN') {
            throw new Error('Authentication Security Violation: Platform accounts must have exactly the PLATFORM_SUPER_ADMIN role.');
        }

        return {
            id,
            email,
            firstName,
            lastName,
            accountType: 'PLATFORM',
            tenantId: null,
            roles: roles as PlatformRole[],
            permissions,
        };
    }

    if (accountType === 'SCHOOL') {
        if (typeof tenantId !== 'string' || tenantId.trim() === '') {
            throw new Error('Authentication Security Violation: School accounts must have a valid tenant ID.');
        }
        if (!Array.isArray(roles) || roles.length === 0) {
            throw new Error('Authentication Security Violation: School accounts must have at least one assigned role.');
        }

        if (hasDuplicates(roles as string[])) {
            throw new Error('Authentication Security Violation: Duplicate roles detected in user profile.');
        }

        const validSchoolRoles: SchoolRole[] = ['SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'SCHOOL_ACCOUNTANT'];
        const hasInvalidRole = roles.some((role) => !validSchoolRoles.includes(role as SchoolRole));

        if (hasInvalidRole) {
            throw new Error('Authentication Security Violation: School account contains unrecognized or cross-domain roles.');
        }

        return {
            id,
            email,
            firstName,
            lastName,
            accountType: 'SCHOOL',
            tenantId: tenantId as string,
            roles: roles as SchoolRole[],
            permissions,
        };
    }

    throw new Error(`Authentication Error: Unsupported accountType '${String(accountType)}'.`);
}

