import type { AuthenticatedUser, PlatformAuthenticatedUser, PlatformRole, SchoolRole } from '../types/auth';
import type { DomainClassification } from '../types/tenant.types';
import {
    ALL_PLATFORM_PERMISSIONS,
    PLATFORM_PERMISSIONS,
    SCHOOL_ADMIN_ROUTE_PERMISSIONS,
    SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS,
    isPlatformPermissionKey,
    validatePlatformPermissionArray,
    type PermissionKey,
    type PlatformPermissionKey,
} from '../constants/permissions';

export { isPlatformPermissionKey };

/**
 * Validates that a user object conforms to the single-role PLATFORM_ADMIN contract
 * and contains no invalid or contradictory platform permission data.
 */
export function isPlatformAdmin(user: AuthenticatedUser | null): user is PlatformAuthenticatedUser {
    if (!user || user.accountType !== 'PLATFORM') return false;
    if (user.tenantId !== null) return false;
    if (!Array.isArray(user.roles) || user.roles.length !== 1 || user.roles[0] !== 'PLATFORM_ADMIN') {
        return false;
    }
    if (typeof user.isSuperAdmin !== 'boolean') return false;

    const permissionsCheck = validatePlatformPermissionArray(user.permissions);
    if (!permissionsCheck.valid) return false;

    if (user.restrictedPermissions !== undefined) {
        const restrictedCheck = validatePlatformPermissionArray(user.restrictedPermissions);
        if (!restrictedCheck.valid) return false;

        if (user.isSuperAdmin && restrictedCheck.keys.length > 0) {
            return false;
        }
    }

    return true;
}

export function isPlatformSuperAdmin(user: AuthenticatedUser | null): boolean {
    return isPlatformAdmin(user) && user.isSuperAdmin === true;
}

/**
 * Resolves effective UI/routing permissions for a verified platform administrator:
 * - Super Admin (`isSuperAdmin: true`) always receives all platform permissions.
 * - Invited Platform Admins (`isSuperAdmin: false`) receive all platform permissions
 *   by default, minus any explicitly restricted permissions (`restrictedPermissions`).
 * - Missing or empty `restrictedPermissions` means no restrictions (all permissions).
 * - Unverified profiles or invalid permission data fail closed (`[]`).
 *
 * Note: Frontend permission derivation is for UI and routing only; the backend
 * remains the authoritative authorization boundary.
 */
export function getPlatformEffectivePermissions(
    user: AuthenticatedUser | null
): PlatformPermissionKey[] {
    if (!isPlatformAdmin(user)) return [];

    if (user.isSuperAdmin) {
        return [...ALL_PLATFORM_PERMISSIONS];
    }

    const restricted = user.restrictedPermissions;
    if (!restricted || restricted.length === 0) {
        return [...ALL_PLATFORM_PERMISSIONS];
    }

    const restrictedSet = new Set<PlatformPermissionKey>(restricted);
    return ALL_PLATFORM_PERMISSIONS.filter((perm) => !restrictedSet.has(perm));
}

/**
 * Returns the validated list of restricted platform permissions for a non-Super-Admin platform account.
 */
export function getPlatformRestrictedPermissions(
    user: AuthenticatedUser | null
): PlatformPermissionKey[] {
    if (!isPlatformAdmin(user) || user.isSuperAdmin) {
        return [];
    }

    return [...(user.restrictedPermissions ?? [])];
}

export function isPlatformPermissionRestricted(
    user: AuthenticatedUser | null,
    permission: string
): boolean {
    if (!isPlatformAdmin(user) || user.isSuperAdmin) {
        return false;
    }
    if (!isPlatformPermissionKey(permission)) {
        return false;
    }

    return (user.restrictedPermissions ?? []).includes(permission);
}

export function canManageAdminRestrictions(
    actor: AuthenticatedUser | null,
    targetAdmin?: { id: string; isSuperAdmin: boolean }
): boolean {
    if (!isPlatformSuperAdmin(actor) || !actor) {
        return false;
    }

    if (targetAdmin) {
        if (targetAdmin.isSuperAdmin || targetAdmin.id === actor.id) {
            return false;
        }
    }

    return true;
}

export function hasPermission(user: AuthenticatedUser | null, permission: string): boolean {
    if (!user) return false;

    if (user.accountType === 'PLATFORM') {
        if (!isPlatformPermissionKey(permission)) return false;
        return getPlatformEffectivePermissions(user).includes(permission);
    }

    return user.permissions.includes(permission);
}

export function hasAnyPermission(user: AuthenticatedUser | null, permissions: string[]): boolean {
    if (!user || permissions.length === 0) return false;
    return permissions.some((perm) => hasPermission(user, perm));
}

export function hasAllPermissions(user: AuthenticatedUser | null, permissions: string[]): boolean {
    if (!user) return false;
    if (permissions.length === 0) return true; // Standard Array.every() semantics
    return permissions.every((perm) => hasPermission(user, perm));
}

export function hasRole(user: AuthenticatedUser | null, role: PlatformRole | SchoolRole): boolean {
    if (!user) return false;

    if (user.accountType === 'PLATFORM') {
        // Block cross-domain matching: Platform accounts can only match PLATFORM_ADMIN
        if (role !== 'PLATFORM_ADMIN') return false;

        return isPlatformAdmin(user);
    }

    if (user.accountType === 'SCHOOL') {
        // Block cross-domain matching: School accounts cannot authorize platform roles
        if (role === 'PLATFORM_ADMIN') return false;

        // Type-safe string comparison without `as` assertions
        return user.roles.some((r) => r === role);
    }

    return false;
}

export function hasAnyRole(user: AuthenticatedUser | null, roles: (PlatformRole | SchoolRole)[]): boolean {
    if (!user || roles.length === 0) return false;
    return roles.some((role) => hasRole(user, role));
}

const NON_RETURN_ROUTES = new Set([
    '/',
    '/login',
    '/register',
    '/invite',
    '/accept-invitation',
    '/forgot-password',
    '/unauthorized',
]);

const PLATFORM_ROUTE_PERMISSION_MAP: Readonly<Record<string, PlatformPermissionKey | null>> = {
    '/dashboard': null,
    '/dashboard/tenants': PLATFORM_PERMISSIONS.TENANTS_MANAGE,
    '/dashboard/domains': PLATFORM_PERMISSIONS.DOMAINS_MANAGE,
    '/dashboard/onboarding': PLATFORM_PERMISSIONS.ONBOARDING_MANAGE,
    '/dashboard/administrators': PLATFORM_PERMISSIONS.ADMINS_MANAGE,
    '/dashboard/settings': PLATFORM_PERMISSIONS.SETTINGS_MANAGE,
    '/dashboard/audit-logs': PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW,
    '/dashboard/monitoring': PLATFORM_PERMISSIONS.MONITORING_ACCESS,
    '/dashboard/support': PLATFORM_PERMISSIONS.SUPPORT_MANAGE,
};

interface SchoolRouteAccessRule {
    role: SchoolRole;
    anyPermissions?: readonly PermissionKey[];
    allPermissions?: readonly PermissionKey[];
}

const SCHOOL_ROUTE_ACCESS_MAP: Readonly<Record<string, SchoolRouteAccessRule>> = {
    '/admin': { role: 'SCHOOL_ADMIN' },
    '/admin/profile': {
        role: 'SCHOOL_ADMIN',
        anyPermissions: SCHOOL_ADMIN_ROUTE_PERMISSIONS.PROFILE,
    },
    '/admin/website': {
        role: 'SCHOOL_ADMIN',
        anyPermissions: SCHOOL_ADMIN_ROUTE_PERMISSIONS.WEBSITE,
    },
    '/admin/academic-structure': {
        role: 'SCHOOL_ADMIN',
        anyPermissions: SCHOOL_ADMIN_ROUTE_PERMISSIONS.ACADEMIC_STRUCTURE,
    },
    '/admin/settings': {
        role: 'SCHOOL_ADMIN',
        anyPermissions: SCHOOL_ADMIN_ROUTE_PERMISSIONS.SETTINGS,
    },
    '/admin/staff': {
        role: 'SCHOOL_ADMIN',
        anyPermissions: SCHOOL_ADMIN_ROUTE_PERMISSIONS.STAFF,
    },
    '/admin/teachers': {
        role: 'SCHOOL_ADMIN',
        anyPermissions: SCHOOL_ADMIN_ROUTE_PERMISSIONS.TEACHERS,
    },
    '/admin/students': {
        role: 'SCHOOL_ADMIN',
        anyPermissions: SCHOOL_ADMIN_ROUTE_PERMISSIONS.STUDENTS,
    },
    '/admin/programs-courses': {
        role: 'SCHOOL_ADMIN',
        anyPermissions: SCHOOL_ADMIN_ROUTE_PERMISSIONS.PROGRAMS_COURSES,
    },
    '/admin/finance': {
        role: 'SCHOOL_ADMIN',
        allPermissions: SCHOOL_ADMIN_ROUTE_PERMISSIONS.FINANCE,
    },
    '/teacher': { role: 'TEACHER' },
    '/student': { role: 'STUDENT' },
    '/accountant': { role: 'SCHOOL_ACCOUNTANT' },
    '/accountant/payments': {
        role: 'SCHOOL_ACCOUNTANT',
        anyPermissions: SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS.PAYMENTS,
    },
    '/accountant/students': {
        role: 'SCHOOL_ACCOUNTANT',
        allPermissions: SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS.STUDENTS,
    },
    '/accountant/reports': {
        role: 'SCHOOL_ACCOUNTANT',
        anyPermissions: SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS.REPORTS,
    },
};

const SCHOOL_ROLE_LABELS: Readonly<Record<SchoolRole, string>> = {
    SCHOOL_ADMIN: 'School Admin',
    TEACHER: 'Teacher',
    STUDENT: 'Student',
    SCHOOL_ACCOUNTANT: 'School Accountant',
};

export function formatAuthenticatedUserRoles(user: AuthenticatedUser | null): string | null {
    if (!user) return null;

    if (user.accountType === 'PLATFORM') {
        if (!isPlatformAdmin(user)) return null;
        return user.isSuperAdmin ? 'Super Admin' : 'Platform Admin';
    }

    if (user.accountType === 'SCHOOL') {
        const labels = user.roles
            .map((role) => SCHOOL_ROLE_LABELS[role])
            .filter((label): label is string => Boolean(label));
        return labels.length > 0 ? labels.join(', ') : null;
    }

    return null;
}

/**
 * Validates that a preserved return URL is a safe relative application route.
 */
export function getSafeRedirectPath(from: unknown): string | null {
    if (typeof from !== 'string') return null;

    const trimmed = from.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
        return null;
    }

    const pathname = trimmed.split(/[?#]/)[0];
    if (NON_RETURN_ROUTES.has(pathname)) {
        return null;
    }

    return trimmed;
}

function matchesVerifiedSchoolTenant(
    userTenantId: string,
    expectedTenantId?: string | null
): boolean {
    if (typeof userTenantId !== 'string' || userTenantId.trim() === '') {
        return false;
    }

    if (expectedTenantId === undefined) {
        return true;
    }

    return typeof expectedTenantId === 'string' && expectedTenantId.trim() !== '' && userTenantId === expectedTenantId;
}

/**
 * Validates a preserved return URL against the newly authenticated user's domain,
 * tenant context, valid route allowlist, role, and effective permissions before allowing post-login redirection.
 */
export function getAuthorizedRedirectPath(
    from: unknown,
    user: AuthenticatedUser | null,
    classification?: DomainClassification,
    expectedTenantId?: string | null
): string | null {
    if (!user) return null;

    const safePath = getSafeRedirectPath(from);
    if (!safePath) return null;

    const rawPathname = safePath.split(/[?#]/)[0];
    const normalizedPath =
        rawPathname.length > 1 ? rawPathname.replace(/\/+$/, '') : rawPathname;

    if (user.accountType === 'PLATFORM') {
        if (classification && classification !== 'PLATFORM_ADMIN') {
            return null;
        }
        if (!isPlatformAdmin(user)) {
            return null;
        }
        if (!Object.prototype.hasOwnProperty.call(PLATFORM_ROUTE_PERMISSION_MAP, normalizedPath)) {
            return null;
        }

        const requiredPermission = PLATFORM_ROUTE_PERMISSION_MAP[normalizedPath];
        if (requiredPermission && !hasPermission(user, requiredPermission)) {
            return null;
        }

        return safePath;
    }

    if (user.accountType === 'SCHOOL') {
        if (classification && classification !== 'SCHOOL') {
            return null;
        }
        if (!matchesVerifiedSchoolTenant(user.tenantId, expectedTenantId)) {
            return null;
        }
        if (normalizedPath === '/dashboard' || normalizedPath.startsWith('/dashboard/')) {
            return null;
        }
        if (!Object.prototype.hasOwnProperty.call(SCHOOL_ROUTE_ACCESS_MAP, normalizedPath)) {
            return null;
        }

        const routeRule = SCHOOL_ROUTE_ACCESS_MAP[normalizedPath];
        if (!hasRole(user, routeRule.role)) {
            return null;
        }

        if (
            routeRule.anyPermissions &&
            routeRule.anyPermissions.length > 0 &&
            !hasAnyPermission(user, [...routeRule.anyPermissions])
        ) {
            return null;
        }

        if (
            routeRule.allPermissions &&
            routeRule.allPermissions.length > 0 &&
            !hasAllPermissions(user, [...routeRule.allPermissions])
        ) {
            return null;
        }

        return safePath;
    }

    return null;
}

/**
 * Returns the appropriate login route for the current domain classification.
 */
export function getLoginRoute(classification?: DomainClassification): string {
    if (classification === 'PLATFORM_ADMIN' || classification === 'PLATFORM') {
        return '/';
    }

    return '/login';
}

/**
 * Determines the most appropriate default dashboard route based on the user's highest priority role.
 */
export function getDefaultDashboard(
    user: AuthenticatedUser | null,
    classification?: DomainClassification,
    expectedTenantId?: string | null
): string {
    if (!user) return getLoginRoute(classification);

    if (user.accountType === 'PLATFORM') {
        if (classification === 'SCHOOL' || classification === 'PLATFORM') {
            return '/unauthorized';
        }
        if (hasRole(user, 'PLATFORM_ADMIN')) {
            return '/dashboard';
        }
        return '/unauthorized';
    }

    if (user.accountType === 'SCHOOL') {
        if (classification === 'PLATFORM' || classification === 'PLATFORM_ADMIN') {
            return '/unauthorized';
        }
        if (!matchesVerifiedSchoolTenant(user.tenantId, expectedTenantId)) {
            return '/unauthorized';
        }
        // Priority 1: Admin
        if (hasRole(user, 'SCHOOL_ADMIN')) return '/admin';
        // Priority 2: Teacher
        if (hasRole(user, 'TEACHER')) return '/teacher';
        // Priority 3: Accountant
        if (hasRole(user, 'SCHOOL_ACCOUNTANT')) return '/accountant';
        // Priority 4: Student
        if (hasRole(user, 'STUDENT')) return '/student';
    }

    // Fallback for valid user with no recognized/supported role mapped to a dashboard
    return '/unauthorized';
}
