import React, { useMemo, useState } from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { ApiError } from '../../../services/api/api-error';
import { AcademicModalShell } from '../../academic/components/AcademicConfirmDialog';
import type { AcademicSection, AcademicYear } from '../../academic/types/academic-structure.types';
import { formatStudentFullName } from '../../students/schemas/student-management-schema';
import type { StudentDirectoryItem } from '../../students/types/student-management.types';
import type {
    EnrollmentFetchError,
    EnrollmentMutationOutcome,
} from '../hooks/useStudentEnrollments';
import {
    ENROLLMENT_LIMITS,
    evaluateSectionTransferEligibility,
    mapBackendFieldValidationErrors,
    validateSectionTransferForm,
} from '../schemas/enrollment-schema';
import type {
    SectionTransferFieldErrors,
    SectionTransferFieldName,
    SectionTransferFormValues,
    SectionTransferRequest,
    StudentEnrollmentRecord,
} from '../types/enrollment.types';

const TRANSFER_ERROR_FIELDS: readonly SectionTransferFieldName[] = [
    'targetSectionId',
    'reason',
];

interface SectionTransferModalProps {
    student: StudentDirectoryItem;
    enrollment: StudentEnrollmentRecord;
    academicYear?: AcademicYear | null;
    canUpdateEnrollments: boolean;
    canReadSections: boolean;
    sections: readonly AcademicSection[];
    isLoadingSections: boolean;
    sectionsError: EnrollmentFetchError | null;
    isSubmitting: boolean;
    onRetrySections: () => void;
    onSubmitTransfer: (
        enrollment: StudentEnrollmentRecord,
        request: SectionTransferRequest,
        targetSection: AcademicSection
    ) => Promise<EnrollmentMutationOutcome>;
    onClose: () => void;
}

export const SectionTransferModal: React.FC<SectionTransferModalProps> = ({
    student,
    enrollment,
    academicYear,
    canUpdateEnrollments,
    canReadSections,
    sections,
    isLoadingSections,
    sectionsError,
    isSubmitting,
    onRetrySections,
    onSubmitTransfer,
    onClose,
}) => {
    const [values, setValues] = useState<SectionTransferFormValues>({
        targetSectionId: '',
        reason: '',
    });
    const [fieldErrors, setFieldErrors] = useState<SectionTransferFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const fullName = formatStudentFullName(
        student.firstName,
        student.lastName,
        student.email
    );

    const eligibility = useMemo(
        () =>
            evaluateSectionTransferEligibility({
                enrollment,
                student,
                academicYear,
                canUpdateEnrollments,
                canReadSections,
            }),
        [academicYear, canReadSections, canUpdateEnrollments, enrollment, student]
    );

    const eligibleTargetSections = useMemo(
        () =>
            sections.filter(
                (section) =>
                    section.status === 'ACTIVE' &&
                    section.classId === enrollment.academicClassId &&
                    section.id !== (enrollment.sectionId ?? '')
            ),
        [enrollment.academicClassId, enrollment.sectionId, sections]
    );

    const selectedTargetSection = useMemo(
        () =>
            eligibleTargetSections.find((item) => item.id === values.targetSectionId.trim()) ??
            null,
        [eligibleTargetSections, values.targetSectionId]
    );

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setSubmitError(null);
        const validation = validateSectionTransferForm({
            enrollment,
            values,
            student,
            academicYear,
            sections,
            canUpdateEnrollments,
            canReadSections,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            if (validation.generalError) {
                setSubmitError(validation.generalError);
            }
            return;
        }
        setFieldErrors({});

        const outcome = await onSubmitTransfer(
            enrollment,
            validation.payload,
            validation.targetSection
        );
        if (outcome.ok) {
            onClose();
            return;
        }

        if (outcome.error instanceof ApiError && outcome.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(
                    outcome.error.validationErrors,
                    TRANSFER_ERROR_FIELDS
                )
            );
        }
        setSubmitError(outcome.errorMessage ?? 'Unable to transfer student section.');
    };

    return (
        <AcademicModalShell
            title={`Transfer Section: ${enrollment.programName ?? enrollment.programId ?? 'Program'}`}
            subtitle={`Student: ${fullName} · Immediate placement update within the same Program, Academic Class, and Academic Year`}
            isSubmitting={isSubmitting}
            onClose={onClose}
            maxWidthClass="max-w-lg"
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-sm text-gray-700">
                <div
                    role="note"
                    className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950"
                >
                    Section Transfer updates section placement inside the existing active
                    enrollment (<code className="font-mono">{enrollment.id}</code>) and records an
                    immutable transfer history entry. Section capacity is advisory only.
                </div>

                {/* Read-only Current Placement */}
                <dl className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-gray-50 p-3.5 text-xs sm:grid-cols-2">
                    <div>
                        <dt className="font-medium text-gray-500">Program (Read-Only)</dt>
                        <dd className="mt-0.5 font-semibold text-gray-900">
                            {enrollment.programName ?? enrollment.programId ?? '—'}
                            {enrollment.programCode ? ` (${enrollment.programCode})` : ''}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">Academic Class (Read-Only)</dt>
                        <dd className="mt-0.5 font-semibold text-gray-900">
                            {enrollment.academicClassName ?? enrollment.academicClassId ?? '—'}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">Academic Year (Read-Only)</dt>
                        <dd className="mt-0.5 font-semibold text-gray-900">
                            {enrollment.academicYearName ?? enrollment.academicYearId ?? '—'}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">Current Section (Read-Only)</dt>
                        <dd className="mt-0.5 font-semibold text-gray-900">
                            {enrollment.sectionName ??
                                enrollment.sectionId ??
                                'Unassigned (No Section)'}
                        </dd>
                    </div>
                </dl>

                {!eligibility.allowed && eligibility.reason && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    >
                        {eligibility.reason}
                    </div>
                )}

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
                        htmlFor="transfer-target-section"
                        className="block text-xs font-medium text-gray-700"
                    >
                        Target ACTIVE Section <span className="text-red-600">*</span>
                    </label>
                    {!canReadSections ? (
                        <p role="alert" className="mt-1 text-xs text-red-700">
                            Selecting a target Section requires{' '}
                            <code className="font-mono">{PERMISSIONS.SECTIONS.READ}</code>{' '}
                            permission.
                        </p>
                    ) : isLoadingSections ? (
                        <p className="mt-1 text-xs text-gray-600">
                            Loading ACTIVE Sections for{' '}
                            {enrollment.academicClassName ?? 'this Academic Class'}...
                        </p>
                    ) : sectionsError ? (
                        <div className="mt-1 space-y-1 text-xs text-red-700">
                            <p>{sectionsError.message}</p>
                            <button
                                type="button"
                                onClick={onRetrySections}
                                className="font-medium underline"
                            >
                                Retry loading Sections
                            </button>
                        </div>
                    ) : (
                        <>
                            <select
                                id="transfer-target-section"
                                disabled={
                                    isSubmitting ||
                                    !eligibility.allowed ||
                                    eligibleTargetSections.length === 0
                                }
                                value={values.targetSectionId}
                                onChange={(e) => {
                                    setSubmitError(null);
                                    setFieldErrors((prev) => ({
                                        ...prev,
                                        targetSectionId: undefined,
                                    }));
                                    setValues((prev) => ({
                                        ...prev,
                                        targetSectionId: e.target.value,
                                    }));
                                }}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                            >
                                <option value="">
                                    {eligibleTargetSections.length === 0
                                        ? 'No other ACTIVE Sections available for this Class'
                                        : 'Select a target ACTIVE Section...'}
                                </option>
                                {eligibleTargetSections.map((section) => (
                                    <option key={section.id} value={section.id}>
                                        {section.name}
                                        {section.code ? ` (${section.code})` : ''}
                                        {typeof section.capacity === 'number'
                                            ? ` · Advisory Capacity: ${section.capacity}`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                            {selectedTargetSection &&
                                typeof selectedTargetSection.capacity === 'number' && (
                                    <p className="mt-1 text-[11px] text-gray-500">
                                        Advisory Section Capacity: {selectedTargetSection.capacity}{' '}
                                        (informational only; does not block transfer).
                                    </p>
                                )}
                            {fieldErrors.targetSectionId && (
                                <p role="alert" className="mt-1 text-xs text-red-600">
                                    {fieldErrors.targetSectionId}
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="transfer-reason"
                        className="block text-xs font-medium text-gray-700"
                    >
                        Transfer Reason <span className="text-red-600">*</span>
                    </label>
                    <textarea
                        id="transfer-reason"
                        rows={3}
                        disabled={isSubmitting || !eligibility.allowed}
                        maxLength={ENROLLMENT_LIMITS.ACTION_REASON_MAX}
                        value={values.reason}
                        onChange={(e) => {
                            setSubmitError(null);
                            setFieldErrors((prev) => ({ ...prev, reason: undefined }));
                            setValues((prev) => ({ ...prev, reason: e.target.value }));
                        }}
                        placeholder="e.g. Balancing classroom schedule / student cohort request..."
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                    />
                    {fieldErrors.reason && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.reason}
                        </p>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={
                            isSubmitting ||
                            !eligibility.allowed ||
                            !canReadSections ||
                            eligibleTargetSections.length === 0
                        }
                        className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? 'Transferring Section...' : 'Confirm Section Transfer'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

