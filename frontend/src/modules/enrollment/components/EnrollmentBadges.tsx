import React from 'react';
import {
    formatEnrollmentStatusLabel,
    formatEnrollmentTypeLabel,
    formatProgramChangeStatusLabel,
} from '../schemas/enrollment-schema';
import type {
    EnrollmentLifecycleStatus,
    EnrollmentType,
    ProgramChangeRequestStatus,
} from '../types/enrollment.types';

const STATUS_CLASSES: Readonly<Record<EnrollmentLifecycleStatus, string>> = {
    PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
    ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    SUSPENDED: 'border-red-200 bg-red-50 text-red-700',
    COMPLETED: 'border-blue-200 bg-blue-50 text-blue-800',
    WITHDRAWN: 'border-gray-300 bg-gray-100 text-gray-700',
    REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
};

const TYPE_CLASSES: Readonly<Record<EnrollmentType, string>> = {
    GRADE_BASED_PROGRAM: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    SKILL_BASED_PROGRAM: 'border-teal-200 bg-teal-50 text-teal-800',
    STANDALONE_COURSE: 'border-violet-200 bg-violet-50 text-violet-800',
};

export const EnrollmentStatusBadge: React.FC<{ status: EnrollmentLifecycleStatus }> = ({
    status,
}) => {
    const classes = STATUS_CLASSES[status] ?? 'border-gray-200 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}
        >
            {formatEnrollmentStatusLabel(status)}
        </span>
    );
};

export const EnrollmentTypeBadge: React.FC<{ type: EnrollmentType }> = ({ type }) => {
    const classes = TYPE_CLASSES[type] ?? 'border-gray-200 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${classes}`}
        >
            {formatEnrollmentTypeLabel(type)}
        </span>
    );
};

const PROGRAM_CHANGE_STATUS_CLASSES: Readonly<Record<ProgramChangeRequestStatus, string>> = {
    PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
    APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const ProgramChangeStatusBadge: React.FC<{
    status: ProgramChangeRequestStatus;
}> = ({ status }) => {
    const classes =
        PROGRAM_CHANGE_STATUS_CLASSES[status] ?? 'border-gray-200 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}
        >
            {formatProgramChangeStatusLabel(status)}
        </span>
    );
};

