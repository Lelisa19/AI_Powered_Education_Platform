import { useCallback } from 'react';
import { useAuth } from './useAuth';
import type { PlatformRole, SchoolRole } from '../types/auth';
import * as authUtils from '../utils/authorization';

export function usePermissions() {
    const { user } = useAuth();

    const hasPermission = useCallback(
        (permission: string) => authUtils.hasPermission(user, permission),
        [user]
    );

    const hasAnyPermission = useCallback(
        (permissions: string[]) => authUtils.hasAnyPermission(user, permissions),
        [user]
    );

    const hasAllPermissions = useCallback(
        (permissions: string[]) => authUtils.hasAllPermissions(user, permissions),
        [user]
    );

    const hasRole = useCallback(
        (role: PlatformRole | SchoolRole) => authUtils.hasRole(user, role),
        [user]
    );

    const hasAnyRole = useCallback(
        (roles: (PlatformRole | SchoolRole)[]) => authUtils.hasAnyRole(user, roles),
        [user]
    );

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole,
        isPlatformAdmin: user?.accountType === 'PLATFORM',
        isSchoolUser: user?.accountType === 'SCHOOL',
    };
}