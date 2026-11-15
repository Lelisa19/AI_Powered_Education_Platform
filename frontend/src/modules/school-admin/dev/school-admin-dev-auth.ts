import {
    ALL_SCHOOL_PERMISSIONS,
    PERMISSIONS,
    type PermissionKey,
} from '../../../constants/permissions';
import type { LoginRequest } from '../../../services/auth-service';
import {
    parseAuthenticatedUser,
    type SchoolAuthenticatedUser,
    type SchoolRole,
} from '../../../types/auth';

export const DEV_SCHOOL_SESSION_STORAGE_KEY = 'eduplatform.dev.school_admin_account_id';
export const DEV_SCHOOL_TENANT_ID = 'dev-school-tenant-001';

export interface DevSchoolAdminFixture {
    readonly id: string;
    readonly email: string;
    readonly password: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly tenantId: string;
    readonly roles: readonly SchoolRole[];
    readonly permissions: readonly PermissionKey[];
    readonly label: string;
    readonly description: string;
}

const RESTRICTED_EXCLUDED_PERMISSIONS = new Set<string>([
    PERMISSIONS.REPORTS.READ,
    PERMISSIONS.PAYMENTS.READ,
]);

const RESTRICTED_PERMISSIONS: readonly PermissionKey[] = ALL_SCHOOL_PERMISSIONS.filter(
    (perm) => !RESTRICTED_EXCLUDED_PERMISSIONS.has(perm)
);

export const DEV_SCHOOL_ADMIN_FIXTURES: readonly DevSchoolAdminFixture[] = [
    {
        id: 'dev-school-full-admin',
        email: 'admin@school.local.test',
        password: 'LocalSchoolAdmin2026!',
        firstName: 'School',
        lastName: 'Admin',
        tenantId: DEV_SCHOOL_TENANT_ID,
        roles: ['SCHOOL_ADMIN'],
        permissions: [...ALL_SCHOOL_PERMISSIONS],
        label: 'Full School Admin',
        description: 'Full administrative access across all school modules and financial oversight.',
    },
    {
        id: 'dev-school-restricted-admin',
        email: 'restricted@school.local.test',
        password: 'LocalRestrictedAdmin2026!',
        firstName: 'Restricted',
        lastName: 'Admin',
        tenantId: DEV_SCHOOL_TENANT_ID,
        roles: ['SCHOOL_ADMIN'],
        permissions: RESTRICTED_PERMISSIONS,
        label: 'Restricted School Admin',
        description: 'School admin without financial permissions (lacks reports.read and payments.read).',
    },
];

const ACCOUNTANT_PERMISSIONS: readonly PermissionKey[] = [
    PERMISSIONS.PAYMENTS.READ,
    PERMISSIONS.PAYMENTS.CREATE,
    PERMISSIONS.PAYMENTS.VERIFY,
    PERMISSIONS.PAYMENTS.REJECT,
    PERMISSIONS.REPORTS.READ,
    PERMISSIONS.REPORTS.EXPORT,
    PERMISSIONS.STUDENTS.READ,
];

export const DEV_SCHOOL_ACCOUNTANT_FIXTURE: DevSchoolAdminFixture = {
    id: 'dev-school-accountant',
    email: 'accountant@school.local.test',
    password: 'LocalAccountant2026!',
    firstName: 'School',
    lastName: 'Accountant',
    tenantId: DEV_SCHOOL_TENANT_ID,
    roles: ['SCHOOL_ACCOUNTANT'],
    permissions: ACCOUNTANT_PERMISSIONS,
    label: 'School Accountant',
    description: 'School financial management, payment verification, student balances, and financial reporting.',
};

export const ALL_DEV_SCHOOL_FIXTURES: readonly DevSchoolAdminFixture[] = [
    ...DEV_SCHOOL_ADMIN_FIXTURES,
    DEV_SCHOOL_ACCOUNTANT_FIXTURE,
];

function assertDevelopmentMode(): void {
    if (!import.meta.env.DEV) {
        throw new Error('Development authentication is only available in development mode.');
    }
}

function buildValidatedProfile(fixture: DevSchoolAdminFixture): SchoolAuthenticatedUser {
    const parsed = parseAuthenticatedUser({
        id: fixture.id,
        email: fixture.email,
        firstName: fixture.firstName,
        lastName: fixture.lastName,
        accountType: 'SCHOOL',
        tenantId: fixture.tenantId,
        roles: [...fixture.roles],
        permissions: [...fixture.permissions],
    });

    if (parsed.accountType !== 'SCHOOL') {
        throw new Error('Development authentication profile must be a SCHOOL account.');
    }

    return parsed;
}

function readStoredAccountId(): string | null {
    if (typeof window === 'undefined') return null;

    try {
        return window.sessionStorage.getItem(DEV_SCHOOL_SESSION_STORAGE_KEY);
    } catch {
        return null;
    }
}

function writeStoredAccountId(accountId: string): void {
    if (typeof window === 'undefined') return;

    try {
        window.sessionStorage.setItem(DEV_SCHOOL_SESSION_STORAGE_KEY, accountId);
    } catch {
        // Ignore storage write errors in restricted browser contexts.
    }
}

export function clearDevSchoolAdminSession(): void {
    if (typeof window === 'undefined') return;

    try {
        window.sessionStorage.removeItem(DEV_SCHOOL_SESSION_STORAGE_KEY);
    } catch {
        // Ignore storage removal errors in restricted browser contexts.
    }
}

export function getStoredDevSchoolAdminSession(
    expectedTenantId?: string | null
): SchoolAuthenticatedUser | null {
    if (!import.meta.env.DEV) {
        return null;
    }

    const storedId = readStoredAccountId();
    if (!storedId) {
        return null;
    }

    const fixture = ALL_DEV_SCHOOL_FIXTURES.find((item) => item.id === storedId);
    if (!fixture) {
        clearDevSchoolAdminSession();
        return null;
    }

    if (expectedTenantId && fixture.tenantId !== expectedTenantId) {
        clearDevSchoolAdminSession();
        return null;
    }

    return buildValidatedProfile(fixture);
}

export function authenticateDevSchoolAdmin(
    credentials: LoginRequest,
    expectedTenantId?: string | null
): SchoolAuthenticatedUser {
    assertDevelopmentMode();

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const fixture = ALL_DEV_SCHOOL_FIXTURES.find(
        (item) => item.email === normalizedEmail && item.password === credentials.password
    );

    if (!fixture) {
        throw new Error('Invalid email or password.');
    }

    if (expectedTenantId && fixture.tenantId !== expectedTenantId) {
        throw new Error("Access Denied: This account does not belong to this school's domain.");
    }

    const validatedUser = buildValidatedProfile(fixture);
    writeStoredAccountId(validatedUser.id);
    return validatedUser;
}

