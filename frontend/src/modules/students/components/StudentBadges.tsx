import React from 'react';
import type { SchoolRole } from '../../../types/auth';
import {
    formatStudentSourceLabel,
    formatStudentStatusLabel,
} from '../schemas/student-management-schema';
import type {
    StudentAccountStatus,
    StudentRegistrationSource,
} from '../types/student-management.types';

const STATUS_CLASSES: Readonly<Record<StudentAccountStatus, string>> = {
    PENDING_ACTIVATION: 'border-sky-200 bg-sky-50 text-sky-800',
    PENDING_APPROVAL: 'border-amber-200 bg-amber-50 text-amber-800',
    ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    SUSPENDED: 'border-red-200 bg-red-50 text-red-700',
    REJECTED: 'border-gray-300 bg-gray-100 text-gray-700',
};

const ROLE_LABELS: Readonly<Record<SchoolRole, string>> = {
    SCHOOL_ADMIN: 'School Admin',
    TEACHER: 'Teacher',
    STUDENT: 'Student',
    SCHOOL_ACCOUNTANT: 'Accountant',
};

const ROLE_CLASSES: Readonly<Record<SchoolRole, string>> = {
    SCHOOL_ADMIN: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    TEACHER: 'border-blue-200 bg-blue-50 text-blue-800',
    STUDENT: 'border-teal-200 bg-teal-50 text-teal-800',
    SCHOOL_ACCOUNTANT: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

export const StudentAccountStatusBadge: React.FC<{ status: StudentAccountStatus }> = ({
    status,
}) => {
    const classes = STATUS_CLASSES[status] ?? 'border-gray-200 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}
        >
            {formatStudentStatusLabel(status)}
        </span>
    );
};

export const StudentSchoolRoleBadge: React.FC<{ role: SchoolRole }> = ({ role }) => {
    const classes = ROLE_CLASSES[role] ?? 'border-gray-200 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${classes}`}
        >
            {ROLE_LABELS[role] ?? role}
        </span>
    );
};

export const MultiRoleAccountBadge: React.FC<{ roles: readonly SchoolRole[] }> = ({ roles }) => {
    if (roles.length <= 1) return null;

    return (
        <span
            title={`Preserved account roles: ${roles.map((r) => ROLE_LABELS[r] ?? r).join(', ')}`}
            className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-800"
        >
            Multi-Role ({roles.length})
        </span>
    );
};

export const StudentRegistrationSourceBadge: React.FC<{
    source?: StudentRegistrationSource;
}> = ({ source }) => {
    if (!source) return null;

    return (
        <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700">
            {formatStudentSourceLabel(source)}
        </span>
    );
};

