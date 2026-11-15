import React, { useState } from 'react';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import { PERMISSIONS } from '../../../constants/permissions';
import type { PaginationMeta } from '../../../types/api.types';
import { AcademicAsyncContent } from '../../academic/components/AcademicAsyncContent';
import type { StudentFetchError } from '../hooks/useStudentManagement';
import {
    STUDENT_ACCOUNT_STATUSES,
    evaluateRegistrationDecisionEligibility,
    formatStaffDate,
    formatStudentFullName,
    formatStudentStatusLabel,
} from '../schemas/student-management-schema';
import type {
    StudentAccountStatusFilter,
    StudentDirectoryItem,
} from '../types/student-management.types';
import {
    MultiRoleAccountBadge,
    StudentAccountStatusBadge,
    StudentRegistrationSourceBadge,
    StudentSchoolRoleBadge,
} from './StudentBadges';

interface StudentDirectorySectionProps {
    mode: 'directory' | 'approvals';
    students: readonly StudentDirectoryItem[];
    pagination: PaginationMeta | null;
    search: string;
    statusFilter?: StudentAccountStatusFilter;
    isLoading: boolean;
    loadError: StudentFetchError | null;
    isMutating: boolean;
    canAccess: boolean;
    canCreate?: boolean;
    canApprove: boolean;
    onSearchSubmit: (search: string) => void;
    onResetFilters: () => void;
    onStatusFilterChange?: (status: StudentAccountStatusFilter) => void;
    onPageChange: (nextPage: number) => void;
    onRetry: () => void;
    onOpenCreate?: () => void;
    onOpenDetails: (student: StudentDirectoryItem) => void;
    onRequestDecision: (
        student: StudentDirectoryItem,
        decision: 'APPROVE' | 'REJECT'
    ) => void;
}

export const StudentDirectorySection: React.FC<StudentDirectorySectionProps> = ({
    mode,
    students,
    pagination,
    search,
    statusFilter = 'ALL',
    isLoading,
    loadError,
    isMutating,
    canAccess,
    canCreate = false,
    canApprove,
    onSearchSubmit,
    onResetFilters,
    onStatusFilterChange,
    onPageChange,
    onRetry,
    onOpenCreate,
    onOpenDetails,
    onRequestDecision,
}) => {
    const [searchInput, setSearchInput] = useState(search);

    const isApprovalsMode = mode === 'approvals';
    const hasActiveFilters =
        search.trim() !== '' || (!isApprovalsMode && statusFilter !== 'ALL');

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSearchSubmit(searchInput.trim());
    };

    const handleReset = () => {
        setSearchInput('');
        onResetFilters();
    };

    return (
        <DashboardOverviewCard
            title={
                isApprovalsMode
                    ? 'Pending Self-Registered Students Queue'
                    : 'School Students Directory'
            }
        >
            <div className="space-y-5">
                {canAccess && (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <form
                            onSubmit={handleFormSubmit}
                            className="flex flex-1 flex-wrap items-end gap-2.5"
                        >
                            <div className="min-w-[220px] flex-1">
                                <label
                                    htmlFor={`students-search-${mode}`}
                                    className="block text-xs font-medium text-gray-600"
                                >
                                    {isApprovalsMode
                                        ? 'Search Pending Registrations'
                                        : 'Search Students'}
                                </label>
                                <input
                                    id={`students-search-${mode}`}
                                    type="search"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search by student name, email, or student code..."
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                />
                            </div>

                            {!isApprovalsMode && onStatusFilterChange && (
                                <div>
                                    <label
                                        htmlFor="students-status-filter"
                                        className="block text-xs font-medium text-gray-600"
                                    >
                                        Account Status
                                    </label>
                                    <select
                                        id="students-status-filter"
                                        value={statusFilter}
                                        onChange={(e) =>
                                            onStatusFilterChange(
                                                e.target.value as StudentAccountStatusFilter
                                            )
                                        }
                                        className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                    >
                                        <option value="ALL">All Account Statuses</option>
                                        {STUDENT_ACCOUNT_STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {formatStudentStatusLabel(status)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    type="submit"
                                    className="rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
                                >
                                    Search
                                </button>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </form>

                        {!isApprovalsMode && canCreate && onOpenCreate && (
                            <button
                                type="button"
                                disabled={isMutating}
                                onClick={onOpenCreate}
                                className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                            >
                                + Add Student (Activation Link)
                            </button>
                        )}
                    </div>
                )}

                <AcademicAsyncContent
                    canRead={canAccess}
                    requiredPermission={
                        isApprovalsMode
                            ? `${PERMISSIONS.STUDENTS.READ} or ${PERMISSIONS.STUDENTS.APPROVE}`
                            : PERMISSIONS.STUDENTS.READ
                    }
                    isLoading={isLoading}
                    loadingMessage={
                        isApprovalsMode
                            ? 'Loading pending student registrations...'
                            : 'Loading school students directory...'
                    }
                    loadError={loadError}
                    backendPendingEndpoint="GET /api/school/students"
                    onRetry={onRetry}
                    isEmpty={students.length === 0}
                    emptyTitle={
                        hasActiveFilters
                            ? 'No Matching Students Found'
                            : isApprovalsMode
                              ? 'No Pending Student Registrations'
                              : 'No Student Accounts Recorded Yet'
                    }
                    emptyDescription={
                        hasActiveFilters
                            ? 'Try adjusting your search query or account status filter.'
                            : isApprovalsMode
                              ? 'Self-registered students awaiting School Admin review will appear in this queue.'
                              : 'Onboard students via activation-link invitations or review self-registered students from this workspace.'
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th scope="col" className="px-4 py-3">
                                        Student
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Student Code
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Roles
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Account Status
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Onboarding
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {students.map((student) => {
                                    const fullName = formatStudentFullName(
                                        student.firstName,
                                        student.lastName,
                                        student.email
                                    );
                                    const canDecideRegistration =
                                        evaluateRegistrationDecisionEligibility(
                                            student,
                                            canApprove
                                        ).allowed;

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">
                                                    {fullName}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {student.email}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-700">
                                                {student.studentCode ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-1">
                                                    {student.roles.map((role) => (
                                                        <StudentSchoolRoleBadge
                                                            key={role}
                                                            role={role}
                                                        />
                                                    ))}
                                                    <MultiRoleAccountBadge roles={student.roles} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <StudentAccountStatusBadge status={student.status} />
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                <div className="space-y-1">
                                                    {student.registrationSource && (
                                                        <div>
                                                            <StudentRegistrationSourceBadge
                                                                source={student.registrationSource}
                                                            />
                                                        </div>
                                                    )}
                                                    {student.status === 'PENDING_ACTIVATION' && (
                                                        <div className="font-medium text-sky-800">
                                                            Awaiting student link activation
                                                        </div>
                                                    )}
                                                    {student.status === 'PENDING_APPROVAL' && (
                                                        <div className="font-medium text-amber-800">
                                                            Awaiting admin approval
                                                        </div>
                                                    )}
                                                    <div>
                                                        Created: {formatStaffDate(student.createdAt)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                                    {canDecideRegistration && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={isMutating}
                                                                onClick={() =>
                                                                    onRequestDecision(
                                                                        student,
                                                                        'APPROVE'
                                                                    )
                                                                }
                                                                className="rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isMutating}
                                                                onClick={() =>
                                                                    onRequestDecision(
                                                                        student,
                                                                        'REJECT'
                                                                    )
                                                                }
                                                                className="rounded border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenDetails(student)}
                                                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        View Details
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {pagination && (pagination.totalPages > 1 || pagination.total > 0) && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 text-xs text-gray-600 sm:flex-row">
                            <span>
                                Showing page{' '}
                                <span className="font-semibold text-gray-900">
                                    {pagination.page}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-gray-900">
                                    {Math.max(1, pagination.totalPages)}
                                </span>{' '}
                                ({pagination.total.toLocaleString()} total{' '}
                                {isApprovalsMode ? 'pending registrations' : 'students'})
                            </span>
                            {pagination.totalPages > 1 && (
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
                                        disabled={
                                            isLoading || pagination.page >= pagination.totalPages
                                        }
                                        onClick={() => onPageChange(pagination.page + 1)}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </AcademicAsyncContent>
            </div>
        </DashboardOverviewCard>
    );
};

