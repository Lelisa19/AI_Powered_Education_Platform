import React from 'react';
import type {
    SchoolStaffAccountStatus,
    SchoolStaffInvitationStatus,
    SchoolStaffRole,
} from '../types/school-staff.types';
import { formatStaffRoleLabel } from '../utils/school-staff-formatters';

const ROLE_BADGE_CLASSES: Record<SchoolStaffRole, string> = {
    SCHOOL_ADMIN: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    TEACHER: 'border-blue-200 bg-blue-50 text-blue-800',
    SCHOOL_ACCOUNTANT: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const INVITATION_STATUS_CONFIG: Record<
    SchoolStaffInvitationStatus,
    { label: string; classes: string }
> = {
    PENDING: {
        label: 'Pending Invitation',
        classes: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    ACCEPTED: {
        label: 'Accepted',
        classes: 'border-green-200 bg-green-50 text-green-700',
    },
    EXPIRED: {
        label: 'Expired',
        classes: 'border-gray-200 bg-gray-100 text-gray-700',
    },
    REVOKED: {
        label: 'Revoked',
        classes: 'border-red-200 bg-red-50 text-red-700',
    },
};

export const StaffRoleBadge: React.FC<{ role: SchoolStaffRole }> = ({ role }) => {
    const classes = ROLE_BADGE_CLASSES[role] ?? 'border-gray-200 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
        >
            {formatStaffRoleLabel(role)}
        </span>
    );
};

export const StaffAccountStatusBadge: React.FC<{
    status: SchoolStaffAccountStatus;
    isPrimaryAdmin?: boolean;
}> = ({ status, isPrimaryAdmin }) => {
    const isActive = status === 'ACTIVE';

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    isActive
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                }`}
            >
                {isActive ? 'Active' : 'Inactive'}
            </span>
            {isPrimaryAdmin && (
                <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    Primary Admin
                </span>
            )}
        </div>
    );
};

export const StaffInvitationStatusBadge: React.FC<{ status: SchoolStaffInvitationStatus }> = ({
    status,
}) => {
    const config = INVITATION_STATUS_CONFIG[status] ?? {
        label: status,
        classes: 'border-gray-200 bg-gray-100 text-gray-700',
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.classes}`}
        >
            {config.label}
        </span>
    );
};

