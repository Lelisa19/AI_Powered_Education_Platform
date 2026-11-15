import React, { useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import { AcademicModalShell } from '../../academic/components/AcademicConfirmDialog';
import type { StudentSubmitOutcome } from '../hooks/useStudentManagement';
import {
    STUDENT_GENDERS,
    STUDENT_LIMITS,
    createEmptyCreateStudentFormValues,
    formatStudentGenderLabel,
    mapBackendFieldValidationErrors,
    validateCreateStudentForm,
} from '../schemas/student-management-schema';
import type {
    CreateStudentFieldErrors,
    CreateStudentFieldName,
    CreateStudentFormValues,
    CreateStudentRequest,
} from '../types/student-management.types';

const CREATE_STUDENT_ERROR_FIELDS: readonly CreateStudentFieldName[] = [
    'firstName',
    'lastName',
    'email',
    'studentCode',
    'phone',
    'dateOfBirth',
    'gender',
    'address',
    'emergencyContactName',
    'emergencyContactPhone',
    'emergencyContactRelation',
    'notes',
];

interface CreateStudentModalProps {
    schoolDisplayName: string;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmitCreate: (payload: CreateStudentRequest) => Promise<StudentSubmitOutcome>;
}

export const CreateStudentModal: React.FC<CreateStudentModalProps> = ({
    schoolDisplayName,
    isSubmitting,
    onClose,
    onSubmitCreate,
}) => {
    const [values, setValues] = useState<CreateStudentFormValues>(() =>
        createEmptyCreateStudentFormValues()
    );
    const [fieldErrors, setFieldErrors] = useState<CreateStudentFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isUnavailable, setIsUnavailable] = useState(false);

    const handleFieldChange = <K extends keyof CreateStudentFormValues>(
        field: K,
        value: CreateStudentFormValues[K]
    ) => {
        setSubmitError(null);
        setIsUnavailable(false);
        setValues((prev) => ({ ...prev, [field]: value }));
        setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setSubmitError(null);
        setIsUnavailable(false);

        const validation = validateCreateStudentForm(values);
        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        const outcome = await onSubmitCreate(validation.payload);
        if (outcome.ok) {
            onClose();
            return;
        }

        if (outcome.error instanceof ApiError && outcome.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(
                    outcome.error.validationErrors,
                    CREATE_STUDENT_ERROR_FIELDS
                )
            );
        }
        setIsUnavailable(outcome.isBackendUnavailable);
        setSubmitError(outcome.errorMessage ?? 'Unable to create student onboarding record.');
    };

    return (
        <AcademicModalShell
            title="Onboard Student via Activation Link"
            subtitle={`Create a student record for ${schoolDisplayName}. No admin-created passwords or tokens are exposed here.`}
            isSubmitting={isSubmitting}
            onClose={onClose}
            maxWidthClass="max-w-2xl"
        >
            <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-4">
                <div
                    role="note"
                    className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-950"
                >
                    Activation-Link Onboarding (<code className="font-mono">PENDING_ACTIVATION</code>
                    ): Submitting creates the student in <strong>Pending Activation</strong> status
                    and sends an email activation link from the server so the student sets their own
                    password. Until the student completes activation, the account cannot sign in to
                    the Student Portal, be approved via self-registration review, or enroll in
                    Programs/Courses (Step 5.10.3).
                </div>

                {submitError && (
                    <div
                        role={isUnavailable ? 'status' : 'alert'}
                        className={`rounded-md border p-3 text-xs ${
                            isUnavailable
                                ? 'border-amber-200 bg-amber-50 text-amber-900'
                                : 'border-red-200 bg-red-50 text-red-800'
                        }`}
                    >
                        {isUnavailable
                            ? `Student creation endpoint (POST /api/school/students) is pending backend implementation (${submitError}). Your form entries are preserved.`
                            : submitError}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="create-student-first-name"
                            className="block text-xs font-medium text-gray-700"
                        >
                            First Name <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="create-student-first-name"
                            type="text"
                            required
                            disabled={isSubmitting}
                            maxLength={STUDENT_LIMITS.NAME_MAX}
                            value={values.firstName}
                            onChange={(e) => handleFieldChange('firstName', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.firstName)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.firstName && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.firstName}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="create-student-last-name"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Last Name <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="create-student-last-name"
                            type="text"
                            required
                            disabled={isSubmitting}
                            maxLength={STUDENT_LIMITS.NAME_MAX}
                            value={values.lastName}
                            onChange={(e) => handleFieldChange('lastName', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.lastName)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.lastName && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.lastName}
                            </p>
                        )}
                    </div>

                    <div className="sm:col-span-2">
                        <label
                            htmlFor="create-student-email"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Student Email Address <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="create-student-email"
                            type="email"
                            required
                            disabled={isSubmitting}
                            maxLength={STUDENT_LIMITS.EMAIL_MAX}
                            value={values.email}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            placeholder="student@school.edu"
                            aria-invalid={Boolean(fieldErrors.email)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.email && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.email}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="create-student-code"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Student Code / Admission No.{' '}
                            <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="create-student-code"
                            type="text"
                            disabled={isSubmitting}
                            maxLength={STUDENT_LIMITS.STUDENT_CODE_MAX}
                            value={values.studentCode}
                            onChange={(e) => handleFieldChange('studentCode', e.target.value)}
                            placeholder="e.g. STU-2026-001"
                            aria-invalid={Boolean(fieldErrors.studentCode)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.studentCode && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.studentCode}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="create-student-phone"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Phone <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="create-student-phone"
                            type="tel"
                            disabled={isSubmitting}
                            maxLength={STUDENT_LIMITS.PHONE_MAX}
                            value={values.phone}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.phone)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.phone && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.phone}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="create-student-dob"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Date of Birth{' '}
                            <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="create-student-dob"
                            type="date"
                            disabled={isSubmitting}
                            value={values.dateOfBirth}
                            onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.dateOfBirth)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.dateOfBirth && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.dateOfBirth}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="create-student-gender"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Gender <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <select
                            id="create-student-gender"
                            disabled={isSubmitting}
                            value={values.gender}
                            onChange={(e) => handleFieldChange('gender', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.gender)}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            <option value="">Unspecified</option>
                            {STUDENT_GENDERS.map((g) => (
                                <option key={g} value={g}>
                                    {formatStudentGenderLabel(g)}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.gender && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.gender}
                            </p>
                        )}
                    </div>

                    <div className="sm:col-span-2">
                        <label
                            htmlFor="create-student-address"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Address <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="create-student-address"
                            type="text"
                            disabled={isSubmitting}
                            maxLength={STUDENT_LIMITS.ADDRESS_MAX}
                            value={values.address}
                            onChange={(e) => handleFieldChange('address', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.address)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.address && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.address}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="create-student-emergency-name"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Emergency Contact Name{' '}
                            <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="create-student-emergency-name"
                            type="text"
                            disabled={isSubmitting}
                            maxLength={STUDENT_LIMITS.EMERGENCY_NAME_MAX}
                            value={values.emergencyContactName}
                            onChange={(e) =>
                                handleFieldChange('emergencyContactName', e.target.value)
                            }
                            aria-invalid={Boolean(fieldErrors.emergencyContactName)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.emergencyContactName && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.emergencyContactName}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="create-student-emergency-phone"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Emergency Contact Phone{' '}
                            <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="create-student-emergency-phone"
                            type="tel"
                            disabled={isSubmitting}
                            maxLength={STUDENT_LIMITS.PHONE_MAX}
                            value={values.emergencyContactPhone}
                            onChange={(e) =>
                                handleFieldChange('emergencyContactPhone', e.target.value)
                            }
                            aria-invalid={Boolean(fieldErrors.emergencyContactPhone)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.emergencyContactPhone && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.emergencyContactPhone}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="create-student-emergency-relation"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Emergency Contact Relationship{' '}
                            <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="create-student-emergency-relation"
                            type="text"
                            disabled={isSubmitting}
                            maxLength={STUDENT_LIMITS.EMERGENCY_RELATION_MAX}
                            value={values.emergencyContactRelation}
                            onChange={(e) =>
                                handleFieldChange('emergencyContactRelation', e.target.value)
                            }
                            placeholder="e.g. Next of Kin, Relative, Sibling"
                            aria-invalid={Boolean(fieldErrors.emergencyContactRelation)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.emergencyContactRelation && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.emergencyContactRelation}
                            </p>
                        )}
                    </div>

                    <div className="sm:col-span-2">
                        <label
                            htmlFor="create-student-notes"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Administrative Notes{' '}
                            <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <textarea
                            id="create-student-notes"
                            rows={2}
                            disabled={isSubmitting}
                            maxLength={STUDENT_LIMITS.NOTES_MAX}
                            value={values.notes}
                            onChange={(e) => handleFieldChange('notes', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.notes)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.notes && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.notes}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Creating...' : 'Create & Send Activation Link'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

