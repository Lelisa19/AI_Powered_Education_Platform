import {
    validatePlatformPermissionArray,
    type PlatformPermissionKey,
} from '../constants/permissions';

export type PlatformRole = 'PLATFORM_ADMIN';
export type SchoolRole = 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'SCHOOL_ACCOUNTANT';
export type Permission = string;

export interface BaseAuthenticatedUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    permissions: Permission[];
}

/**
 * Authentication profile for platform administrators.
 * Every platform administrator receives all platform permissions by default;
 * optional `restrictedPermissions` lists individual platform permissions withheld
 * from a non-Super-Admin administrator (omitted or empty means no restrictions).
 */
export interface PlatformAuthenticatedUser extends BaseAuthenticatedUser {
    accountType: 'PLATFORM';
    tenantId: null;
    roles: PlatformRole[];
    isSuperAdmin: boolean;
    permissions: PlatformPermissionKey[];
    restrictedPermissions?: PlatformPermissionKey[];
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

    const {
        id,
        email,
        firstName,
        lastName,
        accountType,
        tenantId,
        roles,
        permissions,
        isSuperAdmin,
        restrictedPermissions,
    } = data;

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
        if (!Array.isArray(roles) || roles.length !== 1 || roles[0] !== 'PLATFORM_ADMIN') {
            throw new Error('Authentication Security Violation: Platform accounts must have exactly the PLATFORM_ADMIN role.');
        }
        if (typeof isSuperAdmin !== 'boolean') {
            throw new Error('Authentication Security Violation: Platform accounts must specify a boolean isSuperAdmin flag.');
        }

        const permissionsValidation = validatePlatformPermissionArray(permissions);
        if (!permissionsValidation.valid) {
            throw new Error(
                'Authentication Security Violation: Platform account contains unrecognized or invalid permissions.'
            );
        }

        let validatedRestrictedPermissions: PlatformPermissionKey[] | undefined;
        if (restrictedPermissions !== undefined) {
            const restrictedValidation = validatePlatformPermissionArray(restrictedPermissions);
            if (!restrictedValidation.valid) {
                if (restrictedValidation.reason === 'NOT_ARRAY') {
                    throw new Error(
                        'Authentication Error: Restricted permissions must be an array of valid platform permission keys.'
                    );
                }
                if (restrictedValidation.reason === 'DUPLICATE') {
                    throw new Error(
                        'Authentication Error: Duplicate restricted permissions detected in user profile.'
                    );
                }
                throw new Error(
                    'Authentication Security Violation: Restricted permissions contain invalid or non-platform permission keys.'
                );
            }
            if (isSuperAdmin && restrictedValidation.keys.length > 0) {
                throw new Error(
                    'Authentication Security Violation: Super Admin accounts cannot have permission restrictions.'
                );
            }
            validatedRestrictedPermissions = restrictedValidation.keys;
        }

        return {
            id,
            email,
            firstName,
            lastName,
            accountType: 'PLATFORM',
            tenantId: null,
            roles: roles as PlatformRole[],
            isSuperAdmin,
            permissions: permissionsValidation.keys,
            restrictedPermissions: validatedRestrictedPermissions,
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
