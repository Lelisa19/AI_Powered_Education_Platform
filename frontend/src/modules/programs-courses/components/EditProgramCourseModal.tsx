import React, { useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import { AcademicModalShell } from '../../academic/components/AcademicConfirmDialog';
import type { CatalogSubmitOutcome } from '../hooks/useProgramsAndCourses';
import {
    CATALOG_LIMITS,
    mapBackendFieldValidationErrors,
    toEditProgramCourseFormValues,
    validateEditProgramCourseForm,
} from '../schemas/programs-courses-schema';
import type {
    EditProgramCourseFormValues,
    Program,
    ProgramCourse,
    ProgramCourseFieldErrors,
    UpdateProgramCourseRequest,
} from '../types/programs-courses.types';

const EDIT_PROGRAM_COURSE_FIELDS: readonly (keyof EditProgramCourseFormValues)[] = [
    'isRequired',
    'displayOrder',
    'notes',
];

interface EditProgramCourseModalProps {
    program: Program;
    programCourse: ProgramCourse;
    existingProgramCourses: readonly ProgramCourse[];
    isSubmitting: boolean;
    onClose: () => void;
    onSubmitUpdate: (
        programId: string,
        programCourseId: string,
        payload: UpdateProgramCourseRequest
    ) => Promise<CatalogSubmitOutcome>;
}

export const EditProgramCourseModal: React.FC<EditProgramCourseModalProps> = ({
    program,
    programCourse,
    existingProgramCourses,
    isSubmitting,
    onClose,
    onSubmitUpdate,
}) => {
    const [values, setValues] = useState<EditProgramCourseFormValues>(() =>
        toEditProgramCourseFormValues(programCourse)
    );
    const [fieldErrors, setFieldErrors] = useState<ProgramCourseFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;
        setSubmitError(null);

        const validation = validateEditProgramCourseForm({
            values,
            editingProgramCourse: programCourse,
            existingProgramCourses,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        const result = await onSubmitUpdate(program.id, programCourse.id, validation.payload);
        if (result.ok) {
            onClose();
            return;
        }

        if (result.error instanceof ApiError && result.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(
                    result.error.validationErrors,
                    EDIT_PROGRAM_COURSE_FIELDS
                )
            );
        }
        setSubmitError(result.errorMessage);
    };

    return (
        <AcademicModalShell
            title={`Edit Curriculum Settings: ${programCourse.courseTitle}`}
            subtitle={`Configure relationship settings inside "${program.name}" without altering the reusable Course catalog record.`}
            isSubmitting={isSubmitting}
            onClose={onClose}
            maxWidthClass="max-w-lg"
        >
            <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-4">
                {submitError && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                    >
                        {submitError}
                    </div>
                )}

                <div className="rounded-md border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-700">
                    <span className="font-semibold text-gray-900">{programCourse.courseTitle}</span>
                    {programCourse.courseCode ? ` (${programCourse.courseCode})` : ''}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <span className="block text-xs font-medium text-gray-700">
                            Requirement Status <span className="text-red-600">*</span>
                        </span>
                        <div className="mt-1.5 flex items-center gap-4 text-sm text-gray-800">
                            <label className="inline-flex items-center gap-1.5">
                                <input
                                    type="radio"
                                    name="editProgramCourseRequired"
                                    disabled={isSubmitting}
                                    checked={values.isRequired === true}
                                    onChange={() => {
                                        setSubmitError(null);
                                        setValues((prev) => ({ ...prev, isRequired: true }));
                                    }}
                                />
                                <span>Required</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5">
                                <input
                                    type="radio"
                                    name="editProgramCourseRequired"
                                    disabled={isSubmitting}
                                    checked={values.isRequired === false}
                                    onChange={() => {
                                        setSubmitError(null);
                                        setValues((prev) => ({ ...prev, isRequired: false }));
                                    }}
                                />
                                <span>Elective</span>
                            </label>
                        </div>
                        {fieldErrors.isRequired && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.isRequired}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="edit-program-course-order"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Display Order <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="edit-program-course-order"
                            type="text"
                            inputMode="numeric"
                            disabled={isSubmitting}
                            value={values.displayOrder}
                            onChange={(e) => {
                                setSubmitError(null);
                                setValues((prev) => ({
                                    ...prev,
                                    displayOrder: e.target.value,
                                }));
                                setFieldErrors((prev) => ({
                                    ...prev,
                                    displayOrder: undefined,
                                }));
                            }}
                            aria-invalid={Boolean(fieldErrors.displayOrder)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.displayOrder && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.displayOrder}
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="edit-program-course-notes"
                        className="block text-xs font-medium text-gray-700"
                    >
                        Curriculum Notes{' '}
                        <span className="font-normal text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                        id="edit-program-course-notes"
                        rows={3}
                        disabled={isSubmitting}
                        maxLength={CATALOG_LIMITS.CURRICULUM_NOTES_MAX}
                        value={values.notes}
                        onChange={(e) => {
                            setSubmitError(null);
                            setValues((prev) => ({ ...prev, notes: e.target.value }));
                            setFieldErrors((prev) => ({ ...prev, notes: undefined }));
                        }}
                        placeholder="Program-specific syllabus or prerequisite notes..."
                        aria-invalid={Boolean(fieldErrors.notes)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                    />
                    {fieldErrors.notes && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.notes}
                        </p>
                    )}
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
                        {isSubmitting ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

