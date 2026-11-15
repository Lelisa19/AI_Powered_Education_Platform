import React, { useMemo, useState } from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { PERMISSIONS } from '../../../constants/permissions';
import type { AcademicFetchError } from '../hooks/useAcademicStructure';
import {
    ACADEMIC_UNIT_STATUSES,
    evaluateSectionDeleteEligibility,
} from '../schemas/academic-structure-schema';
import type {
    AcademicClass,
    AcademicSection,
    AcademicUnitStatus,
} from '../types/academic-structure.types';
import { AcademicAsyncContent } from './AcademicAsyncContent';
import { AcademicUnitStatusBadge } from './AcademicStatusBadge';

interface SectionsSectionProps {
    classes: readonly AcademicClass[];
    selectedClassFilter: string;
    sections: readonly AcademicSection[];
    isLoadingClasses: boolean;
    isLoadingSections: boolean;
    loadError: AcademicFetchError | null;
    isMutating: boolean;
    canReadClasses: boolean;
    canReadSections: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    onSelectClassFilter: (classId: string) => void;
    onRetry: () => void;
    onOpenCreate: () => void;
    onOpenEdit: (section: AcademicSection) => void;
    onOpenDetails: (section: AcademicSection) => void;
    onChangeStatus: (section: AcademicSection, nextStatus: AcademicUnitStatus) => void;
    onRequestDelete: (section: AcademicSection) => void;
}

export const SectionsSection: React.FC<SectionsSectionProps> = ({
    classes,
    selectedClassFilter,
    sections,
    isLoadingClasses,
    isLoadingSections,
    loadError,
    isMutating,
    canReadClasses,
    canReadSections,
    canCreate,
    canUpdate,
    canDelete,
    onSelectClassFilter,
    onRetry,
    onOpenCreate,
    onOpenEdit,
    onOpenDetails,
    onChangeStatus,
    onRequestDelete,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | AcademicUnitStatus>('ALL');

    const activeClasses = useMemo(
        () => classes.filter((cls) => cls.status === 'ACTIVE'),
        [classes]
    );

    const classLookup = useMemo(() => {
        const map = new Map<string, AcademicClass>();
        for (const cls of classes) {
            map.set(cls.id, cls);
        }
        return map;
    }, [classes]);

    const filteredSections = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        return sections.filter((item) => {
            if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
            if (!needle) return true;
            const parentName = classLookup.get(item.classId)?.name || item.className || '';
            return (
                item.name.toLowerCase().includes(needle) ||
                parentName.toLowerCase().includes(needle) ||
                (item.code && item.code.toLowerCase().includes(needle)) ||
                (item.description && item.description.toLowerCase().includes(needle))
            );
        });
    }, [sections, statusFilter, searchQuery, classLookup]);

    if (canReadSections && !canReadClasses) {
        return (
            <DashboardOverviewCard title="Class Sections / Cohorts">
                <div
                    role="alert"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
                >
                    Selecting parent classes for section management requires the{' '}
                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.CLASSES.READ}
                    </code>{' '}
                    permission alongside{' '}
                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.SECTIONS.READ}
                    </code>
                    .
                </div>
            </DashboardOverviewCard>
        );
    }

    return (
        <DashboardOverviewCard title="Class Sections / Cohorts">
            <div className="space-y-5">
                {canReadSections && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search sections or parent classes..."
                                aria-label="Search sections"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:max-w-xs"
                            />

                            <select
                                value={selectedClassFilter}
                                disabled={isLoadingClasses}
                                onChange={(e) => onSelectClassFilter(e.target.value)}
                                aria-label="Filter sections by class"
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                            >
                                <option value="ALL">All Parent Classes</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name}
                                        {cls.status === 'INACTIVE' ? ' (Inactive)' : ''}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value as 'ALL' | AcademicUnitStatus)
                                }
                                aria-label="Filter sections by status"
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
                                disabled={isMutating || activeClasses.length === 0}
                                title={
                                    activeClasses.length === 0
                                        ? 'At least one active parent class is required before creating a section'
                                        : undefined
                                }
                                onClick={onOpenCreate}
                                className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                + Create Section
                            </button>
                        )}
                    </div>
                )}

                <AcademicAsyncContent
                    canRead={canReadSections}
                    requiredPermission={PERMISSIONS.SECTIONS.READ}
                    isLoading={isLoadingSections}
                    loadingMessage="Loading sections..."
                    loadError={loadError}
                    backendPendingEndpoint={
                        selectedClassFilter !== 'ALL'
                            ? `GET /api/academic/classes/${selectedClassFilter}/sections`
                            : 'GET /api/academic/sections'
                    }
                    onRetry={onRetry}
                    isEmpty={filteredSections.length === 0}
                    emptyTitle={
                        classes.length === 0
                            ? 'Create a Parent Class First'
                            : sections.length === 0
                              ? 'No Sections Configured'
                              : 'No Matching Sections'
                    }
                    emptyDescription={
                        classes.length === 0
                            ? 'Sections are subdivisions of a class or grade level. Configure at least one active class first.'
                            : sections.length === 0
                              ? 'Organize cohorts such as Section A, Morning Group, or Blue Wing inside your configured classes.'
                              : 'Adjust your class filter, status filter, or search terms.'
                    }
                >
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                <tr>
                                    <th className="px-4 py-3">Section</th>
                                    <th className="px-4 py-3">Parent Class</th>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Capacity</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredSections.map((sec) => {
                                    const parentClass = classLookup.get(sec.classId);
                                    const parentName =
                                        parentClass?.name || sec.className || sec.classId;
                                    const deleteEligibility = evaluateSectionDeleteEligibility({
                                        section: sec,
                                        canDeletePermission: canDelete,
                                    });
                                    const nextStatus: AcademicUnitStatus =
                                        sec.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

                                    return (
                                        <tr key={sec.id} className="hover:bg-gray-50/70">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-gray-900">
                                                    {sec.name}
                                                </div>
                                                {sec.description && (
                                                    <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                                                        {sec.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-800">
                                                <span className="font-medium">{parentName}</span>
                                                {parentClass?.status === 'INACTIVE' && (
                                                    <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                                                        Inactive Class
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                {sec.code ? (
                                                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                                                        {sec.code}
                                                    </code>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                {typeof sec.capacity === 'number'
                                                    ? sec.capacity
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <AcademicUnitStatusBadge status={sec.status} />
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenDetails(sec)}
                                                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        View
                                                    </button>

                                                    {canUpdate && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={isMutating}
                                                                onClick={() => onOpenEdit(sec)}
                                                                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isMutating}
                                                                onClick={() =>
                                                                    onChangeStatus(sec, nextStatus)
                                                                }
                                                                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                            >
                                                                {sec.status === 'ACTIVE'
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
                                                                'Delete section'
                                                            }
                                                            onClick={() => onRequestDelete(sec)}
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

