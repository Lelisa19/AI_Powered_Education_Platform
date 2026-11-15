import React from 'react';
import type { PaginationMeta } from '../../../types/api.types';
import {
    formatOfferingStatusLabel,
    formatProgramTypeLabel,
} from '../schemas/programs-courses-schema';
import type { OfferingLifecycleStatus, ProgramType } from '../types/programs-courses.types';

const STATUS_BADGE_CLASSES: Readonly<Record<OfferingLifecycleStatus, string>> = {
    ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    INACTIVE: 'border-gray-300 bg-gray-100 text-gray-700',
    ARCHIVED: 'border-amber-200 bg-amber-50 text-amber-800',
};

const PROGRAM_TYPE_BADGE_CLASSES: Readonly<Record<ProgramType, string>> = {
    GRADE_BASED: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    SKILL_BASED: 'border-purple-200 bg-purple-50 text-purple-800',
};

export const OfferingLifecycleBadge: React.FC<{ status: OfferingLifecycleStatus }> = ({
    status,
}) => {
    const classes = STATUS_BADGE_CLASSES[status] ?? 'border-gray-300 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}
        >
            {formatOfferingStatusLabel(status)}
        </span>
    );
};

export const ProgramTypeBadge: React.FC<{ programType: ProgramType }> = ({ programType }) => {
    const classes =
        PROGRAM_TYPE_BADGE_CLASSES[programType] ?? 'border-gray-300 bg-gray-100 text-gray-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
        >
            {formatProgramTypeLabel(programType)}
        </span>
    );
};

export const StandaloneEligibilityBadge: React.FC<{ allowStandalone: boolean }> = ({
    allowStandalone,
}) => {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                allowStandalone
                    ? 'border-teal-200 bg-teal-50 text-teal-800'
                    : 'border-slate-200 bg-slate-100 text-slate-700'
            }`}
        >
            {allowStandalone ? 'Standalone Eligible' : 'Program-Only'}
        </span>
    );
};

interface CatalogPaginationBarProps {
    pagination: PaginationMeta | null;
    isLoading: boolean;
    itemLabel: string;
    onPageChange: (nextPage: number) => void;
}

export const CatalogPaginationBar: React.FC<CatalogPaginationBarProps> = ({
    pagination,
    isLoading,
    itemLabel,
    onPageChange,
}) => {
    if (!pagination || (pagination.total === 0 && pagination.totalPages <= 1)) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 text-xs text-gray-600 sm:flex-row">
            <span>
                Showing page <span className="font-semibold text-gray-900">{pagination.page}</span>{' '}
                of{' '}
                <span className="font-semibold text-gray-900">
                    {Math.max(1, pagination.totalPages)}
                </span>{' '}
                ({pagination.total} total {itemLabel})
            </span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={isLoading || pagination.page <= 1}
                    onClick={() => onPageChange(pagination.page - 1)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    type="button"
                    disabled={isLoading || pagination.page >= pagination.totalPages}
                    onClick={() => onPageChange(pagination.page + 1)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

