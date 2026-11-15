import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import type { AuthenticatedUser } from '../../../types/auth';
import {
    isAcademicBackendUnavailableError,
    listAcademicYears,
    listClasses,
    listSections,
} from '../../academic/services/academic-structure-service';
import type {
    AcademicClass,
    AcademicSection,
    AcademicYear,
} from '../../academic/types/academic-structure.types';
import {
    buildReorderedProgramCourseIds,
    evaluateCourseDeleteEligibility,
    evaluateProgramDeleteEligibility,
    sortProgramCourses,
} from '../schemas/programs-courses-schema';
import {
    addCourseToProgram,
    createCourse,
    createProgram,
    createTeacherAssignment,
    deleteCourse,
    deleteProgram,
    deleteTeacherAssignment,
    formatCatalogOperationError,
    getCourseById,
    getProgramById,
    isCatalogBackendUnavailableError,
    listCourses,
    listProgramCourses,
    listPrograms,
    listTeacherAssignments,
    removeCourseFromProgram,
    reorderProgramCourses,
    updateCourse,
    updateCourseStatus,
    updateProgram,
    updateProgramCourse,
    updateProgramStatus,
} from '../services/programs-courses-service';
import type {
    AddProgramCourseRequest,
    Course,
    CreateCourseRequest,
    CreateProgramRequest,
    CreateTeacherAssignmentRequest,
    OfferingLifecycleStatus,
    Program,
    ProgramCourse,
    ProgramType,
    StandaloneFilterValue,
    TeacherCourseAssignment,
    UpdateCourseRequest,
    UpdateProgramCourseRequest,
    UpdateProgramRequest,
} from '../types/programs-courses.types';

export interface ProgramsCoursesPermissions {
    canReadPrograms: boolean;
    canCreatePrograms: boolean;
    canUpdatePrograms: boolean;
    canDeletePrograms: boolean;
    canAssignCourses: boolean;
    canAssignProgramTeachers: boolean;
    canReadCourses: boolean;
    canCreateCourses: boolean;
    canUpdateCourses: boolean;
    canDeleteCourses: boolean;
    canAssignStandaloneTeachers: boolean;
    canReadClasses: boolean;
    canReadYears: boolean;
    canReadTerms: boolean;
    canReadSections: boolean;
}

export interface BatchAssignmentOutcome {
    createdCount: number;
    createdTeacherIds: string[];
    failedTeacherErrors: Array<{ teacherId: string; message: string; isConflict: boolean }>;
    errorMessage: string | null;
    isBackendUnavailable: boolean;
}

export interface CatalogFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export interface CatalogMutationError {
    message: string;
    isBackendUnavailable: boolean;
    error: unknown;
}

export interface ProgramsQueryState {
    page: number;
    limit: number;
    search: string;
    programType: 'ALL' | ProgramType;
    status: 'ALL' | OfferingLifecycleStatus;
}

export interface CoursesQueryState {
    page: number;
    limit: number;
    search: string;
    allowStandalone: StandaloneFilterValue;
    status: 'ALL' | OfferingLifecycleStatus;
}

export type CatalogDetailSubject =
    | { kind: 'program'; record: Program }
    | { kind: 'course'; record: Course };

export type CatalogSubmitOutcome =
    | { ok: true }
    | { ok: false; errorMessage: string; error: unknown };

const DEFAULT_PROGRAMS_QUERY: ProgramsQueryState = {
    page: 1,
    limit: 10,
    search: '',
    programType: 'ALL',
    status: 'ALL',
};

const DEFAULT_COURSES_QUERY: CoursesQueryState = {
    page: 1,
    limit: 10,
    search: '',
    allowStandalone: 'ALL',
    status: 'ALL',
};

function toFetchError(error: unknown, fallbackMessage: string): CatalogFetchError {
    return {
        isBackendUnavailable: isCatalogBackendUnavailableError(error),
        message: formatCatalogOperationError(error, fallbackMessage),
    };
}

function toMutationError(error: unknown, fallbackMessage: string): CatalogMutationError {
    return {
        isBackendUnavailable: isCatalogBackendUnavailableError(error),
        message: formatCatalogOperationError(error, fallbackMessage),
        error,
    };
}

export function useProgramsAndCourses(options: {
    actor: AuthenticatedUser | null;
    tenantId: string | null;
    enabled: boolean;
    permissions: ProgramsCoursesPermissions;
}) {
    const { actor, tenantId, enabled, permissions } = options;

    const [programsQuery, setProgramsQuery] = useState<ProgramsQueryState>(DEFAULT_PROGRAMS_QUERY);
    const [coursesQuery, setCoursesQuery] = useState<CoursesQueryState>(DEFAULT_COURSES_QUERY);

    const [programsReload, setProgramsReload] = useState(0);
    const [coursesReload, setCoursesReload] = useState(0);
    const [classesReload, setClassesReload] = useState(0);

    const [programs, setPrograms] = useState<Program[]>([]);
    const [programsPagination, setProgramsPagination] = useState<PaginationMeta | null>(null);
    const [programsError, setProgramsError] = useState<CatalogFetchError | null>(null);
    const [settledProgramsKey, setSettledProgramsKey] = useState<string | null>(null);

    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesPagination, setCoursesPagination] = useState<PaginationMeta | null>(null);
    const [coursesError, setCoursesError] = useState<CatalogFetchError | null>(null);
    const [settledCoursesKey, setSettledCoursesKey] = useState<string | null>(null);

    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [classesError, setClassesError] = useState<CatalogFetchError | null>(null);
    const [settledClassesKey, setSettledClassesKey] = useState<string | null>(null);

    const [detailSubject, setDetailSubject] = useState<CatalogDetailSubject | null>(null);
    const [returnToProgram, setReturnToProgram] = useState<Program | null>(null);
    const [isDetailRefreshing, setIsDetailRefreshing] = useState(false);
    const [detailNotice, setDetailNotice] = useState<string | null>(null);

    const [curriculumReload, setCurriculumReload] = useState(0);
    const [programCourses, setProgramCourses] = useState<ProgramCourse[]>([]);
    const [curriculumError, setCurriculumError] = useState<CatalogFetchError | null>(null);
    const [settledCurriculumKey, setSettledCurriculumKey] = useState<string | null>(null);
    const [isCurriculumMutating, setIsCurriculumMutating] = useState(false);
    const [curriculumMutationNotice, setCurriculumMutationNotice] = useState<string | null>(null);
    const [curriculumMutationError, setCurriculumMutationError] =
        useState<CatalogMutationError | null>(null);

    const [isMutating, setIsMutating] = useState(false);
    const [mutationNotice, setMutationNotice] = useState<string | null>(null);
    const [mutationError, setMutationError] = useState<CatalogMutationError | null>(null);

    // Step 5.9.3: Academic lookups & Teacher Assignment state
    const [yearsReload, setYearsReload] = useState(0);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [yearsError, setYearsError] = useState<CatalogFetchError | null>(null);
    const [settledYearsKey, setSettledYearsKey] = useState<string | null>(null);

    const [sectionsReload, setSectionsReload] = useState(0);
    const [programSections, setProgramSections] = useState<AcademicSection[]>([]);
    const [sectionsError, setSectionsError] = useState<CatalogFetchError | null>(null);
    const [settledSectionsKey, setSettledSectionsKey] = useState<string | null>(null);

    const [programAssignmentsReload, setProgramAssignmentsReload] = useState(0);
    const [programAssignments, setProgramAssignments] = useState<TeacherCourseAssignment[]>([]);
    const [programAssignmentsError, setProgramAssignmentsError] =
        useState<CatalogFetchError | null>(null);
    const [settledProgramAssignmentsKey, setSettledProgramAssignmentsKey] =
        useState<string | null>(null);

    const [standaloneAssignmentsReload, setStandaloneAssignmentsReload] = useState(0);
    const [standaloneAssignments, setStandaloneAssignments] = useState<TeacherCourseAssignment[]>([]);
    const [standaloneAssignmentsError, setStandaloneAssignmentsError] =
        useState<CatalogFetchError | null>(null);
    const [settledStandaloneAssignmentsKey, setSettledStandaloneAssignmentsKey] =
        useState<string | null>(null);

    const [isAssignmentMutating, setIsAssignmentMutating] = useState(false);

    const programsVersionRef = useRef(0);
    const coursesVersionRef = useRef(0);
    const classesVersionRef = useRef(0);
    const curriculumVersionRef = useRef(0);
    const yearsVersionRef = useRef(0);
    const sectionsVersionRef = useRef(0);
    const programAssignmentsVersionRef = useRef(0);
    const standaloneAssignmentsVersionRef = useRef(0);
    const detailAbortRef = useRef<AbortController | null>(null);
    const detailSeqRef = useRef(0);
    const isMutatingRef = useRef(false);
    const isCurriculumMutatingRef = useRef(false);
    const isAssignmentMutatingRef = useRef(false);

    // Fetch Programs Directory
    const programsLoadKey =
        enabled && tenantId && actor && permissions.canReadPrograms
            ? JSON.stringify({
                  scope: 'programs',
                  tenantId,
                  reload: programsReload,
                  page: programsQuery.page,
                  limit: programsQuery.limit,
                  search: programsQuery.search.trim(),
                  programType: programsQuery.programType,
                  status: programsQuery.status,
              })
            : null;

    useEffect(() => {
        if (!programsLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++programsVersionRef.current;

        listPrograms(
            {
                page: programsQuery.page,
                limit: programsQuery.limit,
                ...(programsQuery.search.trim() !== ''
                    ? { search: programsQuery.search.trim() }
                    : {}),
                ...(programsQuery.programType !== 'ALL'
                    ? { programType: programsQuery.programType }
                    : {}),
                ...(programsQuery.status !== 'ALL' ? { status: programsQuery.status } : {}),
            },
            tenantId,
            actor,
            controller.signal
        )
            .then((res) => {
                if (version !== programsVersionRef.current) return;
                setPrograms(res.items);
                setProgramsPagination(res.pagination);
                setProgramsError(null);
                setSettledProgramsKey(programsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== programsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setPrograms([]);
                setProgramsPagination(null);
                setProgramsError(toFetchError(error, 'Unable to load school programs.'));
                setSettledProgramsKey(programsLoadKey);
            });

        return () => controller.abort();
    }, [actor, programsLoadKey, programsQuery, tenantId]);

    // Fetch Courses Catalog
    const coursesLoadKey =
        enabled && tenantId && actor && permissions.canReadCourses
            ? JSON.stringify({
                  scope: 'courses',
                  tenantId,
                  reload: coursesReload,
                  page: coursesQuery.page,
                  limit: coursesQuery.limit,
                  search: coursesQuery.search.trim(),
                  allowStandalone: coursesQuery.allowStandalone,
                  status: coursesQuery.status,
              })
            : null;

    useEffect(() => {
        if (!coursesLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++coursesVersionRef.current;

        listCourses(
            {
                page: coursesQuery.page,
                limit: coursesQuery.limit,
                ...(coursesQuery.search.trim() !== ''
                    ? { search: coursesQuery.search.trim() }
                    : {}),
                ...(coursesQuery.allowStandalone === 'STANDALONE_ONLY'
                    ? { allowStandalone: true }
                    : coursesQuery.allowStandalone === 'PROGRAM_ONLY'
                      ? { allowStandalone: false }
                      : {}),
                ...(coursesQuery.status !== 'ALL' ? { status: coursesQuery.status } : {}),
            },
            tenantId,
            actor,
            controller.signal
        )
            .then((res) => {
                if (version !== coursesVersionRef.current) return;
                setCourses(res.items);
                setCoursesPagination(res.pagination);
                setCoursesError(null);
                setSettledCoursesKey(coursesLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== coursesVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setCourses([]);
                setCoursesPagination(null);
                setCoursesError(toFetchError(error, 'Unable to load school courses.'));
                setSettledCoursesKey(coursesLoadKey);
            });

        return () => controller.abort();
    }, [actor, coursesLoadKey, coursesQuery, tenantId]);

    // Fetch Academic Classes from Step 5.6 (only when classes.read is present and needed for Programs)
    const shouldFetchClasses =
        enabled &&
        Boolean(tenantId) &&
        permissions.canReadClasses &&
        (permissions.canReadPrograms ||
            permissions.canCreatePrograms ||
            permissions.canUpdatePrograms);

    const classesLoadKey = shouldFetchClasses && tenantId ? `${tenantId}:${classesReload}` : null;

    useEffect(() => {
        if (!classesLoadKey || !tenantId) return;

        const controller = new AbortController();
        const version = ++classesVersionRef.current;

        listClasses(tenantId, controller.signal)
            .then((res) => {
                if (version !== classesVersionRef.current) return;
                setClasses(res.classes);
                setClassesError(null);
                setSettledClassesKey(classesLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== classesVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setClasses([]);
                setClassesError({
                    isBackendUnavailable: isAcademicBackendUnavailableError(error),
                    message:
                        error instanceof Error && error.message
                            ? error.message
                            : 'Unable to load Academic Classes.',
                });
                setSettledClassesKey(classesLoadKey);
            });

        return () => controller.abort();
    }, [classesLoadKey, tenantId]);

    const effectivePrograms = useMemo(
        () => (enabled && permissions.canReadPrograms ? programs : []),
        [enabled, permissions.canReadPrograms, programs]
    );
    const effectiveCourses = useMemo(
        () => (enabled && permissions.canReadCourses ? courses : []),
        [enabled, permissions.canReadCourses, courses]
    );
    const effectiveClasses = useMemo(
        () => (shouldFetchClasses ? classes : []),
        [classes, shouldFetchClasses]
    );

    const isLoadingPrograms = Boolean(programsLoadKey && settledProgramsKey !== programsLoadKey);
    const isLoadingCourses = Boolean(coursesLoadKey && settledCoursesKey !== coursesLoadKey);
    const isLoadingClasses = Boolean(classesLoadKey && settledClassesKey !== classesLoadKey);
    const classesLoadedSuccessfully = Boolean(
        classesLoadKey && settledClassesKey === classesLoadKey && !classesError
    );

    const reloadPrograms = useCallback(() => {
        setProgramsReload((c) => c + 1);
    }, []);
    const reloadCourses = useCallback(() => {
        setCoursesReload((c) => c + 1);
    }, []);
    const reloadClasses = useCallback(() => {
        setClassesReload((c) => c + 1);
    }, []);
    const reloadAll = useCallback(() => {
        setProgramsReload((c) => c + 1);
        setCoursesReload((c) => c + 1);
        setClassesReload((c) => c + 1);
    }, []);

    // Fetch Program Curriculum Courses when viewing a Program
    const activeDetailProgramId =
        detailSubject?.kind === 'program' ? detailSubject.record.id : null;
    const curriculumLoadKey =
        enabled && tenantId && actor && permissions.canReadPrograms && activeDetailProgramId
            ? `${tenantId}:${activeDetailProgramId}:${curriculumReload}`
            : null;

    useEffect(() => {
        if (!curriculumLoadKey || !tenantId || !actor || !activeDetailProgramId) return;

        const controller = new AbortController();
        const version = ++curriculumVersionRef.current;

        listProgramCourses(activeDetailProgramId, tenantId, actor, controller.signal)
            .then((res) => {
                if (version !== curriculumVersionRef.current) return;
                setProgramCourses(res.items);
                setCurriculumError(null);
                setSettledCurriculumKey(curriculumLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== curriculumVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setProgramCourses([]);
                setCurriculumError(
                    toFetchError(error, 'Unable to load courses linked to this program.')
                );
                setSettledCurriculumKey(curriculumLoadKey);
            });

        return () => controller.abort();
    }, [activeDetailProgramId, actor, curriculumLoadKey, tenantId]);

    const effectiveProgramCourses = useMemo(
        () => (activeDetailProgramId && permissions.canReadPrograms ? programCourses : []),
        [activeDetailProgramId, permissions.canReadPrograms, programCourses]
    );
    const isLoadingCurriculum = Boolean(
        curriculumLoadKey && settledCurriculumKey !== curriculumLoadKey
    );

    const reloadProgramCurriculum = useCallback(() => {
        setCurriculumReload((c) => c + 1);
    }, []);

    // Fetch Academic Years from Step 5.6 (strictly gated on academic_years.read + teacher assignment access)
    const shouldFetchYears =
        enabled &&
        Boolean(tenantId) &&
        permissions.canReadYears &&
        (permissions.canAssignProgramTeachers || permissions.canAssignStandaloneTeachers);
    const yearsLoadKey = shouldFetchYears && tenantId ? `${tenantId}:${yearsReload}` : null;

    useEffect(() => {
        if (!yearsLoadKey || !tenantId) return;

        const controller = new AbortController();
        const version = ++yearsVersionRef.current;

        listAcademicYears(tenantId, controller.signal)
            .then((res) => {
                if (version !== yearsVersionRef.current) return;
                setAcademicYears(res.academicYears);
                setYearsError(null);
                setSettledYearsKey(yearsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== yearsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setAcademicYears([]);
                setYearsError(toFetchError(error, 'Unable to load academic years.'));
                setSettledYearsKey(yearsLoadKey);
            });

        return () => controller.abort();
    }, [tenantId, yearsLoadKey]);

    const effectiveAcademicYears = useMemo(
        () => (shouldFetchYears ? academicYears : []),
        [academicYears, shouldFetchYears]
    );
    const isLoadingYears = Boolean(yearsLoadKey && settledYearsKey !== yearsLoadKey);
    const reloadAcademicYears = useCallback(() => {
        setYearsReload((c) => c + 1);
    }, []);

    // Fetch Grade Sections for the active GRADE_BASED Program (strictly gated on sections.read)
    const activeGradeProgramClassId =
        detailSubject?.kind === 'program' && detailSubject.record.programType === 'GRADE_BASED'
            ? detailSubject.record.academicClassId ?? null
            : null;
    const shouldFetchSections =
        enabled &&
        Boolean(tenantId) &&
        permissions.canReadSections &&
        permissions.canAssignProgramTeachers &&
        Boolean(activeGradeProgramClassId);
    const sectionsLoadKey =
        shouldFetchSections && tenantId && activeGradeProgramClassId
            ? `${tenantId}:${activeGradeProgramClassId}:${sectionsReload}`
            : null;

    useEffect(() => {
        if (!sectionsLoadKey || !tenantId || !activeGradeProgramClassId) return;

        const controller = new AbortController();
        const version = ++sectionsVersionRef.current;

        listSections({
            classId: activeGradeProgramClassId,
            expectedTenantId: tenantId,
            signal: controller.signal,
        })
            .then((res) => {
                if (version !== sectionsVersionRef.current) return;
                setProgramSections(res.sections);
                setSectionsError(null);
                setSettledSectionsKey(sectionsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== sectionsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setProgramSections([]);
                setSectionsError(toFetchError(error, 'Unable to load academic sections.'));
                setSettledSectionsKey(sectionsLoadKey);
            });

        return () => controller.abort();
    }, [activeGradeProgramClassId, sectionsLoadKey, tenantId]);

    const effectiveProgramSections = useMemo(
        () =>
            shouldFetchSections && activeGradeProgramClassId
                ? programSections.filter((s) => s.classId === activeGradeProgramClassId)
                : [],
        [activeGradeProgramClassId, programSections, shouldFetchSections]
    );
    const isLoadingSections = Boolean(sectionsLoadKey && settledSectionsKey !== sectionsLoadKey);
    const reloadProgramSections = useCallback(() => {
        setSectionsReload((c) => c + 1);
    }, []);

    // Fetch Program-scoped Teacher Assignments when inspecting a Program
    const canViewProgramAssignments =
        permissions.canReadPrograms || permissions.canAssignProgramTeachers;
    const programAssignmentsLoadKey =
        enabled && tenantId && actor && canViewProgramAssignments && activeDetailProgramId
            ? `${tenantId}:${activeDetailProgramId}:${programAssignmentsReload}`
            : null;

    useEffect(() => {
        if (!programAssignmentsLoadKey || !tenantId || !actor || !activeDetailProgramId) return;

        const controller = new AbortController();
        const version = ++programAssignmentsVersionRef.current;

        listTeacherAssignments(
            {
                scope: 'PROGRAM_COURSE',
                programId: activeDetailProgramId,
            },
            tenantId,
            actor,
            controller.signal
        )
            .then((res) => {
                if (version !== programAssignmentsVersionRef.current) return;
                setProgramAssignments(res.items);
                setProgramAssignmentsError(null);
                setSettledProgramAssignmentsKey(programAssignmentsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== programAssignmentsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setProgramAssignments([]);
                setProgramAssignmentsError(
                    toFetchError(error, 'Unable to load program teacher assignments.')
                );
                setSettledProgramAssignmentsKey(programAssignmentsLoadKey);
            });

        return () => controller.abort();
    }, [activeDetailProgramId, actor, programAssignmentsLoadKey, tenantId]);

    const effectiveProgramAssignments = useMemo(
        () =>
            activeDetailProgramId && canViewProgramAssignments ? programAssignments : [],
        [activeDetailProgramId, canViewProgramAssignments, programAssignments]
    );
    const isLoadingProgramAssignments = Boolean(
        programAssignmentsLoadKey && settledProgramAssignmentsKey !== programAssignmentsLoadKey
    );
    const reloadProgramAssignments = useCallback(() => {
        setProgramAssignmentsReload((c) => c + 1);
    }, []);

    // Fetch Standalone Course Teacher Assignments ONLY when viewing an eligible standalone Course
    const activeDetailStandaloneCourseId =
        detailSubject?.kind === 'course' && detailSubject.record.allowStandalone
            ? detailSubject.record.id
            : null;
    const canViewStandaloneAssignments =
        permissions.canReadCourses || permissions.canAssignStandaloneTeachers;
    const standaloneAssignmentsLoadKey =
        enabled &&
        tenantId &&
        actor &&
        canViewStandaloneAssignments &&
        activeDetailStandaloneCourseId
            ? `${tenantId}:${activeDetailStandaloneCourseId}:${standaloneAssignmentsReload}`
            : null;

    useEffect(() => {
        if (
            !standaloneAssignmentsLoadKey ||
            !tenantId ||
            !actor ||
            !activeDetailStandaloneCourseId
        ) {
            return;
        }

        const controller = new AbortController();
        const version = ++standaloneAssignmentsVersionRef.current;

        listTeacherAssignments(
            {
                scope: 'STANDALONE_COURSE',
                courseId: activeDetailStandaloneCourseId,
            },
            tenantId,
            actor,
            controller.signal
        )
            .then((res) => {
                if (version !== standaloneAssignmentsVersionRef.current) return;
                setStandaloneAssignments(res.items);
                setStandaloneAssignmentsError(null);
                setSettledStandaloneAssignmentsKey(standaloneAssignmentsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== standaloneAssignmentsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setStandaloneAssignments([]);
                setStandaloneAssignmentsError(
                    toFetchError(error, 'Unable to load standalone course teacher assignments.')
                );
                setSettledStandaloneAssignmentsKey(standaloneAssignmentsLoadKey);
            });

        return () => controller.abort();
    }, [activeDetailStandaloneCourseId, actor, standaloneAssignmentsLoadKey, tenantId]);

    const effectiveStandaloneAssignments = useMemo(
        () =>
            activeDetailStandaloneCourseId && canViewStandaloneAssignments
                ? standaloneAssignments
                : [],
        [activeDetailStandaloneCourseId, canViewStandaloneAssignments, standaloneAssignments]
    );
    const isLoadingStandaloneAssignments = Boolean(
        standaloneAssignmentsLoadKey &&
            settledStandaloneAssignmentsKey !== standaloneAssignmentsLoadKey
    );
    const reloadStandaloneAssignments = useCallback(() => {
        setStandaloneAssignmentsReload((c) => c + 1);
    }, []);

    // Detail inspection
    const openProgramDetails = useCallback(
        (program: Program) => {
            if (!enabled || !tenantId || !actor || !permissions.canReadPrograms) return;

            detailAbortRef.current?.abort();
            const controller = new AbortController();
            detailAbortRef.current = controller;
            const seq = ++detailSeqRef.current;

            setReturnToProgram(null);
            setDetailSubject({ kind: 'program', record: program });
            setIsDetailRefreshing(true);
            setDetailNotice(null);
            setCurriculumMutationNotice(null);
            setCurriculumMutationError(null);

            getProgramById(program.id, tenantId, actor, controller.signal)
                .then((fresh) => {
                    if (controller.signal.aborted || seq !== detailSeqRef.current) return;
                    setDetailSubject({ kind: 'program', record: fresh });
                    setDetailNotice(null);
                })
                .catch((error: unknown) => {
                    if (controller.signal.aborted || seq !== detailSeqRef.current) return;
                    if (error instanceof ApiError && error.isCancellation) return;
                    setDetailNotice(
                        isCatalogBackendUnavailableError(error)
                            ? 'Showing directory summary record because detail endpoint (GET /api/academic/programs/:id) is pending backend implementation.'
                            : formatCatalogOperationError(error, 'Unable to refresh program details.')
                    );
                })
                .finally(() => {
                    if (seq === detailSeqRef.current) {
                        setIsDetailRefreshing(false);
                    }
                });
        },
        [actor, enabled, permissions.canReadPrograms, tenantId]
    );

    const openCourseDetails = useCallback(
        (course: Course) => {
            if (!enabled || !tenantId || !actor || !permissions.canReadCourses) return;

            detailAbortRef.current?.abort();
            const controller = new AbortController();
            detailAbortRef.current = controller;
            const seq = ++detailSeqRef.current;

            setReturnToProgram(null);
            setDetailSubject({ kind: 'course', record: course });
            setIsDetailRefreshing(true);
            setDetailNotice(null);

            getCourseById(course.id, tenantId, actor, controller.signal)
                .then((fresh) => {
                    if (controller.signal.aborted || seq !== detailSeqRef.current) return;
                    setDetailSubject({ kind: 'course', record: fresh });
                    setDetailNotice(null);
                })
                .catch((error: unknown) => {
                    if (controller.signal.aborted || seq !== detailSeqRef.current) return;
                    if (error instanceof ApiError && error.isCancellation) return;
                    setDetailNotice(
                        isCatalogBackendUnavailableError(error)
                            ? 'Showing catalog summary record because detail endpoint (GET /api/academic/courses/:id) is pending backend implementation.'
                            : formatCatalogOperationError(error, 'Unable to refresh course details.')
                    );
                })
                .finally(() => {
                    if (seq === detailSeqRef.current) {
                        setIsDetailRefreshing(false);
                    }
                });
        },
        [actor, enabled, permissions.canReadCourses, tenantId]
    );

    const openCourseFromProgram = useCallback(
        (programCourse: ProgramCourse, parentProgram: Program) => {
            if (!enabled || !tenantId || !actor || !permissions.canReadCourses) return;

            detailAbortRef.current?.abort();
            const controller = new AbortController();
            detailAbortRef.current = controller;
            const seq = ++detailSeqRef.current;

            const fallbackCourse: Course = {
                id: programCourse.courseId,
                tenantId: programCourse.tenantId,
                title: programCourse.courseTitle,
                code: programCourse.courseCode ?? undefined,
                allowStandalone: programCourse.allowStandalone ?? false,
                status: programCourse.courseStatus ?? 'ACTIVE',
            };

            setReturnToProgram(parentProgram);
            setDetailSubject({ kind: 'course', record: fallbackCourse });
            setIsDetailRefreshing(true);
            setDetailNotice(null);

            getCourseById(programCourse.courseId, tenantId, actor, controller.signal)
                .then((fresh) => {
                    if (controller.signal.aborted || seq !== detailSeqRef.current) return;
                    setDetailSubject({ kind: 'course', record: fresh });
                    setDetailNotice(null);
                })
                .catch((error: unknown) => {
                    if (controller.signal.aborted || seq !== detailSeqRef.current) return;
                    if (error instanceof ApiError && error.isCancellation) return;
                    setDetailNotice(
                        isCatalogBackendUnavailableError(error)
                            ? 'Showing linked curriculum course summary because GET /api/academic/courses/:id is pending backend implementation.'
                            : formatCatalogOperationError(error, 'Unable to load full course details.')
                    );
                })
                .finally(() => {
                    if (seq === detailSeqRef.current) {
                        setIsDetailRefreshing(false);
                    }
                });
        },
        [actor, enabled, permissions.canReadCourses, tenantId]
    );

    const handleReturnToParentProgram = useCallback(() => {
        if (!returnToProgram) return;
        const target = returnToProgram;
        setReturnToProgram(null);
        openProgramDetails(target);
    }, [openProgramDetails, returnToProgram]);

    const closeDetails = useCallback(() => {
        detailAbortRef.current?.abort();
        detailSeqRef.current += 1;
        setDetailSubject(null);
        setReturnToProgram(null);
        setIsDetailRefreshing(false);
        setDetailNotice(null);
        setProgramCourses([]);
        setCurriculumError(null);
        setCurriculumMutationNotice(null);
        setCurriculumMutationError(null);
        setProgramAssignments([]);
        setProgramAssignmentsError(null);
        setStandaloneAssignments([]);
        setStandaloneAssignmentsError(null);
    }, []);

    useEffect(() => {
        return () => {
            detailAbortRef.current?.abort();
        };
    }, []);

    // Safe Mutation Runner
    const runCatalogMutation = useCallback(
        async (
            hasPerm: boolean,
            permissionName: string,
            task: () => Promise<string>
        ): Promise<CatalogSubmitOutcome> => {
            if (!enabled || !tenantId || !actor) {
                const msg = 'Verified school session is required.';
                setMutationError({ message: msg, isBackendUnavailable: false, error: null });
                return { ok: false, errorMessage: msg, error: null };
            }
            if (!hasPerm) {
                const msg = `Access Denied: Requires ${permissionName} permission.`;
                setMutationError({ message: msg, isBackendUnavailable: false, error: null });
                return { ok: false, errorMessage: msg, error: null };
            }
            if (isMutatingRef.current) {
                const msg = 'Another catalog operation is already in progress.';
                return { ok: false, errorMessage: msg, error: null };
            }

            isMutatingRef.current = true;
            setIsMutating(true);
            setMutationNotice(null);
            setMutationError(null);

            try {
                const successMessage = await task();
                setMutationNotice(successMessage);
                return { ok: true };
            } catch (error: unknown) {
                const mapped = toMutationError(error, 'Catalog operation failed.');
                setMutationError(mapped);
                return { ok: false, errorMessage: mapped.message, error };
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [actor, enabled, tenantId]
    );

    // Program Mutations
    const saveNewProgram = useCallback(
        (payload: CreateProgramRequest) =>
            runCatalogMutation(permissions.canCreatePrograms, 'programs.create', async () => {
                const res = await createProgram(payload, tenantId, actor);
                reloadPrograms();
                return res.message ?? `Program "${res.program.name}" created.`;
            }),
        [actor, permissions.canCreatePrograms, reloadPrograms, runCatalogMutation, tenantId]
    );

    const saveEditedProgram = useCallback(
        (programId: string, payload: UpdateProgramRequest) =>
            runCatalogMutation(permissions.canUpdatePrograms, 'programs.update', async () => {
                const res = await updateProgram(programId, payload, tenantId, actor);
                setDetailSubject((prev) =>
                    prev?.kind === 'program' && prev.record.id === res.program.id
                        ? { kind: 'program', record: res.program }
                        : prev
                );
                reloadPrograms();
                return res.message ?? `Program "${res.program.name}" updated.`;
            }),
        [actor, permissions.canUpdatePrograms, reloadPrograms, runCatalogMutation, tenantId]
    );

    const changeProgramStatus = useCallback(
        (program: Program, nextStatus: OfferingLifecycleStatus) =>
            runCatalogMutation(permissions.canUpdatePrograms, 'programs.update', async () => {
                const res = await updateProgramStatus(program.id, nextStatus, tenantId, actor);
                setDetailSubject((prev) =>
                    prev?.kind === 'program' && prev.record.id === res.program.id
                        ? { kind: 'program', record: res.program }
                        : prev
                );
                reloadPrograms();
                return res.message ?? `Program "${res.program.name}" status changed to ${nextStatus}.`;
            }),
        [actor, permissions.canUpdatePrograms, reloadPrograms, runCatalogMutation, tenantId]
    );

    const removeProgram = useCallback(
        async (program: Program): Promise<boolean> => {
            const check = evaluateProgramDeleteEligibility({
                program,
                canDeletePermission: permissions.canDeletePrograms,
            });
            if (!check.allowed) {
                setMutationError({
                    message: check.reason || 'Program cannot be deleted.',
                    isBackendUnavailable: false,
                    error: null,
                });
                return false;
            }
            const outcome = await runCatalogMutation(
                permissions.canDeletePrograms,
                'programs.delete',
                async () => {
                    const res = await deleteProgram(program.id, tenantId, actor);
                    setDetailSubject((prev) =>
                        prev?.kind === 'program' && prev.record.id === program.id ? null : prev
                    );
                    reloadPrograms();
                    return res.message ?? `Program "${program.name}" deleted.`;
                }
            );
            return outcome.ok;
        },
        [actor, permissions.canDeletePrograms, reloadPrograms, runCatalogMutation, tenantId]
    );

    // Course Mutations
    const saveNewCourse = useCallback(
        (payload: CreateCourseRequest) =>
            runCatalogMutation(permissions.canCreateCourses, 'courses.create', async () => {
                const res = await createCourse(payload, tenantId, actor);
                reloadCourses();
                return res.message ?? `Course "${res.course.title}" created.`;
            }),
        [actor, permissions.canCreateCourses, reloadCourses, runCatalogMutation, tenantId]
    );

    const saveEditedCourse = useCallback(
        (courseId: string, payload: UpdateCourseRequest) =>
            runCatalogMutation(permissions.canUpdateCourses, 'courses.update', async () => {
                const res = await updateCourse(courseId, payload, tenantId, actor);
                setDetailSubject((prev) =>
                    prev?.kind === 'course' && prev.record.id === res.course.id
                        ? { kind: 'course', record: res.course }
                        : prev
                );
                reloadCourses();
                return res.message ?? `Course "${res.course.title}" updated.`;
            }),
        [actor, permissions.canUpdateCourses, reloadCourses, runCatalogMutation, tenantId]
    );

    const changeCourseStatus = useCallback(
        (course: Course, nextStatus: OfferingLifecycleStatus) =>
            runCatalogMutation(permissions.canUpdateCourses, 'courses.update', async () => {
                const res = await updateCourseStatus(course.id, nextStatus, tenantId, actor);
                setDetailSubject((prev) =>
                    prev?.kind === 'course' && prev.record.id === res.course.id
                        ? { kind: 'course', record: res.course }
                        : prev
                );
                reloadCourses();
                return res.message ?? `Course "${res.course.title}" status changed to ${nextStatus}.`;
            }),
        [actor, permissions.canUpdateCourses, reloadCourses, runCatalogMutation, tenantId]
    );

    const removeCourse = useCallback(
        async (course: Course): Promise<boolean> => {
            const check = evaluateCourseDeleteEligibility({
                course,
                canDeletePermission: permissions.canDeleteCourses,
            });
            if (!check.allowed) {
                setMutationError({
                    message: check.reason || 'Course cannot be deleted.',
                    isBackendUnavailable: false,
                    error: null,
                });
                return false;
            }
            const outcome = await runCatalogMutation(
                permissions.canDeleteCourses,
                'courses.delete',
                async () => {
                    const res = await deleteCourse(course.id, tenantId, actor);
                    setDetailSubject((prev) =>
                        prev?.kind === 'course' && prev.record.id === course.id ? null : prev
                    );
                    reloadCourses();
                    return res.message ?? `Course "${course.title}" deleted.`;
                }
            );
            return outcome.ok;
        },
        [actor, permissions.canDeleteCourses, reloadCourses, runCatalogMutation, tenantId]
    );

    // Program Curriculum Mutations
    const runCurriculumMutation = useCallback(
        async (
            task: () => Promise<string>
        ): Promise<CatalogSubmitOutcome> => {
            if (!enabled || !tenantId || !actor) {
                const msg = 'Verified school session is required.';
                setCurriculumMutationError({
                    message: msg,
                    isBackendUnavailable: false,
                    error: null,
                });
                return { ok: false, errorMessage: msg, error: null };
            }
            if (!permissions.canAssignCourses) {
                const msg = 'Access Denied: Requires programs.assign_courses permission.';
                setCurriculumMutationError({
                    message: msg,
                    isBackendUnavailable: false,
                    error: null,
                });
                return { ok: false, errorMessage: msg, error: null };
            }
            if (isCurriculumMutatingRef.current) {
                const msg = 'Another curriculum change is currently saving. Please wait.';
                return { ok: false, errorMessage: msg, error: null };
            }

            isCurriculumMutatingRef.current = true;
            setIsCurriculumMutating(true);
            setCurriculumMutationNotice(null);
            setCurriculumMutationError(null);

            try {
                const message = await task();
                setCurriculumMutationNotice(message);
                return { ok: true };
            } catch (error: unknown) {
                const mapped = toMutationError(error, 'Unable to update program curriculum.');
                setCurriculumMutationError(mapped);
                return { ok: false, errorMessage: mapped.message, error };
            } finally {
                isCurriculumMutatingRef.current = false;
                setIsCurriculumMutating(false);
            }
        },
        [actor, enabled, permissions.canAssignCourses, tenantId]
    );

    const addProgramCourse = useCallback(
        (programId: string, payload: AddProgramCourseRequest) =>
            runCurriculumMutation(async () => {
                const res = await addCourseToProgram(programId, payload, tenantId, actor);
                setProgramCourses((prev) => sortProgramCourses([...prev, res.programCourse]));
                reloadPrograms();
                return (
                    res.message ??
                    `Added "${res.programCourse.courseTitle}" to program curriculum.`
                );
            }),
        [actor, reloadPrograms, runCurriculumMutation, tenantId]
    );

    const editProgramCourse = useCallback(
        (programId: string, programCourseId: string, payload: UpdateProgramCourseRequest) =>
            runCurriculumMutation(async () => {
                const res = await updateProgramCourse(
                    programId,
                    programCourseId,
                    payload,
                    tenantId,
                    actor
                );
                setProgramCourses((prev) =>
                    sortProgramCourses(
                        prev.map((item) =>
                            item.id === res.programCourse.id ? res.programCourse : item
                        )
                    )
                );
                return (
                    res.message ??
                    `Updated curriculum settings for "${res.programCourse.courseTitle}".`
                );
            }),
        [actor, runCurriculumMutation, tenantId]
    );

    const reorderProgramCourse = useCallback(
        (programId: string, programCourseId: string, direction: 'up' | 'down') =>
            runCurriculumMutation(async () => {
                const nextOrderIds = buildReorderedProgramCourseIds(
                    effectiveProgramCourses,
                    programCourseId,
                    direction
                );
                if (!nextOrderIds) {
                    throw new Error('Course cannot be moved further in that direction.');
                }
                const res = await reorderProgramCourses(programId, nextOrderIds, tenantId, actor);
                setProgramCourses(res.items);
                return res.message ?? 'Program curriculum order updated.';
            }),
        [actor, effectiveProgramCourses, runCurriculumMutation, tenantId]
    );

    const detachProgramCourse = useCallback(
        async (programId: string, programCourse: ProgramCourse): Promise<boolean> => {
            const outcome = await runCurriculumMutation(async () => {
                const res = await removeCourseFromProgram(
                    programId,
                    programCourse.id,
                    tenantId,
                    actor
                );
                setProgramCourses((prev) =>
                    prev.filter((item) => item.id !== programCourse.id)
                );
                setProgramAssignments((prev) =>
                    prev.filter((item) => item.programCourseId !== programCourse.id)
                );
                reloadPrograms();
                return (
                    res.message ??
                    `Removed "${programCourse.courseTitle}" from this program. The reusable course remains in the Course catalog.`
                );
            });
            return outcome.ok;
        },
        [actor, reloadPrograms, runCurriculumMutation, tenantId]
    );

    // Teacher Assignment Mutations (Step 5.9.3)
    const assignTeachersBatch = useCallback(
        async (
            requests: CreateTeacherAssignmentRequest[],
            context: {
                program?: Program | null;
                course: Pick<Course, 'id' | 'allowStandalone'>;
            }
        ): Promise<BatchAssignmentOutcome> => {
            if (requests.length === 0) {
                return {
                    createdCount: 0,
                    createdTeacherIds: [],
                    failedTeacherErrors: [],
                    errorMessage: 'Select at least one teacher to assign.',
                    isBackendUnavailable: false,
                };
            }

            const firstScope = requests[0].scope;
            const hasScopePermission =
                firstScope === 'PROGRAM_COURSE'
                    ? permissions.canAssignProgramTeachers
                    : permissions.canAssignStandaloneTeachers;

            if (!enabled || !tenantId || !actor) {
                return {
                    createdCount: 0,
                    createdTeacherIds: [],
                    failedTeacherErrors: [],
                    errorMessage: 'Verified school session is required.',
                    isBackendUnavailable: false,
                };
            }
            if (!hasScopePermission) {
                return {
                    createdCount: 0,
                    createdTeacherIds: [],
                    failedTeacherErrors: [],
                    errorMessage:
                        firstScope === 'PROGRAM_COURSE'
                            ? 'Access Denied: Requires programs.assign_teachers permission.'
                            : 'Access Denied: Requires courses.assign_teachers permission.',
                    isBackendUnavailable: false,
                };
            }
            if (isAssignmentMutatingRef.current) {
                return {
                    createdCount: 0,
                    createdTeacherIds: [],
                    failedTeacherErrors: [],
                    errorMessage: 'Another teacher assignment update is in progress. Please wait.',
                    isBackendUnavailable: false,
                };
            }

            isAssignmentMutatingRef.current = true;
            setIsAssignmentMutating(true);

            const createdTeacherIds: string[] = [];
            const createdRecords: TeacherCourseAssignment[] = [];
            const failedTeacherErrors: Array<{
                teacherId: string;
                message: string;
                isConflict: boolean;
            }> = [];
            let sawConflict = false;
            let sawUnavailable = false;

            try {
                for (const request of requests) {
                    try {
                        const res = await createTeacherAssignment(request, tenantId, actor, context);
                        createdTeacherIds.push(request.teacherId);
                        createdRecords.push(res.assignment);
                    } catch (error: unknown) {
                        const isConflict =
                            error instanceof ApiError && error.statusCode === 409;
                        const isUnavailable = isCatalogBackendUnavailableError(error);
                        if (isConflict) sawConflict = true;
                        if (isUnavailable) sawUnavailable = true;
                        failedTeacherErrors.push({
                            teacherId: request.teacherId,
                            message: isUnavailable
                                ? 'Teacher assignment endpoint is pending backend implementation. Selection preserved.'
                                : formatCatalogOperationError(
                                      error,
                                      'Unable to assign teacher.'
                                  ),
                            isConflict,
                        });
                    }
                }

                if (createdRecords.length > 0) {
                    if (firstScope === 'PROGRAM_COURSE') {
                        setProgramAssignments((prev) => [...prev, ...createdRecords]);
                        reloadProgramCurriculum();
                        reloadPrograms();
                    } else {
                        setStandaloneAssignments((prev) => [...prev, ...createdRecords]);
                        reloadCourses();
                    }
                }

                if (createdRecords.length > 0 || sawConflict) {
                    if (firstScope === 'PROGRAM_COURSE') {
                        reloadProgramAssignments();
                    } else {
                        reloadStandaloneAssignments();
                    }
                }

                return {
                    createdCount: createdRecords.length,
                    createdTeacherIds,
                    failedTeacherErrors,
                    errorMessage:
                        failedTeacherErrors.length > 0
                            ? failedTeacherErrors[0].message
                            : null,
                    isBackendUnavailable: sawUnavailable,
                };
            } finally {
                isAssignmentMutatingRef.current = false;
                setIsAssignmentMutating(false);
            }
        },
        [
            actor,
            enabled,
            permissions.canAssignProgramTeachers,
            permissions.canAssignStandaloneTeachers,
            reloadCourses,
            reloadProgramAssignments,
            reloadProgramCurriculum,
            reloadPrograms,
            reloadStandaloneAssignments,
            tenantId,
        ]
    );

    const removeTeacherAssignment = useCallback(
        async (assignment: TeacherCourseAssignment): Promise<CatalogSubmitOutcome> => {
            const hasScopePermission =
                assignment.scope === 'PROGRAM_COURSE'
                    ? permissions.canAssignProgramTeachers
                    : permissions.canAssignStandaloneTeachers;

            if (!enabled || !tenantId || !actor || !hasScopePermission) {
                const msg =
                    assignment.scope === 'PROGRAM_COURSE'
                        ? 'Access Denied: Requires programs.assign_teachers permission.'
                        : 'Access Denied: Requires courses.assign_teachers permission.';
                setCurriculumMutationError({
                    message: msg,
                    isBackendUnavailable: false,
                    error: null,
                });
                return { ok: false, errorMessage: msg, error: null };
            }
            if (isAssignmentMutatingRef.current) {
                return {
                    ok: false,
                    errorMessage: 'Another teacher assignment update is in progress. Please wait.',
                    error: null,
                };
            }

            isAssignmentMutatingRef.current = true;
            setIsAssignmentMutating(true);
            setCurriculumMutationError(null);
            setCurriculumMutationNotice(null);

            try {
                const res = await deleteTeacherAssignment(
                    assignment.id,
                    assignment.scope,
                    tenantId,
                    actor
                );
                if (assignment.scope === 'PROGRAM_COURSE') {
                    setProgramAssignments((prev) =>
                        prev.filter((item) => item.id !== assignment.id)
                    );
                    reloadProgramAssignments();
                    reloadProgramCurriculum();
                    setCurriculumMutationNotice(
                        res.message ??
                            `Removed ${assignment.teacherName} from "${assignment.courseTitle}".`
                    );
                } else {
                    setStandaloneAssignments((prev) =>
                        prev.filter((item) => item.id !== assignment.id)
                    );
                    reloadStandaloneAssignments();
                    reloadCourses();
                    setMutationNotice(
                        res.message ??
                            `Removed ${assignment.teacherName} from standalone course "${assignment.courseTitle}".`
                    );
                }
                return { ok: true };
            } catch (error: unknown) {
                const mapped = toMutationError(error, 'Unable to remove teacher assignment.');
                setCurriculumMutationError(mapped);
                if (assignment.scope === 'STANDALONE_COURSE') {
                    setMutationError(mapped);
                }
                return { ok: false, errorMessage: mapped.message, error };
            } finally {
                isAssignmentMutatingRef.current = false;
                setIsAssignmentMutating(false);
            }
        },
        [
            actor,
            enabled,
            permissions.canAssignProgramTeachers,
            permissions.canAssignStandaloneTeachers,
            reloadCourses,
            reloadProgramAssignments,
            reloadProgramCurriculum,
            reloadStandaloneAssignments,
            tenantId,
        ]
    );

    return {
        programsQuery,
        setProgramsQuery,
        programs: effectivePrograms,
        programsPagination,
        isLoadingPrograms,
        programsError,
        reloadPrograms,

        coursesQuery,
        setCoursesQuery,
        courses: effectiveCourses,
        coursesPagination,
        isLoadingCourses,
        coursesError,
        reloadCourses,

        classes: effectiveClasses,
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

        programCourses: effectiveProgramCourses,
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

        academicYears: effectiveAcademicYears,
        isLoadingYears,
        yearsError,
        reloadAcademicYears,

        programSections: effectiveProgramSections,
        isLoadingSections,
        sectionsError,
        reloadProgramSections,

        programAssignments: effectiveProgramAssignments,
        isLoadingProgramAssignments,
        programAssignmentsError,
        reloadProgramAssignments,

        standaloneAssignments: effectiveStandaloneAssignments,
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
    };
}

