import type { PlatformRole, SchoolRole } from '../types/auth';
import { PLATFORM_PERMISSIONS, type PermissionKey, type PlatformPermissionKey } from './permissions';

export type AppRole = PlatformRole | SchoolRole;

export interface NavItem {
    label: string;
    path: string;
    end?: boolean;
    roles?: AppRole[];
    permission?: PermissionKey | PlatformPermissionKey;
    permissions?: (PermissionKey | PlatformPermissionKey)[];
    requireAll?: boolean;
}

export const PLATFORM_NAVIGATION_ITEMS: NavItem[] = [
    { label: 'Platform Dashboard', path: '/dashboard', end: true, roles: ['PLATFORM_ADMIN'] },
    {
        label: 'Schools / Tenants',
        path: '/dashboard/tenants',
        roles: ['PLATFORM_ADMIN'],
        permission: PLATFORM_PERMISSIONS.TENANTS_MANAGE,
    },
    {
        label: 'Domain Management',
        path: '/dashboard/domains',
        roles: ['PLATFORM_ADMIN'],
        permission: PLATFORM_PERMISSIONS.DOMAINS_MANAGE,
    },
    {
        label: 'School Onboarding',
        path: '/dashboard/onboarding',
        roles: ['PLATFORM_ADMIN'],
        permission: PLATFORM_PERMISSIONS.ONBOARDING_MANAGE,
    },
    {
        label: 'Platform Administrators',
        path: '/dashboard/administrators',
        roles: ['PLATFORM_ADMIN'],
        permission: PLATFORM_PERMISSIONS.ADMINS_MANAGE,
    },
    {
        label: 'Platform Settings',
        path: '/dashboard/settings',
        roles: ['PLATFORM_ADMIN'],
        permission: PLATFORM_PERMISSIONS.SETTINGS_MANAGE,
    },
    {
        label: 'Audit Logs',
        path: '/dashboard/audit-logs',
        roles: ['PLATFORM_ADMIN'],
        permission: PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW,
    },
    {
        label: 'System Monitoring',
        path: '/dashboard/monitoring',
        roles: ['PLATFORM_ADMIN'],
        permission: PLATFORM_PERMISSIONS.MONITORING_ACCESS,
    },
    {
        label: 'Support Management',
        path: '/dashboard/support',
        roles: ['PLATFORM_ADMIN'],
        permission: PLATFORM_PERMISSIONS.SUPPORT_MANAGE,
    },
];

export const SCHOOL_NAVIGATION_ITEMS: NavItem[] = [
    { label: 'Home', path: '/', end: true },
    { label: 'Admin Dashboard', path: '/admin', roles: ['SCHOOL_ADMIN'] },
    { label: 'Teacher Dashboard', path: '/teacher', roles: ['TEACHER'] },
    { label: 'Student Dashboard', path: '/student', roles: ['STUDENT'] },
    { label: 'Accountant Dashboard', path: '/accountant', roles: ['SCHOOL_ACCOUNTANT'] },
];