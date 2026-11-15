import React, { useState } from 'react';
import type { AuthenticatedUser } from '../../../types/auth';
import {
    AcademicConfirmDialog,
    AcademicModalShell,
} from '../../academic/components/AcademicConfirmDialog';
import type {
    AcademicClass,
    AcademicSection,
    AcademicYear,
} from '../../academic/types/academic-structure.types';
import type {
    BatchAssignmentOutcome,
    CatalogDetailSubject,
    CatalogFetchError,
    CatalogMutationError,
    CatalogSubmitOutcome,
} from '../hooks/useProgramsAndCourses';
import { formatAcademicTimestamp } from '../schemas/programs-courses-schema';
import type {
    AddProgramCourseRequest,
    Course,
    CreateTeacherAssignmentRequest,
    Program,
    ProgramCourse,
    TeacherCourseAssignment,
    UpdateProgramCourseRequest,
} from '../types/programs-courses.types';
import { AddCourseToProgramModal } from './AddCourseToProgramModal';
import {
    OfferingLifecycleBadge,
    ProgramTypeBadge,
    StandaloneEligibilityBadge,
} from './CatalogBadgesAndPagination';
import { EditProgramCourseModal } from './EditProgramCourseModal';
import { ManageCourseTeachersModal } from './ManageCourseTeachersModal';
import { ProgramCurriculumSection } from './ProgramCurriculumSection';
import { StandaloneTeachersSection } from './StandaloneTeachersSection';

type CurriculumOverlayState =
    | { kind: 'add-course' }
    | { kind: 'edit-settings'; programCourse: ProgramCourse }
    | { kind: 'remove-course'; programCourse: ProgramCourse }
    | { kind: 'manage-program-teachers'; programCourse: ProgramCourse }
    | { kind: 'manage-standalone-teachers'; course: Course }
    | null;

interface ProgramDetailModalProps {
    subject: CatalogDetailSubject;
    returnToProgram: Program | null;
    actor: AuthenticatedUser | null;
    tenantId: string | null;
    classes: readonly AcademicClass[];
    isRefreshing: boolean;
    detailNotice: string | null;
    programCourses: readonly ProgramCourse[];
    isLoadingCurriculum: boolean;
    curriculumError: CatalogFetchError | null;
    isCurriculumMutating: boolean;
    curriculumMutationNotice: string | null;
    curriculumMutationError: CatalogMutationError | null;
    programAssignments: readonly TeacherCourseAssignment[];
    isLoadingProgramAssignments: boolean;
    programAssignmentsError: CatalogFetchError | null;
    standaloneAssignments: readonly TeacherCourseAssignment[];
    isLoadingStandaloneAssignments: boolean;
    standaloneAssignmentsError: CatalogFetchError | null;
    academicYears: readonly AcademicYear[];
    isLoadingYears: boolean;
    yearsError: CatalogFetchError | null;
    programSections: readonly AcademicSection[];
    isLoadingSections: boolean;
    sectionsError: CatalogFetchError | null;
    isAssignmentMutating: boolean;
    canReadPrograms: boolean;
    canReadCourses: boolean;
    canCreateCourses: boolean;
    canAssignCourses: boolean;
    canAssignProgramTeachers: boolean;
    canAssignStandaloneTeachers: boolean;
    canReadClasses: boolean;
    canReadYears: boolean;
    canReadTerms: boolean;
    canReadSections: boolean;
    canUpdateProgram: boolean;
    canUpdateCourse: boolean;
    onRetryCurriculum: () => void;
    onRetryProgramAssignments: () => void;
    onRetryStandaloneAssignments: () => void;
    onRetryYears: () => void;
    onRetrySections: () => void;
    onAssignTeachersBatch: (
        requests: CreateTeacherAssignmentRequest[],
        context: {
            program?: Program | null;
            course: Pick<Course, 'id' | 'allowStandalone'>;
        }
    ) => Promise<BatchAssignmentOutcome>;
    onRemoveTeacherAssignment: (
        assignment: TeacherCourseAssignment
    ) => Promise<CatalogSubmitOutcome>;
    onAddCourseToProgram: (
        programId: string,
        payload: AddProgramCourseRequest
    ) => Promise<CatalogSubmitOutcome>;
    onUpdateProgramCourse: (
        programId: string,
        programCourseId: string,
        payload: UpdateProgramCourseRequest
    ) => Promise<CatalogSubmitOutcome>;
    onMoveProgramCourse: (
        programId: string,
        programCourseId: string,
        direction: 'up' | 'down'
    ) => Promise<CatalogSubmitOutcome>;
    onRemoveProgramCourse: (
        programId: string,
        programCourse: ProgramCourse
    ) => Promise<boolean>;
    onViewCourseFromProgram: (programCourse: ProgramCourse, parentProgram: Program) => void;
    onReturnToParentProgram: () => void;
    onNavigateToCoursesCatalog: () => void;
    onEditProgram: (program: Program) => void;
    onEditCourse: (course: Course) => void;
    onClose: () => void;
}

export const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({
    subject,
    returnToProgram,
    actor,
    tenantId,
    classes,
    isRefreshing,
    detailNotice,
    programCourses,
    isLoadingCurriculum,
    curriculumError,
    isCurriculumMutating,
    curriculumMutationNotice,
    curriculumMutationError,
    programAssignments,
    isLoadingProgramAssignments,
    programAssignmentsError,
    standaloneAssignments,
    isLoadingStandaloneAssignments,
    standaloneAssignmentsError,
    academicYears,
    isLoadingYears,
    yearsError,
    programSections,
    isLoadingSections,
    sectionsError,
    isAssignmentMutating,
    canReadPrograms,
    canReadCourses,
    canCreateCourses,
    canAssignCourses,
    canAssignProgramTeachers,
    canAssignStandaloneTeachers,
    canReadClasses,
    canReadYears,
    canReadTerms,
    canReadSections,
    canUpdateProgram,
    canUpdateCourse,
    onRetryCurriculum,
    onRetryProgramAssignments,
    onRetryStandaloneAssignments,
    onRetryYears,
    onRetrySections,
    onAssignTeachersBatch,
    onRemoveTeacherAssignment,
    onAddCourseToProgram,
    onUpdateProgramCourse,
    onMoveProgramCourse,
    onRemoveProgramCourse,
    onViewCourseFromProgram,
    onReturnToParentProgram,
    onNavigateToCoursesCatalog,
    onEditProgram,
    onEditCourse,
    onClose,
}) => {
    const [curriculumOverlay, setCurriculumOverlay] = useState<CurriculumOverlayState>(null);

    if (subject.kind === 'program') {
        const program = subject.record;
        const linkedClass = program.academicClassId
            ? classes.find((cls) => cls.id === program.academicClassId)
            : undefined;
        const classDisplay =
            program.programType === 'SKILL_BASED'
                ? 'Not applicable (Skill-Based)'
                : program.academicClassName
                  ? `${program.academicClassName}${program.academicClassCode ? ` (${program.academicClassCode})` : ''}`
                  : linkedClass
                    ? `${linkedClass.name}${linkedClass.code ? ` (${linkedClass.code})` : ''}`
                    : program.academicClassId
                      ? canReadClasses
                          ? program.academicClassId
                          : 'Linked Academic Class (requires classes.read to resolve label)'
                      : '—';

        const createdLabel = formatAcademicTimestamp(program.createdAt);
        const updatedLabel = formatAcademicTimestamp(program.updatedAt);

        return (
            <>
                <AcademicModalShell
                    title={`Program Curriculum & Details: ${program.name}`}
                    isSubmitting={isCurriculumMutating || Boolean(curriculumOverlay)}
                    onClose={onClose}
                    maxWidthClass="max-w-4xl"
                >
                    <div className="space-y-5 text-sm text-gray-700">
                        {isRefreshing && (
                            <div role="status" className="text-xs text-gray-500">
                                Refreshing program details...
                            </div>
                        )}

                        {detailNotice && (
                            <div
                                role="status"
                                className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
                            >
                                {detailNotice}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <ProgramTypeBadge programType={program.programType} />
                                <OfferingLifecycleBadge status={program.status} />
                            </div>
                            {updatedLabel && (
                                <span className="text-xs text-gray-500">
                                    Updated: {updatedLabel}
                                </span>
                            )}
                        </div>

                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <dt className="text-xs font-medium text-gray-500">Program Code</dt>
                                <dd className="mt-0.5 font-medium text-gray-900">
                                    {program.code ?? '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500">
                                    Academic Class
                                </dt>
                                <dd className="mt-0.5 font-medium text-gray-900">
                                    {classDisplay}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500">
                                    Linked Courses
                                </dt>
                                <dd className="mt-0.5 text-gray-900">
                                    {programCourses.length > 0
                                        ? programCourses.length
                                        : typeof program.courseCount === 'number'
                                          ? program.courseCount
                                          : 'Not reported'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500">Enrollments</dt>
                                <dd className="mt-0.5 text-gray-900">
                                    {typeof program.enrollmentCount === 'number'
                                        ? program.enrollmentCount
                                        : 'Not reported'}
                                </dd>
                            </div>
                            {createdLabel && (
                                <div>
                                    <dt className="text-xs font-medium text-gray-500">Created</dt>
                                    <dd className="mt-0.5 text-xs text-gray-800">{createdLabel}</dd>
                                </div>
                            )}
                            {program.updatedBy && (
                                <div>
                                    <dt className="text-xs font-medium text-gray-500">
                                        Updated By
                                    </dt>
                                    <dd className="mt-0.5 text-xs text-gray-800">
                                        {program.updatedBy.name ||
                                            program.updatedBy.email ||
                                            program.updatedBy.id}
                                    </dd>
                                </div>
                            )}
                            {program.description && (
                                <div className="sm:col-span-2 lg:col-span-4">
                                    <dt className="text-xs font-medium text-gray-500">
                                        Description
                                    </dt>
                                    <dd className="mt-0.5 whitespace-pre-wrap text-gray-800">
                                        {program.description}
                                    </dd>
                                </div>
                            )}
                        </dl>

                        <ProgramCurriculumSection
                            program={program}
                            programCourses={programCourses}
                            programAssignments={programAssignments}
                            isLoadingAssignments={isLoadingProgramAssignments}
                            assignmentsError={programAssignmentsError}
                            isLoading={isLoadingCurriculum}
                            loadError={curriculumError}
                            isMutating={isCurriculumMutating || isAssignmentMutating}
                            mutationNotice={curriculumMutationNotice}
                            mutationError={curriculumMutationError}
                            canReadPrograms={canReadPrograms}
                            canReadCourses={canReadCourses}
                            canAssignCourses={canAssignCourses}
                            canAssignProgramTeachers={canAssignProgramTeachers}
                            onRetry={onRetryCurriculum}
                            onRetryAssignments={onRetryProgramAssignments}
                            onOpenAddCourse={() => {
                                if (!canAssignCourses) return;
                                setCurriculumOverlay({ kind: 'add-course' });
                            }}
                            onOpenManageTeachers={(pc) => {
                                setCurriculumOverlay({
                                    kind: 'manage-program-teachers',
                                    programCourse: pc,
                                });
                            }}
                            onViewCourse={(pc) => {
                                if (!canReadCourses) return;
                                onViewCourseFromProgram(pc, program);
                            }}
                            onOpenEditSettings={(pc) => {
                                if (!canAssignCourses) return;
                                setCurriculumOverlay({
                                    kind: 'edit-settings',
                                    programCourse: pc,
                                });
                            }}
                            onMoveCourse={(pcId, direction) => {
                                if (!canAssignCourses) return;
                                void onMoveProgramCourse(program.id, pcId, direction);
                            }}
                            onRequestRemoveCourse={(pc) => {
                                if (!canAssignCourses) return;
                                setCurriculumOverlay({
                                    kind: 'remove-course',
                                    programCourse: pc,
                                });
                            }}
                        />

                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
                            {canUpdateProgram && (
                                <button
                                    type="button"
                                    disabled={isCurriculumMutating}
                                    onClick={() => {
                                        onClose();
                                        onEditProgram(program);
                                    }}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Edit Program Metadata
                                </button>
                            )}
                            <button
                                type="button"
                                disabled={isCurriculumMutating}
                                onClick={onClose}
                                className="rounded-md bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </AcademicModalShell>

                {curriculumOverlay?.kind === 'add-course' && (
                    <AddCourseToProgramModal
                        program={program}
                        existingProgramCourses={programCourses}
                        actor={actor}
                        tenantId={tenantId}
                        canReadCourses={canReadCourses}
                        canCreateCourses={canCreateCourses}
                        canAssignCourses={canAssignCourses}
                        isSubmitting={isCurriculumMutating}
                        onNavigateToCoursesCatalog={() => {
                            setCurriculumOverlay(null);
                            onClose();
                            onNavigateToCoursesCatalog();
                        }}
                        onClose={() => setCurriculumOverlay(null)}
                        onSubmitAdd={onAddCourseToProgram}
                    />
                )}

                {curriculumOverlay?.kind === 'edit-settings' && (
                    <EditProgramCourseModal
                        program={program}
                        programCourse={curriculumOverlay.programCourse}
                        existingProgramCourses={programCourses}
                        isSubmitting={isCurriculumMutating}
                        onClose={() => setCurriculumOverlay(null)}
                        onSubmitUpdate={onUpdateProgramCourse}
                    />
                )}

                {curriculumOverlay?.kind === 'remove-course' && (
                    <AcademicConfirmDialog
                        title={`Remove Course from Program: ${curriculumOverlay.programCourse.courseTitle}`}
                        message={`Remove "${curriculumOverlay.programCourse.courseTitle}" from "${program.name}"?`}
                        warningNote="This removes only the curriculum link inside this Program. The Course will remain available in the reusable Course catalog, and any other Programs using the same Course will not be affected."
                        confirmLabel="Remove from Program"
                        tone="danger"
                        isSubmitting={isCurriculumMutating}
                        onCancel={() => setCurriculumOverlay(null)}
                        onConfirm={async () => {
                            const removed = await onRemoveProgramCourse(
                                program.id,
                                curriculumOverlay.programCourse
                            );
                            if (removed || curriculumOverlay) {
                                setCurriculumOverlay(null);
                            }
                        }}
                    />
                )}

                {curriculumOverlay?.kind === 'manage-program-teachers' && (
                    <ManageCourseTeachersModal
                        target={{
                            scope: 'PROGRAM_COURSE',
                            program,
                            programCourse: curriculumOverlay.programCourse,
                        }}
                        actor={actor}
                        tenantId={tenantId}
                        canAssignTeachers={canAssignProgramTeachers}
                        assignments={programAssignments.filter(
                            (assignment) =>
                                assignment.programCourseId ===
                                curriculumOverlay.programCourse.id
                        )}
                        isLoadingAssignments={isLoadingProgramAssignments}
                        assignmentsError={programAssignmentsError}
                        academicYears={academicYears}
                        isLoadingYears={isLoadingYears}
                        yearsError={yearsError}
                        canReadYears={canReadYears}
                        sections={programSections}
                        isLoadingSections={isLoadingSections}
                        sectionsError={sectionsError}
                        canReadSections={canReadSections}
                        canReadTerms={canReadTerms}
                        isMutating={isAssignmentMutating}
                        onRetryAssignments={onRetryProgramAssignments}
                        onRetryYears={onRetryYears}
                        onRetrySections={onRetrySections}
                        onAssignBatch={onAssignTeachersBatch}
                        onRemoveAssignment={onRemoveTeacherAssignment}
                        onClose={() => setCurriculumOverlay(null)}
                    />
                )}
            </>
        );
    }

    const course = subject.record;
    const createdLabel = formatAcademicTimestamp(course.createdAt);
    const updatedLabel = formatAcademicTimestamp(course.updatedAt);

    return (
        <>
            <AcademicModalShell
                title={`Course Details: ${course.title}`}
                isSubmitting={
                    isAssignmentMutating ||
                    curriculumOverlay?.kind === 'manage-standalone-teachers'
                }
                onClose={onClose}
                maxWidthClass="max-w-2xl"
            >
            <div className="space-y-4 text-sm text-gray-700">
                {returnToProgram && (
                    <div className="flex items-center justify-between rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-950">
                        <span>
                            Opened from <span className="font-semibold">{returnToProgram.name}</span>
                        </span>
                        <button
                            type="button"
                            onClick={onReturnToParentProgram}
                            className="font-semibold text-indigo-700 underline hover:text-indigo-900"
                        >
                            ← Back to Program Curriculum
                        </button>
                    </div>
                )}

                {isRefreshing && (
                    <div role="status" className="text-xs text-gray-500">
                        Refreshing course details...
                    </div>
                )}

                {detailNotice && (
                    <div
                        role="status"
                        className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
                    >
                        {detailNotice}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <StandaloneEligibilityBadge allowStandalone={course.allowStandalone} />
                        <OfferingLifecycleBadge status={course.status} />
                    </div>
                    {updatedLabel && (
                        <span className="text-xs text-gray-500">Updated: {updatedLabel}</span>
                    )}
                </div>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <dt className="text-xs font-medium text-gray-500">Course Code</dt>
                        <dd className="mt-0.5 font-medium text-gray-900">{course.code ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium text-gray-500">Credits / Hours</dt>
                        <dd className="mt-0.5 font-medium text-gray-900">
                            {typeof course.creditHours === 'number' ? course.creditHours : '—'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium text-gray-500">Programs Linked</dt>
                        <dd className="mt-0.5 text-gray-900">
                            {typeof course.programCount === 'number'
                                ? course.programCount
                                : 'Not reported'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium text-gray-500">
                            Standalone Teacher Assignments
                        </dt>
                        <dd className="mt-0.5 text-gray-900">
                            {course.allowStandalone
                                ? !isLoadingStandaloneAssignments &&
                                  !standaloneAssignmentsError &&
                                  (canReadCourses || canAssignStandaloneTeachers)
                                    ? standaloneAssignments.length
                                    : typeof course.standaloneTeacherCount === 'number'
                                      ? course.standaloneTeacherCount
                                      : 'Not reported'
                                : 'Disabled (Program-Only)'}
                        </dd>
                    </div>
                    {typeof course.enrollmentCount === 'number' && (
                        <div>
                            <dt className="text-xs font-medium text-gray-500">Enrollments</dt>
                            <dd className="mt-0.5 text-gray-900">{course.enrollmentCount}</dd>
                        </div>
                    )}
                    {createdLabel && (
                        <div>
                            <dt className="text-xs font-medium text-gray-500">Created</dt>
                            <dd className="mt-0.5 text-xs text-gray-800">{createdLabel}</dd>
                        </div>
                    )}
                    {course.updatedBy && (
                        <div>
                            <dt className="text-xs font-medium text-gray-500">Updated By</dt>
                            <dd className="mt-0.5 text-xs text-gray-800">
                                {course.updatedBy.name ||
                                    course.updatedBy.email ||
                                    course.updatedBy.id}
                            </dd>
                        </div>
                    )}
                    {course.description && (
                        <div className="sm:col-span-2">
                            <dt className="text-xs font-medium text-gray-500">Description</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-gray-800">
                                {course.description}
                            </dd>
                        </div>
                    )}
                </dl>

                <StandaloneTeachersSection
                    course={course}
                    assignments={standaloneAssignments}
                    isLoading={isLoadingStandaloneAssignments}
                    loadError={standaloneAssignmentsError}
                    isMutating={isAssignmentMutating}
                    canReadCourses={canReadCourses}
                    canAssignStandaloneTeachers={canAssignStandaloneTeachers}
                    onRetry={onRetryStandaloneAssignments}
                    onOpenManageTeachers={() => {
                        if (!canAssignStandaloneTeachers || !course.allowStandalone) return;
                        setCurriculumOverlay({
                            kind: 'manage-standalone-teachers',
                            course,
                        });
                    }}
                    onRemoveAssignment={onRemoveTeacherAssignment}
                />

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
                    {returnToProgram && (
                        <button
                            type="button"
                            onClick={onReturnToParentProgram}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                            ← Back to Program
                        </button>
                    )}
                    {canUpdateCourse && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onEditCourse(course);
                            }}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Edit Course
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </AcademicModalShell>

            {curriculumOverlay?.kind === 'manage-standalone-teachers' && (
                <ManageCourseTeachersModal
                    target={{
                        scope: 'STANDALONE_COURSE',
                        course: curriculumOverlay.course,
                    }}
                    actor={actor}
                    tenantId={tenantId}
                    canAssignTeachers={canAssignStandaloneTeachers}
                    assignments={standaloneAssignments}
                    isLoadingAssignments={isLoadingStandaloneAssignments}
                    assignmentsError={standaloneAssignmentsError}
                    academicYears={academicYears}
                    isLoadingYears={isLoadingYears}
                    yearsError={yearsError}
                    canReadYears={canReadYears}
                    sections={[]}
                    isLoadingSections={false}
                    sectionsError={null}
                    canReadSections={false}
                    canReadTerms={canReadTerms}
                    isMutating={isAssignmentMutating}
                    onRetryAssignments={onRetryStandaloneAssignments}
                    onRetryYears={onRetryYears}
                    onRetrySections={onRetrySections}
                    onAssignBatch={onAssignTeachersBatch}
                    onRemoveAssignment={onRemoveTeacherAssignment}
                    onClose={() => setCurriculumOverlay(null)}
                />
            )}
        </>
    );
};
