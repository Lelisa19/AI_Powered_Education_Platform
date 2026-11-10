import {
    ALL_PLATFORM_PERMISSIONS,
    type PlatformPermissionKey,
} from '../../../constants/permissions';
import type { PlatformAdminAccount } from '../types/platform-admin.types';

export function computeEffectiveAdminPermissions(
    admin: Pick<PlatformAdminAccount, 'isSuperAdmin' | 'restrictedPermissions'>
): PlatformPermissionKey[] {
    if (admin.isSuperAdmin) {
        return [...ALL_PLATFORM_PERMISSIONS];
    }

    const restrictedSet = new Set<PlatformPermissionKey>(admin.restrictedPermissions ?? []);
    return ALL_PLATFORM_PERMISSIONS.filter((permission) => !restrictedSet.has(permission));
}

export function formatPlatformAdminName(
    firstName?: string | null,
    lastName?: string | null,
    fallbackEmail?: string
): string {
    const combined = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    if (combined) return combined;
    return fallbackEmail || 'Administrator';
}

export function formatPlatformAdminDate(value?: string | null): string {
    if (!value) return '—';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

