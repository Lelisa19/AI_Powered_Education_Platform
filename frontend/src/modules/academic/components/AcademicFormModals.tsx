import React, { useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import type { AcademicMutationError } from '../hooks/useAcademicStructure';
import {
    ACADEMIC_STRUCTURE_LIMITS,
    createEmptyAcademicClassFormValues,
    createEmptyAcademicSectionFormValues,
    createEmptyAcademicTermFormValues,
    createEmptyAcademicYearFormValues,
    formatIsoDateDisplay,
    mapBackendFieldValidationErrors,
    toAcademicClassFormValues,
    toAcademicSectionFormValues,
    toAcademicTermFormValues,
    toAcademicYearFormValues,
    validateAcademicClassForm,
    validateAcademicSectionForm,
    validateAcademicTermForm,
    validateAcademicYearForm,
} from '../schemas/academic-structure-schema';
import type {
    AcademicClass,
    AcademicClassFieldErrors,
    AcademicClassFormValues,
    AcademicSection,
    AcademicSectionFieldErrors,
    AcademicSectionFormValues,
    AcademicTerm,
    AcademicTermFieldErrors,
    AcademicTermFormValues,
    AcademicYear,
    AcademicYearFieldErrors,
    AcademicYearFormValues,
    CreateAcademicClassRequest,
    CreateAcademicSectionRequest,
    CreateAcademicTermRequest,
    CreateAcademicYearRequest,
} from '../types/academic-structure.types';
import { AcademicModalShell } from './AcademicConfirmDialog';

interface SubmitOutcome {
    ok: boolean;
    error?: AcademicMutationError;
}

// ==================== 1. Academic Year Form Modal ====================

interface AcademicYearFormModalProps {
    editingYear: AcademicYear | null;
    existingYears: readonly AcademicYear[];
    loadedTermsForYear: readonly AcademicTerm[];
    canActivate: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmitCreate: (payload: CreateAcademicYearRequest) => Promise<SubmitOutcome>;
    onSubmitUpdate: (yearId: string, payload: CreateAcademicYearRequest) => Promise<SubmitOutcome>;
}

export const AcademicYearFormModal: React.FC<AcademicYearFormModalProps> = ({
    editingYear,
    existingYears,
    loadedTermsForYear,
    canActivate,
    isSubmitting,
    onClose,
    onSubmitCreate,
    onSubmitUpdate,
}) => {
    const isEditMode = Boolean(editingYear);
    const [values, setValues] = useState<AcademicYearFormValues>(() =>
        editingYear ? toAcademicYearFormValues(editingYear) : createEmptyAcademicYearFormValues()
    );
    const [fieldErrors, setFieldErrors] = useState<AcademicYearFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleFieldChange = <K extends keyof AcademicYearFormValues>(
        field: K,
        value: AcademicYearFormValues[K]
    ) => {
        setSubmitError(null);
        setValues((prev) => ({ ...prev, [field]: value }));
        setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSubmitting) return;
        setSubmitError(null);

        const validation = validateAcademicYearForm({
            values,
            existingYears,
            editingYearId: editingYear?.id ?? null,
            loadedTermsForYear,
            allowStatusSelection: !isEditMode,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        const result = editingYear
            ? await onSubmitUpdate(editingYear.id, validation.payload)
            : await onSubmitCreate(validation.payload);

        if (result.ok) {
            onClose();
            return;
        }

        if (result.error?.error instanceof ApiError && result.error.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(result.error.error.validationErrors, [
                    'name',
                    'startDate',
                    'endDate',
                    'status',
                    'description',
                ])
            );
        }

        setSubmitError(
            result.error?.isBackendUnavailable
                ? 'Academic year endpoint is pending backend implementation. No record was saved.'
                : result.error?.message || 'Unable to save academic year.'
        );
    };

    return (
        <AcademicModalShell
            title={isEditMode ? `Edit Academic Year: ${editingYear?.name}` : 'Create Academic Year'}
            subtitle="Configure institutional academic calendar bounds for your school."
            isSubmitting={isSubmitting}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    >
                        {submitError}
                    </div>
                )}

                <div>
                    <label htmlFor="ay-name" className="block text-sm font-medium text-gray-800">
                        Academic Year Name <span className="text-red-600">*</span>
                    </label>
                    <input
                        id="ay-name"
                        type="text"
                        disabled={isSubmitting}
                        value={values.name}
                        maxLength={ACADEMIC_STRUCTURE_LIMITS.YEAR_NAME_MAX}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="e.g., 2026/2027 Academic Year"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    {fieldErrors.name && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.name}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="ay-start"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Start Date <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="ay-start"
                            type="date"
                            disabled={isSubmitting}
                            value={values.startDate}
                            onChange={(e) => handleFieldChange('startDate', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        {fieldErrors.startDate && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.startDate}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="ay-end" className="block text-sm font-medium text-gray-800">
                            End Date <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="ay-end"
                            type="date"
                            disabled={isSubmitting}
                            value={values.endDate}
                            onChange={(e) => handleFieldChange('endDate', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        {fieldErrors.endDate && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.endDate}
                            </p>
                        )}
                    </div>
                </div>

                {!isEditMode && (
                    <div>
                        <label
                            htmlFor="ay-status"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Initial Status
                        </label>
                        <select
                            id="ay-status"
                            disabled={isSubmitting || !canActivate}
                            value={canActivate ? values.status : 'PLANNED'}
                            onChange={(e) =>
                                handleFieldChange(
                                    'status',
                                    e.target.value as AcademicYearFormValues['status']
                                )
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            <option value="PLANNED">Planned</option>
                            {canActivate && (
                                <option value="ACTIVE">
                                    Active (will deactivate any current active year)
                                </option>
                            )}
                        </select>
                        {!canActivate && (
                            <p className="mt-1 text-xs text-gray-500">
                                New years start as Planned. Activation requires{' '}
                                <code>academic_years.activate</code>.
                            </p>
                        )}
                    </div>
                )}

                <div>
                    <label
                        htmlFor="ay-description"
                        className="block text-sm font-medium text-gray-800"
                    >
                        Description (Optional)
                    </label>
                    <textarea
                        id="ay-description"
                        rows={3}
                        disabled={isSubmitting}
                        value={values.description}
                        maxLength={ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="Optional academic calendar notes..."
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                              ? 'Save Changes'
                              : 'Create Academic Year'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

// ==================== 2. Term Form Modal ====================

interface AcademicTermFormModalProps {
    editingTerm: AcademicTerm | null;
    defaultAcademicYearId: string;
    academicYears: readonly AcademicYear[];
    existingTermsInYear: readonly AcademicTerm[];
    canActivate: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmitCreate: (payload: CreateAcademicTermRequest) => Promise<SubmitOutcome>;
    onSubmitUpdate: (termId: string, payload: CreateAcademicTermRequest) => Promise<SubmitOutcome>;
}

export const AcademicTermFormModal: React.FC<AcademicTermFormModalProps> = ({
    editingTerm,
    defaultAcademicYearId,
    academicYears,
    existingTermsInYear,
    canActivate,
    isSubmitting,
    onClose,
    onSubmitCreate,
    onSubmitUpdate,
}) => {
    const isEditMode = Boolean(editingTerm);
    const [values, setValues] = useState<AcademicTermFormValues>(() =>
        editingTerm
            ? toAcademicTermFormValues(editingTerm)
            : createEmptyAcademicTermFormValues(defaultAcademicYearId)
    );
    const [fieldErrors, setFieldErrors] = useState<AcademicTermFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const selectedYear = academicYears.find((y) => y.id === values.academicYearId) ?? null;

    const handleFieldChange = <K extends keyof AcademicTermFormValues>(
        field: K,
        value: AcademicTermFormValues[K]
    ) => {
        setSubmitError(null);
        setValues((prev) => ({ ...prev, [field]: value }));
        setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSubmitting) return;
        setSubmitError(null);

        const validation = validateAcademicTermForm({
            values,
            academicYears,
            existingTermsInYear,
            editingTermId: editingTerm?.id ?? null,
            allowStatusSelection: !isEditMode,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        const result = editingTerm
            ? await onSubmitUpdate(editingTerm.id, validation.payload)
            : await onSubmitCreate(validation.payload);

        if (result.ok) {
            onClose();
            return;
        }

        if (result.error?.error instanceof ApiError && result.error.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(result.error.error.validationErrors, [
                    'academicYearId',
                    'name',
                    'startDate',
                    'endDate',
                    'status',
                    'description',
                ])
            );
        }

        setSubmitError(
            result.error?.isBackendUnavailable
                ? 'Academic term endpoint is pending backend implementation. No record was saved.'
                : result.error?.message || 'Unable to save term.'
        );
    };

    return (
        <AcademicModalShell
            title={isEditMode ? `Edit Term: ${editingTerm?.name}` : 'Create Academic Term'}
            subtitle="Configure terms, semesters, quarters, or modules inside an academic year."
            isSubmitting={isSubmitting}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    >
                        {submitError}
                    </div>
                )}

                <div>
                    <label htmlFor="term-ay" className="block text-sm font-medium text-gray-800">
                        Parent Academic Year <span className="text-red-600">*</span>
                    </label>
                    <select
                        id="term-ay"
                        disabled={isSubmitting || isEditMode}
                        value={values.academicYearId}
                        onChange={(e) => handleFieldChange('academicYearId', e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                    >
                        <option value="" disabled>
                            Select academic year...
                        </option>
                        {academicYears.map((year) => (
                            <option key={year.id} value={year.id}>
                                {year.name} ({year.startDate} to {year.endDate})
                            </option>
                        ))}
                    </select>
                    {selectedYear && (
                        <p className="mt-1 text-xs text-gray-500">
                            Term dates must fall within {selectedYear.name}:{' '}
                            {formatIsoDateDisplay(selectedYear.startDate)} –{' '}
                            {formatIsoDateDisplay(selectedYear.endDate)}.
                        </p>
                    )}
                    {fieldErrors.academicYearId && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.academicYearId}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="term-name" className="block text-sm font-medium text-gray-800">
                        Term / Period Name <span className="text-red-600">*</span>
                    </label>
                    <input
                        id="term-name"
                        type="text"
                        disabled={isSubmitting}
                        value={values.name}
                        maxLength={ACADEMIC_STRUCTURE_LIMITS.TERM_NAME_MAX}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="e.g., Term 1, Fall Semester, Quarter 2, Module B"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    {fieldErrors.name && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.name}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="term-start"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Start Date <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="term-start"
                            type="date"
                            disabled={isSubmitting}
                            value={values.startDate}
                            min={selectedYear?.startDate}
                            max={selectedYear?.endDate}
                            onChange={(e) => handleFieldChange('startDate', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        {fieldErrors.startDate && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.startDate}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="term-end"
                            className="block text-sm font-medium text-gray-800"
                        >
                            End Date <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="term-end"
                            type="date"
                            disabled={isSubmitting}
                            value={values.endDate}
                            min={selectedYear?.startDate}
                            max={selectedYear?.endDate}
                            onChange={(e) => handleFieldChange('endDate', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        {fieldErrors.endDate && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.endDate}
                            </p>
                        )}
                    </div>
                </div>

                {!isEditMode && (
                    <div>
                        <label
                            htmlFor="term-status"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Initial Status
                        </label>
                        <select
                            id="term-status"
                            disabled={isSubmitting || !canActivate}
                            value={canActivate ? values.status : 'PLANNED'}
                            onChange={(e) =>
                                handleFieldChange(
                                    'status',
                                    e.target.value as AcademicTermFormValues['status']
                                )
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                        >
                            <option value="PLANNED">Planned</option>
                            {canActivate && <option value="ACTIVE">Active</option>}
                        </select>
                        {!canActivate && (
                            <p className="mt-1 text-xs text-gray-500">
                                New terms start as Planned. Activation requires{' '}
                                <code>terms.activate</code>.
                            </p>
                        )}
                    </div>
                )}

                <div>
                    <label
                        htmlFor="term-description"
                        className="block text-sm font-medium text-gray-800"
                    >
                        Description (Optional)
                    </label>
                    <textarea
                        id="term-description"
                        rows={3}
                        disabled={isSubmitting}
                        value={values.description}
                        maxLength={ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="Optional calendar details or holiday notes..."
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                              ? 'Save Changes'
                              : 'Create Term'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

// ==================== 3. Class / Grade Level Form Modal ====================

interface AcademicClassFormModalProps {
    editingClass: AcademicClass | null;
    existingClasses: readonly AcademicClass[];
    isSubmitting: boolean;
    onClose: () => void;
    onSubmitCreate: (payload: CreateAcademicClassRequest) => Promise<SubmitOutcome>;
    onSubmitUpdate: (classId: string, payload: CreateAcademicClassRequest) => Promise<SubmitOutcome>;
}

export const AcademicClassFormModal: React.FC<AcademicClassFormModalProps> = ({
    editingClass,
    existingClasses,
    isSubmitting,
    onClose,
    onSubmitCreate,
    onSubmitUpdate,
}) => {
    const isEditMode = Boolean(editingClass);
    const nextOrder =
        existingClasses.length > 0
            ? Math.max(...existingClasses.map((cls) => cls.displayOrder)) + 1
            : 1;

    const [values, setValues] = useState<AcademicClassFormValues>(() =>
        editingClass
            ? toAcademicClassFormValues(editingClass)
            : createEmptyAcademicClassFormValues(nextOrder)
    );
    const [fieldErrors, setFieldErrors] = useState<AcademicClassFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleFieldChange = <K extends keyof AcademicClassFormValues>(
        field: K,
        value: AcademicClassFormValues[K]
    ) => {
        setSubmitError(null);
        setValues((prev) => ({ ...prev, [field]: value }));
        setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSubmitting) return;
        setSubmitError(null);

        const validation = validateAcademicClassForm({
            values,
            existingClasses,
            editingClassId: editingClass?.id ?? null,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        const result = editingClass
            ? await onSubmitUpdate(editingClass.id, validation.payload)
            : await onSubmitCreate(validation.payload);

        if (result.ok) {
            onClose();
            return;
        }

        if (result.error?.error instanceof ApiError && result.error.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(result.error.error.validationErrors, [
                    'name',
                    'code',
                    'displayOrder',
                    'status',
                    'description',
                ])
            );
        }

        setSubmitError(
            result.error?.isBackendUnavailable
                ? 'Class management endpoint is pending backend implementation. No record was saved.'
                : result.error?.message || 'Unable to save class.'
        );
    };

    return (
        <AcademicModalShell
            title={
                isEditMode
                    ? `Edit Class / Grade Level: ${editingClass?.name}`
                    : 'Create Class / Grade Level'
            }
            subtitle="Supports any institutional naming: grades, years, certification levels, or cohorts."
            isSubmitting={isSubmitting}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    >
                        {submitError}
                    </div>
                )}

                <div>
                    <label htmlFor="cls-name" className="block text-sm font-medium text-gray-800">
                        Class / Level Name <span className="text-red-600">*</span>
                    </label>
                    <input
                        id="cls-name"
                        type="text"
                        disabled={isSubmitting}
                        value={values.name}
                        maxLength={ACADEMIC_STRUCTURE_LIMITS.CLASS_NAME_MAX}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="e.g., Grade 9, Year 1, Level 2, Diploma Track"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    {fieldErrors.name && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.name}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="cls-code"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Class Code (Optional)
                        </label>
                        <input
                            id="cls-code"
                            type="text"
                            disabled={isSubmitting}
                            value={values.code}
                            maxLength={ACADEMIC_STRUCTURE_LIMITS.CODE_MAX}
                            onChange={(e) => handleFieldChange('code', e.target.value)}
                            placeholder="e.g., G9, YR1, LVL2"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        {fieldErrors.code && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.code}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="cls-order"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Display Order <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="cls-order"
                            type="number"
                            min={0}
                            max={ACADEMIC_STRUCTURE_LIMITS.DISPLAY_ORDER_MAX}
                            step={1}
                            disabled={isSubmitting}
                            value={values.displayOrder}
                            onChange={(e) => handleFieldChange('displayOrder', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        {fieldErrors.displayOrder && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.displayOrder}
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label htmlFor="cls-status" className="block text-sm font-medium text-gray-800">
                        Status
                    </label>
                    <select
                        id="cls-status"
                        disabled={isSubmitting}
                        value={values.status}
                        onChange={(e) =>
                            handleFieldChange(
                                'status',
                                e.target.value as AcademicClassFormValues['status']
                            )
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="cls-description"
                        className="block text-sm font-medium text-gray-800"
                    >
                        Description (Optional)
                    </label>
                    <textarea
                        id="cls-description"
                        rows={3}
                        disabled={isSubmitting}
                        value={values.description}
                        maxLength={ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="Optional description of this grade or certification level..."
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                        {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Class'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

// ==================== 4. Section Form Modal ====================

interface AcademicSectionFormModalProps {
    editingSection: AcademicSection | null;
    defaultClassId: string;
    classes: readonly AcademicClass[];
    existingSectionsInSchool: readonly AcademicSection[];
    isSubmitting: boolean;
    onClose: () => void;
    onSubmitCreate: (payload: CreateAcademicSectionRequest) => Promise<SubmitOutcome>;
    onSubmitUpdate: (
        sectionId: string,
        payload: CreateAcademicSectionRequest
    ) => Promise<SubmitOutcome>;
}

export const AcademicSectionFormModal: React.FC<AcademicSectionFormModalProps> = ({
    editingSection,
    defaultClassId,
    classes,
    existingSectionsInSchool,
    isSubmitting,
    onClose,
    onSubmitCreate,
    onSubmitUpdate,
}) => {
    const isEditMode = Boolean(editingSection);
    const [values, setValues] = useState<AcademicSectionFormValues>(() =>
        editingSection
            ? toAcademicSectionFormValues(editingSection)
            : createEmptyAcademicSectionFormValues(defaultClassId)
    );
    const [fieldErrors, setFieldErrors] = useState<AcademicSectionFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleFieldChange = <K extends keyof AcademicSectionFormValues>(
        field: K,
        value: AcademicSectionFormValues[K]
    ) => {
        setSubmitError(null);
        setValues((prev) => ({ ...prev, [field]: value }));
        setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSubmitting) return;
        setSubmitError(null);

        const validation = validateAcademicSectionForm({
            values,
            classes,
            existingSectionsInSchool,
            editingSectionId: editingSection?.id ?? null,
            previousClassId: editingSection?.classId ?? null,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        const result = editingSection
            ? await onSubmitUpdate(editingSection.id, validation.payload)
            : await onSubmitCreate(validation.payload);

        if (result.ok) {
            onClose();
            return;
        }

        if (result.error?.error instanceof ApiError && result.error.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(result.error.error.validationErrors, [
                    'classId',
                    'name',
                    'code',
                    'capacity',
                    'status',
                    'description',
                ])
            );
        }

        setSubmitError(
            result.error?.isBackendUnavailable
                ? 'Section endpoint is pending backend implementation. No record was saved.'
                : result.error?.message || 'Unable to save section.'
        );
    };

    return (
        <AcademicModalShell
            title={
                isEditMode
                    ? `Edit Section: ${editingSection?.name}`
                    : 'Create Section / Cohort Group'
            }
            subtitle="Subdivision belonging to an existing class or grade level."
            isSubmitting={isSubmitting}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    >
                        {submitError}
                    </div>
                )}

                <div>
                    <label htmlFor="sec-class" className="block text-sm font-medium text-gray-800">
                        Parent Class / Grade Level <span className="text-red-600">*</span>
                    </label>
                    <select
                        id="sec-class"
                        disabled={isSubmitting}
                        value={values.classId}
                        onChange={(e) => handleFieldChange('classId', e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                        <option value="" disabled>
                            Select parent class...
                        </option>
                        {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name}
                                {cls.code ? ` (${cls.code})` : ''}
                                {cls.status === 'INACTIVE' ? ' — Inactive' : ''}
                            </option>
                        ))}
                    </select>
                    {fieldErrors.classId && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.classId}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="sec-name"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Section Name <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="sec-name"
                            type="text"
                            disabled={isSubmitting}
                            value={values.name}
                            maxLength={ACADEMIC_STRUCTURE_LIMITS.SECTION_NAME_MAX}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            placeholder="e.g., Section A, Cohort Blue"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        {fieldErrors.name && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.name}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="sec-code"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Section Code (Optional)
                        </label>
                        <input
                            id="sec-code"
                            type="text"
                            disabled={isSubmitting}
                            value={values.code}
                            maxLength={ACADEMIC_STRUCTURE_LIMITS.CODE_MAX}
                            onChange={(e) => handleFieldChange('code', e.target.value)}
                            placeholder="e.g., G9-A"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        {fieldErrors.code && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.code}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="sec-capacity"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Capacity Limit (Optional)
                        </label>
                        <input
                            id="sec-capacity"
                            type="number"
                            min={1}
                            max={ACADEMIC_STRUCTURE_LIMITS.CAPACITY_MAX}
                            step={1}
                            disabled={isSubmitting}
                            value={values.capacity}
                            onChange={(e) => handleFieldChange('capacity', e.target.value)}
                            placeholder="e.g., 35"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        {fieldErrors.capacity && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {fieldErrors.capacity}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="sec-status"
                            className="block text-sm font-medium text-gray-800"
                        >
                            Status
                        </label>
                        <select
                            id="sec-status"
                            disabled={isSubmitting}
                            value={values.status}
                            onChange={(e) =>
                                handleFieldChange(
                                    'status',
                                    e.target.value as AcademicSectionFormValues['status']
                                )
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="sec-description"
                        className="block text-sm font-medium text-gray-800"
                    >
                        Description (Optional)
                    </label>
                    <textarea
                        id="sec-description"
                        rows={3}
                        disabled={isSubmitting}
                        value={values.description}
                        maxLength={ACADEMIC_STRUCTURE_LIMITS.DESCRIPTION_MAX}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="Optional room/wing or cohort notes..."
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                              ? 'Save Changes'
                              : 'Create Section'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

