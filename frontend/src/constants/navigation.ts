import type { PlatformRole, SchoolRole } from '../types/auth';
import type { PermissionKey } from './permissions';

export type AppRole = PlatformRole | SchoolRole;

export interface NavItem {
    label: string;
    path: string;
    roles?: AppRole[];
    permission?: PermissionKey;
    permissions?: PermissionKey[];
    requireAll?: boolean;
}

export const NAVIGATION_ITEMS: NavItem[] = [
    { label: 'Home', path: '/' },
    { label: 'Platform Dashboard', path: '/platform', roles: ['PLATFORM_SUPER_ADMIN'] },
    { label: 'Admin Dashboard', path: '/admin', roles: ['SCHOOL_ADMIN'] },
    { label: 'Teacher Dashboard', path: '/teacher', roles: ['TEACHER'] },
    { label: 'Student Dashboard', path: '/student', roles: ['STUDENT'] },
    { label: 'Accountant Dashboard', path: '/accountant', roles: ['SCHOOL_ACCOUNTANT'] },
];