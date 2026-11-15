import React, { useMemo, useState } from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { PERMISSIONS } from '../../../constants/permissions';
import type { AcademicFetchError } from '../hooks/useAcademicStructure';
import {
    ACADEMIC_UNIT_STATUSES,
    evaluateClassDeleteEligibility,
} from '../schemas/academic-structure-schema';
import type {
    AcademicClass,
    AcademicSection,
    AcademicUnitStatus,
} from '../types/academic-structure.types';
import { AcademicAsyncContent } from './AcademicAsyncContent';
import { AcademicUnitStatusBadge } from './AcademicStatusBadge';

interface ClassesSectionProps {
    classes: readonly AcademicClass[];
    loadedSections: readonly AcademicSection[];
    isLoading: boolean;
    loadError: AcademicFetchError | null;
    isMutating: boolean;
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canReadSections: boolean;
    onRetry: () => void;
    onOpenCreate: () => void;
    onOpenEdit: (academicClass: AcademicClass) => void;
    onOpenDetails: (academicClass: AcademicClass) => void;
    onOpenSectionsForClass: (classId: string) => void;
    onChangeStatus: (academicClass: AcademicClass, nextStatus: AcademicUnitStatus) => void;
    onRequestDelete: (academicClass: AcademicClass) => void;
}

export const ClassesSection: React.FC<ClassesSectionProps> = ({
    classes,
    loadedSections,
    isLoading,
    loadError,
    isMutating,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canReadSections,
    onRetry,
    onOpenCreate,
    onOpenEdit,
    onOpenDetails,
    onOpenSectionsForClass,
    onChangeStatus,
    onRequestDelete,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | AcademicUnitStatus>('ALL');

    const filteredClasses = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        return classes.filter((item) => {
            if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
            if (!needle) return true;
            return (
                item.name.toLowerCase().includes(needle) ||
                (item.code && item.code.toLowerCase().includes(needle)) ||
                (item.description && item.description.toLowerCase().includes(needle))
            );
        });
    }, [classes, searchQuery, statusFilter]);

    return (
        <DashboardOverviewCard title="Classes / Grade Levels">
            <div className="space-y-5">
                {canRead && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search classes, codes, or levels..."
                                aria-label="Search classes"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:max-w-xs"
                            />

                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value as 'ALL' | AcademicUnitStatus)
                                }
                                aria-label="Filter classes by status"
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                            >
                                <option value="ALL">All Statuses</option>
                                {ACADEMIC_UNIT_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {status === 'ACTIVE' ? 'Active' : 'Inactive'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {canCreate && (
                            <button
                                type="button"
                                disabled={isMutating}
                                onClick={onOpenCreate}
                                className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                            >
                                + Create Class / Level
                            </button>
                        )}
                    </div>
                )}

                <AcademicAsyncContent
                    canRead={canRead}
                    requiredPermission={PERMISSIONS.CLASSES.READ}
                    isLoading={isLoading}
                    loadingMessage="Loading classes and grade levels..."
                    loadError={loadError}
                    backendPendingEndpoint="GET /api/academic/classes"
                    onRetry={onRetry}
                    isEmpty={filteredClasses.length === 0}
                    emptyTitle={
                        classes.length === 0
                            ? 'No Classes or Grade Levels Configured'
                            : 'No Matching Classes'
                    }
                    emptyDescription={
                        classes.length === 0
                            ? 'Create reusable institutional levels (such as Grade 1, Year 1, or Diploma Level) suited to your school structure.'
                            : 'Adjust your search query or status filter to locate classes.'
                    }
                >
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                <tr>
                                    <th className="px-4 py-3">Order</th>
                                    <th className="px-4 py-3">Class / Level</th>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Sections</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredClasses.map((cls) => {
                                    const deleteEligibility = evaluateClassDeleteEligibility({
                                        academicClass: cls,
                                        loadedSections,
                                        canDeletePermission: canDelete,
                                    });
                                    const loadedSectionCount = loadedSections.filter(
                                        (s) => s.classId === cls.id
                                    ).length;
                                    const sectionDisplayCount =
                                        loadedSectionCount > 0 ? loadedSectionCount : cls.sectionCount;
                                    const nextStatus: AcademicUnitStatus =
                                        cls.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

                                    return (
                                        <tr key={cls.id} className="hover:bg-gray-50/70">
                                            <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-500">
                                                #{cls.displayOrder}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-gray-900">
                                                    {cls.name}
                                                </div>
                                                {cls.description && (
                                                    <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                                                        {cls.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                {cls.code ? (
                                                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                                                        {cls.code}
                                                    </code>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                {canReadSections ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenSectionsForClass(cls.id)}
                                                        className="font-medium text-blue-700 hover:underline"
                                                    >
                                                        {typeof sectionDisplayCount === 'number'
                                                            ? `${sectionDisplayCount} section(s)`
                                                            : 'View Sections'}
                                                    </button>
                                                ) : typeof sectionDisplayCount === 'number' ? (
                                                    `${sectionDisplayCount} section(s)`
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <AcademicUnitStatusBadge status={cls.status} />
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenDetails(cls)}
                                                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        View
                                                    </button>

                                                    {canUpdate && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={isMutating}
                                                                onClick={() => onOpenEdit(cls)}
                                                                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isMutating}
                                                                onClick={() =>
                                                                    onChangeStatus(cls, nextStatus)
                                                                }
                                                                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                            >
                                                                {cls.status === 'ACTIVE'
                                                                    ? 'Deactivate'
                                                                    : 'Activate'}
                                                            </button>
                                                        </>
                                                    )}

                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                isMutating ||
                                                                !deleteEligibility.allowed
                                                            }
                                                            title={
                                                                deleteEligibility.reason ??
                                                                'Delete class'
                                                            }
                                                            onClick={() => onRequestDelete(cls)}
                                                            className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </AcademicAsyncContent>
            </div>
        </DashboardOverviewCard>
    );
};

