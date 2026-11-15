import type { PlatformRole, SchoolRole } from '../types/auth';
import {
    PLATFORM_PERMISSIONS,
    SCHOOL_ADMIN_ROUTE_PERMISSIONS,
    SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS,
    type PermissionKey,
    type PlatformPermissionKey,
} from './permissions';

export type AppRole = PlatformRole | SchoolRole;

export interface NavItem {
    label: string;
    path: string;
    end?: boolean;
    roles?: AppRole[];
    permission?: PermissionKey | PlatformPermissionKey;
    permissions?: (PermissionKey | PlatformPermissionKey)[];
    requireAll?: boolean;
    section?: string;
}

export interface SchoolAdminNavigationGroupDefinition {
    id:
        | 'OVERVIEW'
        | 'SCHOOL_SETUP'
        | 'PEOPLE_ACCESS'
        | 'ACADEMICS_ENROLLMENT'
        | 'COMMUNICATION_INSIGHTS'
        | 'SUPPORT_GOVERNANCE';
    label: string;
    plannedAreas: readonly string[];
}

export const SCHOOL_ADMIN_NAVIGATION_GROUPS: Readonly<
    Record<SchoolAdminNavigationGroupDefinition['id'], SchoolAdminNavigationGroupDefinition>
> = {
    OVERVIEW: {
        id: 'OVERVIEW',
        label: 'Overview',
        plannedAreas: ['School Admin Dashboard'],
    },
    SCHOOL_SETUP: {
        id: 'SCHOOL_SETUP',
        label: 'School Identity & Settings',
        plannedAreas: ['School Profile & Branding', 'School Website', 'School Settings'],
    },
    PEOPLE_ACCESS: {
        id: 'PEOPLE_ACCESS',
        label: 'People & Access',
        plannedAreas: ['School Administrators', 'Teachers & Permissions', 'Students'],
    },
    ACADEMICS_ENROLLMENT: {
        id: 'ACADEMICS_ENROLLMENT',
        label: 'Academics & Enrollment',
        plannedAreas: [
            'Academic Years, Terms, Classes & Sections',
            'Programs & Courses',
            'Student Enrollments & Approvals',
        ],
    },
    COMMUNICATION_INSIGHTS: {
        id: 'COMMUNICATION_INSIGHTS',
        label: 'Communication & Reports',
        plannedAreas: ['Announcements', 'School Reports & Analytics'],
    },
    SUPPORT_GOVERNANCE: {
        id: 'SUPPORT_GOVERNANCE',
        label: 'Support & Governance',
        plannedAreas: ['School Support', 'Activity & Audit Logs'],
    },
};

export interface SchoolAccountantNavigationGroupDefinition {
    id: 'OVERVIEW' | 'OPERATIONS' | 'REPORTS';
    label: string;
    plannedAreas: readonly string[];
}

export const SCHOOL_ACCOUNTANT_NAVIGATION_GROUPS: Readonly<
    Record<
        SchoolAccountantNavigationGroupDefinition['id'],
        SchoolAccountantNavigationGroupDefinition
    >
> = {
    OVERVIEW: {
        id: 'OVERVIEW',
        label: 'Overview',
        plannedAreas: ['Financial Dashboard'],
    },
    OPERATIONS: {
        id: 'OPERATIONS',
        label: 'Financial Operations',
        plannedAreas: ['Payment Verification', 'Student Financial Records'],
    },
    REPORTS: {
        id: 'REPORTS',
        label: 'Financial Insights',
        plannedAreas: ['Financial Reports'],
    },
};

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
    {
        label: 'Admin Dashboard',
        path: '/admin',
        end: true,
        roles: ['SCHOOL_ADMIN'],
        section: SCHOOL_ADMIN_NAVIGATION_GROUPS.OVERVIEW.label,
    },
    {
        label: 'School Profile',
        path: '/admin/profile',
        end: true,
        roles: ['SCHOOL_ADMIN'],
        permissions: [...SCHOOL_ADMIN_ROUTE_PERMISSIONS.PROFILE],
        section: SCHOOL_ADMIN_NAVIGATION_GROUPS.SCHOOL_SETUP.label,
    },
    {
        label: 'School Website',
        path: '/admin/website',
        end: true,
        roles: ['SCHOOL_ADMIN'],
        permissions: [...SCHOOL_ADMIN_ROUTE_PERMISSIONS.WEBSITE],
        section: SCHOOL_ADMIN_NAVIGATION_GROUPS.SCHOOL_SETUP.label,
    },
    {
        label: 'School Settings',
        path: '/admin/settings',
        end: true,
        roles: ['SCHOOL_ADMIN'],
        permissions: [...SCHOOL_ADMIN_ROUTE_PERMISSIONS.SETTINGS],
        section: SCHOOL_ADMIN_NAVIGATION_GROUPS.SCHOOL_SETUP.label,
    },
    {
        label: 'Staff & Administrators',
        path: '/admin/staff',
        end: true,
        roles: ['SCHOOL_ADMIN'],
        permissions: [...SCHOOL_ADMIN_ROUTE_PERMISSIONS.STAFF],
        section: SCHOOL_ADMIN_NAVIGATION_GROUPS.PEOPLE_ACCESS.label,
    },
    {
        label: 'Teachers',
        path: '/admin/teachers',
        end: true,
        roles: ['SCHOOL_ADMIN'],
        permissions: [...SCHOOL_ADMIN_ROUTE_PERMISSIONS.TEACHERS],
        section: SCHOOL_ADMIN_NAVIGATION_GROUPS.PEOPLE_ACCESS.label,
    },
    {
        label: 'Students',
        path: '/admin/students',
        end: true,
        roles: ['SCHOOL_ADMIN'],
        permissions: [...SCHOOL_ADMIN_ROUTE_PERMISSIONS.STUDENTS],
        section: SCHOOL_ADMIN_NAVIGATION_GROUPS.PEOPLE_ACCESS.label,
    },
    {
        label: 'Academic Structure',
        path: '/admin/academic-structure',
        end: true,
        roles: ['SCHOOL_ADMIN'],
        permissions: [...SCHOOL_ADMIN_ROUTE_PERMISSIONS.ACADEMIC_STRUCTURE],
        section: SCHOOL_ADMIN_NAVIGATION_GROUPS.ACADEMICS_ENROLLMENT.label,
    },
    {
        label: 'Programs & Courses',
        path: '/admin/programs-courses',
        end: true,
        roles: ['SCHOOL_ADMIN'],
        permissions: [...SCHOOL_ADMIN_ROUTE_PERMISSIONS.PROGRAMS_COURSES],
        section: SCHOOL_ADMIN_NAVIGATION_GROUPS.ACADEMICS_ENROLLMENT.label,
    },
    {
        label: 'Financial Oversight',
        path: '/admin/finance',
        end: true,
        roles: ['SCHOOL_ADMIN'],
        permissions: [...SCHOOL_ADMIN_ROUTE_PERMISSIONS.FINANCE],
        requireAll: true,
        section: SCHOOL_ADMIN_NAVIGATION_GROUPS.COMMUNICATION_INSIGHTS.label,
    },
    { label: 'Teacher Dashboard', path: '/teacher', end: true, roles: ['TEACHER'] },
    { label: 'Student Dashboard', path: '/student', end: true, roles: ['STUDENT'] },
    {
        label: 'Financial Dashboard',
        path: '/accountant',
        end: true,
        roles: ['SCHOOL_ACCOUNTANT'],
        section: SCHOOL_ACCOUNTANT_NAVIGATION_GROUPS.OVERVIEW.label,
    },
    {
        label: 'Payment Verification',
        path: '/accountant/payments',
        end: true,
        roles: ['SCHOOL_ACCOUNTANT'],
        permissions: [...SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS.PAYMENTS],
        section: SCHOOL_ACCOUNTANT_NAVIGATION_GROUPS.OPERATIONS.label,
    },
    {
        label: 'Student Financial Records',
        path: '/accountant/students',
        end: true,
        roles: ['SCHOOL_ACCOUNTANT'],
        permissions: [...SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS.STUDENTS],
        requireAll: true,
        section: SCHOOL_ACCOUNTANT_NAVIGATION_GROUPS.OPERATIONS.label,
    },
    {
        label: 'Financial Reports',
        path: '/accountant/reports',
        end: true,
        roles: ['SCHOOL_ACCOUNTANT'],
        permissions: [...SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS.REPORTS],
        section: SCHOOL_ACCOUNTANT_NAVIGATION_GROUPS.REPORTS.label,
    },
];