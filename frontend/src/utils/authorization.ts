import type { AuthenticatedUser, PlatformRole, SchoolRole } from '../types/auth';

export function hasPermission(user: AuthenticatedUser | null, permission: string): boolean {
    if (!user) return false;
    return user.permissions.includes(permission);
}

export function hasAnyPermission(user: AuthenticatedUser | null, permissions: string[]): boolean {
    if (!user || permissions.length === 0) return false;
    return permissions.some((perm) => user.permissions.includes(perm));
}

export function hasAllPermissions(user: AuthenticatedUser | null, permissions: string[]): boolean {
    if (!user) return false;
    if (permissions.length === 0) return true; // Standard Array.every() semantics
    return permissions.every((perm) => user.permissions.includes(perm));
}

export function hasRole(user: AuthenticatedUser | null, role: PlatformRole | SchoolRole): boolean {
    if (!user) return false;

    if (user.accountType === 'PLATFORM') {
        // Block cross-domain matching: Platform accounts can only match PLATFORM_SUPER_ADMIN
        if (role !== 'PLATFORM_SUPER_ADMIN') return false;

        // Type-safe string comparison without `as` assertions
        return user.roles.some((r) => r === role);
    }

    if (user.accountType === 'SCHOOL') {
        // Block cross-domain matching: School accounts cannot authorize platform roles
        if (role === 'PLATFORM_SUPER_ADMIN') return false;

        // Type-safe string comparison without `as` assertions
        return user.roles.some((r) => r === role);
    }

    return false;
}

export function hasAnyRole(user: AuthenticatedUser | null, roles: (PlatformRole | SchoolRole)[]): boolean {
    if (!user || roles.length === 0) return false;
    return roles.some((role) => hasRole(user, role));
}

/**
 * Determines the most appropriate default dashboard route based on the user's highest priority role.
 */
export function getDefaultDashboard(user: AuthenticatedUser | null): string {
    if (!user) return '/login';

    if (user.accountType === 'PLATFORM') {
        return '/platform';
    }

    if (user.accountType === 'SCHOOL') {
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