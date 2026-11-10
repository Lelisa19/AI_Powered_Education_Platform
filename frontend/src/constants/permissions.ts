export const PERMISSIONS = {
    STUDENTS: {
        READ: 'students.read',
        CREATE: 'students.create',
        UPDATE: 'students.update',
        DELETE: 'students.delete',
    },
    TEACHERS: {
        READ: 'teachers.read',
        CREATE: 'teachers.create',
        UPDATE: 'teachers.update',
        DELETE: 'teachers.delete',
    },
    COURSES: {
        READ: 'courses.read',
        CREATE: 'courses.create',
        UPDATE: 'courses.update',
        DELETE: 'courses.delete',
    },
    PROGRAMS: {
        READ: 'programs.read',
        CREATE: 'programs.create',
        UPDATE: 'programs.update',
        DELETE: 'programs.delete',
    },
    ENROLLMENTS: {
        READ: 'enrollments.read',
        CREATE: 'enrollments.create',
        UPDATE: 'enrollments.update',
        CANCEL: 'enrollments.cancel',
    },
    PAYMENTS: {
        READ: 'payments.read',
        CREATE: 'payments.create',
        VERIFY: 'payments.verify',
        REJECT: 'payments.reject',
        REFUND: 'payments.refund',
    },
    REPORTS: {
        READ: 'reports.read',
        EXPORT: 'reports.export',
    },
    ATTENDANCE: {
        READ: 'attendance.read',
        CREATE: 'attendance.create',
        UPDATE: 'attendance.update',
    },
    ASSIGNMENTS: {
        READ: 'assignments.read',
        CREATE: 'assignments.create',
        UPDATE: 'assignments.update',
        DELETE: 'assignments.delete',
        GRADE: 'assignments.grade',
    },
    ASSESSMENTS: {
        READ: 'assessments.read',
        CREATE: 'assessments.create',
        UPDATE: 'assessments.update',
        DELETE: 'assessments.delete',
        GRADE: 'assessments.grade',
    },
    SETTINGS: {
        READ: 'settings.read',
        UPDATE: 'settings.update',
    },
    USERS: {
        READ: 'users.read',
        CREATE: 'users.create',
        UPDATE: 'users.update',
        DISABLE: 'users.disable',
    },
    ROLES: {
        READ: 'roles.read',
        MANAGE: 'roles.manage',
    },
} as const;

// Utility type to extract all leaf node string values from the PERMISSIONS object
export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS][keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]];

export const PLATFORM_PERMISSIONS = {
    ADMINS_MANAGE: 'platform.admins.manage',
    TENANTS_MANAGE: 'platform.tenants.manage',
    ONBOARDING_MANAGE: 'platform.onboarding.manage',
    DOMAINS_MANAGE: 'platform.domains.manage',
    SETTINGS_MANAGE: 'platform.settings.manage',
    AUDIT_LOGS_VIEW: 'platform.audit_logs.view',
    SUPPORT_MANAGE: 'platform.support.manage',
    MONITORING_ACCESS: 'platform.monitoring.access',
} as const;

export type PlatformPermissionKey =
    typeof PLATFORM_PERMISSIONS[keyof typeof PLATFORM_PERMISSIONS];

export const ALL_PLATFORM_PERMISSIONS: readonly PlatformPermissionKey[] =
    Object.values(PLATFORM_PERMISSIONS);

const PLATFORM_PERMISSION_SET = new Set<string>(ALL_PLATFORM_PERMISSIONS);

export function isPlatformPermissionKey(permission: unknown): permission is PlatformPermissionKey {
    return typeof permission === 'string' && PLATFORM_PERMISSION_SET.has(permission);
}

export type PlatformPermissionArrayValidationResult =
    | { valid: true; keys: PlatformPermissionKey[] }
    | { valid: false; reason: 'NOT_ARRAY' | 'INVALID_KEY' | 'DUPLICATE' };

export function validatePlatformPermissionArray(
    value: unknown
): PlatformPermissionArrayValidationResult {
    if (!Array.isArray(value)) {
        return { valid: false, reason: 'NOT_ARRAY' };
    }

    const seen = new Set<string>();
    const validated: PlatformPermissionKey[] = [];

    for (const item of value) {
        if (!isPlatformPermissionKey(item)) {
            return { valid: false, reason: 'INVALID_KEY' };
        }
        if (seen.has(item)) {
            return { valid: false, reason: 'DUPLICATE' };
        }
        seen.add(item);
        validated.push(item);
    }

    return { valid: true, keys: validated };
}

export interface PlatformPermissionDefinition {
    key: PlatformPermissionKey;
    label: string;
    description: string;
}

export const PLATFORM_PERMISSION_DEFINITIONS: readonly PlatformPermissionDefinition[] = [
    {
        key: PLATFORM_PERMISSIONS.ADMINS_MANAGE,
        label: 'Manage Platform Administrators',
        description: 'Invite platform administrators, revoke invitations, and manage administrator status.',
    },
    {
        key: PLATFORM_PERMISSIONS.TENANTS_MANAGE,
        label: 'Manage School Tenants',
        description: 'Provision, view, activate, and deactivate school tenant accounts.',
    },
    {
        key: PLATFORM_PERMISSIONS.ONBOARDING_MANAGE,
        label: 'Manage School Onboarding',
        description: 'Review and guide initial school onboarding and primary admin activation.',
    },
    {
        key: PLATFORM_PERMISSIONS.DOMAINS_MANAGE,
        label: 'Manage Domains',
        description: 'Configure and verify custom and subdomain mappings for school tenants.',
    },
    {
        key: PLATFORM_PERMISSIONS.SETTINGS_MANAGE,
        label: 'Manage Platform Settings',
        description: 'Configure global platform operational settings and defaults.',
    },
    {
        key: PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW,
        label: 'View Audit Logs',
        description: 'Inspect platform-wide administrative activity and security audit logs.',
    },
    {
        key: PLATFORM_PERMISSIONS.SUPPORT_MANAGE,
        label: 'Manage Support Operations',
        description: 'Handle platform support inquiries and tenant operational assistance.',
    },
    {
        key: PLATFORM_PERMISSIONS.MONITORING_ACCESS,
        label: 'Access System Monitoring',
        description: 'View platform health status, service metrics, and operational diagnostics.',
    },
];
