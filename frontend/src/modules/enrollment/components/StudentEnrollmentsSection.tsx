import React from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { AcademicAsyncContent } from '../../academic/components/AcademicAsyncContent';
import type { AcademicYear } from '../../academic/types/academic-structure.types';
import type {
    StudentActionEligibility,
    StudentDirectoryItem,
} from '../../students/types/student-management.types';
import type { EnrollmentFetchError } from '../hooks/useStudentEnrollments';
import {
    evaluateEnrollmentLifecycleEligibility,
    evaluateProgramChangeRequestEligibility,
    evaluateSectionTransferEligibility,
    formatAcademicTimestamp,
    getAllowedEnrollmentStatusTransitions,
} from '../schemas/enrollment-schema';
import type {
    EnrollmentHistoryResponse,
    EnrollmentTransitionTargetStatus,
    GroupedStudentEnrollments,
    ProgramChangeRequestRecord,
    StudentEnrollmentRecord,
} from '../types/enrollment.types';
import {
    EnrollmentStatusBadge,
    EnrollmentTypeBadge,
    ProgramChangeStatusBadge,
} from './EnrollmentBadges';

interface StudentEnrollmentsSectionProps {
    student: StudentDirectoryItem;
    studentEligibility: StudentActionEligibility;
    canReadStudents: boolean;
    canReadEnrollments: boolean;
    canCreateEnrollments: boolean;
    canUpdateEnrollments: boolean;
    canCancelEnrollments: boolean;
    canReadPrograms: boolean;
    canReadSections: boolean;
    isLoadingStudentDetail: boolean;
    hasStudentDetailError: boolean;
    enrollments: readonly StudentEnrollmentRecord[];
    groupedEnrollments: GroupedStudentEnrollments;
    academicYearsById: ReadonlyMap<string, AcademicYear>;
    enrollmentsLoaded: boolean;
    isLoadingEnrollments: boolean;
    enrollmentsError: EnrollmentFetchError | null;
    inspectedHistoryEnrollmentId: string | null;
    enrollmentHistory: EnrollmentHistoryResponse | null;
    isLoadingHistory: boolean;
    historyError: EnrollmentFetchError | null;
    programChangeRequests: readonly ProgramChangeRequestRecord[];
    isLoadingProgramChanges: boolean;
    programChangesError: EnrollmentFetchError | null;
    isMutatingEnrollment: boolean;
    enrollmentNotice: string | null;
    enrollmentActionError: EnrollmentFetchError | null;
    onClearFeedback: () => void;
    onRetryEnrollments: () => void;
    onOpenCreateEnrollment: () => void;
    onRequestLifecycleAction: (
        enrollment: StudentEnrollmentRecord,
        targetStatus: EnrollmentTransitionTargetStatus
    ) => void;
    onOpenSectionTransfer: (enrollment: StudentEnrollmentRecord) => void;
    onOpenProgramChangeRequest: (enrollment: StudentEnrollmentRecord) => void;
    onToggleEnrollmentHistory: (enrollmentId: string) => void;
    onRetryHistory: () => void;
    onRetryProgramChanges: () => void;
}

function resolveEnrollmentDisplayDate(record: StudentEnrollmentRecord): string {
    return (
        formatAcademicTimestamp(record.enrolledAt) ??
        formatAcademicTimestamp(record.createdAt) ??
        'Pending backend timestamp'
    );
}

const TRANSITION_BUTTON_META: Readonly<
    Record<
        EnrollmentTransitionTargetStatus,
        { label: string; buttonClasses: string }
    >
> = {
    SUSPENDED: {
        label: 'Suspend',
        buttonClasses: 'border border-amber-300 bg-white text-amber-900 hover:bg-amber-50',
    },
    ACTIVE: {
        label: 'Reactivate',
        buttonClasses: 'border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50',
    },
    COMPLETED: {
        label: 'Mark Completed',
        buttonClasses: 'border border-blue-300 bg-white text-blue-800 hover:bg-blue-50',
    },
    WITHDRAWN: {
        label: 'Withdraw',
        buttonClasses: 'border border-red-300 bg-white text-red-700 hover:bg-red-50',
    },
};

const EnrollmentActionControls: React.FC<{
    item: StudentEnrollmentRecord;
    student: StudentDirectoryItem;
    existingEnrollments: readonly StudentEnrollmentRecord[];
    programChangeRequests: readonly ProgramChangeRequestRecord[];
    academicYearsById: ReadonlyMap<string, AcademicYear>;
    canReadEnrollments: boolean;
    canUpdateEnrollments: boolean;
    canCancelEnrollments: boolean;
    canReadPrograms: boolean;
    canReadSections: boolean;
    isMutatingEnrollment: boolean;
    isHistoryOpen: boolean;
    onRequestLifecycleAction: (
        enrollment: StudentEnrollmentRecord,
        targetStatus: EnrollmentTransitionTargetStatus
    ) => void;
    onOpenSectionTransfer: (enrollment: StudentEnrollmentRecord) => void;
    onOpenProgramChangeRequest: (enrollment: StudentEnrollmentRecord) => void;
    onToggleEnrollmentHistory: (enrollmentId: string) => void;
}> = ({
    item,
    student,
    existingEnrollments,
    programChangeRequests,
    academicYearsById,
    canReadEnrollments,
    canUpdateEnrollments,
    canCancelEnrollments,
    canReadPrograms,
    canReadSections,
    isMutatingEnrollment,
    isHistoryOpen,
    onRequestLifecycleAction,
    onOpenSectionTransfer,
    onOpenProgramChangeRequest,
    onToggleEnrollmentHistory,
}) => {
    const matchedYear = item.academicYearId
        ? academicYearsById.get(item.academicYearId) ?? null
        : null;

    const allowedTargets = getAllowedEnrollmentStatusTransitions(item.status);
    const permittedTransitions = allowedTargets
        .filter((target) =>
            target === 'WITHDRAWN' ? canCancelEnrollments : canUpdateEnrollments
        )
        .map((target) => ({
            target,
            eligibility: evaluateEnrollmentLifecycleEligibility({
                enrollment: item,
                targetStatus: target,
                student,
                existingEnrollments,
                academicYear: matchedYear,
                canUpdateEnrollments,
                canCancelEnrollments,
            }),
        }));

    const isGradeBased = item.enrollmentType === 'GRADE_BASED_PROGRAM';
    const showTransferButton =
        isGradeBased &&
        item.status === 'ACTIVE' &&
        canUpdateEnrollments &&
        canReadSections;
    const transferEligibility = showTransferButton
        ? evaluateSectionTransferEligibility({
              enrollment: item,
              student,
              academicYear: matchedYear,
              canUpdateEnrollments,
              canReadSections,
          })
        : null;

    const showProgramChangeButton =
        isGradeBased &&
        item.status === 'ACTIVE' &&
        canUpdateEnrollments &&
        canReadPrograms;
    const programChangeEligibility = showProgramChangeButton
        ? evaluateProgramChangeRequestEligibility({
              sourceEnrollment: item,
              student,
              academicYear: matchedYear,
              existingProgramChangeRequests: programChangeRequests,
              canUpdateEnrollments,
          })
        : null;

    const blockedReasons = new Set<string>();
    for (const entry of permittedTransitions) {
        if (!entry.eligibility.allowed && entry.eligibility.reason) {
            blockedReasons.add(entry.eligibility.reason);
        }
    }
    if (
        transferEligibility &&
        !transferEligibility.allowed &&
        transferEligibility.reason
    ) {
        blockedReasons.add(transferEligibility.reason);
    }
    if (
        programChangeEligibility &&
        !programChangeEligibility.allowed &&
        programChangeEligibility.reason
    ) {
        blockedReasons.add(programChangeEligibility.reason);
    }

    const isTerminal =
        item.status === 'COMPLETED' ||
        item.status === 'WITHDRAWN' ||
        item.status === 'REJECTED';

    return (
        <div className="mt-2 space-y-1.5 border-t border-gray-200/80 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    {permittedTransitions.map(({ target, eligibility }) => {
                        const meta = TRANSITION_BUTTON_META[target];
                        return (
                            <button
                                key={target}
                                type="button"
                                disabled={isMutatingEnrollment || !eligibility.allowed}
                                title={
                                    !eligibility.allowed && eligibility.reason
                                        ? eligibility.reason
                                        : undefined
                                }
                                onClick={() => onRequestLifecycleAction(item, target)}
                                className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${meta.buttonClasses}`}
                            >
                                {meta.label}
                            </button>
                        );
                    })}

                    {showTransferButton && transferEligibility && (
                        <button
                            type="button"
                            disabled={isMutatingEnrollment || !transferEligibility.allowed}
                            title={
                                !transferEligibility.allowed && transferEligibility.reason
                                    ? transferEligibility.reason
                                    : undefined
                            }
                            onClick={() => onOpenSectionTransfer(item)}
                            className="rounded border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            Transfer Section
                        </button>
                    )}

                    {showProgramChangeButton && programChangeEligibility && (
                        <button
                            type="button"
                            disabled={isMutatingEnrollment || !programChangeEligibility.allowed}
                            title={
                                !programChangeEligibility.allowed &&
                                programChangeEligibility.reason
                                    ? programChangeEligibility.reason
                                    : undefined
                            }
                            onClick={() => onOpenProgramChangeRequest(item)}
                            className="rounded border border-purple-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-purple-800 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            Request Program Change
                        </button>
                    )}

                    {item.status === 'PENDING' && (
                        <span className="text-[11px] text-amber-800">
                            Pending approval workflow deferred until student self-enrollment
                        </span>
                    )}

                    {isTerminal && (
                        <span className="text-[11px] text-gray-500">
                            Terminal record (preserved in history)
                        </span>
                    )}
                </div>

                {isGradeBased && canReadEnrollments && (
                    <button
                        type="button"
                        onClick={() => onToggleEnrollmentHistory(item.id)}
                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100"
                    >
                        {isHistoryOpen ? 'Hide Transfer History' : 'Section Transfer History'}
                    </button>
                )}
            </div>

            {blockedReasons.size > 0 && (
                <p className="text-[11px] text-amber-800">
                    {Array.from(blockedReasons).join(' · ')}
                </p>
            )}
        </div>
    );
};

const SectionTransferHistoryPanel: React.FC<{
    enrollment: StudentEnrollmentRecord;
    history: EnrollmentHistoryResponse | null;
    isLoading: boolean;
    error: EnrollmentFetchError | null;
    onRetry: () => void;
}> = ({ enrollment, history, isLoading, error, onRetry }) => {
    const transfers = history?.sectionTransfers ?? [];

    return (
        <div className="mt-2.5 rounded-md border border-indigo-200 bg-white p-3 text-xs">
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-indigo-100 pb-1.5">
                <h5 className="font-semibold text-indigo-950">
                    Immutable Section Transfer History
                </h5>
                <span className="text-[11px] text-gray-500">
                    Enrollment ID: <code className="font-mono">{enrollment.id}</code> (Read-Only)
                </span>
            </div>

            {isLoading ? (
                <div role="status" className="flex items-center gap-2 py-2 text-gray-600">
                    <div
                        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
                        aria-hidden="true"
                    />
                    <span>Loading section transfer history...</span>
                </div>
            ) : error ? (
                <div
                    role={error.isBackendUnavailable ? 'status' : 'alert'}
                    className={`space-y-1.5 rounded border p-2.5 ${
                        error.isBackendUnavailable
                            ? 'border-amber-200 bg-amber-50 text-amber-900'
                            : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                >
                    <p>
                        {error.isBackendUnavailable
                            ? `Section transfer history endpoint (GET /api/school/students/${enrollment.studentId}/enrollments/${enrollment.id}/history) is pending backend implementation.`
                            : error.message}
                    </p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="rounded border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-800 hover:bg-gray-50"
                    >
                        Retry History
                    </button>
                </div>
            ) : transfers.length === 0 ? (
                <p className="py-1 text-gray-500">
                    No Section transfers recorded for this enrollment.
                </p>
            ) : (
                <ul className="space-y-2">
                    {transfers.map((transfer) => (
                        <li
                            key={transfer.id}
                            className="rounded border border-gray-200 bg-gray-50 p-2.5 text-[11px]"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-gray-900">
                                    {transfer.fromSectionName ??
                                        transfer.fromSectionId ??
                                        'Unassigned'}{' '}
                                    → {transfer.toSectionName ?? transfer.toSectionId}
                                </span>
                                <span className="text-gray-500">
                                    {formatAcademicTimestamp(transfer.transferredAt) ??
                                        transfer.transferredAt}
                                </span>
                            </div>
                            <p className="mt-1 text-gray-700">
                                <strong>Reason:</strong> {transfer.reason}
                            </p>
                            <p className="mt-0.5 text-gray-500">
                                <strong>Transferred by:</strong>{' '}
                                {transfer.transferredBy.name ??
                                    transfer.transferredBy.email ??
                                    transfer.transferredBy.id}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export const StudentEnrollmentsSection: React.FC<StudentEnrollmentsSectionProps> = ({
    student,
    studentEligibility,
    canReadStudents,
    canReadEnrollments,
    canCreateEnrollments,
    canUpdateEnrollments,
    canCancelEnrollments,
    canReadPrograms,
    canReadSections,
    isLoadingStudentDetail,
    hasStudentDetailError,
    enrollments,
    groupedEnrollments,
    academicYearsById,
    enrollmentsLoaded,
    isLoadingEnrollments,
    enrollmentsError,
    inspectedHistoryEnrollmentId,
    enrollmentHistory,
    isLoadingHistory,
    historyError,
    programChangeRequests,
    isLoadingProgramChanges,
    programChangesError,
    isMutatingEnrollment,
    enrollmentNotice,
    enrollmentActionError,
    onClearFeedback,
    onRetryEnrollments,
    onOpenCreateEnrollment,
    onRequestLifecycleAction,
    onOpenSectionTransfer,
    onOpenProgramChangeRequest,
    onToggleEnrollmentHistory,
    onRetryHistory,
    onRetryProgramChanges,
}) => {
    const canOfferCreateButton = canReadStudents && canCreateEnrollments;
    const isCreateDisabled =
        !studentEligibility.allowed ||
        isLoadingStudentDetail ||
        hasStudentDetailError ||
        isMutatingEnrollment;

    const { summary, gradeBased, skillBased, standaloneCourses } = groupedEnrollments;

    return (
        <section aria-labelledby="student-enrollments-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h3
                        id="student-enrollments-heading"
                        className="text-sm font-semibold text-gray-900"
                    >
                        4. Program &amp; Standalone Course Enrollments
                    </h3>
                    <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                            studentEligibility.allowed
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-amber-50 text-amber-900'
                        }`}
                    >
                        {studentEligibility.allowed
                            ? 'Account Eligible for Enrollment'
                            : 'Enrollment Locked'}
                    </span>
                </div>

                {canOfferCreateButton && (
                    <button
                        type="button"
                        disabled={isCreateDisabled}
                        onClick={onOpenCreateEnrollment}
                        title={
                            !studentEligibility.allowed && studentEligibility.reason
                                ? studentEligibility.reason
                                : hasStudentDetailError
                                  ? 'Resolve student profile verification before creating an enrollment.'
                                  : undefined
                        }
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        + Add Enrollment
                    </button>
                )}
            </div>

            {!canReadStudents ? (
                <div
                    role="note"
                    className="rounded-md border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-700"
                >
                    Enrollment viewing and management require{' '}
                    <code className="font-mono">{PERMISSIONS.STUDENTS.READ}</code> alongside
                    enrollment permissions. Approval-only access does not grant enrollment access.
                </div>
            ) : (
                <div className="space-y-3">
                    {!studentEligibility.allowed && studentEligibility.reason && (
                        <div
                            role="note"
                            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
                        >
                            <span className="font-semibold">
                                Student Ineligible for New or Active Enrollment:
                            </span>{' '}
                            {studentEligibility.reason} Existing historical enrollments (if any)
                            remain preserved below.
                        </div>
                    )}

                    {enrollmentNotice && (
                        <div
                            role="status"
                            className="flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
                        >
                            <span>{enrollmentNotice}</span>
                            <button
                                type="button"
                                onClick={onClearFeedback}
                                className="font-medium text-emerald-800 underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    {enrollmentActionError && (
                        <div
                            role={enrollmentActionError.isBackendUnavailable ? 'status' : 'alert'}
                            className={`flex items-center justify-between gap-2 rounded-md border p-3 text-xs ${
                                enrollmentActionError.isBackendUnavailable
                                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                                    : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                        >
                            <span>{enrollmentActionError.message}</span>
                            <button
                                type="button"
                                onClick={onClearFeedback}
                                className="font-medium underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    {!canReadEnrollments ? (
                        <div
                            role="alert"
                            className="rounded-md border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-700"
                        >
                            <p className="font-medium text-gray-900">
                                Enrollment History Restricted
                            </p>
                            <p className="mt-1">
                                Viewing student enrollment records and Section Transfer history
                                requires{' '}
                                <code className="rounded bg-gray-200 px-1 py-0.5 font-mono">
                                    {PERMISSIONS.ENROLLMENTS.READ}
                                </code>{' '}
                                permission. Having{' '}
                                <code className="font-mono">{PERMISSIONS.STUDENTS.READ}</code> or{' '}
                                <code className="font-mono">{PERMISSIONS.ENROLLMENTS.CREATE}</code>{' '}
                                alone does not grant read access to existing enrollments.
                            </p>
                        </div>
                    ) : (
                        <>
                            {enrollmentsLoaded && (
                                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5 text-xs">
                                        <p className="font-medium text-gray-500">Total Enrollments</p>
                                        <p className="mt-1 text-base font-bold text-gray-900">
                                            {summary.totalCount}
                                        </p>
                                        <p className="text-[11px] text-emerald-700">
                                            {summary.activeCount} Active
                                        </p>
                                    </div>
                                    <div className="rounded-md border border-indigo-200 bg-indigo-50/50 p-2.5 text-xs">
                                        <p className="font-medium text-indigo-800">
                                            Grade-Based Programs
                                        </p>
                                        <p className="mt-1 text-base font-bold text-indigo-950">
                                            {summary.gradeBasedCount}
                                        </p>
                                        <p className="text-[11px] text-indigo-700">
                                            {summary.activeGradeBasedCount} Active
                                        </p>
                                    </div>
                                    <div className="rounded-md border border-teal-200 bg-teal-50/50 p-2.5 text-xs">
                                        <p className="font-medium text-teal-800">
                                            Skill-Based Programs
                                        </p>
                                        <p className="mt-1 text-base font-bold text-teal-950">
                                            {summary.skillBasedCount}
                                        </p>
                                        <p className="text-[11px] text-teal-700">
                                            {summary.activeSkillBasedCount} Active
                                        </p>
                                    </div>
                                    <div className="rounded-md border border-violet-200 bg-violet-50/50 p-2.5 text-xs">
                                        <p className="font-medium text-violet-800">
                                            Standalone Courses
                                        </p>
                                        <p className="mt-1 text-base font-bold text-violet-950">
                                            {summary.standaloneCourseCount}
                                        </p>
                                        <p className="text-[11px] text-violet-700">
                                            {summary.activeStandaloneCourseCount} Active
                                        </p>
                                    </div>
                                </div>
                            )}

                            <AcademicAsyncContent
                                canRead={canReadEnrollments}
                                requiredPermission={PERMISSIONS.ENROLLMENTS.READ}
                                isLoading={isLoadingEnrollments}
                                loadingMessage="Loading student enrollments..."
                                loadError={enrollmentsError}
                                backendPendingEndpoint={`GET /api/school/students/${student.id}/enrollments`}
                                onRetry={onRetryEnrollments}
                                isEmpty={summary.totalCount === 0}
                                emptyTitle="No Enrollments Recorded Yet"
                                emptyDescription={
                                    studentEligibility.allowed && canCreateEnrollments
                                        ? 'Use "+ Add Enrollment" to enroll this student in a Grade-Based Program, Skill-Based Program, or eligible standalone Course.'
                                        : 'This student currently has no Grade-Based Program, Skill-Based Program, or standalone Course enrollments.'
                                }
                            >
                                <div className="space-y-4">
                                    {/* Group 1: Grade-Based Programs */}
                                    <div className="space-y-2 rounded-md border border-indigo-200 bg-white p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                                            <div>
                                                <h4 className="text-xs font-semibold text-indigo-950">
                                                    Grade-Based Program Enrollments ({gradeBased.length})
                                                </h4>
                                                <p className="text-[11px] text-gray-500">
                                                    Bound to an Academic Year and the Program’s fixed Academic Class (max 1 ACTIVE per Academic Year).
                                                </p>
                                            </div>
                                        </div>
                                        {gradeBased.length === 0 ? (
                                            <p className="py-1 text-xs text-gray-500">
                                                No Grade-Based Program enrollments recorded.
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {gradeBased.map((item) => {
                                                    const isHistoryOpen =
                                                        inspectedHistoryEnrollmentId === item.id;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="rounded border border-gray-200 bg-gray-50/70 p-2.5 text-xs"
                                                        >
                                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                                <div className="space-y-1">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="font-semibold text-gray-900">
                                                                            {item.programName ??
                                                                                item.programId}
                                                                        </span>
                                                                        {item.programCode && (
                                                                            <span className="font-mono text-[11px] text-gray-500">
                                                                                ({item.programCode})
                                                                            </span>
                                                                        )}
                                                                        <EnrollmentTypeBadge
                                                                            type={
                                                                                item.enrollmentType
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
                                                                        <span>
                                                                            <strong>
                                                                                Academic Year:
                                                                            </strong>{' '}
                                                                            {item.academicYearName ??
                                                                                item.academicYearId ??
                                                                                '—'}
                                                                        </span>
                                                                        <span>
                                                                            <strong>Class:</strong>{' '}
                                                                            {item.academicClassName ??
                                                                                item.academicClassId ??
                                                                                '—'}
                                                                        </span>
                                                                        <span>
                                                                            <strong>Section:</strong>{' '}
                                                                            {item.sectionName ??
                                                                                item.sectionId ??
                                                                                'Unassigned (Optional)'}
                                                                        </span>
                                                                        <span>
                                                                            <strong>
                                                                                Enrolled:
                                                                            </strong>{' '}
                                                                            {resolveEnrollmentDisplayDate(
                                                                                item
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    {(item.suspendedReason ||
                                                                        item.withdrawnReason ||
                                                                        item.completionNote) && (
                                                                        <p className="text-[11px] text-gray-600">
                                                                            <strong>Audit Note:</strong>{' '}
                                                                            {item.suspendedReason ??
                                                                                item.withdrawnReason ??
                                                                                item.completionNote}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <EnrollmentStatusBadge
                                                                    status={item.status}
                                                                />
                                                            </div>

                                                            <EnrollmentActionControls
                                                                item={item}
                                                                student={student}
                                                                existingEnrollments={enrollments}
                                                                programChangeRequests={
                                                                    programChangeRequests
                                                                }
                                                                academicYearsById={
                                                                    academicYearsById
                                                                }
                                                                canReadEnrollments={
                                                                    canReadEnrollments
                                                                }
                                                                canUpdateEnrollments={
                                                                    canUpdateEnrollments
                                                                }
                                                                canCancelEnrollments={
                                                                    canCancelEnrollments
                                                                }
                                                                canReadPrograms={canReadPrograms}
                                                                canReadSections={canReadSections}
                                                                isMutatingEnrollment={
                                                                    isMutatingEnrollment
                                                                }
                                                                isHistoryOpen={isHistoryOpen}
                                                                onRequestLifecycleAction={
                                                                    onRequestLifecycleAction
                                                                }
                                                                onOpenSectionTransfer={
                                                                    onOpenSectionTransfer
                                                                }
                                                                onOpenProgramChangeRequest={
                                                                    onOpenProgramChangeRequest
                                                                }
                                                                onToggleEnrollmentHistory={
                                                                    onToggleEnrollmentHistory
                                                                }
                                                            />

                                                            {isHistoryOpen && (
                                                                <SectionTransferHistoryPanel
                                                                    enrollment={item}
                                                                    history={enrollmentHistory}
                                                                    isLoading={isLoadingHistory}
                                                                    error={historyError}
                                                                    onRetry={onRetryHistory}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Group 2: Skill-Based Programs */}
                                    <div className="space-y-2 rounded-md border border-teal-200 bg-white p-3">
                                        <div className="border-b border-teal-100 pb-2">
                                            <h4 className="text-xs font-semibold text-teal-950">
                                                Skill-Based Program Enrollments ({skillBased.length})
                                            </h4>
                                            <p className="text-[11px] text-gray-500">
                                                Independent of Academic Year, Class, and Section; may coexist with Grade-Based and other Skill-Based Programs.
                                            </p>
                                        </div>
                                        {skillBased.length === 0 ? (
                                            <p className="py-1 text-xs text-gray-500">
                                                No Skill-Based Program enrollments recorded.
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {skillBased.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="rounded border border-gray-200 bg-gray-50/70 p-2.5 text-xs"
                                                    >
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <div className="space-y-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="font-semibold text-gray-900">
                                                                        {item.programName ??
                                                                            item.programId}
                                                                    </span>
                                                                    {item.programCode && (
                                                                        <span className="font-mono text-[11px] text-gray-500">
                                                                            ({item.programCode})
                                                                        </span>
                                                                    )}
                                                                    <EnrollmentTypeBadge
                                                                        type={item.enrollmentType}
                                                                    />
                                                                </div>
                                                                <p className="text-[11px] text-gray-600">
                                                                    <strong>Enrolled:</strong>{' '}
                                                                    {resolveEnrollmentDisplayDate(
                                                                        item
                                                                    )}
                                                                </p>
                                                                {(item.suspendedReason ||
                                                                    item.withdrawnReason ||
                                                                    item.completionNote) && (
                                                                    <p className="text-[11px] text-gray-600">
                                                                        <strong>Audit Note:</strong>{' '}
                                                                        {item.suspendedReason ??
                                                                            item.withdrawnReason ??
                                                                            item.completionNote}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <EnrollmentStatusBadge
                                                                status={item.status}
                                                            />
                                                        </div>

                                                        <EnrollmentActionControls
                                                            item={item}
                                                            student={student}
                                                            existingEnrollments={enrollments}
                                                            programChangeRequests={
                                                                programChangeRequests
                                                            }
                                                            academicYearsById={academicYearsById}
                                                            canReadEnrollments={canReadEnrollments}
                                                            canUpdateEnrollments={
                                                                canUpdateEnrollments
                                                            }
                                                            canCancelEnrollments={
                                                                canCancelEnrollments
                                                            }
                                                            canReadPrograms={canReadPrograms}
                                                            canReadSections={canReadSections}
                                                            isMutatingEnrollment={
                                                                isMutatingEnrollment
                                                            }
                                                            isHistoryOpen={false}
                                                            onRequestLifecycleAction={
                                                                onRequestLifecycleAction
                                                            }
                                                            onOpenSectionTransfer={
                                                                onOpenSectionTransfer
                                                            }
                                                            onOpenProgramChangeRequest={
                                                                onOpenProgramChangeRequest
                                                            }
                                                            onToggleEnrollmentHistory={
                                                                onToggleEnrollmentHistory
                                                            }
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Group 3: Standalone Courses */}
                                    <div className="space-y-2 rounded-md border border-violet-200 bg-white p-3">
                                        <div className="border-b border-violet-100 pb-2">
                                            <h4 className="text-xs font-semibold text-violet-950">
                                                Standalone Course Enrollments (
                                                {standaloneCourses.length})
                                            </h4>
                                            <p className="text-[11px] text-gray-500">
                                                Direct enrollments into standalone-enabled Courses, independent of Program curriculum membership.
                                            </p>
                                        </div>
                                        {standaloneCourses.length === 0 ? (
                                            <p className="py-1 text-xs text-gray-500">
                                                No Standalone Course enrollments recorded.
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {standaloneCourses.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="rounded border border-gray-200 bg-gray-50/70 p-2.5 text-xs"
                                                    >
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <div className="space-y-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="font-semibold text-gray-900">
                                                                        {item.courseTitle ??
                                                                            item.courseId}
                                                                    </span>
                                                                    {item.courseCode && (
                                                                        <span className="font-mono text-[11px] text-gray-500">
                                                                            ({item.courseCode})
                                                                        </span>
                                                                    )}
                                                                    <EnrollmentTypeBadge
                                                                        type={item.enrollmentType}
                                                                    />
                                                                </div>
                                                                <p className="text-[11px] text-gray-600">
                                                                    <strong>Enrolled:</strong>{' '}
                                                                    {resolveEnrollmentDisplayDate(
                                                                        item
                                                                    )}
                                                                </p>
                                                                {(item.suspendedReason ||
                                                                    item.withdrawnReason ||
                                                                    item.completionNote) && (
                                                                    <p className="text-[11px] text-gray-600">
                                                                        <strong>Audit Note:</strong>{' '}
                                                                        {item.suspendedReason ??
                                                                            item.withdrawnReason ??
                                                                            item.completionNote}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <EnrollmentStatusBadge
                                                                status={item.status}
                                                            />
                                                        </div>

                                                        <EnrollmentActionControls
                                                            item={item}
                                                            student={student}
                                                            existingEnrollments={enrollments}
                                                            programChangeRequests={
                                                                programChangeRequests
                                                            }
                                                            academicYearsById={academicYearsById}
                                                            canReadEnrollments={canReadEnrollments}
                                                            canUpdateEnrollments={
                                                                canUpdateEnrollments
                                                            }
                                                            canCancelEnrollments={
                                                                canCancelEnrollments
                                                            }
                                                            canReadPrograms={canReadPrograms}
                                                            canReadSections={canReadSections}
                                                            isMutatingEnrollment={
                                                                isMutatingEnrollment
                                                            }
                                                            isHistoryOpen={false}
                                                            onRequestLifecycleAction={
                                                                onRequestLifecycleAction
                                                            }
                                                            onOpenSectionTransfer={
                                                                onOpenSectionTransfer
                                                            }
                                                            onOpenProgramChangeRequest={
                                                                onOpenProgramChangeRequest
                                                            }
                                                            onToggleEnrollmentHistory={
                                                                onToggleEnrollmentHistory
                                                            }
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AcademicAsyncContent>

                            {/* Read-Only Individual Student Program Change Request History */}
                            <div className="space-y-2 rounded-md border border-purple-200 bg-white p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2">
                                    <div>
                                        <h4 className="text-xs font-semibold text-purple-950">
                                            Grade-Based Program Change History (
                                            {programChangeRequests.length})
                                        </h4>
                                        <p className="text-[11px] text-gray-500">
                                            Read-only audit log of Program Change Requests and
                                            approval outcomes for this student. Approvals occur in
                                            the Program Change Queue.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isLoadingProgramChanges}
                                        onClick={onRetryProgramChanges}
                                        className="rounded border border-purple-200 bg-white px-2.5 py-1 text-[11px] font-medium text-purple-800 hover:bg-purple-50 disabled:opacity-50"
                                    >
                                        {isLoadingProgramChanges
                                            ? 'Refreshing...'
                                            : 'Refresh History'}
                                    </button>
                                </div>

                                <AcademicAsyncContent
                                    canRead={canReadEnrollments}
                                    requiredPermission={PERMISSIONS.ENROLLMENTS.READ}
                                    isLoading={isLoadingProgramChanges}
                                    loadingMessage="Loading student Program Change history..."
                                    loadError={programChangesError}
                                    backendPendingEndpoint="GET /api/school/students/:studentId/program-change-requests"
                                    onRetry={onRetryProgramChanges}
                                    isEmpty={programChangeRequests.length === 0}
                                    emptyTitle="No Program Change Requests"
                                    emptyDescription="No Grade-Based Program Change Requests have been submitted for this student yet."
                                >
                                    <div className="space-y-2">
                                        {programChangeRequests.map((req) => (
                                            <div
                                                key={req.id}
                                                className="rounded border border-gray-200 bg-gray-50/70 p-2.5 text-xs space-y-1.5"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="space-y-0.5">
                                                        <p className="font-semibold text-gray-900">
                                                            {req.sourceProgramName ??
                                                                req.sourceProgramId}{' '}
                                                            &rarr;{' '}
                                                            {req.targetProgramName ??
                                                                req.targetProgramId}
                                                        </p>
                                                        <p className="text-[11px] text-gray-600">
                                                            <strong>Academic Year:</strong>{' '}
                                                            {req.academicYearName ??
                                                                req.academicYearId}
                                                            {' · '}
                                                            <strong>From Class:</strong>{' '}
                                                            {req.sourceAcademicClassName ??
                                                                req.sourceAcademicClassId}
                                                            {req.sourceSectionName
                                                                ? ` (${req.sourceSectionName})`
                                                                : ''}
                                                            {' · '}
                                                            <strong>To Class:</strong>{' '}
                                                            {req.targetAcademicClassName ??
                                                                req.targetAcademicClassId}
                                                            {req.targetSectionName
                                                                ? ` (${req.targetSectionName})`
                                                                : ' (Section Unassigned)'}
                                                        </p>
                                                    </div>
                                                    <ProgramChangeStatusBadge status={req.status} />
                                                </div>

                                                <p className="text-[11px] text-gray-700">
                                                    <strong>Reason:</strong> {req.reason}
                                                </p>

                                                <p className="text-[11px] text-gray-500">
                                                    Requested by{' '}
                                                    {req.requestedBy.name ??
                                                        req.requestedBy.email ??
                                                        req.requestedBy.id}{' '}
                                                    on {formatAcademicTimestamp(req.requestedAt)}
                                                </p>

                                                {(req.reviewedBy ||
                                                    req.decisionNote ||
                                                    req.resultingEnrollmentId) && (
                                                    <div className="rounded border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-700 space-y-0.5">
                                                        {req.reviewedBy && (
                                                            <p>
                                                                <strong>Reviewed by:</strong>{' '}
                                                                {req.reviewedBy.name ??
                                                                    req.reviewedBy.email ??
                                                                    req.reviewedBy.id}
                                                                {req.reviewedAt
                                                                    ? ` on ${formatAcademicTimestamp(
                                                                          req.reviewedAt
                                                                      )}`
                                                                    : ''}
                                                            </p>
                                                        )}
                                                        {req.decisionNote && (
                                                            <p>
                                                                <strong>Decision Note:</strong>{' '}
                                                                {req.decisionNote}
                                                            </p>
                                                        )}
                                                        {req.resultingEnrollmentId && (
                                                            <p>
                                                                <strong>
                                                                    Resulting Enrollment ID:
                                                                </strong>{' '}
                                                                <code className="font-mono text-[10px]">
                                                                    {req.resultingEnrollmentId}
                                                                </code>
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </AcademicAsyncContent>
                            </div>
                        </>
                    )}

                    <p className="text-[11px] text-gray-500">
                        Account status and payment verification are managed independently of academic enrollment status.
                    </p>
                </div>
            )}
        </section>
    );
};
