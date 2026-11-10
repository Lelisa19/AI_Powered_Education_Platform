import { ALL_PLATFORM_PERMISSIONS, PLATFORM_PERMISSIONS } from '../../../constants/permissions';
import type { LoginRequest } from '../../../services/auth-service';
import { parseAuthenticatedUser, type PlatformAuthenticatedUser } from '../../../types/auth';

const DEV_SESSION_STORAGE_KEY = 'eduplatform.dev.platform_admin_account_id';

interface DevPlatformAdminFixture {
    readonly id: string;
    readonly email: string;
    readonly password: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly isSuperAdmin: boolean;
    readonly restrictedPermissions?: readonly string[];
}

const DEV_PLATFORM_ADMIN_FIXTURES: readonly DevPlatformAdminFixture[] = [
    {
        id: 'dev-platform-super-admin',
        email: 'superadmin@local.test',
        password: 'LocalSuperAdmin2026!',
        firstName: 'Super',
        lastName: 'Admin',
        isSuperAdmin: true,
    },
    {
        id: 'dev-platform-invited-admin',
        email: 'admin@local.test',
        password: 'LocalAdmin2026!',
        firstName: 'Invited',
        lastName: 'Admin',
        isSuperAdmin: false,
        restrictedPermissions: [
            PLATFORM_PERMISSIONS.ADMINS_MANAGE,
            PLATFORM_PERMISSIONS.SETTINGS_MANAGE,
        ],
    },
];

function assertDevelopmentMode(): void {
    if (!import.meta.env.DEV) {
        throw new Error('Development authentication is only available in development mode.');
    }
}

function buildValidatedProfile(fixture: DevPlatformAdminFixture): PlatformAuthenticatedUser {
    const parsed = parseAuthenticatedUser({
        id: fixture.id,
        email: fixture.email,
        firstName: fixture.firstName,
        lastName: fixture.lastName,
        accountType: 'PLATFORM',
        tenantId: null,
        roles: ['PLATFORM_ADMIN'],
        isSuperAdmin: fixture.isSuperAdmin,
        permissions: [...ALL_PLATFORM_PERMISSIONS],
        ...(fixture.restrictedPermissions !== undefined
            ? { restrictedPermissions: [...fixture.restrictedPermissions] }
            : {}),
    });

    if (parsed.accountType !== 'PLATFORM') {
        throw new Error('Development authentication profile must be a PLATFORM account.');
    }

    return parsed;
}

function readStoredAccountId(): string | null {
    if (typeof window === 'undefined') return null;

    try {
        return window.sessionStorage.getItem(DEV_SESSION_STORAGE_KEY);
    } catch {
        return null;
    }
}

function writeStoredAccountId(accountId: string): void {
    if (typeof window === 'undefined') return;

    try {
        window.sessionStorage.setItem(DEV_SESSION_STORAGE_KEY, accountId);
    } catch {
        // Ignore storage write errors in restricted browser contexts.
    }
}

export function clearDevPlatformAdminSession(): void {
    if (typeof window === 'undefined') return;

    try {
        window.sessionStorage.removeItem(DEV_SESSION_STORAGE_KEY);
    } catch {
        // Ignore storage removal errors in restricted browser contexts.
    }
}

export function getStoredDevPlatformAdminSession(): PlatformAuthenticatedUser | null {
    if (!import.meta.env.DEV) {
        return null;
    }

    const storedId = readStoredAccountId();
    if (!storedId) {
        return null;
    }

    const fixture = DEV_PLATFORM_ADMIN_FIXTURES.find((item) => item.id === storedId);
    if (!fixture) {
        clearDevPlatformAdminSession();
        return null;
    }

    return buildValidatedProfile(fixture);
}

export function authenticateDevPlatformAdmin(credentials: LoginRequest): PlatformAuthenticatedUser {
    assertDevelopmentMode();

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const fixture = DEV_PLATFORM_ADMIN_FIXTURES.find(
        (item) => item.email === normalizedEmail && item.password === credentials.password
    );

    if (!fixture) {
        throw new Error('Invalid email or password.');
    }

    const validatedUser = buildValidatedProfile(fixture);
    // Persist only the non-sensitive fixture identifier for refresh persistence; never store passwords.
    writeStoredAccountId(validatedUser.id);
    return validatedUser;
}

