import React, { useState } from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { AcademicAsyncContent } from '../../academic/components/AcademicAsyncContent';
import { AcademicConfirmDialog } from '../../academic/components/AcademicConfirmDialog';
import type {
    CatalogFetchError,
    CatalogSubmitOutcome,
} from '../hooks/useProgramsAndCourses';
import type { Course, TeacherCourseAssignment } from '../types/programs-courses.types';

interface StandaloneTeachersSectionProps {
    course: Course;
    assignments: readonly TeacherCourseAssignment[];
    isLoading: boolean;
    loadError: CatalogFetchError | null;
    isMutating: boolean;
    canReadCourses: boolean;
    canAssignStandaloneTeachers: boolean;
    onRetry: () => void;
    onOpenManageTeachers: () => void;
    onRemoveAssignment: (assignment: TeacherCourseAssignment) => Promise<CatalogSubmitOutcome>;
}

export const StandaloneTeachersSection: React.FC<StandaloneTeachersSectionProps> = ({
    course,
    assignments,
    isLoading,
    loadError,
    isMutating,
    canReadCourses,
    canAssignStandaloneTeachers,
    onRetry,
    onOpenManageTeachers,
    onRemoveAssignment,
}) => {
    const [pendingRemoval, setPendingRemoval] = useState<TeacherCourseAssignment | null>(null);
    const [actionNotice, setActionNotice] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    if (!course.allowStandalone) {
        return (
            <section
                aria-labelledby="standalone-teachers-heading"
                className="space-y-2 border-t border-gray-200 pt-4"
            >
                <div className="flex items-center justify-between gap-2">
                    <h3
                        id="standalone-teachers-heading"
                        className="text-sm font-semibold text-gray-900"
                    >
                        Standalone Teacher Assignments
                    </h3>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        Standalone Disabled
                    </span>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                    This course has <code className="font-mono">allowStandalone = false</code>.
                    Teachers can only be assigned to this course through a Program curriculum
                    pairing.
                </div>
            </section>
        );
    }

    const canViewList = canReadCourses || canAssignStandaloneTeachers;

    return (
        <>
            <section
                aria-labelledby="standalone-teachers-heading"
                className="space-y-3 border-t border-gray-200 pt-4"
            >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3
                                id="standalone-teachers-heading"
                                className="text-sm font-semibold text-gray-900"
                            >
                                Standalone Teacher Assignments
                            </h3>
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">
                                {assignments.length} assigned
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                            Teachers delivering <span className="font-medium">{course.title}</span>{' '}
                            as a standalone course. Program-specific assignments live inside each
                            Program curriculum.
                        </p>
                    </div>

                    {canAssignStandaloneTeachers && (
                        <button
                            type="button"
                            disabled={isMutating}
                            onClick={onOpenManageTeachers}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            + Manage Standalone Teachers
                        </button>
                    )}
                </div>

                {actionNotice && (
                    <div
                        role="status"
                        className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
                    >
                        {actionNotice}
                    </div>
                )}

                {actionError && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    >
                        {actionError}
                    </div>
                )}

                {!canViewList ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        Requires <code className="font-mono">{PERMISSIONS.COURSES.READ}</code> or{' '}
                        <code className="font-mono">{PERMISSIONS.COURSES.ASSIGN_TEACHERS}</code>{' '}
                        to view standalone teaching assignments.
                    </div>
                ) : (
                    <AcademicAsyncContent
                        canRead={canViewList}
                        requiredPermission={PERMISSIONS.COURSES.READ}
                        isLoading={isLoading}
                        loadingMessage="Loading standalone teacher assignments..."
                        loadError={loadError}
                        backendPendingEndpoint="GET /api/academic/teacher-assignments"
                        isEmpty={assignments.length === 0}
                        emptyTitle="No standalone teachers assigned"
                        emptyDescription={
                            canAssignStandaloneTeachers
                                ? 'Use "Manage Standalone Teachers" above to assign verified active teachers to this standalone offering.'
                                : 'No teachers are currently assigned to the standalone offering of this course.'
                        }
                        onRetry={onRetry}
                    >
                        <div className="overflow-x-auto rounded-md border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                                <thead className="bg-gray-50 text-left font-medium text-gray-500">
                                    <tr>
                                        <th className="px-3 py-2">Teacher</th>
                                        <th className="px-3 py-2">Academic Period</th>
                                        {canAssignStandaloneTeachers && (
                                            <th className="px-3 py-2 text-right">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {assignments.map((assignment) => {
                                        const periodLabel =
                                            [assignment.academicYearName, assignment.termName]
                                                .filter(Boolean)
                                                .join(' · ') || 'All / Unscoped';

                                        return (
                                            <tr key={assignment.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-medium text-gray-900">
                                                            {assignment.teacherName}
                                                        </span>
                                                        {assignment.isPrimaryInstructor && (
                                                            <span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                                                                Primary
                                                            </span>
                                                        )}
                                                    </div>
                                                    {assignment.teacherEmail && (
                                                        <div className="text-[11px] text-gray-500">
                                                            {assignment.teacherEmail}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-gray-700">
                                                    {periodLabel}
                                                </td>
                                                {canAssignStandaloneTeachers && (
                                                    <td className="px-3 py-2 text-right">
                                                        <button
                                                            type="button"
                                                            disabled={isMutating}
                                                            onClick={() =>
                                                                setPendingRemoval(assignment)
                                                            }
                                                            className="rounded border border-red-300 bg-white px-2 py-1 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </AcademicAsyncContent>
                )}
            </section>

            {pendingRemoval && (
                <AcademicConfirmDialog
                    title={`Remove Standalone Teacher: ${pendingRemoval.teacherName}`}
                    message={`Remove ${pendingRemoval.teacherName} from the standalone offering of "${course.title}"?`}
                    warningNote="Only this standalone course teaching assignment will be deleted. Program-course assignments and the teacher account remain unaffected."
                    confirmLabel="Remove Assignment"
                    tone="danger"
                    isSubmitting={isMutating}
                    onCancel={() => setPendingRemoval(null)}
                    onConfirm={async () => {
                        const targetAssignment = pendingRemoval;
                        setActionNotice(null);
                        setActionError(null);
                        const outcome = await onRemoveAssignment(targetAssignment);
                        setPendingRemoval(null);
                        if (outcome.ok) {
                            setActionNotice(
                                `Removed ${targetAssignment.teacherName} from standalone offering.`
                            );
                        } else {
                            setActionError(outcome.errorMessage);
                        }
                    }}
                />
            )}
        </>
    );
};

