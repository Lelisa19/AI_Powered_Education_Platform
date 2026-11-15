import React from 'react';
import { formatCalendarStatusLabel } from '../schemas/academic-structure-schema';
import type {
    AcademicCalendarStatus,
    AcademicUnitStatus,
} from '../types/academic-structure.types';

const CALENDAR_STATUS_BADGE_CLASSES: Readonly<Record<AcademicCalendarStatus, string>> = {
    PLANNED: 'border-slate-300 bg-slate-100 text-slate-700',
    ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    COMPLETED: 'border-blue-200 bg-blue-50 text-blue-800',
    ARCHIVED: 'border-gray-300 bg-gray-100 text-gray-600',
};

const UNIT_STATUS_CONFIG: Readonly<Record<AcademicUnitStatus, { label: string; classes: string }>> =
    {
        ACTIVE: {
            label: 'Active',
            classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        },
        INACTIVE: {
            label: 'Inactive',
            classes: 'border-gray-300 bg-gray-100 text-gray-700',
        },
    };

export const AcademicCalendarStatusBadge: React.FC<{ status: AcademicCalendarStatus }> = ({
    status,
}) => {
    const classes =
        CALENDAR_STATUS_BADGE_CLASSES[status] ?? 'border-gray-300 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}
        >
            {formatCalendarStatusLabel(status)}
        </span>
    );
};

export const AcademicUnitStatusBadge: React.FC<{ status: AcademicUnitStatus }> = ({ status }) => {
    const cfg = UNIT_STATUS_CONFIG[status] ?? {
        label: status,
        classes: 'border-gray-300 bg-gray-100 text-gray-700',
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}
        >
            {cfg.label}
        </span>
    );
};
