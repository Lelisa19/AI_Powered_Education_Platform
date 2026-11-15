import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    StaffAccountStatusBadge,
    StaffRoleBadge,
} from '../../school-admin/components/StaffBadges';
import { validateStaffActionReason } from '../../school-admin/schemas/school-staff-schema';
import {
    isSchoolStaffBackendUnavailableError,
    updateSchoolStaffAccountStatus,
} from '../../school-admin/services/school-staff-service';
import type { SchoolStaffAccount } from '../../school-admin/types/school-staff.types';
import {
    evaluateStaffStatusToggleEligibility,
    formatStaffDateTime,
    formatStaffFullName,
} from '../../school-admin/utils/school-staff-formatters';
import { PERMISSIONS, SCHOOL_ADMIN_ROUTE_PERMISSIONS } from '../../../constants/permissions';
import type { Permission } from '../../../types/auth';
import type {
    TeacherFunctionalPermissionKey,
    TeacherPermissionCategory,
} from '../constants/teacher-permissions';
import type { TeacherOperationErrorState } from '../hooks/useTeacherManagement';
import {
    TEACHER_BIO_MAX_LENGTH,
    TEACHER_DEPARTMENT_MAX_LENGTH,
    TEACHER_EMPLOYEE_CODE_MAX_LENGTH,
    TEACHER_PHONE_MAX_LENGTH,
    TEACHER_QUALIFICATION_MAX_LENGTH,
    TEACHER_SPECIALIZATION_MAX_LENGTH,
} from '../schemas/teacher-profile-schema';
import type {
    TeacherProfileFieldErrors,
    TeacherProfileFormValues,
    TeacherProfileRecord,
} from '../types/teacher-management.types';
import { TeacherPermissionsSection } from './TeacherPermissionsSection';

interface TeacherDetailModalProps {
    account: SchoolStaffAccount;
    teacherRecord: TeacherProfileRecord | null;
    expectedTenantId: string;
    currentActorId: string | null;
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    canUpdateTeacher: boolean;
    canManageTeacherPermissions: boolean;
    profileLoading: boolean;
    hasLoadedProfile: boolean;
    profileError: TeacherOperationErrorState | null;
    formValues: TeacherProfileFormValues;
    fieldErrors: TeacherProfileFieldErrors;
    isProfileDirty: boolean;
    isSaving: boolean;
    saveError: TeacherOperationErrorState | null;
    saveSuccessMessage: string | null;
    hasExplicitTeacherPermissionScope: boolean;
    savedTeacherPermissions: readonly TeacherFunctionalPermissionKey[];
    draftTeacherPermissions: readonly TeacherFunctionalPermissionKey[];
    preservedNonTeacherPermissions: readonly Permission[];
    isPermissionsDirty: boolean;
    isSavingPermissions: boolean;
    permissionsSaveError: TeacherOperationErrorState | null;
    permissionsSaveSuccessMessage: string | null;
    onRetryLoadProfile: () => void;
    onFieldChange: <K extends keyof TeacherProfileFormValues>(
        field: K,
        value: TeacherProfileFormValues[K]
    ) => void;
    onResetForm: () => void;
    onSaveProfile: () => Promise<boolean>;
    onToggleTeacherPermission: (permission: TeacherFunctionalPermissionKey) => void;
    onSetTeacherPermissionCategorySelection: (
        category: TeacherPermissionCategory,
        selected: boolean
    ) => void;
    onResetTeacherPermissions: () => void;
    onSaveTeacherPermissions: () => Promise<boolean>;
    onAccountUpdated: (updatedAccount: SchoolStaffAccount) => void;
    onClose: () => void;
}

export const TeacherDetailModal: React.FC<TeacherDetailModalProps> = ({
    account,
    teacherRecord,
    expectedTenantId,
    currentActorId,
    hasPermission,
    hasAnyPermission,
    canUpdateTeacher,
    canManageTeacherPermissions,
    profileLoading,
    hasLoadedProfile,
    profileError,
    formValues,
    fieldErrors,
    isProfileDirty,
    isSaving,
    saveError,
    saveSuccessMessage,
    hasExplicitTeacherPermissionScope,
    savedTeacherPermissions,
    draftTeacherPermissions,
    preservedNonTeacherPermissions,
    isPermissionsDirty,
    isSavingPermissions,
    permissionsSaveError,
    permissionsSaveSuccessMessage,
    onRetryLoadProfile,
    onFieldChange,
    onResetForm,
    onSaveProfile,
    onToggleTeacherPermission,
    onSetTeacherPermissionCategorySelection,
    onResetTeacherPermissions,
    onSaveTeacherPermissions,
    onAccountUpdated,
    onClose,
}) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [statusReason, setStatusReason] = useState('');
    const [statusReasonError, setStatusReasonError] = useState<string | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [statusError, setStatusError] = useState<TeacherOperationErrorState | null>(null);
    const [statusSuccessMessage, setStatusSuccessMessage] = useState<string | null>(null);

    const hasUnsavedChanges = isProfileDirty || isPermissionsDirty;
    const isBusy = isSaving || isSavingPermissions || isUpdatingStatus;
    const isMultiRoleAccount = account.roles.length > 1;
    const nextStatus = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const nextStatusVerb = account.status === 'ACTIVE' ? 'Deactivate' : 'Activate';

    const statusEligibility = evaluateStaffStatusToggleEligibility(
        account,
        currentActorId,
        hasPermission,
        hasAnyPermission
    );

    const requestClose = () => {
        if (isBusy) return;
        if (hasUnsavedChanges) {
            setShowDiscardConfirm(true);
            return;
        }
        onClose();
    };

    useEffect(() => {
        const frameId = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });
        return () => cancelAnimationFrame(frameId);
    }, [account.id]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            if (isBusy) return;
            if (hasUnsavedChanges) {
                setShowDiscardConfirm(true);
                return;
            }
            onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [hasUnsavedChanges, isBusy, onClose]);

    const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canUpdateTeacher || !hasLoadedProfile || profileError) {
            return;
        }
        await onSaveProfile();
    };

    const handleConfirmStatusChange = async () => {
        if (isUpdatingStatus || !statusEligibility.allowed) return;

        const reasonCheck = validateStaffActionReason(
            statusReason.trim() === '' ? undefined : statusReason
        );
        if (!reasonCheck.valid) {
            setStatusReasonError(reasonCheck.error);
            return;
        }

        setStatusReasonError(null);
        setStatusError(null);
        setStatusSuccessMessage(null);
        setIsUpdatingStatus(true);

        try {
            const response = await updateSchoolStaffAccountStatus(
                {
                    staffId: account.id,
                    status: nextStatus,
                    ...(reasonCheck.reason ? { reason: reasonCheck.reason } : {}),
                },
                expectedTenantId
            );
            onAccountUpdated(response.staff);
            setShowStatusConfirm(false);
            setStatusReason('');
            setStatusSuccessMessage(
                response.message ??
                    `Account ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`
            );
        } catch (error: unknown) {
            const unavailable = isSchoolStaffBackendUnavailableError(error);
            setStatusError({
                message: unavailable
                    ? 'Staff account status endpoint is currently unavailable or pending backend implementation. Account status was not changed.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to update staff account status.',
                isBackendUnavailable: unavailable,
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const teachingAssignments = teacherRecord?.teachingAssignments;

    const canManageAssignments =
        hasPermission(PERMISSIONS.PROGRAMS.ASSIGN_TEACHERS) ||
        hasPermission(PERMISSIONS.COURSES.ASSIGN_TEACHERS);
    const canAccessProgramsCoursesRoute = hasAnyPermission([
        ...SCHOOL_ADMIN_ROUTE_PERMISSIONS.PROGRAMS_COURSES,
    ]);
    const canNavigateToAssignments = canAccessProgramsCoursesRoute && canManageAssignments;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={requestClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="teacher-detail-modal-title"
                className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2
                                id="teacher-detail-modal-title"
                                className="text-lg font-semibold text-gray-900"
                            >
                                {formatStaffFullName(
                                    account.firstName,
                                    account.lastName,
                                    account.email
                                )}
                            </h2>
                            <StaffAccountStatusBadge
                                status={account.status}
                                isPrimaryAdmin={account.isPrimaryAdmin}
                            />
                            {hasUnsavedChanges && (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                    Unsaved Changes
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-600">{account.email}</p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {account.roles.map((role) => (
                                <StaffRoleBadge key={role} role={role} />
                            ))}
                        </div>
                    </div>

                    <button
                        ref={closeButtonRef}
                        type="button"
                        disabled={isBusy}
                        onClick={requestClose}
                        aria-label="Close teacher detail dialog"
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6 px-6 py-5">
                    {showDiscardConfirm && hasUnsavedChanges && (
                        <div
                            role="alertdialog"
                            aria-label="Confirm discarding unsaved teacher changes"
                            className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <p className="text-sm text-amber-950">
                                {isProfileDirty && isPermissionsDirty
                                    ? 'You have unsaved teacher profile and permission changes. Discard all unsaved edits and close?'
                                    : isPermissionsDirty
                                      ? 'You have unsaved teacher permission changes. Discard these edits and close?'
                                      : 'You have unsaved teacher profile changes. Discard these edits and close?'}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDiscardConfirm(false)}
                                    className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
                                >
                                    Keep Editing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDiscardConfirm(false);
                                        onClose();
                                    }}
                                    className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
                                >
                                    Discard &amp; Close
                                </button>
                            </div>
                        </div>
                    )}

                    {isMultiRoleAccount && (
                        <div
                            role="note"
                            className="rounded-md border border-indigo-200 bg-indigo-50 p-3.5 text-xs text-indigo-900"
                        >
                            <span className="font-semibold">Multi-Role Account Notice:</span> This
                            teacher holds multiple school roles ({account.roles.join(', ')}). Editing
                            teacher profile details here will not alter assigned roles or
                            permissions, and status changes affect the shared school account.
                        </div>
                    )}

                    <section aria-labelledby="teacher-identity-section-heading" className="space-y-3">
                        <h3
                            id="teacher-identity-section-heading"
                            className="text-sm font-semibold text-gray-900"
                        >
                            School Staff Account Summary
                        </h3>
                        <dl className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-xs font-medium text-gray-500">Account ID</dt>
                                <dd className="mt-0.5 font-mono text-xs text-gray-900">{account.id}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500">Primary Role</dt>
                                <dd className="mt-0.5 text-gray-900">{account.primaryRole}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500">Created At</dt>
                                <dd className="mt-0.5 text-gray-900">
                                    {formatStaffDateTime(account.createdAt)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500">Activated At</dt>
                                <dd className="mt-0.5 text-gray-900">
                                    {formatStaffDateTime(account.activatedAt)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500">Last Login</dt>
                                <dd className="mt-0.5 text-gray-900">
                                    {formatStaffDateTime(account.lastLoginAt)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500">Invited By</dt>
                                <dd className="mt-0.5 text-gray-900">
                                    {account.invitedByName ?? 'Not recorded'}
                                </dd>
                            </div>
                        </dl>
                        <p className="text-xs text-gray-500">
                            Account identity, email, login credentials, and role membership are owned
                            by the canonical School Staff account record.
                        </p>
                    </section>

                    <section aria-labelledby="teacher-profile-section-heading" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3
                                id="teacher-profile-section-heading"
                                className="text-sm font-semibold text-gray-900"
                            >
                                Teacher Professional Profile
                            </h3>
                            {teacherRecord?.profile.updatedAt && (
                                <span className="text-xs text-gray-500">
                                    Profile updated:{' '}
                                    {formatStaffDateTime(teacherRecord.profile.updatedAt)}
                                </span>
                            )}
                        </div>

                        {profileLoading ? (
                            <div
                                role="status"
                                className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
                            >
                                <div
                                    className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
                                    aria-hidden="true"
                                />
                                <span>Loading teacher professional profile details...</span>
                            </div>
                        ) : profileError ? (
                            <div className="space-y-3">
                                <div
                                    role={profileError.isBackendUnavailable ? 'status' : 'alert'}
                                    className={`rounded-md border p-4 text-sm ${
                                        profileError.isBackendUnavailable
                                            ? 'border-amber-200 bg-amber-50 text-amber-900'
                                            : 'border-red-200 bg-red-50 text-red-800'
                                    }`}
                                >
                                    <p className="font-medium">{profileError.message}</p>
                                    <p className="mt-1 text-xs">
                                        Profile editing is disabled until the saved profile record
                                        can be verified from the backend, preventing accidental
                                        overwrites. Existing staff directory contact fields remain
                                        visible below.
                                    </p>
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            onClick={onRetryLoadProfile}
                                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                                        >
                                            Retry Load Profile
                                        </button>
                                    </div>
                                </div>

                                <dl className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-white p-4 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs font-medium text-gray-500">
                                            Phone (Staff Account)
                                        </dt>
                                        <dd className="mt-0.5 text-gray-900">
                                            {account.phone ?? 'Not provided'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium text-gray-500">
                                            Department (Staff Account)
                                        </dt>
                                        <dd className="mt-0.5 text-gray-900">
                                            {account.department ?? 'Not assigned'}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        ) : (
                            <form onSubmit={handleProfileSubmit} noValidate className="space-y-4">
                                {!canUpdateTeacher && (
                                    <div
                                        role="note"
                                        className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"
                                    >
                                        Read-only mode: editing teacher professional profile
                                        details requires the{' '}
                                        <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">
                                            {PERMISSIONS.TEACHERS.UPDATE}
                                        </code>{' '}
                                        permission.
                                    </div>
                                )}

                                {saveSuccessMessage && (
                                    <div
                                        role="status"
                                        className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                                    >
                                        {saveSuccessMessage}
                                    </div>
                                )}

                                {saveError && (
                                    <div
                                        role={saveError.isBackendUnavailable ? 'status' : 'alert'}
                                        className={`rounded-md border p-3 text-sm ${
                                            saveError.isBackendUnavailable
                                                ? 'border-amber-200 bg-amber-50 text-amber-900'
                                                : 'border-red-200 bg-red-50 text-red-700'
                                        }`}
                                    >
                                        {saveError.message}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label
                                            htmlFor="teacher-profile-phone"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Phone Number
                                        </label>
                                        <input
                                            id="teacher-profile-phone"
                                            type="tel"
                                            disabled={!canUpdateTeacher || isSaving}
                                            maxLength={TEACHER_PHONE_MAX_LENGTH}
                                            value={formValues.phone}
                                            onChange={(event) =>
                                                onFieldChange('phone', event.target.value)
                                            }
                                            placeholder="+1 (555) 234-5678"
                                            aria-invalid={Boolean(fieldErrors.phone)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                        />
                                        {fieldErrors.phone && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.phone}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="teacher-profile-department"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Department
                                        </label>
                                        <input
                                            id="teacher-profile-department"
                                            type="text"
                                            disabled={!canUpdateTeacher || isSaving}
                                            maxLength={TEACHER_DEPARTMENT_MAX_LENGTH}
                                            value={formValues.department}
                                            onChange={(event) =>
                                                onFieldChange('department', event.target.value)
                                            }
                                            placeholder="e.g. Science & Mathematics"
                                            aria-invalid={Boolean(fieldErrors.department)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                        />
                                        {fieldErrors.department && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.department}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="teacher-profile-employee-code"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Employee / Faculty Code
                                        </label>
                                        <input
                                            id="teacher-profile-employee-code"
                                            type="text"
                                            disabled={!canUpdateTeacher || isSaving}
                                            maxLength={TEACHER_EMPLOYEE_CODE_MAX_LENGTH}
                                            value={formValues.employeeCode}
                                            onChange={(event) =>
                                                onFieldChange('employeeCode', event.target.value)
                                            }
                                            placeholder="e.g. TCH-042"
                                            aria-invalid={Boolean(fieldErrors.employeeCode)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                        />
                                        {fieldErrors.employeeCode && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.employeeCode}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="teacher-profile-specialization"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Specialization / Subject Focus
                                        </label>
                                        <input
                                            id="teacher-profile-specialization"
                                            type="text"
                                            disabled={!canUpdateTeacher || isSaving}
                                            maxLength={TEACHER_SPECIALIZATION_MAX_LENGTH}
                                            value={formValues.specialization}
                                            onChange={(event) =>
                                                onFieldChange('specialization', event.target.value)
                                            }
                                            placeholder="e.g. Physics & Applied Calculus"
                                            aria-invalid={Boolean(fieldErrors.specialization)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                        />
                                        {fieldErrors.specialization && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.specialization}
                                            </p>
                                        )}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label
                                            htmlFor="teacher-profile-qualification"
                                            className="block text-xs font-medium text-gray-700"
                                        >
                                            Academic Qualification / Credentials
                                        </label>
                                        <input
                                            id="teacher-profile-qualification"
                                            type="text"
                                            disabled={!canUpdateTeacher || isSaving}
                                            maxLength={TEACHER_QUALIFICATION_MAX_LENGTH}
                                            value={formValues.qualification}
                                            onChange={(event) =>
                                                onFieldChange('qualification', event.target.value)
                                            }
                                            placeholder="e.g. M.Sc. Mathematics, Certified Secondary Educator"
                                            aria-invalid={Boolean(fieldErrors.qualification)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                        />
                                        {fieldErrors.qualification && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.qualification}
                                            </p>
                                        )}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <div className="flex items-center justify-between">
                                            <label
                                                htmlFor="teacher-profile-bio"
                                                className="block text-xs font-medium text-gray-700"
                                            >
                                                Professional Bio / Summary
                                            </label>
                                            <span className="text-xs text-gray-400">
                                                {formValues.bio.length}/{TEACHER_BIO_MAX_LENGTH}
                                            </span>
                                        </div>
                                        <textarea
                                            id="teacher-profile-bio"
                                            rows={3}
                                            disabled={!canUpdateTeacher || isSaving}
                                            maxLength={TEACHER_BIO_MAX_LENGTH}
                                            value={formValues.bio}
                                            onChange={(event) =>
                                                onFieldChange('bio', event.target.value)
                                            }
                                            placeholder="Optional faculty summary, teaching background, and academic focus."
                                            aria-invalid={Boolean(fieldErrors.bio)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                                        />
                                        {fieldErrors.bio && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {fieldErrors.bio}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {canUpdateTeacher && (
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        {isProfileDirty && (
                                            <button
                                                type="button"
                                                disabled={isSaving}
                                                onClick={onResetForm}
                                                className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Reset Changes
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={!isProfileDirty || isSaving}
                                            className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isSaving ? 'Saving Profile...' : 'Save Teacher Profile'}
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}
                    </section>

                    <section aria-labelledby="teacher-assignments-section-heading" className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h3
                                    id="teacher-assignments-section-heading"
                                    className="text-sm font-semibold text-gray-900"
                                >
                                    Teaching Assignments (Read-Only)
                                </h3>
                                <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                    Managed in Programs &amp; Courses
                                </span>
                            </div>
                            {canNavigateToAssignments && (
                                <Link
                                    to="/admin/programs-courses"
                                    onClick={onClose}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                    Manage Assignments →
                                </Link>
                            )}
                        </div>

                        {teachingAssignments && teachingAssignments.length > 0 ? (
                            <div className="overflow-x-auto rounded-md border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-50 text-left font-medium text-gray-500">
                                        <tr>
                                            <th className="px-3 py-2">Course</th>
                                            <th className="px-3 py-2">Offering / Program</th>
                                            <th className="px-3 py-2">Academic Period</th>
                                            <th className="px-3 py-2">Section</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white text-gray-700">
                                        {teachingAssignments.map((assignment) => {
                                            const isStandalone =
                                                assignment.scope === 'STANDALONE_COURSE' ||
                                                (assignment.scope === undefined &&
                                                    !assignment.programName);

                                            return (
                                                <tr key={assignment.id}>
                                                    <td className="px-3 py-2 font-medium text-gray-900">
                                                        {assignment.courseTitle}
                                                        {assignment.courseCode
                                                            ? ` (${assignment.courseCode})`
                                                            : ''}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {isStandalone ? (
                                                            <span className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
                                                                Standalone Course
                                                            </span>
                                                        ) : (
                                                            assignment.programName || 'Program Course'
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {[
                                                            assignment.academicYearName,
                                                            assignment.termName,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ') || '—'}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {assignment.sectionName ?? '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-600">
                                No teaching assignments reported. Assigning or unassigning teachers to
                                Program or Standalone courses is managed inside Programs &amp; Courses
                                Management, outside the scope of this Teacher Profile workspace.
                            </div>
                        )}
                    </section>

                    <TeacherPermissionsSection
                        accountRoles={account.roles}
                        canManageTeacherPermissions={canManageTeacherPermissions}
                        hasExplicitTeacherPermissionScope={hasExplicitTeacherPermissionScope}
                        savedTeacherPermissions={savedTeacherPermissions}
                        draftTeacherPermissions={draftTeacherPermissions}
                        preservedNonTeacherPermissions={preservedNonTeacherPermissions}
                        isPermissionsDirty={isPermissionsDirty}
                        isSavingPermissions={isSavingPermissions}
                        permissionsSaveError={permissionsSaveError}
                        permissionsSaveSuccessMessage={permissionsSaveSuccessMessage}
                        onTogglePermission={onToggleTeacherPermission}
                        onSetCategorySelection={onSetTeacherPermissionCategorySelection}
                        onResetPermissions={onResetTeacherPermissions}
                        onSavePermissions={onSaveTeacherPermissions}
                    />

                    <section aria-labelledby="teacher-lifecycle-section-heading" className="space-y-3 border-t border-gray-200 pt-5">
                        <h3
                            id="teacher-lifecycle-section-heading"
                            className="text-sm font-semibold text-gray-900"
                        >
                            Account Status Lifecycle
                        </h3>

                        {statusSuccessMessage && (
                            <div
                                role="status"
                                className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                            >
                                {statusSuccessMessage}
                            </div>
                        )}

                        {statusError && (
                            <div
                                role={statusError.isBackendUnavailable ? 'status' : 'alert'}
                                className={`rounded-md border p-3 text-sm ${
                                    statusError.isBackendUnavailable
                                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                                        : 'border-red-200 bg-red-50 text-red-700'
                                }`}
                            >
                                {statusError.message}
                            </div>
                        )}

                        {!statusEligibility.allowed ? (
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-700">
                                <span className="font-semibold">Status Change Restricted:</span>{' '}
                                {statusEligibility.reason ??
                                    'Account status cannot be modified from your current session.'}
                            </div>
                        ) : !showStatusConfirm ? (
                            <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-gray-700">
                                    {account.status === 'ACTIVE'
                                        ? 'Deactivating revokes active sign-in access without deleting historical teaching records.'
                                        : 'Reactivating restores school sign-in access for this account under existing roles.'}
                                    {isMultiRoleAccount
                                        ? ' Note: This impacts all roles assigned to this account.'
                                        : ''}
                                </p>
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => {
                                        setStatusError(null);
                                        setStatusSuccessMessage(null);
                                        setStatusReasonError(null);
                                        setShowStatusConfirm(true);
                                    }}
                                    className={`shrink-0 rounded-md px-3.5 py-2 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                                        account.status === 'ACTIVE'
                                            ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50 focus:ring-red-600'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600'
                                    }`}
                                >
                                    {nextStatusVerb} Account
                                </button>
                            </div>
                        ) : (
                            <div
                                role="alertdialog"
                                aria-label={`Confirm ${nextStatusVerb.toLowerCase()} teacher account`}
                                className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4"
                            >
                                <p className="text-sm font-semibold text-amber-950">
                                    Confirm {nextStatusVerb}{' '}
                                    {formatStaffFullName(
                                        account.firstName,
                                        account.lastName,
                                        account.email
                                    )}{' '}
                                    ({account.email})
                                </p>
                                <p className="text-xs text-amber-900">
                                    {account.status === 'ACTIVE'
                                        ? 'The staff member will no longer be able to sign in to this school workspace until reactivated.'
                                        : 'The staff member will regain school workspace access under their existing permissions.'}
                                    {isMultiRoleAccount
                                        ? ` Warning: This account also holds non-teacher role(s) (${account.roles.filter((r) => r !== 'TEACHER').join(', ')}).`
                                        : ''}
                                </p>
                                <div>
                                    <label
                                        htmlFor="teacher-status-action-reason"
                                        className="block text-xs font-medium text-amber-950"
                                    >
                                        Reason / Audit Note{' '}
                                        <span className="font-normal text-amber-800">
                                            (Optional)
                                        </span>
                                    </label>
                                    <input
                                        id="teacher-status-action-reason"
                                        type="text"
                                        disabled={isUpdatingStatus}
                                        maxLength={500}
                                        value={statusReason}
                                        onChange={(event) => {
                                            setStatusReason(event.target.value);
                                            if (statusReasonError) setStatusReasonError(null);
                                        }}
                                        placeholder="Optional reason recorded by backend audit log"
                                        className="mt-1 block w-full rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                    {statusReasonError && (
                                        <p className="mt-1 text-xs text-red-700">
                                            {statusReasonError}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                        type="button"
                                        disabled={isUpdatingStatus}
                                        onClick={() => {
                                            setShowStatusConfirm(false);
                                            setStatusReason('');
                                            setStatusReasonError(null);
                                        }}
                                        className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isUpdatingStatus}
                                        onClick={handleConfirmStatusChange}
                                        className={`rounded-md px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50 ${
                                            account.status === 'ACTIVE'
                                                ? 'bg-red-600 hover:bg-red-700'
                                                : 'bg-emerald-600 hover:bg-emerald-700'
                                        }`}
                                    >
                                        {isUpdatingStatus
                                            ? 'Updating Status...'
                                            : `Confirm ${nextStatusVerb}`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                <div className="flex items-center justify-end border-t border-gray-200 bg-gray-50 px-6 py-3.5">
                    <button
                        type="button"
                        disabled={isBusy}
                        onClick={requestClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
