import React, { useState } from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { ApiError } from '../../../services/api/api-error';
import {
    AcademicConfirmDialog,
    AcademicModalShell,
} from '../../academic/components/AcademicConfirmDialog';
import { EnrollmentCreationModal } from '../../enrollment/components/EnrollmentCreationModal';
import { EnrollmentLifecycleConfirmModal } from '../../enrollment/components/EnrollmentLifecycleConfirmModal';
import { ProgramChangeRequestModal } from '../../enrollment/components/ProgramChangeRequestModal';
import { SectionTransferModal } from '../../enrollment/components/SectionTransferModal';
import { StudentEnrollmentsSection } from '../../enrollment/components/StudentEnrollmentsSection';
import type {
    StudentEnrollmentPermissions,
    useStudentEnrollments,
} from '../../enrollment/hooks/useStudentEnrollments';
import type {
    StudentFetchError,
    StudentSubmitOutcome,
} from '../hooks/useStudentManagement';
import {
    STUDENT_GENDERS,
    STUDENT_LIMITS,
    areStudentProfileFormsEqual,
    evaluateRegistrationDecisionEligibility,
    evaluateStudentStatusToggleEligibility,
    formatIsoDateDisplay,
    formatStaffDateTime,
    formatStudentFullName,
    formatStudentGenderLabel,
    formatStudentSourceLabel,
    mapBackendFieldValidationErrors,
    validateStudentActionReason,
    validateStudentProfileForm,
} from '../schemas/student-management-schema';
import type {
    StudentDetailRecord,
    StudentDirectoryItem,
    StudentProfileFieldErrors,
    StudentProfileFieldName,
    StudentProfileFormValues,
    UpdateStudentProfileRequest,
} from '../types/student-management.types';
import {
    MultiRoleAccountBadge,
    StudentAccountStatusBadge,
    StudentRegistrationSourceBadge,
    StudentSchoolRoleBadge,
} from './StudentBadges';

export type PendingStudentLifecycleAction =
    | { kind: 'APPROVE'; student: StudentDirectoryItem }
    | { kind: 'REJECT'; student: StudentDirectoryItem }
    | { kind: 'SUSPEND'; student: StudentDirectoryItem }
    | { kind: 'REACTIVATE'; student: StudentDirectoryItem };

interface StudentLifecycleConfirmDialogProps {
    action: PendingStudentLifecycleAction;
    isSubmitting: boolean;
    onCancel: () => void;
    onConfirm: (reason?: string) => Promise<void>;
}

export const StudentLifecycleConfirmDialog: React.FC<StudentLifecycleConfirmDialogProps> = ({
    action,
    isSubmitting,
    onCancel,
    onConfirm,
}) => {
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState<string | null>(null);

    const fullName = formatStudentFullName(
        action.student.firstName,
        action.student.lastName,
        action.student.email
    );

    const isApprove = action.kind === 'APPROVE';
    const isReject = action.kind === 'REJECT';
    const isSuspend = action.kind === 'SUSPEND';

    const title = isApprove
        ? `Approve Student Registration: ${fullName}`
        : isReject
          ? `Reject Student Registration: ${fullName}`
          : isSuspend
            ? `Suspend Student Account: ${fullName}`
            : `Reactivate Student Account: ${fullName}`;

    const message = isApprove
        ? `Approve registration for ${fullName} (${action.student.email}) and mark the account ACTIVE?`
        : isReject
          ? `Reject pending registration for ${fullName} (${action.student.email})?`
          : isSuspend
            ? `Suspend portal access for ${fullName} (${action.student.email})?`
            : `Reactivate account access for ${fullName} (${action.student.email})?`;

    const warningNote = isApprove
        ? 'Approval activates the student user account only. Program and Course enrollments are managed separately in Step 5.10.3.'
        : isReject
          ? 'The registration record will remain preserved as Rejected for audit history rather than permanently deleted.'
          : isSuspend
            ? 'Suspending disables login/portal access while preserving all academic history, enrollments, and multi-role identity metadata.'
            : 'Restores account access to ACTIVE status without altering existing roles or historical records.';

    const confirmLabel = isApprove
        ? 'Approve Registration'
        : isReject
          ? 'Reject Registration'
          : isSuspend
            ? 'Suspend Account'
            : 'Reactivate Account';

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        const check = validateStudentActionReason(reason);
        if (!check.valid) {
            setReasonError(check.error);
            return;
        }
        setReasonError(null);
        await onConfirm(check.reason);
    };

    return (
        <AcademicModalShell
            title={title}
            isSubmitting={isSubmitting}
            onClose={onCancel}
            maxWidthClass="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-4 text-sm text-gray-700">
                <p>{message}</p>

                <div
                    role="note"
                    className={`rounded-md border p-3 text-xs ${
                        isReject || isSuspend
                            ? 'border-red-200 bg-red-50 text-red-900'
                            : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                >
                    {warningNote}
                </div>

                <div>
                    <label
                        htmlFor="student-lifecycle-reason"
                        className="block text-xs font-medium text-gray-700"
                    >
                        Reason / Audit Note{' '}
                        <span className="font-normal text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                        id="student-lifecycle-reason"
                        rows={2}
                        disabled={isSubmitting}
                        maxLength={STUDENT_LIMITS.ACTION_REASON_MAX}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            if (reasonError) setReasonError(null);
                        }}
                        placeholder={
                            isReject
                                ? 'e.g. Unable to verify school admission details...'
                                : isSuspend
                                  ? 'e.g. Temporary leave / administrative hold...'
                                  : 'Optional audit comment...'
                        }
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
                        onClick={onCancel}
                        className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`rounded-md px-3.5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 ${
                            isReject || isSuspend
                                ? 'bg-red-600 hover:bg-red-700'
                                : isApprove
                                  ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isSubmitting ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

const PROFILE_ERROR_FIELDS: readonly StudentProfileFieldName[] = [
    'firstName',
    'lastName',
    'phone',
    'studentCode',
    'dateOfBirth',
    'gender',
    'address',
    'emergencyContactName',
    'emergencyContactPhone',
    'emergencyContactRelation',
    'notes',
];

interface StudentDetailModalProps {
    summary: StudentDirectoryItem;
    detailRecord: StudentDetailRecord | null;
    hasVerifiedProfile: boolean;
    savedProfileValues: StudentProfileFormValues;
    isLoadingDetail: boolean;
    detailError: StudentFetchError | null;
    currentActorId: string | null;
    canUpdateStudents: boolean;
    canApproveStudents: boolean;
    canDisableStudents: boolean;
    enrollmentPermissions: StudentEnrollmentPermissions;
    enrollment: ReturnType<typeof useStudentEnrollments>;
    isMutating: boolean;
    onRetryDetail: () => void;
    onSaveProfile: (
        studentId: string,
        payload: UpdateStudentProfileRequest
    ) => Promise<StudentSubmitOutcome>;
    onDecideRegistration: (
        student: StudentDirectoryItem,
        decision: 'APPROVE' | 'REJECT',
        reason?: string
    ) => Promise<StudentSubmitOutcome>;
    onToggleStatus: (
        student: StudentDirectoryItem,
        reason?: string
    ) => Promise<StudentSubmitOutcome>;
    onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
    summary,
    detailRecord,
    hasVerifiedProfile,
    savedProfileValues,
    isLoadingDetail,
    detailError,
    currentActorId,
    canUpdateStudents,
    canApproveStudents,
    canDisableStudents,
    enrollmentPermissions,
    enrollment,
    isMutating,
    onRetryDetail,
    onSaveProfile,
    onDecideRegistration,
    onToggleStatus,
    onClose,
}) => {
    const activeStudent = detailRecord ?? summary;
    const [draftValues, setDraftValues] = useState<StudentProfileFormValues | null>(null);
    const [fieldErrors, setFieldErrors] = useState<StudentProfileFieldErrors>({});
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileNotice, setProfileNotice] = useState<string | null>(null);
    const [lifecycleAction, setLifecycleAction] = useState<PendingStudentLifecycleAction | null>(
        null
    );
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const formValues = draftValues ?? savedProfileValues;
    const isProfileDirty =
        canUpdateStudents &&
        hasVerifiedProfile &&
        !areStudentProfileFormsEqual(formValues, savedProfileValues);

    const fullName = formatStudentFullName(
        activeStudent.firstName,
        activeStudent.lastName,
        activeStudent.email
    );
    const isMultiRole = activeStudent.roles.length > 1;
    const registrationEligibility = evaluateRegistrationDecisionEligibility(
        activeStudent,
        canApproveStudents
    );
    const statusEligibility = evaluateStudentStatusToggleEligibility(
        activeStudent,
        currentActorId,
        canDisableStudents
    );

    const requestClose = () => {
        if (
            isMutating ||
            enrollment.isMutatingEnrollment ||
            enrollment.createDialogOpen ||
            Boolean(enrollment.lifecycleDialogTarget) ||
            Boolean(enrollment.transferDialogEnrollment) ||
            Boolean(enrollment.programChangeDialogSource)
        ) {
            return;
        }
        if (isProfileDirty) {
            setShowDiscardConfirm(true);
            return;
        }
        onClose();
    };

    const handleFieldChange = <K extends keyof StudentProfileFormValues>(
        field: K,
        value: StudentProfileFormValues[K]
    ) => {
        setProfileError(null);
        setProfileNotice(null);
        setDraftValues({ ...formValues, [field]: value });
        setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };

    const handleSubmitProfile = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canUpdateStudents || !hasVerifiedProfile || !isProfileDirty || isMutating) {
            return;
        }

        setProfileError(null);
        setProfileNotice(null);

        const validation = validateStudentProfileForm(formValues);
        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        const outcome = await onSaveProfile(activeStudent.id, validation.payload);
        if (outcome.ok) {
            setDraftValues(null);
            setProfileNotice('Student profile saved successfully.');
            return;
        }

        if (outcome.error instanceof ApiError && outcome.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(
                    outcome.error.validationErrors,
                    PROFILE_ERROR_FIELDS
                )
            );
        }
        setProfileError(outcome.errorMessage ?? 'Unable to update student profile.');
    };

    const canRenderProfileForm = canUpdateStudents && hasVerifiedProfile && !detailError;

    return (
        <>
            <AcademicModalShell
                title={`Student Record: ${fullName}`}
                subtitle={`${activeStudent.email} · Tenant-scoped student identity, lifecycle, and profile details`}
                isSubmitting={
                    isMutating ||
                    Boolean(lifecycleAction) ||
                    showDiscardConfirm ||
                    enrollment.createDialogOpen ||
                    Boolean(enrollment.lifecycleDialogTarget) ||
                    Boolean(enrollment.transferDialogEnrollment) ||
                    Boolean(enrollment.programChangeDialogSource) ||
                    enrollment.isMutatingEnrollment
                }
                onClose={requestClose}
                maxWidthClass="max-w-3xl"
            >
                <div className="space-y-6 text-sm text-gray-700">
                    {/* Status & Roles Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <StudentAccountStatusBadge status={activeStudent.status} />
                            {activeStudent.roles.map((role) => (
                                <StudentSchoolRoleBadge key={role} role={role} />
                            ))}
                            <MultiRoleAccountBadge roles={activeStudent.roles} />
                            <StudentRegistrationSourceBadge
                                source={activeStudent.registrationSource}
                            />
                        </div>
                        {isProfileDirty && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                Unsaved Profile Changes
                            </span>
                        )}
                    </div>

                    {/* Section 1: Protected Account Identity */}
                    <section aria-labelledby="student-identity-heading" className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3
                                id="student-identity-heading"
                                className="text-sm font-semibold text-gray-900"
                            >
                                1. Account Identity (Protected Read-Only)
                            </h3>
                            <span className="text-[11px] text-gray-500">
                                Roles, permissions, email &amp; credentials cannot be edited here
                            </span>
                        </div>

                        {isMultiRole && (
                            <div
                                role="note"
                                className="rounded-md border border-purple-200 bg-purple-50 p-3 text-xs text-purple-950"
                            >
                                Multi-Role Account: Non-STUDENT roles and security assignments on
                                this account are preserved untouched by Student Management
                                operations.
                            </div>
                        )}

                        <dl className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <dt className="font-medium text-gray-500">Account ID</dt>
                                <dd className="mt-0.5 font-mono text-gray-900">
                                    {activeStudent.id}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium text-gray-500">
                                    Account Email (Verified Process Required to Change)
                                </dt>
                                <dd className="mt-0.5 font-medium text-gray-900">
                                    {activeStudent.email}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium text-gray-500">Onboarding Source</dt>
                                <dd className="mt-0.5 text-gray-900">
                                    {formatStudentSourceLabel(activeStudent.registrationSource)}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium text-gray-500">Created At</dt>
                                <dd className="mt-0.5 text-gray-900">
                                    {formatStaffDateTime(activeStudent.createdAt)}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium text-gray-500">Activated At</dt>
                                <dd className="mt-0.5 text-gray-900">
                                    {formatStaffDateTime(activeStudent.activatedAt)}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium text-gray-500">Last Login</dt>
                                <dd className="mt-0.5 text-gray-900">
                                    {formatStaffDateTime(activeStudent.lastLoginAt)}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {/* Section 2: Account Lifecycle & Registration Decision */}
                    <section aria-labelledby="student-lifecycle-heading" className="space-y-3">
                        <h3
                            id="student-lifecycle-heading"
                            className="text-sm font-semibold text-gray-900"
                        >
                            2. Account Status &amp; Registration Review
                        </h3>

                        <div className="rounded-md border border-gray-200 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-600">
                                            Current Account Status:
                                        </span>
                                        <StudentAccountStatusBadge status={activeStudent.status} />
                                    </div>
                                    {detailRecord?.approvedAt && (
                                        <p className="text-gray-600">
                                            Reviewed on {formatStaffDateTime(detailRecord.approvedAt)}
                                            {detailRecord.approvedBy?.name
                                                ? ` by ${detailRecord.approvedBy.name}`
                                                : ''}
                                        </p>
                                    )}
                                    {detailRecord?.rejectionReason && (
                                        <p className="text-red-700">
                                            Rejection note: {detailRecord.rejectionReason}
                                        </p>
                                    )}
                                    {detailRecord?.suspendedReason && (
                                        <p className="text-red-700">
                                            Suspension note: {detailRecord.suspendedReason}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {registrationEligibility.allowed && (
                                        <>
                                            <button
                                                type="button"
                                                disabled={isMutating}
                                                onClick={() =>
                                                    setLifecycleAction({
                                                        kind: 'APPROVE',
                                                        student: activeStudent,
                                                    })
                                                }
                                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                Approve Registration
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isMutating}
                                                onClick={() =>
                                                    setLifecycleAction({
                                                        kind: 'REJECT',
                                                        student: activeStudent,
                                                    })
                                                }
                                                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                Reject Registration
                                            </button>
                                        </>
                                    )}

                                    {statusEligibility.allowed && statusEligibility.nextStatus && (
                                        <button
                                            type="button"
                                            disabled={isMutating}
                                            onClick={() =>
                                                setLifecycleAction({
                                                    kind:
                                                        statusEligibility.nextStatus === 'SUSPENDED'
                                                            ? 'SUSPEND'
                                                            : 'REACTIVATE',
                                                    student: activeStudent,
                                                })
                                            }
                                            className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                                                statusEligibility.nextStatus === 'SUSPENDED'
                                                    ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            {statusEligibility.nextStatus === 'SUSPENDED'
                                                ? 'Suspend Account'
                                                : 'Reactivate Account'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {(activeStudent.status === 'PENDING_ACTIVATION' ||
                                activeStudent.status === 'PENDING_APPROVAL') && (
                                <div
                                    role="note"
                                    className={`mt-3 rounded border p-2.5 text-xs ${
                                        activeStudent.status === 'PENDING_ACTIVATION'
                                            ? 'border-sky-200 bg-sky-50 text-sky-950'
                                            : 'border-amber-200 bg-amber-50 text-amber-950'
                                    }`}
                                >
                                    {activeStudent.status === 'PENDING_ACTIVATION'
                                        ? 'Awaiting Student Activation: This admin-created student must complete onboarding via their activation link and set their own password before becoming Active. It cannot be activated through Registration Approval or Suspend/Reactivate actions.'
                                        : 'Pending Self-Registration Approval: Review and approve or reject this verified-domain student registration. Registration approval does not substitute for activation-link onboarding on admin-created accounts.'}
                                </div>
                            )}

                            {canDisableStudents &&
                                !statusEligibility.allowed &&
                                statusEligibility.reason &&
                                activeStudent.status !== 'REJECTED' && (
                                    <p className="mt-2 text-xs text-gray-600">
                                        {statusEligibility.reason}
                                    </p>
                                )}
                        </div>
                    </section>

                    {/* Section 3: Student Profile Details */}
                    <section aria-labelledby="student-profile-heading" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3
                                id="student-profile-heading"
                                className="text-sm font-semibold text-gray-900"
                            >
                                3. Student Profile Information
                            </h3>
                            {detailRecord?.profile.updatedAt && (
                                <span className="text-xs text-gray-500">
                                    Profile updated:{' '}
                                    {formatStaffDateTime(detailRecord.profile.updatedAt)}
                                </span>
                            )}
                        </div>

                        {isLoadingDetail ? (
                            <div
                                role="status"
                                className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700"
                            >
                                <div
                                    className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
                                    aria-hidden="true"
                                />
                                <span>Loading verified student profile details...</span>
                            </div>
                        ) : detailError ? (
                            <div
                                role={detailError.isBackendUnavailable ? 'status' : 'alert'}
                                className={`space-y-2 rounded-md border p-4 text-xs ${
                                    detailError.isBackendUnavailable
                                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                                        : 'border-red-200 bg-red-50 text-red-800'
                                }`}
                            >
                                <p className="font-medium">{detailError.message}</p>
                                <p>
                                    Profile editing is disabled until the saved record is loaded from
                                    the backend (<code className="font-mono">GET /api/school/students/:id</code>),
                                    preventing partial overwrites.
                                </p>
                                <button
                                    type="button"
                                    onClick={onRetryDetail}
                                    className="rounded border border-gray-300 bg-white px-2.5 py-1 font-medium text-gray-800 hover:bg-gray-50"
                                >
                                    Retry Load Profile
                                </button>
                            </div>
                        ) : canRenderProfileForm ? (
                            <form onSubmit={handleSubmitProfile} noValidate className="space-y-4">
                                {profileNotice && (
                                    <div
                                        role="status"
                                        className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
                                    >
                                        {profileNotice}
                                    </div>
                                )}
                                {profileError && (
                                    <div
                                        role="alert"
                                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                                    >
                                        {profileError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                    <div>
                                        <label
                                            htmlFor="edit-student-first-name"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            First Name <span className="text-red-600">*</span>
                                        </label>
                                        <input
                                            id="edit-student-first-name"
                                            type="text"
                                            disabled={isMutating}
                                            maxLength={STUDENT_LIMITS.NAME_MAX}
                                            value={formValues.firstName}
                                            onChange={(e) =>
                                                handleFieldChange('firstName', e.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        />
                                        {fieldErrors.firstName && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.firstName}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-student-last-name"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Last Name <span className="text-red-600">*</span>
                                        </label>
                                        <input
                                            id="edit-student-last-name"
                                            type="text"
                                            disabled={isMutating}
                                            maxLength={STUDENT_LIMITS.NAME_MAX}
                                            value={formValues.lastName}
                                            onChange={(e) =>
                                                handleFieldChange('lastName', e.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        />
                                        {fieldErrors.lastName && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.lastName}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-student-code"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Student Code / Admission No.
                                        </label>
                                        <input
                                            id="edit-student-code"
                                            type="text"
                                            disabled={isMutating}
                                            maxLength={STUDENT_LIMITS.STUDENT_CODE_MAX}
                                            value={formValues.studentCode}
                                            onChange={(e) =>
                                                handleFieldChange('studentCode', e.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        />
                                        {fieldErrors.studentCode && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.studentCode}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-student-phone"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Phone
                                        </label>
                                        <input
                                            id="edit-student-phone"
                                            type="tel"
                                            disabled={isMutating}
                                            maxLength={STUDENT_LIMITS.PHONE_MAX}
                                            value={formValues.phone}
                                            onChange={(e) =>
                                                handleFieldChange('phone', e.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        />
                                        {fieldErrors.phone && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.phone}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-student-dob"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Date of Birth
                                        </label>
                                        <input
                                            id="edit-student-dob"
                                            type="date"
                                            disabled={isMutating}
                                            value={formValues.dateOfBirth}
                                            onChange={(e) =>
                                                handleFieldChange('dateOfBirth', e.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        />
                                        {fieldErrors.dateOfBirth && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.dateOfBirth}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-student-gender"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Gender
                                        </label>
                                        <select
                                            id="edit-student-gender"
                                            disabled={isMutating}
                                            value={formValues.gender}
                                            onChange={(e) =>
                                                handleFieldChange('gender', e.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        >
                                            <option value="">Unspecified</option>
                                            {STUDENT_GENDERS.map((g) => (
                                                <option key={g} value={g}>
                                                    {formatStudentGenderLabel(g)}
                                                </option>
                                            ))}
                                            {formValues.gender &&
                                                !STUDENT_GENDERS.includes(
                                                    formValues.gender as (typeof STUDENT_GENDERS)[number]
                                                ) && (
                                                    <option value={formValues.gender}>
                                                        {formValues.gender}
                                                    </option>
                                                )}
                                        </select>
                                        {fieldErrors.gender && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.gender}
                                            </p>
                                        )}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label
                                            htmlFor="edit-student-address"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Address
                                        </label>
                                        <input
                                            id="edit-student-address"
                                            type="text"
                                            disabled={isMutating}
                                            maxLength={STUDENT_LIMITS.ADDRESS_MAX}
                                            value={formValues.address}
                                            onChange={(e) =>
                                                handleFieldChange('address', e.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        />
                                        {fieldErrors.address && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.address}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-student-emergency-name"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Emergency Contact Name
                                        </label>
                                        <input
                                            id="edit-student-emergency-name"
                                            type="text"
                                            disabled={isMutating}
                                            maxLength={STUDENT_LIMITS.EMERGENCY_NAME_MAX}
                                            value={formValues.emergencyContactName}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    'emergencyContactName',
                                                    e.target.value
                                                )
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        />
                                        {fieldErrors.emergencyContactName && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.emergencyContactName}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-student-emergency-phone"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Emergency Contact Phone
                                        </label>
                                        <input
                                            id="edit-student-emergency-phone"
                                            type="tel"
                                            disabled={isMutating}
                                            maxLength={STUDENT_LIMITS.PHONE_MAX}
                                            value={formValues.emergencyContactPhone}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    'emergencyContactPhone',
                                                    e.target.value
                                                )
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        />
                                        {fieldErrors.emergencyContactPhone && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.emergencyContactPhone}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="edit-student-emergency-relation"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Emergency Contact Relationship
                                        </label>
                                        <input
                                            id="edit-student-emergency-relation"
                                            type="text"
                                            disabled={isMutating}
                                            maxLength={STUDENT_LIMITS.EMERGENCY_RELATION_MAX}
                                            value={formValues.emergencyContactRelation}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    'emergencyContactRelation',
                                                    e.target.value
                                                )
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        />
                                        {fieldErrors.emergencyContactRelation && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.emergencyContactRelation}
                                            </p>
                                        )}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label
                                            htmlFor="edit-student-notes"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Administrative Notes
                                        </label>
                                        <textarea
                                            id="edit-student-notes"
                                            rows={2}
                                            disabled={isMutating}
                                            maxLength={STUDENT_LIMITS.NOTES_MAX}
                                            value={formValues.notes}
                                            onChange={(e) =>
                                                handleFieldChange('notes', e.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        />
                                        {fieldErrors.notes && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        disabled={isMutating || !isProfileDirty}
                                        onClick={() => {
                                            setDraftValues(null);
                                            setFieldErrors({});
                                            setProfileError(null);
                                        }}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                                    >
                                        Reset Changes
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isMutating || !isProfileDirty}
                                        className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isMutating ? 'Saving Profile...' : 'Save Student Profile'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-2">
                                {!canUpdateStudents && (
                                    <p className="text-xs text-gray-500">
                                        Read-only profile view (editing requires{' '}
                                        <code className="font-mono">
                                            {PERMISSIONS.STUDENTS.UPDATE}
                                        </code>
                                        ).
                                    </p>
                                )}
                                <dl className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
                                    <div>
                                        <dt className="font-medium text-gray-500">Student Code</dt>
                                        <dd className="mt-0.5 text-gray-900">
                                            {detailRecord?.profile.studentCode ??
                                                activeStudent.studentCode ??
                                                '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-gray-500">Phone</dt>
                                        <dd className="mt-0.5 text-gray-900">
                                            {detailRecord?.profile.phone ??
                                                activeStudent.phone ??
                                                '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-gray-500">Date of Birth</dt>
                                        <dd className="mt-0.5 text-gray-900">
                                            {formatIsoDateDisplay(
                                                detailRecord?.profile.dateOfBirth
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-gray-500">Gender</dt>
                                        <dd className="mt-0.5 text-gray-900">
                                            {formatStudentGenderLabel(detailRecord?.profile.gender)}
                                        </dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="font-medium text-gray-500">Address</dt>
                                        <dd className="mt-0.5 text-gray-900">
                                            {detailRecord?.profile.address ?? '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-gray-500">
                                            Emergency Contact
                                        </dt>
                                        <dd className="mt-0.5 text-gray-900">
                                            {detailRecord?.profile.emergencyContactName ?? '—'}
                                            {detailRecord?.profile.emergencyContactRelation
                                                ? ` (${detailRecord.profile.emergencyContactRelation})`
                                                : ''}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-gray-500">
                                            Emergency Phone
                                        </dt>
                                        <dd className="mt-0.5 text-gray-900">
                                            {detailRecord?.profile.emergencyContactPhone ?? '—'}
                                        </dd>
                                    </div>
                                    {detailRecord?.profile.notes && (
                                        <div className="sm:col-span-3">
                                            <dt className="font-medium text-gray-500">Notes</dt>
                                            <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">
                                                {detailRecord.profile.notes}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        )}
                    </section>

                    {/* Section 4: Program & Standalone Course Enrollments */}
                    <StudentEnrollmentsSection
                        student={activeStudent}
                        studentEligibility={enrollment.studentEligibility}
                        canReadStudents={enrollmentPermissions.canReadStudents}
                        canReadEnrollments={enrollmentPermissions.canReadEnrollments}
                        canCreateEnrollments={enrollmentPermissions.canCreateEnrollments}
                        canUpdateEnrollments={enrollmentPermissions.canUpdateEnrollments}
                        canCancelEnrollments={enrollmentPermissions.canCancelEnrollments}
                        canReadPrograms={enrollmentPermissions.canReadPrograms}
                        canReadSections={enrollmentPermissions.canReadSections}
                        isLoadingStudentDetail={isLoadingDetail}
                        hasStudentDetailError={Boolean(detailError)}
                        enrollments={enrollment.enrollments}
                        groupedEnrollments={enrollment.groupedEnrollments}
                        academicYearsById={enrollment.academicYearsById}
                        enrollmentsLoaded={enrollment.enrollmentsLoaded}
                        isLoadingEnrollments={enrollment.isLoadingEnrollments}
                        enrollmentsError={enrollment.enrollmentsError}
                        inspectedHistoryEnrollmentId={enrollment.inspectedHistoryEnrollmentId}
                        enrollmentHistory={enrollment.enrollmentHistory}
                        isLoadingHistory={enrollment.isLoadingHistory}
                        historyError={enrollment.historyError}
                        programChangeRequests={enrollment.programChangeRequests}
                        isLoadingProgramChanges={enrollment.isLoadingProgramChanges}
                        programChangesError={enrollment.programChangesError}
                        isMutatingEnrollment={enrollment.isMutatingEnrollment}
                        enrollmentNotice={enrollment.enrollmentNotice}
                        enrollmentActionError={enrollment.enrollmentActionError}
                        onClearFeedback={enrollment.clearEnrollmentFeedback}
                        onRetryEnrollments={enrollment.reloadEnrollments}
                        onOpenCreateEnrollment={enrollment.openCreateEnrollmentDialog}
                        onRequestLifecycleAction={enrollment.openLifecycleActionDialog}
                        onOpenSectionTransfer={enrollment.openSectionTransferDialog}
                        onOpenProgramChangeRequest={enrollment.openProgramChangeRequestDialog}
                        onToggleEnrollmentHistory={enrollment.toggleEnrollmentHistory}
                        onRetryHistory={enrollment.reloadHistory}
                        onRetryProgramChanges={enrollment.reloadProgramChanges}
                    />

                    <div className="flex items-center justify-end border-t border-gray-200 pt-4">
                        <button
                            type="button"
                            disabled={isMutating || enrollment.isMutatingEnrollment}
                            onClick={requestClose}
                            className="rounded-md bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </AcademicModalShell>

            {enrollment.createDialogOpen &&
                enrollmentPermissions.canReadStudents &&
                enrollmentPermissions.canCreateEnrollments &&
                enrollment.studentEligibility.allowed && (
                    <EnrollmentCreationModal
                        student={activeStudent}
                        canReadEnrollments={enrollmentPermissions.canReadEnrollments}
                        canCreateEnrollments={enrollmentPermissions.canCreateEnrollments}
                        canReadPrograms={enrollmentPermissions.canReadPrograms}
                        canReadCourses={enrollmentPermissions.canReadCourses}
                        canReadAcademicYears={enrollmentPermissions.canReadAcademicYears}
                        canReadSections={enrollmentPermissions.canReadSections}
                        enrollmentsLoaded={enrollment.enrollmentsLoaded}
                        existingEnrollments={enrollment.enrollments}
                        programs={enrollment.programs}
                        isLoadingPrograms={enrollment.isLoadingPrograms}
                        programsError={enrollment.programsError}
                        standaloneCourses={enrollment.standaloneCourses}
                        isLoadingCourses={enrollment.isLoadingCourses}
                        coursesError={enrollment.coursesError}
                        academicYears={enrollment.academicYears}
                        isLoadingYears={enrollment.isLoadingYears}
                        yearsError={enrollment.yearsError}
                        sections={enrollment.classSections}
                        isLoadingSections={enrollment.isLoadingSections}
                        sectionsError={enrollment.sectionsError}
                        isSubmitting={enrollment.isMutatingEnrollment}
                        onCreationTypeChange={enrollment.setActiveCreationType}
                        onSelectedClassChange={enrollment.setSelectedClassIdForSections}
                        onRetryPrograms={enrollment.reloadProgramsLookup}
                        onRetryCourses={enrollment.reloadCoursesLookup}
                        onRetryYears={enrollment.reloadYearsLookup}
                        onRetrySections={enrollment.reloadSectionsLookup}
                        onSubmitProgramEnrollment={enrollment.submitProgramEnrollment}
                        onSubmitStandaloneCourseEnrollment={
                            enrollment.submitStandaloneCourseEnrollment
                        }
                        onClose={enrollment.closeCreateEnrollmentDialog}
                    />
                )}

            {enrollment.lifecycleDialogTarget && enrollmentPermissions.canReadStudents && (
                <EnrollmentLifecycleConfirmModal
                    student={activeStudent}
                    enrollment={enrollment.lifecycleDialogTarget.enrollment}
                    targetStatus={enrollment.lifecycleDialogTarget.targetStatus}
                    existingEnrollments={enrollment.enrollments}
                    academicYear={
                        enrollment.lifecycleDialogTarget.enrollment.academicYearId
                            ? enrollment.academicYearsById.get(
                                  enrollment.lifecycleDialogTarget.enrollment.academicYearId
                              ) ?? null
                            : null
                    }
                    canUpdateEnrollments={enrollmentPermissions.canUpdateEnrollments}
                    canCancelEnrollments={enrollmentPermissions.canCancelEnrollments}
                    isSubmitting={enrollment.isMutatingEnrollment}
                    onSubmitStatusUpdate={enrollment.submitEnrollmentStatusUpdate}
                    onClose={enrollment.closeLifecycleActionDialog}
                />
            )}

            {enrollment.transferDialogEnrollment &&
                enrollmentPermissions.canReadStudents &&
                enrollmentPermissions.canUpdateEnrollments &&
                enrollmentPermissions.canReadSections && (
                    <SectionTransferModal
                        student={activeStudent}
                        enrollment={enrollment.transferDialogEnrollment}
                        academicYear={
                            enrollment.transferDialogEnrollment.academicYearId
                                ? enrollment.academicYearsById.get(
                                      enrollment.transferDialogEnrollment.academicYearId
                                  ) ?? null
                                : null
                        }
                        canUpdateEnrollments={enrollmentPermissions.canUpdateEnrollments}
                        canReadSections={enrollmentPermissions.canReadSections}
                        sections={enrollment.classSections}
                        isLoadingSections={enrollment.isLoadingSections}
                        sectionsError={enrollment.sectionsError}
                        isSubmitting={enrollment.isMutatingEnrollment}
                        onRetrySections={enrollment.reloadSectionsLookup}
                        onSubmitTransfer={enrollment.submitSectionTransfer}
                        onClose={enrollment.closeSectionTransferDialog}
                    />
                )}

            {enrollment.programChangeDialogSource &&
                enrollmentPermissions.canReadStudents &&
                enrollmentPermissions.canUpdateEnrollments &&
                enrollmentPermissions.canReadPrograms &&
                enrollment.studentEligibility.allowed && (
                    <ProgramChangeRequestModal
                        student={activeStudent}
                        sourceEnrollment={enrollment.programChangeDialogSource}
                        academicYear={
                            enrollment.programChangeDialogSource.academicYearId
                                ? enrollment.academicYearsById.get(
                                      enrollment.programChangeDialogSource.academicYearId
                                  ) ?? null
                                : null
                        }
                        existingProgramChangeRequests={enrollment.programChangeRequests}
                        canUpdateEnrollments={enrollmentPermissions.canUpdateEnrollments}
                        canReadPrograms={enrollmentPermissions.canReadPrograms}
                        canReadSections={enrollmentPermissions.canReadSections}
                        programs={enrollment.programs}
                        isLoadingPrograms={enrollment.isLoadingPrograms}
                        programsError={enrollment.programsError}
                        sections={enrollment.classSections}
                        isLoadingSections={enrollment.isLoadingSections}
                        sectionsError={enrollment.sectionsError}
                        isSubmitting={enrollment.isMutatingEnrollment}
                        onTargetClassChange={enrollment.setTargetClassIdForProgramChange}
                        onRetryPrograms={enrollment.reloadProgramsLookup}
                        onRetrySections={enrollment.reloadSectionsLookup}
                        onSubmitProgramChangeRequest={enrollment.submitProgramChangeRequest}
                        onClose={enrollment.closeProgramChangeRequestDialog}
                    />
                )}

            {lifecycleAction && (
                <StudentLifecycleConfirmDialog
                    action={lifecycleAction}
                    isSubmitting={isMutating}
                    onCancel={() => setLifecycleAction(null)}
                    onConfirm={async (reason) => {
                        const target = lifecycleAction;
                        let outcome: StudentSubmitOutcome;
                        if (target.kind === 'APPROVE') {
                            outcome = await onDecideRegistration(target.student, 'APPROVE', reason);
                        } else if (target.kind === 'REJECT') {
                            outcome = await onDecideRegistration(target.student, 'REJECT', reason);
                        } else {
                            outcome = await onToggleStatus(target.student, reason);
                        }
                        if (outcome.ok || lifecycleAction) {
                            setLifecycleAction(null);
                        }
                    }}
                />
            )}

            {showDiscardConfirm && (
                <AcademicConfirmDialog
                    title="Discard Unsaved Profile Changes?"
                    message="You have unsaved edits on this student profile."
                    warningNote="Closing now will discard your unsaved profile edits."
                    confirmLabel="Discard & Close"
                    tone="warning"
                    isSubmitting={false}
                    onCancel={() => setShowDiscardConfirm(false)}
                    onConfirm={() => {
                        setShowDiscardConfirm(false);
                        onClose();
                    }}
                />
            )}
        </>
    );
};

