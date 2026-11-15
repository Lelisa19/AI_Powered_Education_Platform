import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS } from '../../../constants/permissions';
import { ApiError } from '../../../services/api/api-error';
import { AcademicModalShell } from '../../academic/components/AcademicConfirmDialog';
import type { AcademicClass } from '../../academic/types/academic-structure.types';
import type {
    CatalogFetchError,
    CatalogSubmitOutcome,
} from '../hooks/useProgramsAndCourses';
import {
    CATALOG_LIMITS,
    OFFERING_LIFECYCLE_STATUSES,
    PROGRAM_TYPES,
    createEmptyProgramFormValues,
    formatOfferingStatusLabel,
    formatProgramTypeLabel,
    mapBackendFieldValidationErrors,
    toProgramFormValues,
    validateProgramForm,
} from '../schemas/programs-courses-schema';
import type {
    CreateProgramRequest,
    OfferingLifecycleStatus,
    Program,
    ProgramFieldErrors,
    ProgramFieldName,
    ProgramFormValues,
    ProgramType,
} from '../types/programs-courses.types';

const PROGRAM_ERROR_FIELDS: readonly ProgramFieldName[] = [
    'name',
    'code',
    'programType',
    'academicClassId',
    'description',
    'status',
];

interface ProgramFormModalProps {
    editingProgram: Program | null;
    classes: readonly AcademicClass[];
    canReadClasses: boolean;
    canAccessAcademicStructure: boolean;
    isLoadingClasses: boolean;
    classesLoadedSuccessfully: boolean;
    classesError: CatalogFetchError | null;
    isSubmitting: boolean;
    onRetryClasses: () => void;
    onClose: () => void;
    onSubmitCreate: (payload: CreateProgramRequest) => Promise<CatalogSubmitOutcome>;
    onSubmitUpdate: (
        programId: string,
        payload: CreateProgramRequest
    ) => Promise<CatalogSubmitOutcome>;
}

export const ProgramFormModal: React.FC<ProgramFormModalProps> = ({
    editingProgram,
    classes,
    canReadClasses,
    canAccessAcademicStructure,
    isLoadingClasses,
    classesLoadedSuccessfully,
    classesError,
    isSubmitting,
    onRetryClasses,
    onClose,
    onSubmitCreate,
    onSubmitUpdate,
}) => {
    const isEditMode = Boolean(editingProgram);
    const [values, setValues] = useState<ProgramFormValues>(() =>
        editingProgram ? toProgramFormValues(editingProgram) : createEmptyProgramFormValues()
    );
    const [fieldErrors, setFieldErrors] = useState<ProgramFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const selectableClasses = useMemo(() => {
        return [...classes]
            .filter(
                (cls) => cls.status === 'ACTIVE' || cls.id === editingProgram?.academicClassId
            )
            .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    }, [classes, editingProgram?.academicClassId]);

    const isGradeBased = values.programType === 'GRADE_BASED';
    const isUsingUnreadableExistingClass = Boolean(
        isGradeBased &&
            !canReadClasses &&
            editingProgram?.programType === 'GRADE_BASED' &&
            editingProgram.academicClassId &&
            values.academicClassId === editingProgram.academicClassId
    );
    const isBlockedByMissingClassRead = Boolean(
        isGradeBased && !canReadClasses && !isUsingUnreadableExistingClass
    );
    const isBlockedByUnavailableClasses = Boolean(
        isGradeBased &&
            canReadClasses &&
            !isLoadingClasses &&
            (Boolean(classesError) || selectableClasses.length === 0) &&
            !editingProgram?.academicClassId
    );

    const handleFieldChange = <K extends keyof ProgramFormValues>(
        field: K,
        value: ProgramFormValues[K]
    ) => {
        setSubmitError(null);
        setValues((prev) => {
            if (field === 'programType') {
                const nextType = value as '' | ProgramType;
                return {
                    ...prev,
                    programType: nextType,
                    academicClassId:
                        nextType === 'GRADE_BASED'
                            ? prev.academicClassId ||
                              (editingProgram?.programType === 'GRADE_BASED'
                                  ? editingProgram.academicClassId ?? ''
                                  : '')
                            : '',
                };
            }
            return { ...prev, [field]: value };
        });
        setFieldErrors((prev) => {
            const next = { ...prev, [field]: undefined };
            if (field === 'programType') {
                next.academicClassId = undefined;
            }
            return next;
        });
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting || isBlockedByMissingClassRead || isBlockedByUnavailableClasses) {
            return;
        }
        setSubmitError(null);

        const validation = validateProgramForm({
            values,
            classes,
            classesLoaded: classesLoadedSuccessfully,
            editingProgram,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            return;
        }
        setFieldErrors({});

        const result = editingProgram
            ? await onSubmitUpdate(editingProgram.id, validation.payload)
            : await onSubmitCreate(validation.payload);

        if (result.ok) {
            onClose();
            return;
        }

        if (result.error instanceof ApiError && result.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(
                    result.error.validationErrors,
                    PROGRAM_ERROR_FIELDS
                )
            );
        }
        setSubmitError(result.errorMessage);
    };

    return (
        <AcademicModalShell
            title={isEditMode ? `Edit Program: ${editingProgram?.name}` : 'Create Program'}
            subtitle="Configure a reusable educational program. Grade-based programs link to one Academic Class; programs are not permanently bound to an Academic Year."
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
                        htmlFor="program-name"
                        className="block text-xs font-medium text-gray-700"
                    >
                        Program Name <span className="text-red-600">*</span>
                    </label>
                    <input
                        id="program-name"
                        type="text"
                        required
                        disabled={isSubmitting}
                        maxLength={CATALOG_LIMITS.PROGRAM_NAME_MAX}
                        value={values.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="e.g. Grade 9 Academic Program or Graphic Design Program"
                        aria-invalid={Boolean(fieldErrors.name)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
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
                            htmlFor="program-code"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Program Code <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            id="program-code"
                            type="text"
                            disabled={isSubmitting}
                            maxLength={CATALOG_LIMITS.CODE_MAX}
                            value={values.code}
                            onChange={(e) => handleFieldChange('code', e.target.value)}
                            placeholder="e.g. PROG-G9"
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
                            htmlFor="program-status"
                            className="block text-xs font-medium text-gray-700"
                        >
                            Lifecycle Status <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="program-status"
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

                <div>
                    <label
                        htmlFor="program-type"
                        className="block text-xs font-medium text-gray-700"
                    >
                        Program Type <span className="text-red-600">*</span>
                    </label>
                    <select
                        id="program-type"
                        disabled={isSubmitting}
                        value={values.programType}
                        onChange={(e) =>
                            handleFieldChange('programType', e.target.value as '' | ProgramType)
                        }
                        aria-invalid={Boolean(fieldErrors.programType)}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                    >
                        {PROGRAM_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {formatProgramTypeLabel(type)}
                            </option>
                        ))}
                    </select>
                    {fieldErrors.programType && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {fieldErrors.programType}
                        </p>
                    )}
                </div>

                {isGradeBased ? (
                    <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3.5">
                        <label
                            htmlFor="program-academic-class"
                            className="block text-xs font-medium text-gray-800"
                        >
                            Associated Academic Class <span className="text-red-600">*</span>
                        </label>

                        {!canReadClasses ? (
                            isUsingUnreadableExistingClass ? (
                                <div className="space-y-1.5 text-xs text-gray-700">
                                    <p className="rounded border border-gray-300 bg-white px-3 py-2 font-medium text-gray-900">
                                        {editingProgram?.academicClassName ||
                                            editingProgram?.academicClassId}
                                    </p>
                                    <p className="text-amber-800">
                                        Changing the linked class requires{' '}
                                        <code className="font-mono">
                                            {PERMISSIONS.CLASSES.READ}
                                        </code>
                                        . Existing link will be preserved.
                                    </p>
                                </div>
                            ) : (
                                <div
                                    role="alert"
                                    className="rounded border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900"
                                >
                                    Loading selectable Academic Classes requires the{' '}
                                    <code className="font-mono">{PERMISSIONS.CLASSES.READ}</code>{' '}
                                    permission. Choose a Skill-Based program type or request class
                                    read access.
                                </div>
                            )
                        ) : isLoadingClasses ? (
                            <p className="text-xs text-gray-600">
                                Loading existing Academic Classes from Academic Structure...
                            </p>
                        ) : classesError ? (
                            <div
                                role="alert"
                                className="space-y-2 rounded border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900"
                            >
                                <p>
                                    {classesError.isBackendUnavailable
                                        ? `Academic Classes lookup endpoint is pending backend implementation (${classesError.message}).`
                                        : classesError.message}
                                </p>
                                <button
                                    type="button"
                                    onClick={onRetryClasses}
                                    className="rounded border border-amber-300 bg-white px-2.5 py-1 font-medium text-amber-950 hover:bg-amber-100"
                                >
                                    Retry Loading Classes
                                </button>
                            </div>
                        ) : selectableClasses.length === 0 ? (
                            <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                                <p>
                                    No active Academic Classes exist yet. Grade-Based programs must
                                    reference an existing Academic Class from Academic Structure.
                                </p>
                                {canAccessAcademicStructure && (
                                    <Link
                                        to="/admin/academic-structure"
                                        onClick={onClose}
                                        className="mt-1.5 inline-block font-semibold text-blue-700 underline hover:text-blue-800"
                                    >
                                        Go to Academic Structure to configure Classes →
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <>
                                <select
                                    id="program-academic-class"
                                    disabled={isSubmitting}
                                    value={values.academicClassId}
                                    onChange={(e) =>
                                        handleFieldChange('academicClassId', e.target.value)
                                    }
                                    aria-invalid={Boolean(fieldErrors.academicClassId)}
                                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                                >
                                    <option value="">Select Academic Class...</option>
                                    {selectableClasses.map((cls) => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.name}
                                            {cls.code ? ` (${cls.code})` : ''}
                                            {cls.status !== 'ACTIVE' ? ` [${cls.status}]` : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-600">
                                    Required for Grade-Based programs. Managed separately under
                                    Academic Structure.
                                </p>
                            </>
                        )}

                        {fieldErrors.academicClassId && (
                            <p role="alert" className="text-xs text-red-600">
                                {fieldErrors.academicClassId}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                        Skill-Based programs are not associated with a grade-level Academic Class.
                    </div>
                )}

                <div>
                    <label
                        htmlFor="program-description"
                        className="block text-xs font-medium text-gray-700"
                    >
                        Description <span className="font-normal text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                        id="program-description"
                        rows={3}
                        disabled={isSubmitting}
                        maxLength={CATALOG_LIMITS.DESCRIPTION_MAX}
                        value={values.description}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="Program overview, curriculum focus, and eligibility notes..."
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
                        disabled={
                            isSubmitting ||
                            isBlockedByMissingClassRead ||
                            isBlockedByUnavailableClasses
                        }
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting
                            ? 'Saving...'
                            : isEditMode
                              ? 'Save Program Changes'
                              : 'Create Program'}
                    </button>
                </div>
            </form>
        </AcademicModalShell>
    );
};

