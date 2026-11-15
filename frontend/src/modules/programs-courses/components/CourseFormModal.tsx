import React, { useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import { AcademicModalShell } from '../../academic/components/AcademicConfirmDialog';
import type { CatalogSubmitOutcome } from '../hooks/useProgramsAndCourses';
import {
    CATALOG_LIMITS,
    OFFERING_LIFECYCLE_STATUSES,
    createEmptyCourseFormValues,
    formatOfferingStatusLabel,
    mapBackendFieldValidationErrors,
    toCourseFormValues,
    validateCourseForm,
} from '../schemas/programs-courses-schema';
import type {
    Course,
    CourseFieldErrors,
    CourseFieldName,
    CourseFormValues,
    CreateCourseRequest,
    OfferingLifecycleStatus,
} from '../types/programs-courses.types';

const COURSE_ERROR_FIELDS: readonly CourseFieldName[] = [
    'title',
    'code',
    'description',
    'creditHours',
    'allowStandalone',
    'status',
];

interface CourseFormModalProps {
    editingCourse: Course | null;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmitCreate: (payload: CreateCourseRequest) => Promise<CatalogSubmitOutcome>;
    onSubmitUpdate: (
        courseId: string,
        payload: CreateCourseRequest
    ) => Promise<CatalogSubmitOutcome>;
}

export const CourseFormModal: React.FC<CourseFormModalProps> = ({
    editingCourse,
    isSubmitting,
    onClose,
    onSubmitCreate,
    onSubmitUpdate,
}) => {
    const isEditMode = Boolean(editingCourse);
    const [values, setValues] = useState<CourseFormValues>(() =>
        editingCourse ? toCourseFormValues(editingCourse) : createEmptyCourseFormValues()
    );
    const [fieldErrors, setFieldErrors] = useState<CourseFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleFieldChange = <K extends keyof CourseFormValues>(
        field: K,
        value: CourseFormValues[K]
    ) => {
        setSubmitError(null);
        setValues((prev) => ({ ...prev, [field]: value }));
        setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;
        setSubmitError(null);

        const validation = validateCourseForm(values);
        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        const result = editingCourse
            ? await onSubmitUpdate(editingCourse.id, validation.payload)
            : await onSubmitCreate(validation.payload);

        if (result.ok) {
            onClose();
            return;
        }

        if (result.error instanceof ApiError && result.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(
                    result.error.validationErrors,
                    COURSE_ERROR_FIELDS
                )
            );
        }
        setSubmitError(result.errorMessage);
    };

    return (
        <AcademicModalShell
            title={isEditMode ? `Edit Course: ${editingCourse?.title}` : 'Create Reusable Course'}
            subtitle="Courses live in a shared reusable catalog and can belong to multiple Programs, operate standalone, or both simultaneously."
            isSubmitting={isSubmitting}
            onClose={onClose}
            maxWidthClass="max-w-xl"
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

                <div>
                    <label
                        htmlFor="course-title"
                        className="block text-xs font-medium text-gray-700"
                    >
                        Course Title <span className="text-red-600">*</span>
                    </label>
                    <input
                        id="course-title"
                        type="text"
                        required
                        disabled={isSubmitting}
                        maxLength={CATALOG_LIMITS.COURSE_TITLE_MAX}
                        value={values.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        placeholder="e.g. Mathematics or Digital Illustration Fundamentals"
                        aria-invalid={Boolean(fieldErrors.title)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                    />
                    {fieldErrors.title && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.title}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                        <label
                            htmlFor="course-code"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Course Code <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="course-code"
                            type="text"
                            disabled={isSubmitting}
                            maxLength={CATALOG_LIMITS.CODE_MAX}
                            value={values.code}
                            onChange={(e) => handleFieldChange('code', e.target.value)}
                            placeholder="e.g. MATH-101"
                            aria-invalid={Boolean(fieldErrors.code)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.code && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.code}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="course-credits"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Credits / Hours{' '}
                            <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="course-credits"
                            type="text"
                            inputMode="decimal"
                            disabled={isSubmitting}
                            value={values.creditHours}
                            onChange={(e) => handleFieldChange('creditHours', e.target.value)}
                            placeholder="e.g. 3 or 40"
                            aria-invalid={Boolean(fieldErrors.creditHours)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        />
                        {fieldErrors.creditHours && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.creditHours}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="course-status"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Lifecycle Status <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="course-status"
                            disabled={isSubmitting}
                            value={values.status}
                            onChange={(e) =>
                                handleFieldChange(
                                    'status',
                                    e.target.value as OfferingLifecycleStatus
                                )
                            }
                            aria-invalid={Boolean(fieldErrors.status)}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            {OFFERING_LIFECYCLE_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {formatOfferingStatusLabel(status)}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.status && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.status}
                            </p>
                        )}
                    </div>
                </div>

                <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5">
                    <label className="flex items-start gap-2.5 text-sm text-gray-900">
                        <input
                            id="course-allow-standalone"
                            type="checkbox"
                            disabled={isSubmitting}
                            checked={values.allowStandalone}
                            onChange={(e) =>
                                handleFieldChange('allowStandalone', e.target.checked)
                            }
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
                        />
                        <span>
                            <span className="block font-medium text-gray-900">
                                Allow Standalone Offering
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-600">
                                Permits this course to be offered independently outside any Program.
                                Regardless of this setting, the course remains reusable across
                                multiple Programs without duplication.
                            </span>
                        </span>
                    </label>
                    {editingCourse?.allowStandalone && !values.allowStandalone && (
                        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                            Disabling standalone offering keeps all Program–Course curriculum links
                            intact. Existing standalone teacher assignments (if any) must be removed
                            if the server enforces standalone cleanup.
                        </p>
                    )}
                    {fieldErrors.allowStandalone && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.allowStandalone}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="course-description"
                        className="block text-xs font-medium text-gray-700"
                    >
                        Description <span className="font-normal text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                        id="course-description"
                        rows={3}
                        disabled={isSubmitting}
                        maxLength={CATALOG_LIMITS.DESCRIPTION_MAX}
                        value={values.description}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="Course summary, learning objectives, and syllabus overview..."
                        aria-invalid={Boolean(fieldErrors.description)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                    />
                    {fieldErrors.description && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.description}
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
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {isSubmitting
                            ? 'Saving...'
                            : isEditMode
                              ? 'Save Course Changes'
                              : 'Create Course'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

