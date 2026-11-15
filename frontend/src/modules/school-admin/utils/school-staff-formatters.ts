import { PERMISSIONS } from '../../../constants/permissions';
import {
    SCHOOL_STAFF_ROLES,
    type SchoolStaffAccount,
    type SchoolStaffInvitation,
    type SchoolStaffRole,
} from '../types/school-staff.types';

const STAFF_ROLE_LABELS: Record<SchoolStaffRole, string> = {
    SCHOOL_ADMIN: 'School Admin',
    TEACHER: 'Teacher',
    SCHOOL_ACCOUNTANT: 'School Accountant',
};

const STAFF_ROLE_DESCRIPTIONS: Record<SchoolStaffRole, string> = {
    SCHOOL_ADMIN: 'School-level operational, staff, student, and academic administration.',
    TEACHER: 'Course delivery, grading, assignments, assessments, and class attendance.',
    SCHOOL_ACCOUNTANT: 'Tuition billing, fee verification, receipts, and school financial records.',
};

export function formatStaffRoleLabel(role: SchoolStaffRole | string): string {
    return STAFF_ROLE_LABELS[role as SchoolStaffRole] ?? role;
}

export function formatStaffRoleDescription(role: SchoolStaffRole): string {
    return STAFF_ROLE_DESCRIPTIONS[role];
}

export function formatStaffFullName(
    firstName?: string | null,
    lastName?: string | null,
    fallbackEmail?: string
): string {
    const combined = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    if (combined) return combined;
    return fallbackEmail || 'Staff Member';
}

export function formatStaffDate(value?: string | null): string {
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

export function formatStaffDateTime(value?: string | null): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export type PermissionCheckFn = (permission: string) => boolean;
export type AnyPermissionCheckFn = (permissions: string[]) => boolean;

export function canActorInviteStaffRole(
    role: SchoolStaffRole,
    hasPermission: PermissionCheckFn,
    hasAnyPermission: AnyPermissionCheckFn
): boolean {
    if (role === 'SCHOOL_ADMIN') {
        return hasPermission(PERMISSIONS.SCHOOL_ADMINS.INVITE);
    }
    if (role === 'TEACHER') {
        return hasAnyPermission([PERMISSIONS.TEACHERS.INVITE, PERMISSIONS.TEACHERS.CREATE]);
    }
    if (role === 'SCHOOL_ACCOUNTANT') {
        return hasPermission(PERMISSIONS.USERS.CREATE);
    }
    return false;
}

export function getActorInvitableStaffRoles(
    hasPermission: PermissionCheckFn,
    hasAnyPermission: AnyPermissionCheckFn
): SchoolStaffRole[] {
    return SCHOOL_STAFF_ROLES.filter((role) =>
        canActorInviteStaffRole(role, hasPermission, hasAnyPermission)
    );
}

export function canActorResendStaffInvitation(
    invitation: Pick<SchoolStaffInvitation, 'role' | 'status'>,
    hasPermission: PermissionCheckFn,
    hasAnyPermission: AnyPermissionCheckFn
): boolean {
    if (invitation.status !== 'PENDING' && invitation.status !== 'EXPIRED') {
        return false;
    }
    return canActorInviteStaffRole(invitation.role, hasPermission, hasAnyPermission);
}

export function canActorRevokeStaffInvitation(
    invitation: Pick<SchoolStaffInvitation, 'role' | 'status'>,
    hasPermission: PermissionCheckFn,
    hasAnyPermission: AnyPermissionCheckFn
): boolean {
    if (invitation.status !== 'PENDING') {
        return false;
    }
    if (invitation.role === 'SCHOOL_ADMIN') {
        return hasPermission(PERMISSIONS.SCHOOL_ADMINS.REVOKE_INVITATION);
    }
    if (invitation.role === 'TEACHER') {
        return hasAnyPermission([PERMISSIONS.TEACHERS.INVITE, PERMISSIONS.TEACHERS.UPDATE]);
    }
    if (invitation.role === 'SCHOOL_ACCOUNTANT') {
        return hasAnyPermission([PERMISSIONS.USERS.CREATE, PERMISSIONS.USERS.UPDATE]);
    }
    return false;
}

export interface StaffStatusToggleEligibility {
    allowed: boolean;
    reason?: string;
}

/**
 * Evaluates UI action eligibility for toggling a staff account's active/inactive status.
 * Fails closed when permission, self-protection, or backend mutability checks fail.
 */
export function evaluateStaffStatusToggleEligibility(
    target: Pick<SchoolStaffAccount, 'id' | 'roles' | 'isPrimaryAdmin' | 'canManageStatus'>,
    actorId: string | null,
    hasPermission: PermissionCheckFn,
    hasAnyPermission: AnyPermissionCheckFn
): StaffStatusToggleEligibility {
    if (actorId && target.id === actorId) {
        return {
            allowed: false,
            reason: 'You cannot disable or change the status of your own account.',
        };
    }

    if (target.isPrimaryAdmin) {
        return {
            allowed: false,
            reason: 'Primary School Admin account lifecycle authority is protected and governed by backend policy.',
        };
    }

    if (target.canManageStatus === false) {
        return {
            allowed: false,
            reason: 'This account status cannot be modified under your current authority.',
        };
    }

    if (target.roles.includes('SCHOOL_ADMIN') && !hasPermission(PERMISSIONS.SCHOOL_ADMINS.DISABLE)) {
        return {
            allowed: false,
            reason: `Requires ${PERMISSIONS.SCHOOL_ADMINS.DISABLE} permission.`,
        };
    }

    if (
        target.roles.includes('SCHOOL_ACCOUNTANT') &&
        !hasPermission(PERMISSIONS.USERS.DISABLE)
    ) {
        return {
            allowed: false,
            reason: `Requires ${PERMISSIONS.USERS.DISABLE} permission.`,
        };
    }

    if (
        target.roles.includes('TEACHER') &&
        !hasAnyPermission([PERMISSIONS.TEACHERS.DISABLE, PERMISSIONS.USERS.DISABLE])
    ) {
        return {
            allowed: false,
            reason: `Requires ${PERMISSIONS.TEACHERS.DISABLE} or ${PERMISSIONS.USERS.DISABLE} permission.`,
        };
    }

    return { allowed: true };
}

