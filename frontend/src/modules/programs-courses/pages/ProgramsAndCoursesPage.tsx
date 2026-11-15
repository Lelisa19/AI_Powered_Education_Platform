import React, { useMemo, useState } from 'react';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PERMISSIONS, SCHOOL_ADMIN_ROUTE_PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { AcademicConfirmDialog } from '../../academic/components/AcademicConfirmDialog';
import { CourseFormModal } from '../components/CourseFormModal';
import { CoursesDirectorySection } from '../components/CoursesDirectorySection';
import { ProgramDetailModal } from '../components/ProgramDetailModal';
import { ProgramFormModal } from '../components/ProgramFormModal';
import { ProgramsDirectorySection } from '../components/ProgramsDirectorySection';
import {
    type ProgramsCoursesPermissions,
    useProgramsAndCourses,
} from '../hooks/useProgramsAndCourses';
import {
    evaluateCourseDeleteEligibility,
    evaluateProgramDeleteEligibility,
    formatOfferingStatusLabel,
} from '../schemas/programs-courses-schema';
import type {
    Course,
    OfferingLifecycleStatus,
    Program,
    ProgramsCoursesTabId,
} from '../types/programs-courses.types';

type ActiveFormModal =
    | { kind: 'program-create' }
    | { kind: 'program-edit'; program: Program }
    | { kind: 'course-create' }
    | { kind: 'course-edit'; course: Course };

type PendingConfirmation =
    | { kind: 'program-status'; program: Program; nextStatus: OfferingLifecycleStatus }
    | { kind: 'program-delete'; program: Program }
    | { kind: 'course-status'; course: Course; nextStatus: OfferingLifecycleStatus }
    | { kind: 'course-delete'; course: Course };

export const ProgramsAndCoursesPage: React.FC = () => {
    const { user } = useAuth();
    const { classification, tenantId, schoolName, hostname } = useTenantContext();
    const { hasPermission, hasAnyPermission } = usePermissions();

    const perms: ProgramsCoursesPermissions = useMemo(
        () => ({
            canReadPrograms: hasPermission(PERMISSIONS.PROGRAMS.READ),
            canCreatePrograms: hasPermission(PERMISSIONS.PROGRAMS.CREATE),
            canUpdatePrograms: hasPermission(PERMISSIONS.PROGRAMS.UPDATE),
            canDeletePrograms: hasPermission(PERMISSIONS.PROGRAMS.DELETE),
            canAssignCourses: hasPermission(PERMISSIONS.PROGRAMS.ASSIGN_COURSES),
            canAssignProgramTeachers: hasPermission(PERMISSIONS.PROGRAMS.ASSIGN_TEACHERS),
            canReadCourses: hasPermission(PERMISSIONS.COURSES.READ),
            canCreateCourses: hasPermission(PERMISSIONS.COURSES.CREATE),
            canUpdateCourses: hasPermission(PERMISSIONS.COURSES.UPDATE),
            canDeleteCourses: hasPermission(PERMISSIONS.COURSES.DELETE),
            canAssignStandaloneTeachers: hasPermission(PERMISSIONS.COURSES.ASSIGN_TEACHERS),
            canReadClasses: hasPermission(PERMISSIONS.CLASSES.READ),
            canReadYears: hasPermission(PERMISSIONS.ACADEMIC_YEARS.READ),
            canReadTerms: hasPermission(PERMISSIONS.TERMS.READ),
            canReadSections: hasPermission(PERMISSIONS.SECTIONS.READ),
        }),
        [hasPermission]
    );

    const canAccessAcademicStructure = hasAnyPermission([
        ...SCHOOL_ADMIN_ROUTE_PERMISSIONS.ACADEMIC_STRUCTURE,
    ]);

    const isVerifiedSchoolSession =
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user?.accountType === 'SCHOOL' &&
        user.tenantId === tenantId;

    const hasAnyCatalogRead = perms.canReadPrograms || perms.canReadCourses;

    const visibleTabs = useMemo(() => {
        const tabs: { id: ProgramsCoursesTabId; label: string }[] = [];
        if (perms.canReadPrograms) tabs.push({ id: 'programs', label: 'Programs' });
        if (perms.canReadCourses) tabs.push({ id: 'courses', label: 'Courses Catalog' });
        return tabs;
    }, [perms.canReadCourses, perms.canReadPrograms]);

    const [preferredTab, setPreferredTab] = useState<ProgramsCoursesTabId | null>(null);
    const activeTab: ProgramsCoursesTabId | null = useMemo(() => {
        if (visibleTabs.length === 0) return null;
        if (preferredTab && visibleTabs.some((t) => t.id === preferredTab)) {
            return preferredTab;
        }
        return visibleTabs[0].id;
    }, [preferredTab, visibleTabs]);

    const [formModal, setFormModal] = useState<ActiveFormModal | null>(null);
    const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);

    const {
        programsQuery,
        setProgramsQuery,
        programs,
        programsPagination,
        isLoadingPrograms,
        programsError,
        reloadPrograms,

        coursesQuery,
        setCoursesQuery,
        courses,
        coursesPagination,
        isLoadingCourses,
        coursesError,
        reloadCourses,

        classes,
        isLoadingClasses,
        classesError,
        classesLoadedSuccessfully,
        reloadClasses,

        detailSubject,
        returnToProgram,
        isDetailRefreshing,
        detailNotice,
        openProgramDetails,
        openCourseDetails,
        openCourseFromProgram,
        handleReturnToParentProgram,
        closeDetails,

        programCourses,
        isLoadingCurriculum,
        curriculumError,
        isCurriculumMutating,
        curriculumMutationNotice,
        curriculumMutationError,
        reloadProgramCurriculum,
        addProgramCourse,
        editProgramCourse,
        reorderProgramCourse,
        detachProgramCourse,

        academicYears,
        isLoadingYears,
        yearsError,
        reloadAcademicYears,

        programSections,
        isLoadingSections,
        sectionsError,
        reloadProgramSections,

        programAssignments,
        isLoadingProgramAssignments,
        programAssignmentsError,
        reloadProgramAssignments,

        standaloneAssignments,
        isLoadingStandaloneAssignments,
        standaloneAssignmentsError,
        reloadStandaloneAssignments,

        isAssignmentMutating,
        assignTeachersBatch,
        removeTeacherAssignment,

        isMutating,
        mutationNotice,
        mutationError,
        saveNewProgram,
        saveEditedProgram,
        changeProgramStatus,
        removeProgram,
        saveNewCourse,
        saveEditedCourse,
        changeCourseStatus,
        removeCourse,
        reloadAll,
    } = useProgramsAndCourses({
        actor: user,
        tenantId,
        enabled: isVerifiedSchoolSession && hasAnyCatalogRead,
        permissions: perms,
    });

    const displaySchoolName = schoolName || hostname || 'Verified School';
    const isAnyLoading = isLoadingPrograms || isLoadingCourses || isLoadingClasses;

    const handleOpenCreateProgram = () => {
        if (!isVerifiedSchoolSession || !perms.canCreatePrograms) return;
        setFormModal({ kind: 'program-create' });
    };

    const handleOpenEditProgram = (program: Program) => {
        if (!isVerifiedSchoolSession || !perms.canUpdatePrograms) return;
        setFormModal({ kind: 'program-edit', program });
    };

    const handleRequestProgramStatus = (program: Program, nextStatus: OfferingLifecycleStatus) => {
        if (!isVerifiedSchoolSession || !perms.canUpdatePrograms || isMutating) return;
        setPendingConfirm({ kind: 'program-status', program, nextStatus });
    };

    const handleRequestProgramDelete = (program: Program) => {
        if (!isVerifiedSchoolSession || isMutating) return;
        const check = evaluateProgramDeleteEligibility({
            program,
            canDeletePermission: perms.canDeletePrograms,
        });
        if (!check.allowed) return;
        setPendingConfirm({ kind: 'program-delete', program });
    };

    const handleOpenCreateCourse = () => {
        if (!isVerifiedSchoolSession || !perms.canCreateCourses) return;
        setFormModal({ kind: 'course-create' });
    };

    const handleOpenEditCourse = (course: Course) => {
        if (!isVerifiedSchoolSession || !perms.canUpdateCourses) return;
        setFormModal({ kind: 'course-edit', course });
    };

    const handleRequestCourseStatus = (course: Course, nextStatus: OfferingLifecycleStatus) => {
        if (!isVerifiedSchoolSession || !perms.canUpdateCourses || isMutating) return;
        setPendingConfirm({ kind: 'course-status', course, nextStatus });
    };

    const handleRequestCourseDelete = (course: Course) => {
        if (!isVerifiedSchoolSession || isMutating) return;
        const check = evaluateCourseDeleteEligibility({
            course,
            canDeletePermission: perms.canDeleteCourses,
        });
        if (!check.allowed) return;
        setPendingConfirm({ kind: 'course-delete', course });
    };

    const handleExecuteConfirm = async () => {
        if (!pendingConfirm || isMutating) return;

        if (pendingConfirm.kind === 'program-status') {
            await changeProgramStatus(pendingConfirm.program, pendingConfirm.nextStatus);
        } else if (pendingConfirm.kind === 'program-delete') {
            await removeProgram(pendingConfirm.program);
        } else if (pendingConfirm.kind === 'course-status') {
            await changeCourseStatus(pendingConfirm.course, pendingConfirm.nextStatus);
        } else if (pendingConfirm.kind === 'course-delete') {
            await removeCourse(pendingConfirm.course);
        }
        setPendingConfirm(null);
    };

    const renderConfirmDialog = () => {
        if (!pendingConfirm) return null;

        if (pendingConfirm.kind === 'program-status') {
            const { program, nextStatus } = pendingConfirm;
            return (
                <AcademicConfirmDialog
                    title={`Confirm Program Status: ${program.name}`}
                    message={`Change "${program.name}" status from ${formatOfferingStatusLabel(
                        program.status
                    )} to ${formatOfferingStatusLabel(nextStatus)}?`}
                    warningNote={
                        nextStatus === 'ARCHIVED'
                            ? 'Archived programs remain preserved for historical records and can be reactivated later.'
                            : nextStatus === 'INACTIVE'
                              ? 'Inactive programs cannot receive new curriculum links or student enrollments until reactivated.'
                              : undefined
                    }
                    confirmLabel={`Mark as ${formatOfferingStatusLabel(nextStatus)}`}
                    tone={nextStatus === 'ACTIVE' ? 'primary' : 'warning'}
                    isSubmitting={isMutating}
                    onCancel={() => setPendingConfirm(null)}
                    onConfirm={handleExecuteConfirm}
                />
            );
        }

        if (pendingConfirm.kind === 'program-delete') {
            const eligibility = evaluateProgramDeleteEligibility({
                program: pendingConfirm.program,
                canDeletePermission: perms.canDeletePrograms,
            });
            return (
                <AcademicConfirmDialog
                    title={`Request Program Deletion: ${pendingConfirm.program.name}`}
                    message={`Request deletion of program "${pendingConfirm.program.name}"?`}
                    warningNote={eligibility.warningNote}
                    confirmLabel="Request Program Delete"
                    tone="danger"
                    isSubmitting={isMutating}
                    onCancel={() => setPendingConfirm(null)}
                    onConfirm={handleExecuteConfirm}
                />
            );
        }

        if (pendingConfirm.kind === 'course-status') {
            const { course, nextStatus } = pendingConfirm;
            return (
                <AcademicConfirmDialog
                    title={`Confirm Course Status: ${course.title}`}
                    message={`Change "${course.title}" status from ${formatOfferingStatusLabel(
                        course.status
                    )} to ${formatOfferingStatusLabel(nextStatus)}?`}
                    warningNote={
                        nextStatus === 'ARCHIVED'
                            ? 'Archived courses remain preserved across historical curriculum and assessment records.'
                            : nextStatus === 'INACTIVE'
                              ? 'Inactive courses are withheld from new program assignments and standalone enrollments.'
                              : undefined
                    }
                    confirmLabel={`Mark as ${formatOfferingStatusLabel(nextStatus)}`}
                    tone={nextStatus === 'ACTIVE' ? 'primary' : 'warning'}
                    isSubmitting={isMutating}
                    onCancel={() => setPendingConfirm(null)}
                    onConfirm={handleExecuteConfirm}
                />
            );
        }

        const eligibility = evaluateCourseDeleteEligibility({
            course: pendingConfirm.course,
            canDeletePermission: perms.canDeleteCourses,
        });
        return (
            <AcademicConfirmDialog
                title={`Request Course Deletion: ${pendingConfirm.course.title}`}
                message={`Request deletion of course "${pendingConfirm.course.title}"?`}
                warningNote={eligibility.warningNote}
                confirmLabel="Request Course Delete"
                tone="danger"
                isSubmitting={isMutating}
                onCancel={() => setPendingConfirm(null)}
                onConfirm={handleExecuteConfirm}
            />
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="Programs & Courses"
                    subtitle={`Configure grade-based or skill-based programs and reusable course offerings for ${displaySchoolName}.`}
                />

                {isVerifiedSchoolSession && hasAnyCatalogRead && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            disabled={isAnyLoading || isMutating}
                            onClick={reloadAll}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isAnyLoading ? 'Refreshing...' : 'Refresh All'}
                        </button>
                    </div>
                )}
            </div>

            {!isVerifiedSchoolSession ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Verified School Context Required: Programs and Courses management requires an
                    authenticated School Admin session matching the active school tenant.
                </div>
            ) : !hasAnyCatalogRead ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: Viewing Programs &amp; Courses requires at least{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.PROGRAMS.READ}
                    </code>{' '}
                    or{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.COURSES.READ}
                    </code>
                    .
                </div>
            ) : (
                <>
                    <div
                        role="note"
                        className="flex flex-col gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <span>
                            Programs and reusable Courses support many-to-many curriculum
                            membership (<code className="font-mono">ProgramCourse</code>) and
                            scoped teacher assignments across Program courses and standalone
                            eligible Courses.
                        </span>
                        {(!perms.canReadPrograms || !perms.canReadCourses) && (
                            <span className="shrink-0 font-semibold text-blue-950">
                                {perms.canReadPrograms
                                    ? `Courses tab hidden (requires ${PERMISSIONS.COURSES.READ})`
                                    : `Programs tab hidden (requires ${PERMISSIONS.PROGRAMS.READ})`}
                            </span>
                        )}
                    </div>

                    {mutationNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                        >
                            {mutationNotice}
                        </div>
                    )}

                    {mutationError && (
                        <div
                            role={mutationError.isBackendUnavailable ? 'status' : 'alert'}
                            className={`rounded-md border p-4 text-sm ${
                                mutationError.isBackendUnavailable
                                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                                    : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                        >
                            {mutationError.isBackendUnavailable
                                ? `Catalog API endpoint is pending backend implementation (${mutationError.message}). No local changes were persisted.`
                                : mutationError.message}
                        </div>
                    )}

                    <div className="border-b border-gray-200">
                        <nav
                            role="tablist"
                            aria-label="Programs and Courses Sections"
                            className="-mb-px flex flex-wrap gap-2 sm:gap-4"
                        >
                            {visibleTabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setPreferredTab(tab.id)}
                                        className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                                            isActive
                                                ? 'border-blue-600 text-blue-700'
                                                : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {activeTab === 'programs' && perms.canReadPrograms && (
                        <ProgramsDirectorySection
                            programs={programs}
                            pagination={programsPagination}
                            query={programsQuery}
                            classes={classes}
                            canReadClasses={perms.canReadClasses}
                            isLoading={isLoadingPrograms}
                            loadError={programsError}
                            isMutating={isMutating}
                            canRead={perms.canReadPrograms}
                            canCreate={perms.canCreatePrograms}
                            canUpdate={perms.canUpdatePrograms}
                            canDelete={perms.canDeletePrograms}
                            onUpdateQuery={setProgramsQuery}
                            onRetry={reloadPrograms}
                            onOpenCreate={handleOpenCreateProgram}
                            onOpenDetails={openProgramDetails}
                            onOpenEdit={handleOpenEditProgram}
                            onRequestStatusChange={handleRequestProgramStatus}
                            onRequestDelete={handleRequestProgramDelete}
                        />
                    )}

                    {activeTab === 'courses' && perms.canReadCourses && (
                        <CoursesDirectorySection
                            courses={courses}
                            pagination={coursesPagination}
                            query={coursesQuery}
                            isLoading={isLoadingCourses}
                            loadError={coursesError}
                            isMutating={isMutating}
                            canRead={perms.canReadCourses}
                            canCreate={perms.canCreateCourses}
                            canUpdate={perms.canUpdateCourses}
                            canDelete={perms.canDeleteCourses}
                            onUpdateQuery={setCoursesQuery}
                            onRetry={reloadCourses}
                            onOpenCreate={handleOpenCreateCourse}
                            onOpenDetails={openCourseDetails}
                            onOpenEdit={handleOpenEditCourse}
                            onRequestStatusChange={handleRequestCourseStatus}
                            onRequestDelete={handleRequestCourseDelete}
                        />
                    )}
                </>
            )}

            {(formModal?.kind === 'program-create' || formModal?.kind === 'program-edit') && (
                <ProgramFormModal
                    editingProgram={formModal.kind === 'program-edit' ? formModal.program : null}
                    classes={classes}
                    canReadClasses={perms.canReadClasses}
                    canAccessAcademicStructure={canAccessAcademicStructure}
                    isLoadingClasses={isLoadingClasses}
                    classesLoadedSuccessfully={classesLoadedSuccessfully}
                    classesError={classesError}
                    isSubmitting={isMutating}
                    onRetryClasses={reloadClasses}
                    onClose={() => setFormModal(null)}
                    onSubmitCreate={saveNewProgram}
                    onSubmitUpdate={saveEditedProgram}
                />
            )}

            {(formModal?.kind === 'course-create' || formModal?.kind === 'course-edit') && (
                <CourseFormModal
                    editingCourse={formModal.kind === 'course-edit' ? formModal.course : null}
                    isSubmitting={isMutating}
                    onClose={() => setFormModal(null)}
                    onSubmitCreate={saveNewCourse}
                    onSubmitUpdate={saveEditedCourse}
                />
            )}

            {detailSubject && (
                <ProgramDetailModal
                    key={
                        detailSubject.kind === 'program'
                            ? `program-${detailSubject.record.id}`
                            : `course-${detailSubject.record.id}`
                    }
                    subject={detailSubject}
                    returnToProgram={returnToProgram}
                    actor={user}
                    tenantId={tenantId}
                    classes={classes}
                    isRefreshing={isDetailRefreshing}
                    detailNotice={detailNotice}
                    programCourses={programCourses}
                    isLoadingCurriculum={isLoadingCurriculum}
                    curriculumError={curriculumError}
                    isCurriculumMutating={isCurriculumMutating}
                    curriculumMutationNotice={curriculumMutationNotice}
                    curriculumMutationError={curriculumMutationError}
                    programAssignments={programAssignments}
                    isLoadingProgramAssignments={isLoadingProgramAssignments}
                    programAssignmentsError={programAssignmentsError}
                    standaloneAssignments={standaloneAssignments}
                    isLoadingStandaloneAssignments={isLoadingStandaloneAssignments}
                    standaloneAssignmentsError={standaloneAssignmentsError}
                    academicYears={academicYears}
                    isLoadingYears={isLoadingYears}
                    yearsError={yearsError}
                    programSections={programSections}
                    isLoadingSections={isLoadingSections}
                    sectionsError={sectionsError}
                    isAssignmentMutating={isAssignmentMutating}
                    canReadPrograms={perms.canReadPrograms}
                    canReadCourses={perms.canReadCourses}
                    canCreateCourses={perms.canCreateCourses}
                    canAssignCourses={perms.canAssignCourses}
                    canAssignProgramTeachers={perms.canAssignProgramTeachers}
                    canAssignStandaloneTeachers={perms.canAssignStandaloneTeachers}
                    canReadClasses={perms.canReadClasses}
                    canReadYears={perms.canReadYears}
                    canReadTerms={perms.canReadTerms}
                    canReadSections={perms.canReadSections}
                    canUpdateProgram={perms.canUpdatePrograms}
                    canUpdateCourse={perms.canUpdateCourses}
                    onRetryCurriculum={reloadProgramCurriculum}
                    onRetryProgramAssignments={reloadProgramAssignments}
                    onRetryStandaloneAssignments={reloadStandaloneAssignments}
                    onRetryYears={reloadAcademicYears}
                    onRetrySections={reloadProgramSections}
                    onAssignTeachersBatch={assignTeachersBatch}
                    onRemoveTeacherAssignment={removeTeacherAssignment}
                    onAddCourseToProgram={addProgramCourse}
                    onUpdateProgramCourse={editProgramCourse}
                    onMoveProgramCourse={reorderProgramCourse}
                    onRemoveProgramCourse={detachProgramCourse}
                    onViewCourseFromProgram={openCourseFromProgram}
                    onReturnToParentProgram={handleReturnToParentProgram}
                    onNavigateToCoursesCatalog={() => {
                        if (perms.canReadCourses) {
                            setPreferredTab('courses');
                        }
                    }}
                    onEditProgram={handleOpenEditProgram}
                    onEditCourse={handleOpenEditCourse}
                    onClose={closeDetails}
                />
            )}

            {renderConfirmDialog()}
        </div>
    );
};

