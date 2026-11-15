import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { ApiError } from '../../../services/api/api-error';
import type { AuthenticatedUser } from '../../../types/auth';
import { listAcademicYears } from '../../academic/services/academic-structure-service';
import type { AcademicSection, AcademicYear } from '../../academic/types/academic-structure.types';
import type { Course, Program } from '../../programs-courses/types/programs-courses.types';
import { isStudentEligibleForEnrollment } from '../../students/schemas/student-management-schema';
import type { StudentDirectoryItem } from '../../students/types/student-management.types';
import {
    formatEnrollmentStatusLabel,
    groupAndSummarizeEnrollments,
} from '../schemas/enrollment-schema';
import {
    createProgramChangeRequest,
    createProgramEnrollment,
    createStandaloneCourseEnrollment,
    formatEnrollmentOperationError,
    getEnrollmentHistory,
    isEnrollmentBackendUnavailableError,
    listActiveSectionsForClass,
    listEligibleEnrollmentAcademicYears,
    listEnrollableActivePrograms,
    listEnrollableStandaloneCourses,
    listStudentEnrollments,
    listStudentProgramChangeRequests,
    transferEnrollmentSection,
    updateEnrollmentStatus,
} from '../services/enrollment-service';
import type {
    CreateProgramChangeRequestDto,
    CreateProgramEnrollmentRequest,
    CreateStandaloneCourseEnrollmentRequest,
    EnrollmentHistoryResponse,
    EnrollmentTransitionTargetStatus,
    EnrollmentType,
    ProgramChangeRequestRecord,
    SectionTransferRequest,
    StudentEnrollmentRecord,
} from '../types/enrollment.types';

export interface StudentEnrollmentPermissions {
    canReadStudents: boolean;
    canReadEnrollments: boolean;
    canCreateEnrollments: boolean;
    canUpdateEnrollments: boolean;
    canCancelEnrollments: boolean;
    canApproveProgramChange: boolean;
    canReadPrograms: boolean;
    canReadCourses: boolean;
    canReadAcademicYears: boolean;
    canReadSections: boolean;
}

export interface EnrollmentFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export interface EnrollmentMutationOutcome {
    ok: boolean;
    errorMessage: string | null;
    isBackendUnavailable: boolean;
    error: unknown;
    enrollment?: StudentEnrollmentRecord;
    programChangeRequest?: ProgramChangeRequestRecord;
}

function toFetchError(error: unknown, fallback: string): EnrollmentFetchError {
    return {
        message: formatEnrollmentOperationError(error, fallback),
        isBackendUnavailable: isEnrollmentBackendUnavailableError(error),
    };
}

export function useStudentEnrollments(options: {
    actor: AuthenticatedUser | null;
    tenantId: string | null;
    enabled: boolean;
    student: StudentDirectoryItem | null;
    permissions: StudentEnrollmentPermissions;
    onProgramChangeCreated?: () => void;
}) {
    const { actor, tenantId, enabled, student, permissions, onProgramChangeCreated } = options;

    const [enrollmentsReload, setEnrollmentsReload] = useState(0);
    const [enrollments, setEnrollments] = useState<StudentEnrollmentRecord[]>([]);
    const [enrollmentsError, setEnrollmentsError] = useState<EnrollmentFetchError | null>(null);
    const [settledEnrollmentsKey, setSettledEnrollmentsKey] = useState<string | null>(null);

    // Lazy creation modal lookup controls scoped to active studentId
    const [dialogState, setDialogState] = useState<{
        studentId: string | null;
        open: boolean;
        creationType: '' | EnrollmentType;
        classIdForSections: string | null;
    }>({
        studentId: null,
        open: false,
        creationType: '',
        classIdForSections: null,
    });

    const [programsReload, setProgramsReload] = useState(0);
    const [gradePrograms, setGradePrograms] = useState<Program[]>([]);
    const [gradeProgramsError, setGradeProgramsError] = useState<EnrollmentFetchError | null>(null);
    const [settledGradeProgramsKey, setSettledGradeProgramsKey] = useState<string | null>(null);

    const [skillPrograms, setSkillPrograms] = useState<Program[]>([]);
    const [skillProgramsError, setSkillProgramsError] = useState<EnrollmentFetchError | null>(null);
    const [settledSkillProgramsKey, setSettledSkillProgramsKey] = useState<string | null>(null);

    const [coursesReload, setCoursesReload] = useState(0);
    const [standaloneCourses, setStandaloneCourses] = useState<Course[]>([]);
    const [coursesError, setCoursesError] = useState<EnrollmentFetchError | null>(null);
    const [settledCoursesKey, setSettledCoursesKey] = useState<string | null>(null);

    const [yearsReload, setYearsReload] = useState(0);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [yearsError, setYearsError] = useState<EnrollmentFetchError | null>(null);
    const [settledYearsKey, setSettledYearsKey] = useState<string | null>(null);

    const [sectionsReload, setSectionsReload] = useState(0);
    const [classSections, setClassSections] = useState<AcademicSection[]>([]);
    const [sectionsError, setSectionsError] = useState<EnrollmentFetchError | null>(null);
    const [settledSectionsKey, setSettledSectionsKey] = useState<string | null>(null);

    // Step 5.10.4B: Lifecycle, Section Transfer, History & All-Years lookup state (scoped to studentId)
    const [lifecycleDialogState, setLifecycleDialogState] = useState<{
        studentId: string | null;
        enrollment: StudentEnrollmentRecord | null;
        targetStatus: EnrollmentTransitionTargetStatus | null;
    }>({
        studentId: null,
        enrollment: null,
        targetStatus: null,
    });

    const [transferDialogState, setTransferDialogState] = useState<{
        studentId: string | null;
        enrollment: StudentEnrollmentRecord | null;
    }>({
        studentId: null,
        enrollment: null,
    });

    const [historyDialogState, setHistoryDialogState] = useState<{
        studentId: string | null;
        enrollmentId: string | null;
    }>({
        studentId: null,
        enrollmentId: null,
    });
    const [historyReload, setHistoryReload] = useState(0);
    const [enrollmentHistory, setEnrollmentHistory] = useState<EnrollmentHistoryResponse | null>(
        null
    );
    const [historyError, setHistoryError] = useState<EnrollmentFetchError | null>(null);
    const [settledHistoryKey, setSettledHistoryKey] = useState<string | null>(null);

    const [allAcademicYears, setAllAcademicYears] = useState<AcademicYear[]>([]);
    const [settledAllYearsKey, setSettledAllYearsKey] = useState<string | null>(null);

    // Step 5.10.4C: Student Program Change Request creation & history state (scoped to studentId)
    const [programChangesReload, setProgramChangesReload] = useState(0);
    const [programChangeRequests, setProgramChangeRequests] = useState<
        ProgramChangeRequestRecord[]
    >([]);
    const [programChangesError, setProgramChangesError] = useState<EnrollmentFetchError | null>(
        null
    );
    const [settledProgramChangesKey, setSettledProgramChangesKey] = useState<string | null>(null);

    const [programChangeDialogState, setProgramChangeDialogState] = useState<{
        studentId: string | null;
        sourceEnrollment: StudentEnrollmentRecord | null;
        targetClassIdForSections: string | null;
    }>({
        studentId: null,
        sourceEnrollment: null,
        targetClassIdForSections: null,
    });

    const [isMutatingEnrollment, setIsMutatingEnrollment] = useState(false);
    const [feedbackState, setFeedbackState] = useState<{
        studentId: string | null;
        notice: string | null;
        error: EnrollmentFetchError | null;
    }>({
        studentId: null,
        notice: null,
        error: null,
    });

    const enrollmentsVersionRef = useRef(0);
    const gradeProgramsVersionRef = useRef(0);
    const skillProgramsVersionRef = useRef(0);
    const coursesVersionRef = useRef(0);
    const yearsVersionRef = useRef(0);
    const allYearsVersionRef = useRef(0);
    const sectionsVersionRef = useRef(0);
    const historyVersionRef = useRef(0);
    const programChangesVersionRef = useRef(0);
    const isMutatingRef = useRef(false);

    const studentEligibility = useMemo(
        () =>
            student
                ? isStudentEligibleForEnrollment(student)
                : { allowed: false, reason: 'No student selected.' },
        [student]
    );

    const studentId = student?.id ?? null;
    const createDialogOpen = Boolean(
        studentId && dialogState.studentId === studentId && dialogState.open
    );
    const activeCreationType: '' | EnrollmentType =
        studentId && dialogState.studentId === studentId ? dialogState.creationType : '';
    const selectedClassIdForSections =
        studentId && dialogState.studentId === studentId ? dialogState.classIdForSections : null;
    const lifecycleDialogTarget =
        studentId &&
        lifecycleDialogState.studentId === studentId &&
        lifecycleDialogState.enrollment &&
        lifecycleDialogState.targetStatus
            ? {
                  enrollment: lifecycleDialogState.enrollment,
                  targetStatus: lifecycleDialogState.targetStatus,
              }
            : null;
    const transferDialogEnrollment =
        studentId && transferDialogState.studentId === studentId
            ? transferDialogState.enrollment
            : null;
    const inspectedHistoryEnrollmentId =
        studentId && historyDialogState.studentId === studentId
            ? historyDialogState.enrollmentId
            : null;
    const programChangeDialogSource =
        studentId && programChangeDialogState.studentId === studentId
            ? programChangeDialogState.sourceEnrollment
            : null;
    const programChangeTargetClassId =
        studentId && programChangeDialogState.studentId === studentId
            ? programChangeDialogState.targetClassIdForSections
            : null;
    const enrollmentNotice =
        studentId && feedbackState.studentId === studentId ? feedbackState.notice : null;
    const enrollmentActionError =
        studentId && feedbackState.studentId === studentId ? feedbackState.error : null;

    // 1. List enrollments (`students.read` + `enrollments.read`)
    const enrollmentsLoadKey =
        enabled &&
        tenantId &&
        actor &&
        studentId &&
        permissions.canReadStudents &&
        permissions.canReadEnrollments
            ? `${tenantId}:${studentId}:${enrollmentsReload}`
            : null;

    useEffect(() => {
        if (!enrollmentsLoadKey || !tenantId || !actor || !studentId) return;

        const controller = new AbortController();
        const version = ++enrollmentsVersionRef.current;

        listStudentEnrollments(studentId, tenantId, actor, controller.signal)
            .then((res) => {
                if (version !== enrollmentsVersionRef.current) return;
                setEnrollments(res.items);
                setEnrollmentsError(null);
                setSettledEnrollmentsKey(enrollmentsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== enrollmentsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setEnrollments([]);
                setEnrollmentsError(toFetchError(error, 'Unable to load student enrollments.'));
                setSettledEnrollmentsKey(enrollmentsLoadKey);
            });

        return () => controller.abort();
    }, [actor, enrollmentsLoadKey, studentId, tenantId]);

    const effectiveEnrollments = useMemo(
        () =>
            enrollmentsLoadKey && settledEnrollmentsKey === enrollmentsLoadKey ? enrollments : [],
        [enrollments, enrollmentsLoadKey, settledEnrollmentsKey]
    );
    const isLoadingEnrollments = Boolean(
        enrollmentsLoadKey && settledEnrollmentsKey !== enrollmentsLoadKey
    );
    const enrollmentsLoaded = Boolean(
        enrollmentsLoadKey && settledEnrollmentsKey === enrollmentsLoadKey && !enrollmentsError
    );
    const groupedEnrollments = useMemo(
        () => groupAndSummarizeEnrollments(effectiveEnrollments),
        [effectiveEnrollments]
    );

    // 2. Lazy-load Grade-Based Programs when creation OR Program Change modal needs GRADE_BASED Programs
    const canFetchCatalog =
        enabled &&
        Boolean(tenantId) &&
        Boolean(actor) &&
        Boolean(studentId) &&
        permissions.canReadStudents &&
        permissions.canCreateEnrollments &&
        studentEligibility.allowed &&
        createDialogOpen;

    const needsGradeProgramsForCreate =
        canFetchCatalog && activeCreationType === 'GRADE_BASED_PROGRAM';
    const needsGradeProgramsForChange =
        enabled &&
        Boolean(tenantId) &&
        Boolean(actor) &&
        Boolean(studentId) &&
        permissions.canReadStudents &&
        permissions.canUpdateEnrollments &&
        studentEligibility.allowed &&
        Boolean(programChangeDialogSource);

    const gradeProgramsLoadKey =
        (needsGradeProgramsForCreate || needsGradeProgramsForChange) &&
        permissions.canReadPrograms &&
        tenantId
            ? `${tenantId}:GRADE_BASED:${programsReload}`
            : null;

    useEffect(() => {
        if (!gradeProgramsLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++gradeProgramsVersionRef.current;

        listEnrollableActivePrograms('GRADE_BASED', tenantId, actor, controller.signal)
            .then((items) => {
                if (version !== gradeProgramsVersionRef.current) return;
                setGradePrograms(items);
                setGradeProgramsError(null);
                setSettledGradeProgramsKey(gradeProgramsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== gradeProgramsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setGradePrograms([]);
                setGradeProgramsError(
                    toFetchError(error, 'Unable to load active Grade-Based Programs.')
                );
                setSettledGradeProgramsKey(gradeProgramsLoadKey);
            });

        return () => controller.abort();
    }, [actor, gradeProgramsLoadKey, tenantId]);

    // 3. Lazy-load Skill-Based Programs when creation modal needs SKILL_BASED_PROGRAM
    const skillProgramsLoadKey =
        canFetchCatalog &&
        activeCreationType === 'SKILL_BASED_PROGRAM' &&
        permissions.canReadPrograms &&
        tenantId
            ? `${tenantId}:SKILL_BASED:${programsReload}`
            : null;

    useEffect(() => {
        if (!skillProgramsLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++skillProgramsVersionRef.current;

        listEnrollableActivePrograms('SKILL_BASED', tenantId, actor, controller.signal)
            .then((items) => {
                if (version !== skillProgramsVersionRef.current) return;
                setSkillPrograms(items);
                setSkillProgramsError(null);
                setSettledSkillProgramsKey(skillProgramsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== skillProgramsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setSkillPrograms([]);
                setSkillProgramsError(
                    toFetchError(error, 'Unable to load active Skill-Based Programs.')
                );
                setSettledSkillProgramsKey(skillProgramsLoadKey);
            });

        return () => controller.abort();
    }, [actor, skillProgramsLoadKey, tenantId]);

    // 4. Lazy-load Standalone Courses (`allowStandalone === true`) when type is STANDALONE_COURSE
    const coursesLoadKey =
        canFetchCatalog &&
        activeCreationType === 'STANDALONE_COURSE' &&
        permissions.canReadCourses &&
        tenantId
            ? `${tenantId}:STANDALONE_COURSES:${coursesReload}`
            : null;

    useEffect(() => {
        if (!coursesLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++coursesVersionRef.current;

        listEnrollableStandaloneCourses(tenantId, actor, controller.signal)
            .then((items) => {
                if (version !== coursesVersionRef.current) return;
                setStandaloneCourses(items);
                setCoursesError(null);
                setSettledCoursesKey(coursesLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== coursesVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setStandaloneCourses([]);
                setCoursesError(
                    toFetchError(error, 'Unable to load eligible standalone Courses.')
                );
                setSettledCoursesKey(coursesLoadKey);
            });

        return () => controller.abort();
    }, [actor, coursesLoadKey, tenantId]);

    // 5. Lazy-load Academic Years (ACTIVE & PLANNED) for GRADE_BASED_PROGRAM
    const yearsLoadKey =
        canFetchCatalog &&
        activeCreationType === 'GRADE_BASED_PROGRAM' &&
        permissions.canReadAcademicYears &&
        tenantId
            ? `${tenantId}:ENROLL_YEARS:${yearsReload}`
            : null;

    useEffect(() => {
        if (!yearsLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++yearsVersionRef.current;

        listEligibleEnrollmentAcademicYears(tenantId, actor, controller.signal)
            .then((items) => {
                if (version !== yearsVersionRef.current) return;
                setAcademicYears(items);
                setYearsError(null);
                setSettledYearsKey(yearsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== yearsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setAcademicYears([]);
                setYearsError(toFetchError(error, 'Unable to load eligible Academic Years.'));
                setSettledYearsKey(yearsLoadKey);
            });

        return () => controller.abort();
    }, [actor, tenantId, yearsLoadKey]);

    // 6. Lazy-load Active Sections filtered to Grade-Based creation, Section Transfer, OR Program Change target Class
    const cleanCreateClassId =
        canFetchCatalog && activeCreationType === 'GRADE_BASED_PROGRAM'
            ? selectedClassIdForSections?.trim() ?? ''
            : '';
    const cleanTransferClassId =
        enabled &&
        Boolean(tenantId) &&
        Boolean(actor) &&
        Boolean(studentId) &&
        permissions.canReadStudents &&
        permissions.canUpdateEnrollments &&
        permissions.canReadSections &&
        transferDialogEnrollment?.enrollmentType === 'GRADE_BASED_PROGRAM' &&
        transferDialogEnrollment.status === 'ACTIVE'
            ? transferDialogEnrollment.academicClassId?.trim() ?? ''
            : '';
    const cleanProgramChangeClassId =
        needsGradeProgramsForChange && permissions.canReadSections
            ? programChangeTargetClassId?.trim() ?? ''
            : '';
    const effectiveSectionsClassId =
        cleanProgramChangeClassId || cleanTransferClassId || cleanCreateClassId;
    const canFetchSectionsForEnrollment =
        permissions.canReadSections &&
        ((Boolean(cleanCreateClassId) && permissions.canCreateEnrollments) ||
            (Boolean(cleanTransferClassId) && permissions.canUpdateEnrollments) ||
            (Boolean(cleanProgramChangeClassId) && permissions.canUpdateEnrollments));

    const sectionsLoadKey =
        canFetchSectionsForEnrollment && effectiveSectionsClassId !== '' && tenantId
            ? `${tenantId}:${effectiveSectionsClassId}:${sectionsReload}`
            : null;

    useEffect(() => {
        if (!sectionsLoadKey || !tenantId || !actor || !effectiveSectionsClassId) return;

        const controller = new AbortController();
        const version = ++sectionsVersionRef.current;

        listActiveSectionsForClass(effectiveSectionsClassId, tenantId, actor, controller.signal)
            .then((items) => {
                if (version !== sectionsVersionRef.current) return;
                setClassSections(items);
                setSectionsError(null);
                setSettledSectionsKey(sectionsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== sectionsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setClassSections([]);
                setSectionsError(toFetchError(error, 'Unable to load Sections for this Class.'));
                setSettledSectionsKey(sectionsLoadKey);
            });

        return () => controller.abort();
    }, [actor, effectiveSectionsClassId, sectionsLoadKey, tenantId]);

    // 7. Optional reference lookup of ALL Academic Years (strictly when academic_years.read + enrollments.read)
    // Used cleanly to enforce COMPLETED / ARCHIVED Academic Year read-only guards when omitted on row DTOs.
    const allYearsLoadKey =
        enabled &&
        tenantId &&
        actor &&
        studentId &&
        permissions.canReadStudents &&
        permissions.canReadEnrollments &&
        permissions.canReadAcademicYears
            ? `${tenantId}:ALL_YEARS:${enrollmentsReload}`
            : null;

    useEffect(() => {
        if (!allYearsLoadKey || !tenantId) return;

        const controller = new AbortController();
        const version = ++allYearsVersionRef.current;

        listAcademicYears(tenantId, controller.signal)
            .then((res) => {
                if (version !== allYearsVersionRef.current) return;
                setAllAcademicYears(res.academicYears);
                setSettledAllYearsKey(allYearsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== allYearsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setAllAcademicYears([]);
                setSettledAllYearsKey(allYearsLoadKey);
            });

        return () => controller.abort();
    }, [allYearsLoadKey, tenantId]);

    const academicYearsById = useMemo(() => {
        const map = new Map<string, AcademicYear>();
        if (allYearsLoadKey && settledAllYearsKey === allYearsLoadKey) {
            for (const year of allAcademicYears) {
                map.set(year.id, year);
            }
        }
        return map;
    }, [allAcademicYears, allYearsLoadKey, settledAllYearsKey]);

    // 8. Lazy-load Immutable Enrollment History (strictly `students.read` + `enrollments.read`)
    const historyLoadKey =
        enabled &&
        tenantId &&
        actor &&
        studentId &&
        permissions.canReadStudents &&
        permissions.canReadEnrollments &&
        inspectedHistoryEnrollmentId
            ? `${tenantId}:${studentId}:${inspectedHistoryEnrollmentId}:${historyReload}`
            : null;

    useEffect(() => {
        if (
            !historyLoadKey ||
            !tenantId ||
            !actor ||
            !studentId ||
            !inspectedHistoryEnrollmentId
        ) {
            return;
        }

        const controller = new AbortController();
        const version = ++historyVersionRef.current;

        getEnrollmentHistory(
            studentId,
            inspectedHistoryEnrollmentId,
            tenantId,
            actor,
            controller.signal
        )
            .then((res) => {
                if (version !== historyVersionRef.current) return;
                setEnrollmentHistory(res);
                setHistoryError(null);
                setSettledHistoryKey(historyLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== historyVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setEnrollmentHistory(null);
                setHistoryError(toFetchError(error, 'Unable to load enrollment transfer history.'));
                setSettledHistoryKey(historyLoadKey);
            });

        return () => controller.abort();
    }, [actor, historyLoadKey, inspectedHistoryEnrollmentId, studentId, tenantId]);

    const effectiveHistory = useMemo(
        () =>
            historyLoadKey && settledHistoryKey === historyLoadKey ? enrollmentHistory : null,
        [enrollmentHistory, historyLoadKey, settledHistoryKey]
    );
    const isLoadingHistory = Boolean(historyLoadKey && settledHistoryKey !== historyLoadKey);

    // 9. List Individual Student Program Change History (`students.read` + `enrollments.read`, never requires `enrollments.approve_program_change`)
    const programChangesLoadKey =
        enabled &&
        tenantId &&
        actor &&
        studentId &&
        permissions.canReadStudents &&
        permissions.canReadEnrollments
            ? `${tenantId}:${studentId}:PROGRAM_CHANGES:${programChangesReload}`
            : null;

    useEffect(() => {
        if (!programChangesLoadKey || !tenantId || !actor || !studentId) return;

        const controller = new AbortController();
        const version = ++programChangesVersionRef.current;

        listStudentProgramChangeRequests(studentId, tenantId, actor, controller.signal)
            .then((res) => {
                if (version !== programChangesVersionRef.current) return;
                setProgramChangeRequests(res.items);
                setProgramChangesError(null);
                setSettledProgramChangesKey(programChangesLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== programChangesVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setProgramChangeRequests([]);
                setProgramChangesError(
                    toFetchError(error, 'Unable to load student Program Change history.')
                );
                setSettledProgramChangesKey(programChangesLoadKey);
            });

        return () => controller.abort();
    }, [actor, programChangesLoadKey, studentId, tenantId]);

    const effectiveProgramChangeRequests = useMemo(
        () =>
            programChangesLoadKey && settledProgramChangesKey === programChangesLoadKey
                ? programChangeRequests
                : [],
        [programChangeRequests, programChangesLoadKey, settledProgramChangesKey]
    );
    const isLoadingProgramChanges = Boolean(
        programChangesLoadKey && settledProgramChangesKey !== programChangesLoadKey
    );

    const effectivePrograms = useMemo(() => {
        if (
            activeCreationType === 'GRADE_BASED_PROGRAM' ||
            Boolean(programChangeDialogSource)
        ) {
            return gradeProgramsLoadKey && settledGradeProgramsKey === gradeProgramsLoadKey
                ? gradePrograms
                : [];
        }
        if (activeCreationType === 'SKILL_BASED_PROGRAM') {
            return skillProgramsLoadKey && settledSkillProgramsKey === skillProgramsLoadKey
                ? skillPrograms
                : [];
        }
        return [];
    }, [
        activeCreationType,
        gradePrograms,
        gradeProgramsLoadKey,
        programChangeDialogSource,
        settledGradeProgramsKey,
        skillPrograms,
        skillProgramsLoadKey,
        settledSkillProgramsKey,
    ]);

    const programsError =
        activeCreationType === 'GRADE_BASED_PROGRAM' || Boolean(programChangeDialogSource)
            ? gradeProgramsError
            : activeCreationType === 'SKILL_BASED_PROGRAM'
              ? skillProgramsError
              : null;

    const isLoadingPrograms =
        activeCreationType === 'GRADE_BASED_PROGRAM' || Boolean(programChangeDialogSource)
            ? Boolean(gradeProgramsLoadKey && settledGradeProgramsKey !== gradeProgramsLoadKey)
            : activeCreationType === 'SKILL_BASED_PROGRAM'
              ? Boolean(skillProgramsLoadKey && settledSkillProgramsKey !== skillProgramsLoadKey)
              : false;

    const effectiveStandaloneCourses = useMemo(
        () => (coursesLoadKey && settledCoursesKey === coursesLoadKey ? standaloneCourses : []),
        [coursesLoadKey, settledCoursesKey, standaloneCourses]
    );
    const isLoadingCourses = Boolean(coursesLoadKey && settledCoursesKey !== coursesLoadKey);

    const effectiveAcademicYears = useMemo(
        () => (yearsLoadKey && settledYearsKey === yearsLoadKey ? academicYears : []),
        [academicYears, settledYearsKey, yearsLoadKey]
    );
    const isLoadingYears = Boolean(yearsLoadKey && settledYearsKey !== yearsLoadKey);

    const effectiveClassSections = useMemo(
        () => (sectionsLoadKey && settledSectionsKey === sectionsLoadKey ? classSections : []),
        [classSections, sectionsLoadKey, settledSectionsKey]
    );
    const isLoadingSections = Boolean(sectionsLoadKey && settledSectionsKey !== sectionsLoadKey);

    const reloadEnrollments = useCallback(() => {
        setEnrollmentsReload((c) => c + 1);
    }, []);
    const reloadProgramsLookup = useCallback(() => {
        setProgramsReload((c) => c + 1);
    }, []);
    const reloadCoursesLookup = useCallback(() => {
        setCoursesReload((c) => c + 1);
    }, []);
    const reloadYearsLookup = useCallback(() => {
        setYearsReload((c) => c + 1);
    }, []);
    const reloadSectionsLookup = useCallback(() => {
        setSectionsReload((c) => c + 1);
    }, []);
    const reloadHistory = useCallback(() => {
        setHistoryReload((c) => c + 1);
    }, []);
    const reloadProgramChanges = useCallback(() => {
        setProgramChangesReload((c) => c + 1);
    }, []);
    const reloadAllStudentEnrollmentData = useCallback(() => {
        setEnrollmentsReload((c) => c + 1);
        setProgramChangesReload((c) => c + 1);
        setHistoryReload((c) => c + 1);
    }, []);

    const clearEnrollmentFeedback = useCallback(() => {
        setFeedbackState({ studentId: null, notice: null, error: null });
    }, []);

    const openLifecycleActionDialog = useCallback(
        (enrollment: StudentEnrollmentRecord, targetStatus: EnrollmentTransitionTargetStatus) => {
            if (!enabled || !studentId || !permissions.canReadStudents) return;
            const hasPerm =
                targetStatus === 'WITHDRAWN'
                    ? permissions.canCancelEnrollments
                    : permissions.canUpdateEnrollments;
            if (!hasPerm) return;
            setFeedbackState({ studentId, notice: null, error: null });
            setLifecycleDialogState({ studentId, enrollment, targetStatus });
        },
        [
            enabled,
            permissions.canCancelEnrollments,
            permissions.canReadStudents,
            permissions.canUpdateEnrollments,
            studentId,
        ]
    );

    const closeLifecycleActionDialog = useCallback(() => {
        if (isMutatingRef.current) return;
        setLifecycleDialogState({ studentId: null, enrollment: null, targetStatus: null });
    }, []);

    const openSectionTransferDialog = useCallback(
        (enrollment: StudentEnrollmentRecord) => {
            if (
                !enabled ||
                !studentId ||
                !permissions.canReadStudents ||
                !permissions.canUpdateEnrollments ||
                !permissions.canReadSections
            ) {
                return;
            }
            setFeedbackState({ studentId, notice: null, error: null });
            setTransferDialogState({ studentId, enrollment });
        },
        [
            enabled,
            permissions.canReadSections,
            permissions.canReadStudents,
            permissions.canUpdateEnrollments,
            studentId,
        ]
    );

    const closeSectionTransferDialog = useCallback(() => {
        if (isMutatingRef.current) return;
        setTransferDialogState({ studentId: null, enrollment: null });
    }, []);

    const toggleEnrollmentHistory = useCallback(
        (enrollmentId: string) => {
            if (
                !enabled ||
                !studentId ||
                !permissions.canReadStudents ||
                !permissions.canReadEnrollments
            ) {
                return;
            }
            setHistoryDialogState((prev) =>
                prev.studentId === studentId && prev.enrollmentId === enrollmentId
                    ? { studentId: null, enrollmentId: null }
                    : { studentId, enrollmentId }
            );
        },
        [enabled, permissions.canReadEnrollments, permissions.canReadStudents, studentId]
    );

    const openProgramChangeRequestDialog = useCallback(
        (sourceEnrollment: StudentEnrollmentRecord) => {
            if (
                !enabled ||
                !studentId ||
                !permissions.canReadStudents ||
                !permissions.canUpdateEnrollments ||
                !permissions.canReadPrograms ||
                !studentEligibility.allowed
            ) {
                return;
            }
            setFeedbackState({ studentId, notice: null, error: null });
            setProgramChangeDialogState({
                studentId,
                sourceEnrollment,
                targetClassIdForSections: null,
            });
        },
        [
            enabled,
            permissions.canReadPrograms,
            permissions.canReadStudents,
            permissions.canUpdateEnrollments,
            studentEligibility.allowed,
            studentId,
        ]
    );

    const closeProgramChangeRequestDialog = useCallback(() => {
        if (isMutatingRef.current) return;
        setProgramChangeDialogState({
            studentId: null,
            sourceEnrollment: null,
            targetClassIdForSections: null,
        });
    }, []);

    const setTargetClassIdForProgramChange = useCallback(
        (nextClassId: string | null) => {
            if (!studentId) return;
            setProgramChangeDialogState((prev) => ({
                ...prev,
                studentId,
                targetClassIdForSections: nextClassId,
            }));
        },
        [studentId]
    );

    const setActiveCreationType = useCallback(
        (nextType: '' | EnrollmentType) => {
            if (!studentId) return;
            setDialogState((prev) => ({
                ...prev,
                studentId,
                creationType: nextType,
                classIdForSections: null,
            }));
        },
        [studentId]
    );

    const setSelectedClassIdForSections = useCallback(
        (nextClassId: string | null) => {
            if (!studentId) return;
            setDialogState((prev) => ({
                ...prev,
                studentId,
                classIdForSections: nextClassId,
            }));
        },
        [studentId]
    );

    const openCreateEnrollmentDialog = useCallback(() => {
        if (
            !enabled ||
            !studentId ||
            !permissions.canReadStudents ||
            !permissions.canCreateEnrollments ||
            !studentEligibility.allowed
        ) {
            return;
        }
        setFeedbackState({ studentId, notice: null, error: null });
        setDialogState({
            studentId,
            open: true,
            creationType: '',
            classIdForSections: null,
        });
    }, [
        enabled,
        permissions.canCreateEnrollments,
        permissions.canReadStudents,
        studentEligibility.allowed,
        studentId,
    ]);

    const closeCreateEnrollmentDialog = useCallback(() => {
        if (isMutatingRef.current) return;
        setDialogState({
            studentId: null,
            open: false,
            creationType: '',
            classIdForSections: null,
        });
    }, []);

    const runEnrollmentMutation = useCallback(
        async (
            hasRequiredPermission: boolean,
            permissionLabel: string,
            requireStudentEligible: boolean,
            task: () => Promise<{
                enrollment?: StudentEnrollmentRecord;
                programChangeRequest?: ProgramChangeRequestRecord;
                message: string;
            }>
        ): Promise<EnrollmentMutationOutcome> => {
            if (!enabled || !tenantId || !actor || !student) {
                const msg = 'Verified school session and student target are required.';
                setFeedbackState({
                    studentId: student?.id ?? null,
                    notice: null,
                    error: { message: msg, isBackendUnavailable: false },
                });
                return {
                    ok: false,
                    errorMessage: msg,
                    isBackendUnavailable: false,
                    error: null,
                };
            }
            if (!permissions.canReadStudents || !hasRequiredPermission) {
                const msg = `Access Denied: This operation requires ${PERMISSIONS.STUDENTS.READ} and ${permissionLabel}.`;
                setFeedbackState({
                    studentId: student.id,
                    notice: null,
                    error: { message: msg, isBackendUnavailable: false },
                });
                return {
                    ok: false,
                    errorMessage: msg,
                    isBackendUnavailable: false,
                    error: null,
                };
            }
            if (requireStudentEligible) {
                const eligibility = isStudentEligibleForEnrollment(student);
                if (!eligibility.allowed) {
                    const msg =
                        eligibility.reason ?? 'Target student is not eligible for this action.';
                    setFeedbackState({
                        studentId: student.id,
                        notice: null,
                        error: { message: msg, isBackendUnavailable: false },
                    });
                    return {
                        ok: false,
                        errorMessage: msg,
                        isBackendUnavailable: false,
                        error: null,
                    };
                }
            }
            if (isMutatingRef.current) {
                const msg = 'Another enrollment operation is currently in progress.';
                return {
                    ok: false,
                    errorMessage: msg,
                    isBackendUnavailable: false,
                    error: null,
                };
            }

            isMutatingRef.current = true;
            setIsMutatingEnrollment(true);
            setFeedbackState({ studentId: student.id, notice: null, error: null });

            try {
                const result = await task();
                setFeedbackState({
                    studentId: student.id,
                    notice: result.message,
                    error: null,
                });
                if (permissions.canReadEnrollments) {
                    reloadEnrollments();
                    if (
                        result.enrollment &&
                        inspectedHistoryEnrollmentId === result.enrollment.id
                    ) {
                        reloadHistory();
                    }
                    if (result.programChangeRequest) {
                        reloadProgramChanges();
                    }
                }
                if (result.programChangeRequest) {
                    onProgramChangeCreated?.();
                }
                return {
                    ok: true,
                    errorMessage: null,
                    isBackendUnavailable: false,
                    error: null,
                    ...(result.enrollment ? { enrollment: result.enrollment } : {}),
                    ...(result.programChangeRequest
                        ? { programChangeRequest: result.programChangeRequest }
                        : {}),
                };
            } catch (error: unknown) {
                const mapped = toFetchError(error, 'Enrollment operation failed.');
                setFeedbackState({
                    studentId: student.id,
                    notice: null,
                    error: mapped,
                });
                return {
                    ok: false,
                    errorMessage: mapped.message,
                    isBackendUnavailable: mapped.isBackendUnavailable,
                    error,
                };
            } finally {
                isMutatingRef.current = false;
                setIsMutatingEnrollment(false);
            }
        },
        [
            actor,
            enabled,
            inspectedHistoryEnrollmentId,
            onProgramChangeCreated,
            permissions.canReadEnrollments,
            permissions.canReadStudents,
            reloadEnrollments,
            reloadHistory,
            reloadProgramChanges,
            student,
            tenantId,
        ]
    );

    const submitProgramEnrollment = useCallback(
        (
            request: CreateProgramEnrollmentRequest,
            context: {
                program: Program;
                academicYear?: AcademicYear | null;
                section?: AcademicSection | null;
            }
        ) =>
            runEnrollmentMutation(
                permissions.canCreateEnrollments,
                PERMISSIONS.ENROLLMENTS.CREATE,
                true,
                async () => {
                    if (!student) {
                        throw new ApiError('Target student is required.', 400);
                    }
                    const res = await createProgramEnrollment(
                        student,
                        request,
                        context,
                        tenantId,
                        actor
                    );
                    return {
                        enrollment: res.enrollment,
                        message:
                            res.message ??
                            `Enrolled student in ${context.program.name} (${res.enrollment.status}).`,
                    };
                }
            ),
        [actor, permissions.canCreateEnrollments, runEnrollmentMutation, student, tenantId]
    );

    const submitStandaloneCourseEnrollment = useCallback(
        (
            request: CreateStandaloneCourseEnrollmentRequest,
            context: {
                course: Course;
            }
        ) =>
            runEnrollmentMutation(
                permissions.canCreateEnrollments,
                PERMISSIONS.ENROLLMENTS.CREATE,
                true,
                async () => {
                    if (!student) {
                        throw new ApiError('Target student is required.', 400);
                    }
                    const res = await createStandaloneCourseEnrollment(
                        student,
                        request,
                        context,
                        tenantId,
                        actor
                    );
                    return {
                        enrollment: res.enrollment,
                        message:
                            res.message ??
                            `Enrolled student in standalone course ${context.course.title} (${res.enrollment.status}).`,
                    };
                }
            ),
        [actor, permissions.canCreateEnrollments, runEnrollmentMutation, student, tenantId]
    );

    const submitEnrollmentStatusUpdate = useCallback(
        (
            enrollment: StudentEnrollmentRecord,
            targetStatus: EnrollmentTransitionTargetStatus,
            rawReason: string
        ) => {
            const isWithdraw = targetStatus === 'WITHDRAWN';
            const hasPerm = isWithdraw
                ? permissions.canCancelEnrollments
                : permissions.canUpdateEnrollments;
            const permLabel = isWithdraw
                ? PERMISSIONS.ENROLLMENTS.CANCEL
                : PERMISSIONS.ENROLLMENTS.UPDATE;

            return runEnrollmentMutation(
                hasPerm,
                permLabel,
                targetStatus === 'ACTIVE',
                async () => {
                    if (!student) {
                        throw new ApiError('Target student is required.', 400);
                    }
                    const matchedYear = enrollment.academicYearId
                        ? academicYearsById.get(enrollment.academicYearId) ?? null
                        : null;
                    const trimmed = rawReason.trim();
                    const res = await updateEnrollmentStatus(
                        student,
                        enrollment,
                        {
                            targetStatus,
                            reason: trimmed === '' ? null : trimmed,
                        },
                        {
                            existingEnrollments: effectiveEnrollments,
                            academicYear: matchedYear,
                        },
                        tenantId,
                        actor
                    );
                    return {
                        enrollment: res.enrollment,
                        message:
                            res.message ??
                            `Enrollment status updated to ${formatEnrollmentStatusLabel(
                                res.enrollment.status
                            )}.`,
                    };
                }
            );
        },
        [
            academicYearsById,
            actor,
            effectiveEnrollments,
            permissions.canCancelEnrollments,
            permissions.canUpdateEnrollments,
            runEnrollmentMutation,
            student,
            tenantId,
        ]
    );

    const submitSectionTransfer = useCallback(
        (
            enrollment: StudentEnrollmentRecord,
            request: SectionTransferRequest,
            targetSection: AcademicSection
        ) =>
            runEnrollmentMutation(
                permissions.canUpdateEnrollments && permissions.canReadSections,
                `${PERMISSIONS.ENROLLMENTS.UPDATE} and ${PERMISSIONS.SECTIONS.READ}`,
                true,
                async () => {
                    if (!student) {
                        throw new ApiError('Target student is required.', 400);
                    }
                    const matchedYear = enrollment.academicYearId
                        ? academicYearsById.get(enrollment.academicYearId) ?? null
                        : null;
                    const res = await transferEnrollmentSection(
                        student,
                        enrollment,
                        request,
                        {
                            targetSection,
                            academicYear: matchedYear,
                        },
                        tenantId,
                        actor
                    );
                    return {
                        enrollment: res.enrollment,
                        message:
                            res.message ??
                            `Transferred section to ${
                                res.transfer.toSectionName ?? targetSection.name
                            }.`,
                    };
                }
            ),
        [
            academicYearsById,
            actor,
            permissions.canReadSections,
            permissions.canUpdateEnrollments,
            runEnrollmentMutation,
            student,
            tenantId,
        ]
    );

    const submitProgramChangeRequest = useCallback(
        (
            sourceEnrollment: StudentEnrollmentRecord,
            request: CreateProgramChangeRequestDto,
            context: {
                targetProgram: Program;
                targetSection?: AcademicSection | null;
            }
        ) =>
            runEnrollmentMutation(
                permissions.canUpdateEnrollments && permissions.canReadPrograms,
                `${PERMISSIONS.ENROLLMENTS.UPDATE} and ${PERMISSIONS.PROGRAMS.READ}`,
                true,
                async () => {
                    if (!student) {
                        throw new ApiError('Target student is required.', 400);
                    }
                    const matchedYear = sourceEnrollment.academicYearId
                        ? academicYearsById.get(sourceEnrollment.academicYearId) ?? null
                        : null;
                    const res = await createProgramChangeRequest(
                        student,
                        sourceEnrollment,
                        request,
                        {
                            targetProgram: context.targetProgram,
                            targetSection: context.targetSection,
                            academicYear: matchedYear,
                            existingRequests: effectiveProgramChangeRequests,
                        },
                        tenantId,
                        actor
                    );
                    return {
                        programChangeRequest: res.request,
                        message:
                            res.message ??
                            `Program Change Request submitted for ${context.targetProgram.name} (Pending Approval). Existing enrollment remains ACTIVE.`,
                    };
                }
            ),
        [
            academicYearsById,
            actor,
            effectiveProgramChangeRequests,
            permissions.canReadPrograms,
            permissions.canUpdateEnrollments,
            runEnrollmentMutation,
            student,
            tenantId,
        ]
    );

    return {
        studentEligibility,
        enrollments: effectiveEnrollments,
        groupedEnrollments,
        enrollmentsLoaded,
        isLoadingEnrollments,
        enrollmentsError,
        reloadEnrollments,
        reloadAllStudentEnrollmentData,
        academicYearsById,

        createDialogOpen,
        openCreateEnrollmentDialog,
        closeCreateEnrollmentDialog,
        activeCreationType,
        setActiveCreationType,
        selectedClassIdForSections,
        setSelectedClassIdForSections,

        lifecycleDialogTarget,
        openLifecycleActionDialog,
        closeLifecycleActionDialog,

        transferDialogEnrollment,
        openSectionTransferDialog,
        closeSectionTransferDialog,

        inspectedHistoryEnrollmentId,
        enrollmentHistory: effectiveHistory,
        isLoadingHistory,
        historyError,
        reloadHistory,
        toggleEnrollmentHistory,

        programChangeRequests: effectiveProgramChangeRequests,
        isLoadingProgramChanges,
        programChangesError,
        reloadProgramChanges,
        programChangeDialogSource,
        openProgramChangeRequestDialog,
        closeProgramChangeRequestDialog,
        setTargetClassIdForProgramChange,

        programs: effectivePrograms,
        isLoadingPrograms,
        programsError,
        reloadProgramsLookup,

        standaloneCourses: effectiveStandaloneCourses,
        isLoadingCourses,
        coursesError,
        reloadCoursesLookup,

        academicYears: effectiveAcademicYears,
        isLoadingYears,
        yearsError,
        reloadYearsLookup,

        classSections: effectiveClassSections,
        isLoadingSections,
        sectionsError,
        reloadSectionsLookup,

        isMutatingEnrollment,
        enrollmentNotice,
        enrollmentActionError,
        clearEnrollmentFeedback,
        submitProgramEnrollment,
        submitStandaloneCourseEnrollment,
        submitEnrollmentStatusUpdate,
        submitSectionTransfer,
        submitProgramChangeRequest,
    };
}

