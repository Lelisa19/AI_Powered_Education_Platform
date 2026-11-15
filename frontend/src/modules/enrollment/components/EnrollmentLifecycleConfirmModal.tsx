import React, { useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import { AcademicModalShell } from '../../academic/components/AcademicConfirmDialog';
import type { AcademicYear } from '../../academic/types/academic-structure.types';
import { formatStudentFullName } from '../../students/schemas/student-management-schema';
import type { StudentDirectoryItem } from '../../students/types/student-management.types';
import type { EnrollmentMutationOutcome } from '../hooks/useStudentEnrollments';
import {
    ENROLLMENT_LIMITS,
    formatEnrollmentStatusLabel,
    isEnrollmentTransitionReasonRequired,
    validateEnrollmentStatusUpdateForm,
} from '../schemas/enrollment-schema';
import type {
    EnrollmentTransitionTargetStatus,
    StudentEnrollmentRecord,
} from '../types/enrollment.types';
import { EnrollmentStatusBadge, EnrollmentTypeBadge } from './EnrollmentBadges';

interface EnrollmentLifecycleConfirmModalProps {
    student: StudentDirectoryItem;
    enrollment: StudentEnrollmentRecord;
    targetStatus: EnrollmentTransitionTargetStatus;
    existingEnrollments: readonly StudentEnrollmentRecord[];
    academicYear?: AcademicYear | null;
    canUpdateEnrollments: boolean;
    canCancelEnrollments: boolean;
    isSubmitting: boolean;
    onSubmitStatusUpdate: (
        enrollment: StudentEnrollmentRecord,
        targetStatus: EnrollmentTransitionTargetStatus,
        rawReason: string
    ) => Promise<EnrollmentMutationOutcome>;
    onClose: () => void;
}

function getActionMetadata(targetStatus: EnrollmentTransitionTargetStatus): {
    verb: string;
    titlePrefix: string;
    confirmLabel: string;
    tone: 'danger' | 'warning' | 'primary';
    note: string;
    placeholder: string;
} {
    switch (targetStatus) {
        case 'SUSPENDED':
            return {
                verb: 'Suspend',
                titlePrefix: 'Suspend Enrollment',
                confirmLabel: 'Suspend Enrollment',
                tone: 'danger',
                note: 'Suspending pauses this enrollment while keeping historical records and keeping the student’s user account and payment status separate.',
                placeholder: 'e.g. Academic probation or temporary administrative hold...',
            };
        case 'WITHDRAWN':
            return {
                verb: 'Withdraw',
                titlePrefix: 'Withdraw Enrollment',
                confirmLabel: 'Confirm Withdrawal',
                tone: 'danger',
                note: 'Withdrawing marks this enrollment as terminal and preserves the historical record (enrollments are never permanently deleted). Student account and payment records remain untouched.',
                placeholder: 'e.g. Student withdrew before term completion...',
            };
        case 'COMPLETED':
            return {
                verb: 'Complete',
                titlePrefix: 'Mark Enrollment Completed',
                confirmLabel: 'Mark Completed',
                tone: 'primary',
                note: 'Marks this enrollment as successfully Completed (terminal historical record). Student account and payment records remain separate.',
                placeholder: 'Optional completion note or academic remark...',
            };
        case 'ACTIVE':
            return {
                verb: 'Reactivate',
                titlePrefix: 'Reactivate Enrollment',
                confirmLabel: 'Reactivate Enrollment',
                tone: 'primary',
                note: 'Restores this suspended enrollment back to ACTIVE status without altering student account security or payment verification.',
                placeholder: 'Optional reactivation note...',
            };
    }
}

function resolveOfferingTitle(enrollment: StudentEnrollmentRecord): string {
    if (enrollment.enrollmentType === 'STANDALONE_COURSE') {
        return enrollment.courseTitle ?? enrollment.courseId ?? 'Standalone Course';
    }
    return enrollment.programName ?? enrollment.programId ?? 'Program';
}

export const EnrollmentLifecycleConfirmModal: React.FC<EnrollmentLifecycleConfirmModalProps> = ({
    student,
    enrollment,
    targetStatus,
    existingEnrollments,
    academicYear,
    canUpdateEnrollments,
    canCancelEnrollments,
    isSubmitting,
    onSubmitStatusUpdate,
    onClose,
}) => {
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const meta = getActionMetadata(targetStatus);
    const reasonRequired = isEnrollmentTransitionReasonRequired(targetStatus);
    const fullName = formatStudentFullName(
        student.firstName,
        student.lastName,
        student.email
    );
    const offeringTitle = resolveOfferingTitle(enrollment);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setReasonError(null);
        setSubmitError(null);

        const validation = validateEnrollmentStatusUpdateForm({
            enrollment,
            targetStatus,
            rawReason: reason,
            student,
            existingEnrollments,
            academicYear,
            canUpdateEnrollments,
            canCancelEnrollments,
        });

        if (!validation.valid) {
            if (validation.error.toLowerCase().includes('reason')) {
                setReasonError(validation.error);
            } else {
                setSubmitError(validation.error);
            }
            return;
        }

        const outcome = await onSubmitStatusUpdate(enrollment, targetStatus, reason);
        if (outcome.ok) {
            onClose();
            return;
        }

        if (outcome.error instanceof ApiError && outcome.error.validationErrors?.reason?.[0]) {
            setReasonError(outcome.error.validationErrors.reason[0]);
        }
        setSubmitError(
            outcome.errorMessage ??
                `Unable to change enrollment status to ${formatEnrollmentStatusLabel(targetStatus)}.`
        );
    };

    const confirmButtonClasses =
        meta.tone === 'danger'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700';

    return (
        <AcademicModalShell
            title={`${meta.titlePrefix}: ${offeringTitle}`}
            subtitle={`Student: ${fullName} (${student.email})`}
            isSubmitting={isSubmitting}
            onClose={onClose}
            maxWidthClass="max-w-md"
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-sm text-gray-700">
                <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{offeringTitle}</span>
                        <EnrollmentTypeBadge type={enrollment.enrollmentType} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-gray-600">
                        <span>Transition:</span>
                        <EnrollmentStatusBadge status={enrollment.status} />
                        <span aria-hidden="true">→</span>
                        <EnrollmentStatusBadge status={targetStatus} />
                    </div>
                    {enrollment.enrollmentType === 'GRADE_BASED_PROGRAM' &&
                        (enrollment.academicYearName || enrollment.academicYearId) && (
                            <p className="text-gray-600">
                                Academic Year:{' '}
                                <span className="font-medium text-gray-900">
                                    {enrollment.academicYearName ?? enrollment.academicYearId}
                                </span>
                            </p>
                        )}
                </div>

                <div
                    role="note"
                    className={`rounded-md border p-3 text-xs ${
                        meta.tone === 'danger'
                            ? 'border-red-200 bg-red-50 text-red-900'
                            : 'border-blue-200 bg-blue-50 text-blue-950'
                    }`}
                >
                    {meta.note}
                </div>

                {submitError && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    >
                        {submitError}
                    </div>
                )}

                <div>
                    <label
                        htmlFor="enrollment-lifecycle-reason"
                        className="block text-xs font-medium text-gray-700"
                    >
                        Audit Reason / Note{' '}
                        {reasonRequired ? (
                            <span className="text-red-600">*</span>
                        ) : (
                            <span className="font-normal text-gray-400">(Optional)</span>
                        )}
                    </label>
                    <textarea
                        id="enrollment-lifecycle-reason"
                        rows={3}
                        disabled={isSubmitting}
                        maxLength={ENROLLMENT_LIMITS.ACTION_REASON_MAX}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            if (reasonError) setReasonError(null);
                            if (submitError) setSubmitError(null);
                        }}
                        placeholder={meta.placeholder}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                    />
                    {reasonError && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {reasonError}
                        </p>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`rounded-md px-3.5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 ${confirmButtonClasses}`}
                    >
                        {isSubmitting ? 'Processing...' : meta.confirmLabel}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

