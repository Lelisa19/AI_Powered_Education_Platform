import React, { useMemo, useState } from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { ApiError } from '../../../services/api/api-error';
import { AcademicModalShell } from '../../academic/components/AcademicConfirmDialog';
import type {
    AcademicSection,
    AcademicYear,
} from '../../academic/types/academic-structure.types';
import type { Program } from '../../programs-courses/types/programs-courses.types';
import { formatStudentFullName } from '../../students/schemas/student-management-schema';
import type { StudentDirectoryItem } from '../../students/types/student-management.types';
import type {
    EnrollmentFetchError,
    EnrollmentMutationOutcome,
} from '../hooks/useStudentEnrollments';
import {
    ENROLLMENT_LIMITS,
    evaluateProgramChangeRequestEligibility,
    mapBackendFieldValidationErrors,
    validateProgramChangeRequestForm,
} from '../schemas/enrollment-schema';
import type {
    CreateProgramChangeRequestDto,
    ProgramChangeRequestFieldErrors,
    ProgramChangeRequestFieldName,
    ProgramChangeRequestFormValues,
    ProgramChangeRequestRecord,
    StudentEnrollmentRecord,
} from '../types/enrollment.types';

const PROGRAM_CHANGE_ERROR_FIELDS: readonly ProgramChangeRequestFieldName[] = [
    'targetProgramId',
    'targetSectionId',
    'reason',
];

interface ProgramChangeRequestModalProps {
    student: StudentDirectoryItem;
    sourceEnrollment: StudentEnrollmentRecord;
    academicYear?: AcademicYear | null;
    existingProgramChangeRequests: readonly ProgramChangeRequestRecord[];
    canUpdateEnrollments: boolean;
    canReadPrograms: boolean;
    canReadSections: boolean;
    programs: readonly Program[];
    isLoadingPrograms: boolean;
    programsError: EnrollmentFetchError | null;
    sections: readonly AcademicSection[];
    isLoadingSections: boolean;
    sectionsError: EnrollmentFetchError | null;
    isSubmitting: boolean;
    onTargetClassChange: (classId: string | null) => void;
    onRetryPrograms: () => void;
    onRetrySections: () => void;
    onSubmitProgramChangeRequest: (
        sourceEnrollment: StudentEnrollmentRecord,
        request: CreateProgramChangeRequestDto,
        context: {
            targetProgram: Program;
            targetSection?: AcademicSection | null;
        }
    ) => Promise<EnrollmentMutationOutcome>;
    onClose: () => void;
}

export const ProgramChangeRequestModal: React.FC<ProgramChangeRequestModalProps> = ({
    student,
    sourceEnrollment,
    academicYear,
    existingProgramChangeRequests,
    canUpdateEnrollments,
    canReadPrograms,
    canReadSections,
    programs,
    isLoadingPrograms,
    programsError,
    sections,
    isLoadingSections,
    sectionsError,
    isSubmitting,
    onTargetClassChange,
    onRetryPrograms,
    onRetrySections,
    onSubmitProgramChangeRequest,
    onClose,
}) => {
    const [values, setValues] = useState<ProgramChangeRequestFormValues>({
        targetProgramId: '',
        targetSectionId: '',
        reason: '',
    });
    const [fieldErrors, setFieldErrors] = useState<ProgramChangeRequestFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const fullName = formatStudentFullName(
        student.firstName,
        student.lastName,
        student.email
    );

    const eligibility = useMemo(
        () =>
            evaluateProgramChangeRequestEligibility({
                sourceEnrollment,
                student,
                academicYear,
                existingProgramChangeRequests,
                canUpdateEnrollments,
            }),
        [
            academicYear,
            canUpdateEnrollments,
            existingProgramChangeRequests,
            sourceEnrollment,
            student,
        ]
    );

    const eligibleTargetPrograms = useMemo(
        () =>
            programs.filter(
                (program) =>
                    program.status === 'ACTIVE' &&
                    program.programType === 'GRADE_BASED' &&
                    Boolean(program.academicClassId && program.academicClassId.trim()) &&
                    program.id !== sourceEnrollment.programId
            ),
        [programs, sourceEnrollment.programId]
    );

    const selectedTargetProgram = useMemo(
        () =>
            eligibleTargetPrograms.find(
                (program) => program.id === values.targetProgramId.trim()
            ) ?? null,
        [eligibleTargetPrograms, values.targetProgramId]
    );

    const eligibleTargetSections = useMemo(() => {
        if (!selectedTargetProgram?.academicClassId) return [];
        return sections.filter(
            (section) =>
                section.status === 'ACTIVE' &&
                section.classId === selectedTargetProgram.academicClassId
        );
    }, [sections, selectedTargetProgram]);

    const handleTargetProgramChange = (nextProgramId: string) => {
        const matched =
            eligibleTargetPrograms.find((program) => program.id === nextProgramId.trim()) ??
            null;

        setValues((prev) => ({
            ...prev,
            targetProgramId: nextProgramId,
            targetSectionId: '',
        }));
        setFieldErrors((prev) => ({
            ...prev,
            targetProgramId: undefined,
            targetSectionId: undefined,
        }));
        setSubmitError(null);
        onTargetClassChange(matched?.academicClassId ?? null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setSubmitError(null);
        const validation = validateProgramChangeRequestForm({
            sourceEnrollment,
            values,
            student,
            academicYear,
            existingProgramChangeRequests,
            programs,
            sections,
            canUpdateEnrollments,
            canReadPrograms,
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

        const outcome = await onSubmitProgramChangeRequest(
            sourceEnrollment,
            validation.payload,
            {
                targetProgram: validation.targetProgram,
                targetSection: validation.targetSection,
            }
        );

        if (outcome.ok) {
            onClose();
            return;
        }

        if (outcome.error instanceof ApiError && outcome.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(
                    outcome.error.validationErrors,
                    PROGRAM_CHANGE_ERROR_FIELDS
                )
            );
        }
        setSubmitError(
            outcome.errorMessage ?? 'Unable to submit Program Change Request.'
        );
    };

    return (
        <AcademicModalShell
            title={`Request Program Change: ${
                sourceEnrollment.programName ?? sourceEnrollment.programId ?? 'Program'
            }`}
            subtitle={`Student: ${fullName} · Requires separate approval before changing active placement`}
            isSubmitting={isSubmitting}
            onClose={onClose}
            maxWidthClass="max-w-xl"
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-sm text-gray-700">
                <div
                    role="note"
                    className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950"
                >
                    Submitting creates a <strong>Pending</strong> Program Change Request. The
                    student&apos;s current active enrollment remains <strong>ACTIVE</strong> until
                    another authorized School Admin approves the request. The requester cannot
                    approve or reject their own submission.
                </div>

                {/* Read-only Current Grade-Based Placement */}
                <dl className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-gray-50 p-3.5 text-xs sm:grid-cols-2">
                    <div>
                        <dt className="font-medium text-gray-500">Current Program (Read-Only)</dt>
                        <dd className="mt-0.5 font-semibold text-gray-900">
                            {sourceEnrollment.programName ?? sourceEnrollment.programId ?? '—'}
                            {sourceEnrollment.programCode
                                ? ` (${sourceEnrollment.programCode})`
                                : ''}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">
                            Current Academic Class (Read-Only)
                        </dt>
                        <dd className="mt-0.5 font-semibold text-gray-900">
                            {sourceEnrollment.academicClassName ??
                                sourceEnrollment.academicClassId ??
                                '—'}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">Academic Year (Read-Only)</dt>
                        <dd className="mt-0.5 font-semibold text-gray-900">
                            {sourceEnrollment.academicYearName ??
                                sourceEnrollment.academicYearId ??
                                '—'}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-500">Current Section (Read-Only)</dt>
                        <dd className="mt-0.5 font-semibold text-gray-900">
                            {sourceEnrollment.sectionName ??
                                sourceEnrollment.sectionId ??
                                'Unassigned (No Section)'}
                        </dd>
                    </div>
                </dl>

                {!eligibility.allowed && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
                    >
                        {eligibility.reason ??
                            'This enrollment is not currently eligible for a Program Change Request.'}
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

                {/* Target Grade-Based Program */}
                <div>
                    <label
                        htmlFor="program-change-target-program"
                        className="block text-xs font-semibold uppercase tracking-wide text-gray-700"
                    >
                        Target Grade-Based Program <span className="text-red-600">*</span>
                    </label>
                    {!canReadPrograms ? (
                        <div
                            role="alert"
                            className="mt-1.5 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
                        >
                            Viewing eligible Programs requires{' '}
                            <code className="rounded bg-red-100 px-1 py-0.5 font-mono">
                                {PERMISSIONS.PROGRAMS.READ}
                            </code>
                            .
                        </div>
                    ) : isLoadingPrograms ? (
                        <p className="mt-1.5 text-xs text-gray-600">
                            Loading active Grade-Based Programs...
                        </p>
                    ) : programsError ? (
                        <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                            <span>
                                {programsError.message}
                                {programsError.isBackendUnavailable
                                    ? ' (Backend lookup endpoint pending)'
                                    : ''}
                            </span>
                            <button
                                type="button"
                                onClick={onRetryPrograms}
                                className="shrink-0 rounded border border-amber-300 bg-white px-2.5 py-1 font-medium text-amber-900 hover:bg-amber-100"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                            <select
                                id="program-change-target-program"
                                value={values.targetProgramId}
                                disabled={isSubmitting || !eligibility.allowed}
                                onChange={(e) => handleTargetProgramChange(e.target.value)}
                                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 ${
                                    fieldErrors.targetProgramId
                                        ? 'border-red-400'
                                        : 'border-gray-300'
                                }`}
                            >
                                <option value="">Select target Grade-Based Program...</option>
                                {eligibleTargetPrograms.map((program) => (
                                    <option key={program.id} value={program.id}>
                                        {program.name}
                                        {program.code ? ` (${program.code})` : ''} —{' '}
                                        {program.academicClassName ??
                                            program.academicClassCode ??
                                            program.academicClassId}
                                    </option>
                                ))}
                            </select>
                            {eligibleTargetPrograms.length === 0 && (
                                <p className="mt-1 text-xs text-amber-800">
                                    No other ACTIVE Grade-Based Programs are available in the
                                    school catalog.
                                </p>
                            )}
                        </>
                    )}
                    {fieldErrors.targetProgramId && (
                        <p className="mt-1 text-xs text-red-700">
                            {fieldErrors.targetProgramId}
                        </p>
                    )}
                </div>

                {/* Read-Only Target Academic Class derived from selected Program */}
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs">
                    <span className="font-medium text-gray-500">
                        Target Academic Class (Derived from Selected Program):{' '}
                    </span>
                    <span className="font-semibold text-gray-900">
                        {selectedTargetProgram
                            ? selectedTargetProgram.academicClassName ??
                              selectedTargetProgram.academicClassCode ??
                              selectedTargetProgram.academicClassId ??
                              '—'
                            : 'Select a target Grade-Based Program'}
                    </span>
                </div>

                {/* Optional Target Section */}
                <div>
                    <label
                        htmlFor="program-change-target-section"
                        className="block text-xs font-semibold uppercase tracking-wide text-gray-700"
                    >
                        Target Section (Optional)
                    </label>
                    {!canReadSections ? (
                        <p className="mt-1.5 rounded-md border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-600">
                            Section lookup requires{' '}
                            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono">
                                {PERMISSIONS.SECTIONS.READ}
                            </code>
                            . You can still submit this request with Target Section unassigned (
                            <code className="font-mono">null</code>).
                        </p>
                    ) : !selectedTargetProgram ? (
                        <p className="mt-1.5 text-xs text-gray-500">
                            Select a target Grade-Based Program first to view ACTIVE sections for its
                            Academic Class.
                        </p>
                    ) : isLoadingSections ? (
                        <p className="mt-1.5 text-xs text-gray-600">
                            Loading ACTIVE Sections for target Academic Class...
                        </p>
                    ) : sectionsError ? (
                        <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                            <span>
                                {sectionsError.message}
                                {sectionsError.isBackendUnavailable
                                    ? ' (Backend lookup endpoint pending)'
                                    : ''}
                            </span>
                            <button
                                type="button"
                                onClick={onRetrySections}
                                className="shrink-0 rounded border border-amber-300 bg-white px-2.5 py-1 font-medium text-amber-900 hover:bg-amber-100"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                            <select
                                id="program-change-target-section"
                                value={values.targetSectionId}
                                disabled={isSubmitting || !eligibility.allowed}
                                onChange={(e) => {
                                    setValues((prev) => ({
                                        ...prev,
                                        targetSectionId: e.target.value,
                                    }));
                                    setFieldErrors((prev) => ({
                                        ...prev,
                                        targetSectionId: undefined,
                                    }));
                                    setSubmitError(null);
                                }}
                                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 ${
                                    fieldErrors.targetSectionId
                                        ? 'border-red-400'
                                        : 'border-gray-300'
                                }`}
                            >
                                <option value="">Leave section unassigned (assign later)</option>
                                {eligibleTargetSections.map((section) => (
                                    <option key={section.id} value={section.id}>
                                        {section.name}
                                        {section.code ? ` (${section.code})` : ''}
                                        {typeof section.capacity === 'number'
                                            ? ` — Advisory capacity: ${section.capacity}`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                            {eligibleTargetSections.length === 0 && (
                                <p className="mt-1 text-xs text-gray-500">
                                    No ACTIVE sections are configured for the target Academic Class.
                                    You may submit without a Section.
                                </p>
                            )}
                            <p className="mt-1 text-[11px] text-gray-500">
                                Section capacity is advisory only and does not block submission.
                            </p>
                        </>
                    )}
                    {fieldErrors.targetSectionId && (
                        <p className="mt-1 text-xs text-red-700">
                            {fieldErrors.targetSectionId}
                        </p>
                    )}
                </div>

                {/* Required Request Reason */}
                <div>
                    <label
                        htmlFor="program-change-reason"
                        className="block text-xs font-semibold uppercase tracking-wide text-gray-700"
                    >
                        Reason for Program Change Request <span className="text-red-600">*</span>
                    </label>
                    <textarea
                        id="program-change-reason"
                        rows={3}
                        maxLength={ENROLLMENT_LIMITS.ACTION_REASON_MAX}
                        value={values.reason}
                        disabled={isSubmitting || !eligibility.allowed}
                        onChange={(e) => {
                            setValues((prev) => ({ ...prev, reason: e.target.value }));
                            setFieldErrors((prev) => ({ ...prev, reason: undefined }));
                            setSubmitError(null);
                        }}
                        placeholder="Provide the academic or administrative reason for changing Programs..."
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 ${
                            fieldErrors.reason ? 'border-red-400' : 'border-gray-300'
                        }`}
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="text-red-700">{fieldErrors.reason ?? ''}</span>
                        <span>
                            {values.reason.length}/{ENROLLMENT_LIMITS.ACTION_REASON_MAX}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-3">
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
                            !canReadPrograms ||
                            eligibleTargetPrograms.length === 0
                        }
                        className="rounded-md bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? 'Submitting Request...' : 'Submit Program Change Request'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

