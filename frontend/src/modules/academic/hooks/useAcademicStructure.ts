import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import {
    compareIsoDates,
    evaluateAcademicYearDeleteEligibility,
    evaluateClassDeleteEligibility,
    evaluateSectionDeleteEligibility,
    evaluateTermDeleteEligibility,
    isCalendarStatusTransitionAllowed,
} from '../schemas/academic-structure-schema';
import {
    createAcademicClass,
    createAcademicSection,
    createAcademicTerm,
    createAcademicYear,
    deleteAcademicClass,
    deleteAcademicSection,
    deleteAcademicTerm,
    deleteAcademicYear,
    isAcademicBackendUnavailableError,
    listAcademicYears,
    listClasses,
    listSections,
    listTermsByAcademicYear,
    updateAcademicClass,
    updateAcademicClassStatus,
    updateAcademicSection,
    updateAcademicSectionStatus,
    updateAcademicTerm,
    updateAcademicTermStatus,
    updateAcademicYear,
    updateAcademicYearStatus,
} from '../services/academic-structure-service';
import type {
    AcademicCalendarStatus,
    AcademicClass,
    AcademicSection,
    AcademicTerm,
    AcademicUnitStatus,
    AcademicYear,
    CreateAcademicClassRequest,
    CreateAcademicSectionRequest,
    CreateAcademicTermRequest,
    CreateAcademicYearRequest,
    UpdateAcademicTermRequest,
    UpdateAcademicYearRequest,
} from '../types/academic-structure.types';

export interface AcademicStructurePermissions {
    canReadYears: boolean;
    canCreateYears: boolean;
    canUpdateYears: boolean;
    canActivateYears: boolean;
    canDeleteYears: boolean;
    canReadTerms: boolean;
    canCreateTerms: boolean;
    canUpdateTerms: boolean;
    canActivateTerms: boolean;
    canDeleteTerms: boolean;
    canReadClasses: boolean;
    canCreateClasses: boolean;
    canUpdateClasses: boolean;
    canDeleteClasses: boolean;
    canReadSections: boolean;
    canCreateSections: boolean;
    canUpdateSections: boolean;
    canDeleteSections: boolean;
}

export interface AcademicFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export interface AcademicMutationError {
    message: string;
    isBackendUnavailable: boolean;
    error: unknown;
}

function toFetchError(error: unknown, fallbackMessage: string): AcademicFetchError {
    return {
        isBackendUnavailable: isAcademicBackendUnavailableError(error),
        message: error instanceof Error && error.message ? error.message : fallbackMessage,
    };
}

function toMutationError(error: unknown, fallbackMessage: string): AcademicMutationError {
    return {
        isBackendUnavailable: isAcademicBackendUnavailableError(error),
        message: error instanceof Error && error.message ? error.message : fallbackMessage,
        error,
    };
}

export function useAcademicStructure(options: {
    tenantId: string | null;
    enabled: boolean;
    permissions: AcademicStructurePermissions;
}) {
    const { tenantId, enabled, permissions } = options;

    // Reload counters
    const [yearsReload, setYearsReload] = useState(0);
    const [termsReload, setTermsReload] = useState(0);
    const [classesReload, setClassesReload] = useState(0);
    const [sectionsReload, setSectionsReload] = useState(0);

    // Collections & fetch states
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [yearsError, setYearsError] = useState<AcademicFetchError | null>(null);
    const [settledYearsKey, setSettledYearsKey] = useState<string | null>(null);

    const [preferredYearId, setPreferredYearId] = useState<string | null>(null);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [termsError, setTermsError] = useState<AcademicFetchError | null>(null);
    const [settledTermsKey, setSettledTermsKey] = useState<string | null>(null);

    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [classesError, setClassesError] = useState<AcademicFetchError | null>(null);
    const [settledClassesKey, setSettledClassesKey] = useState<string | null>(null);

    const [sectionClassFilter, setSectionClassFilter] = useState<string>('ALL');
    const [sections, setSections] = useState<AcademicSection[]>([]);
    const [sectionsError, setSectionsError] = useState<AcademicFetchError | null>(null);
    const [settledSectionsKey, setSettledSectionsKey] = useState<string | null>(null);

    // Mutation notice / error state
    const [isMutating, setIsMutating] = useState(false);
    const [mutationNotice, setMutationNotice] = useState<string | null>(null);
    const [mutationError, setMutationError] = useState<AcademicMutationError | null>(null);

    const yearsVersionRef = useRef(0);
    const termsVersionRef = useRef(0);
    const classesVersionRef = useRef(0);
    const sectionsVersionRef = useRef(0);
    const isMutatingRef = useRef(false);

    // Fetch Academic Years
    const yearsLoadKey =
        enabled && tenantId && permissions.canReadYears ? `${tenantId}:${yearsReload}` : null;

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
    }, [yearsLoadKey, tenantId]);

    const effectiveAcademicYears = useMemo(
        () => (enabled && permissions.canReadYears ? academicYears : []),
        [enabled, permissions.canReadYears, academicYears]
    );

    const activeAcademicYear = useMemo(
        () => effectiveAcademicYears.find((y) => y.status === 'ACTIVE') ?? null,
        [effectiveAcademicYears]
    );

    const selectedYearId = useMemo(() => {
        if (effectiveAcademicYears.length === 0) return null;
        if (preferredYearId && effectiveAcademicYears.some((y) => y.id === preferredYearId)) {
            return preferredYearId;
        }
        return activeAcademicYear?.id ?? effectiveAcademicYears[0].id;
    }, [effectiveAcademicYears, preferredYearId, activeAcademicYear]);

    const selectedAcademicYear = useMemo(
        () => effectiveAcademicYears.find((y) => y.id === selectedYearId) ?? null,
        [effectiveAcademicYears, selectedYearId]
    );

    // Fetch Terms for selected Academic Year
    const termsLoadKey =
        enabled && tenantId && permissions.canReadTerms && selectedYearId
            ? `${tenantId}:${selectedYearId}:${termsReload}`
            : null;

    useEffect(() => {
        if (!termsLoadKey || !tenantId || !selectedYearId) return;

        const controller = new AbortController();
        const version = ++termsVersionRef.current;

        listTermsByAcademicYear(selectedYearId, tenantId, controller.signal)
            .then((res) => {
                if (version !== termsVersionRef.current) return;
                setTerms(res.terms);
                setTermsError(null);
                setSettledTermsKey(termsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== termsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setTerms([]);
                setTermsError(toFetchError(error, 'Unable to load academic terms.'));
                setSettledTermsKey(termsLoadKey);
            });

        return () => controller.abort();
    }, [termsLoadKey, tenantId, selectedYearId]);

    // Fetch Classes
    const classesLoadKey =
        enabled && tenantId && permissions.canReadClasses ? `${tenantId}:${classesReload}` : null;

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
                setClassesError(toFetchError(error, 'Unable to load classes and grade levels.'));
                setSettledClassesKey(classesLoadKey);
            });

        return () => controller.abort();
    }, [classesLoadKey, tenantId]);

    const effectiveClasses = useMemo(() => {
        const list = enabled && permissions.canReadClasses ? classes : [];
        return [...list].sort((a, b) =>
            a.displayOrder !== b.displayOrder
                ? a.displayOrder - b.displayOrder
                : a.name.localeCompare(b.name)
        );
    }, [enabled, permissions.canReadClasses, classes]);

    const effectiveSectionClassFilter = useMemo(() => {
        if (sectionClassFilter === 'ALL') return 'ALL';
        if (effectiveClasses.some((cls) => cls.id === sectionClassFilter)) {
            return sectionClassFilter;
        }
        return 'ALL';
    }, [effectiveClasses, sectionClassFilter]);

    // Fetch Sections
    const sectionsLoadKey =
        enabled && tenantId && permissions.canReadSections
            ? `${tenantId}:${effectiveSectionClassFilter}:${sectionsReload}`
            : null;

    useEffect(() => {
        if (!sectionsLoadKey || !tenantId) return;

        const controller = new AbortController();
        const version = ++sectionsVersionRef.current;

        listSections({
            classId: effectiveSectionClassFilter === 'ALL' ? null : effectiveSectionClassFilter,
            expectedTenantId: tenantId,
            signal: controller.signal,
        })
            .then((res) => {
                if (version !== sectionsVersionRef.current) return;
                setSections(res.sections);
                setSectionsError(null);
                setSettledSectionsKey(sectionsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== sectionsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setSections([]);
                setSectionsError(toFetchError(error, 'Unable to load class sections.'));
                setSettledSectionsKey(sectionsLoadKey);
            });

        return () => controller.abort();
    }, [sectionsLoadKey, tenantId, effectiveSectionClassFilter]);

    const sortedAcademicYears = useMemo(
        () =>
            [...effectiveAcademicYears].sort((a, b) => {
                if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
                if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
                return compareIsoDates(b.startDate, a.startDate);
            }),
        [effectiveAcademicYears]
    );

    const sortedTerms = useMemo(() => {
        if (!enabled || !permissions.canReadTerms || !selectedYearId) return [];
        return [...terms]
            .filter((t) => t.academicYearId === selectedYearId)
            .sort((a, b) => compareIsoDates(a.startDate, b.startDate));
    }, [enabled, permissions.canReadTerms, selectedYearId, terms]);

    const effectiveSections = useMemo(
        () =>
            enabled && permissions.canReadSections
                ? [...sections].sort((a, b) => a.name.localeCompare(b.name))
                : [],
        [enabled, permissions.canReadSections, sections]
    );

    const clearFeedback = useCallback(() => {
        setMutationError(null);
        setMutationNotice(null);
    }, []);

    // Helper ensuring no two academic years remain marked ACTIVE simultaneously in client state
    const reconcileActiveYearList = useCallback(
        (updated: AcademicYear, previousActive?: AcademicYear | null) => {
            setAcademicYears((prev) => {
                const withoutUpdated = prev.filter((item) => item.id !== updated.id);
                const normalized = withoutUpdated.map((item) => {
                    if (previousActive && item.id === previousActive.id) {
                        return previousActive;
                    }
                    if (updated.status === 'ACTIVE' && item.status === 'ACTIVE') {
                        return { ...item, status: 'COMPLETED' as const };
                    }
                    return item;
                });
                return [...normalized, updated];
            });
        },
        []
    );

    // Reload triggers
    const reloadYears = useCallback(() => setYearsReload((c) => c + 1), []);
    const reloadTerms = useCallback(() => setTermsReload((c) => c + 1), []);
    const reloadClasses = useCallback(() => setClassesReload((c) => c + 1), []);
    const reloadSections = useCallback(() => setSectionsReload((c) => c + 1), []);
    const reloadAll = useCallback(() => {
        clearFeedback();
        setYearsReload((c) => c + 1);
        setTermsReload((c) => c + 1);
        setClassesReload((c) => c + 1);
        setSectionsReload((c) => c + 1);
    }, [clearFeedback]);

    // ---------- Academic Year Mutations ----------

    const saveNewAcademicYear = useCallback(
        async (request: CreateAcademicYearRequest): Promise<{ ok: boolean; error?: AcademicMutationError }> => {
            if (!enabled || !tenantId || !permissions.canCreateYears || isMutatingRef.current) {
                return { ok: false };
            }
            if (request.status === 'ACTIVE' && !permissions.canActivateYears) {
                return {
                    ok: false,
                    error: toMutationError(
                        new ApiError('Activating an academic year requires academic_years.activate.', 403),
                        'Permission denied.'
                    ),
                };
            }

            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await createAcademicYear(request, tenantId);
                reconcileActiveYearList(res.academicYear, res.previousActiveAcademicYear);
                setPreferredYearId(res.academicYear.id);
                setMutationNotice(
                    res.message || `Academic year "${res.academicYear.name}" created successfully.`
                );
                return { ok: true };
            } catch (err: unknown) {
                const formatted = toMutationError(err, 'Unable to create academic year.');
                setMutationError(formatted);
                return { ok: false, error: formatted };
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [
            enabled,
            tenantId,
            permissions.canCreateYears,
            permissions.canActivateYears,
            clearFeedback,
            reconcileActiveYearList,
        ]
    );

    const saveEditedAcademicYear = useCallback(
        async (
            yearId: string,
            request: UpdateAcademicYearRequest
        ): Promise<{ ok: boolean; error?: AcademicMutationError }> => {
            if (!enabled || !tenantId || !permissions.canUpdateYears || isMutatingRef.current) {
                return { ok: false };
            }
            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await updateAcademicYear(yearId, request, tenantId);
                reconcileActiveYearList(res.academicYear);
                setMutationNotice(
                    res.message || `Academic year "${res.academicYear.name}" updated successfully.`
                );
                return { ok: true };
            } catch (err: unknown) {
                const formatted = toMutationError(err, 'Unable to update academic year.');
                setMutationError(formatted);
                return { ok: false, error: formatted };
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canUpdateYears, clearFeedback, reconcileActiveYearList]
    );

    const changeAcademicYearStatus = useCallback(
        async (year: AcademicYear, nextStatus: AcademicCalendarStatus): Promise<boolean> => {
            if (!enabled || !tenantId || !permissions.canActivateYears || isMutatingRef.current) {
                return false;
            }
            if (!isCalendarStatusTransitionAllowed(year.status, nextStatus)) {
                setMutationError(
                    toMutationError(
                        new ApiError(`Invalid status transition from ${year.status} to ${nextStatus}.`, 400),
                        'Invalid transition.'
                    )
                );
                return false;
            }

            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await updateAcademicYearStatus(year.id, nextStatus, tenantId);
                reconcileActiveYearList(res.academicYear, res.previousActiveAcademicYear);
                reloadYears();
                setMutationNotice(
                    res.message || `Academic year "${res.academicYear.name}" marked as ${nextStatus}.`
                );
                return true;
            } catch (err: unknown) {
                setMutationError(toMutationError(err, 'Unable to change academic year status.'));
                return false;
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [
            enabled,
            tenantId,
            permissions.canActivateYears,
            clearFeedback,
            reconcileActiveYearList,
            reloadYears,
        ]
    );

    const removeAcademicYear = useCallback(
        async (year: AcademicYear): Promise<boolean> => {
            if (!enabled || !tenantId || isMutatingRef.current) return false;
            const check = evaluateAcademicYearDeleteEligibility({
                year,
                loadedTerms: terms,
                canDeletePermission: permissions.canDeleteYears,
            });
            if (!check.allowed) {
                if (check.reason) {
                    setMutationError(toMutationError(new ApiError(check.reason, 400), check.reason));
                }
                return false;
            }

            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await deleteAcademicYear(year.id);
                setAcademicYears((prev) => prev.filter((item) => item.id !== year.id));
                setMutationNotice(res.message || `Academic year "${year.name}" deleted.`);
                return true;
            } catch (err: unknown) {
                setMutationError(toMutationError(err, 'Unable to delete academic year.'));
                return false;
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canDeleteYears, terms, clearFeedback]
    );

    // ---------- Term Mutations ----------

    const saveNewTerm = useCallback(
        async (request: CreateAcademicTermRequest): Promise<{ ok: boolean; error?: AcademicMutationError }> => {
            if (!enabled || !tenantId || !permissions.canCreateTerms || isMutatingRef.current) {
                return { ok: false };
            }
            if (request.status === 'ACTIVE' && !permissions.canActivateTerms) {
                return {
                    ok: false,
                    error: toMutationError(
                        new ApiError('Activating a term requires terms.activate.', 403),
                        'Permission denied.'
                    ),
                };
            }

            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await createAcademicTerm(request, tenantId);
                setTerms((prev) => [...prev, res.term]);
                setPreferredYearId(res.term.academicYearId);
                reloadYears();
                setMutationNotice(res.message || `Term "${res.term.name}" created successfully.`);
                return { ok: true };
            } catch (err: unknown) {
                const formatted = toMutationError(err, 'Unable to create term.');
                setMutationError(formatted);
                return { ok: false, error: formatted };
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [
            enabled,
            tenantId,
            permissions.canCreateTerms,
            permissions.canActivateTerms,
            clearFeedback,
            reloadYears,
        ]
    );

    const saveEditedTerm = useCallback(
        async (
            termId: string,
            request: UpdateAcademicTermRequest
        ): Promise<{ ok: boolean; error?: AcademicMutationError }> => {
            if (!enabled || !tenantId || !permissions.canUpdateTerms || isMutatingRef.current) {
                return { ok: false };
            }
            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await updateAcademicTerm(termId, request, tenantId);
                setTerms((prev) => prev.map((item) => (item.id === termId ? res.term : item)));
                setMutationNotice(res.message || `Term "${res.term.name}" updated successfully.`);
                return { ok: true };
            } catch (err: unknown) {
                const formatted = toMutationError(err, 'Unable to update term.');
                setMutationError(formatted);
                return { ok: false, error: formatted };
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canUpdateTerms, clearFeedback]
    );

    const changeTermStatus = useCallback(
        async (term: AcademicTerm, nextStatus: AcademicCalendarStatus): Promise<boolean> => {
            if (!enabled || !tenantId || !permissions.canActivateTerms || isMutatingRef.current) {
                return false;
            }
            if (!isCalendarStatusTransitionAllowed(term.status, nextStatus)) {
                return false;
            }

            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await updateAcademicTermStatus(term.id, nextStatus, tenantId);
                setTerms((prev) => prev.map((item) => (item.id === term.id ? res.term : item)));
                reloadTerms();
                setMutationNotice(res.message || `Term "${res.term.name}" marked as ${nextStatus}.`);
                return true;
            } catch (err: unknown) {
                setMutationError(toMutationError(err, 'Unable to change term status.'));
                return false;
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canActivateTerms, clearFeedback, reloadTerms]
    );

    const removeTerm = useCallback(
        async (term: AcademicTerm): Promise<boolean> => {
            if (!enabled || !tenantId || isMutatingRef.current) return false;
            const check = evaluateTermDeleteEligibility({
                term,
                canDeletePermission: permissions.canDeleteTerms,
            });
            if (!check.allowed) {
                if (check.reason) {
                    setMutationError(toMutationError(new ApiError(check.reason, 400), check.reason));
                }
                return false;
            }

            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await deleteAcademicTerm(term.id);
                setTerms((prev) => prev.filter((item) => item.id !== term.id));
                reloadYears();
                setMutationNotice(res.message || `Term "${term.name}" deleted.`);
                return true;
            } catch (err: unknown) {
                setMutationError(toMutationError(err, 'Unable to delete term.'));
                return false;
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canDeleteTerms, clearFeedback, reloadYears]
    );

    // ---------- Class Mutations ----------

    const saveNewClass = useCallback(
        async (request: CreateAcademicClassRequest): Promise<{ ok: boolean; error?: AcademicMutationError }> => {
            if (!enabled || !tenantId || !permissions.canCreateClasses || isMutatingRef.current) {
                return { ok: false };
            }
            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await createAcademicClass(request, tenantId);
                setClasses((prev) => [...prev, res.academicClass]);
                setMutationNotice(
                    res.message || `Class / level "${res.academicClass.name}" created successfully.`
                );
                return { ok: true };
            } catch (err: unknown) {
                const formatted = toMutationError(err, 'Unable to create class.');
                setMutationError(formatted);
                return { ok: false, error: formatted };
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canCreateClasses, clearFeedback]
    );

    const saveEditedClass = useCallback(
        async (
            classId: string,
            request: CreateAcademicClassRequest
        ): Promise<{ ok: boolean; error?: AcademicMutationError }> => {
            if (!enabled || !tenantId || !permissions.canUpdateClasses || isMutatingRef.current) {
                return { ok: false };
            }
            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await updateAcademicClass(classId, request, tenantId);
                setClasses((prev) =>
                    prev.map((item) => (item.id === classId ? res.academicClass : item))
                );
                reloadSections();
                setMutationNotice(
                    res.message || `Class / level "${res.academicClass.name}" updated successfully.`
                );
                return { ok: true };
            } catch (err: unknown) {
                const formatted = toMutationError(err, 'Unable to update class.');
                setMutationError(formatted);
                return { ok: false, error: formatted };
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canUpdateClasses, clearFeedback, reloadSections]
    );

    const changeClassStatus = useCallback(
        async (academicClass: AcademicClass, nextStatus: AcademicUnitStatus): Promise<boolean> => {
            if (
                !enabled ||
                !tenantId ||
                !permissions.canUpdateClasses ||
                academicClass.status === nextStatus ||
                isMutatingRef.current
            ) {
                return false;
            }
            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await updateAcademicClassStatus(academicClass.id, nextStatus, tenantId);
                setClasses((prev) =>
                    prev.map((item) => (item.id === academicClass.id ? res.academicClass : item))
                );
                setMutationNotice(
                    res.message || `Class "${res.academicClass.name}" marked as ${nextStatus}.`
                );
                return true;
            } catch (err: unknown) {
                setMutationError(toMutationError(err, 'Unable to change class status.'));
                return false;
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canUpdateClasses, clearFeedback]
    );

    const removeClass = useCallback(
        async (academicClass: AcademicClass): Promise<boolean> => {
            if (!enabled || !tenantId || isMutatingRef.current) return false;
            const check = evaluateClassDeleteEligibility({
                academicClass,
                loadedSections: sections,
                canDeletePermission: permissions.canDeleteClasses,
            });
            if (!check.allowed) {
                if (check.reason) {
                    setMutationError(toMutationError(new ApiError(check.reason, 400), check.reason));
                }
                return false;
            }

            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await deleteAcademicClass(academicClass.id);
                setClasses((prev) => prev.filter((item) => item.id !== academicClass.id));
                setMutationNotice(res.message || `Class "${academicClass.name}" deleted.`);
                return true;
            } catch (err: unknown) {
                setMutationError(toMutationError(err, 'Unable to delete class.'));
                return false;
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canDeleteClasses, sections, clearFeedback]
    );

    // ---------- Section Mutations ----------

    const saveNewSection = useCallback(
        async (request: CreateAcademicSectionRequest): Promise<{ ok: boolean; error?: AcademicMutationError }> => {
            if (!enabled || !tenantId || !permissions.canCreateSections || isMutatingRef.current) {
                return { ok: false };
            }
            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await createAcademicSection(request, tenantId);
                setSections((prev) => [...prev, res.section]);
                reloadClasses();
                setMutationNotice(res.message || `Section "${res.section.name}" created successfully.`);
                return { ok: true };
            } catch (err: unknown) {
                const formatted = toMutationError(err, 'Unable to create section.');
                setMutationError(formatted);
                return { ok: false, error: formatted };
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canCreateSections, clearFeedback, reloadClasses]
    );

    const saveEditedSection = useCallback(
        async (
            sectionId: string,
            request: CreateAcademicSectionRequest
        ): Promise<{ ok: boolean; error?: AcademicMutationError }> => {
            if (!enabled || !tenantId || !permissions.canUpdateSections || isMutatingRef.current) {
                return { ok: false };
            }
            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await updateAcademicSection(sectionId, request, tenantId);
                setSections((prev) =>
                    prev.map((item) => (item.id === sectionId ? res.section : item))
                );
                reloadClasses();
                setMutationNotice(res.message || `Section "${res.section.name}" updated successfully.`);
                return { ok: true };
            } catch (err: unknown) {
                const formatted = toMutationError(err, 'Unable to update section.');
                setMutationError(formatted);
                return { ok: false, error: formatted };
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canUpdateSections, clearFeedback, reloadClasses]
    );

    const changeSectionStatus = useCallback(
        async (section: AcademicSection, nextStatus: AcademicUnitStatus): Promise<boolean> => {
            if (
                !enabled ||
                !tenantId ||
                !permissions.canUpdateSections ||
                section.status === nextStatus ||
                isMutatingRef.current
            ) {
                return false;
            }
            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await updateAcademicSectionStatus(section.id, nextStatus, tenantId);
                setSections((prev) =>
                    prev.map((item) => (item.id === section.id ? res.section : item))
                );
                setMutationNotice(
                    res.message || `Section "${res.section.name}" marked as ${nextStatus}.`
                );
                return true;
            } catch (err: unknown) {
                setMutationError(toMutationError(err, 'Unable to change section status.'));
                return false;
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canUpdateSections, clearFeedback]
    );

    const removeSection = useCallback(
        async (section: AcademicSection): Promise<boolean> => {
            if (!enabled || !tenantId || isMutatingRef.current) return false;
            const check = evaluateSectionDeleteEligibility({
                section,
                canDeletePermission: permissions.canDeleteSections,
            });
            if (!check.allowed) {
                if (check.reason) {
                    setMutationError(toMutationError(new ApiError(check.reason, 400), check.reason));
                }
                return false;
            }

            clearFeedback();
            isMutatingRef.current = true;
            setIsMutating(true);
            try {
                const res = await deleteAcademicSection(section.id);
                setSections((prev) => prev.filter((item) => item.id !== section.id));
                reloadClasses();
                setMutationNotice(res.message || `Section "${section.name}" deleted.`);
                return true;
            } catch (err: unknown) {
                setMutationError(toMutationError(err, 'Unable to delete section.'));
                return false;
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [enabled, tenantId, permissions.canDeleteSections, clearFeedback, reloadClasses]
    );

    return {
        academicYears: sortedAcademicYears,
        activeAcademicYear,
        selectedYearId,
        selectedAcademicYear,
        setSelectedYearId: setPreferredYearId,
        isLoadingYears: Boolean(yearsLoadKey) && settledYearsKey !== yearsLoadKey,
        yearsError: enabled && permissions.canReadYears ? yearsError : null,
        reloadYears,

        terms: sortedTerms,
        isLoadingTerms: Boolean(termsLoadKey) && settledTermsKey !== termsLoadKey,
        termsError: enabled && permissions.canReadTerms ? termsError : null,
        reloadTerms,

        classes: effectiveClasses,
        isLoadingClasses: Boolean(classesLoadKey) && settledClassesKey !== classesLoadKey,
        classesError: enabled && permissions.canReadClasses ? classesError : null,
        reloadClasses,

        sections: effectiveSections,
        sectionClassFilter: effectiveSectionClassFilter,
        setSectionClassFilter,
        isLoadingSections: Boolean(sectionsLoadKey) && settledSectionsKey !== sectionsLoadKey,
        sectionsError: enabled && permissions.canReadSections ? sectionsError : null,
        reloadSections,

        isMutating,
        mutationNotice,
        mutationError,
        clearFeedback,

        saveNewAcademicYear,
        saveEditedAcademicYear,
        changeAcademicYearStatus,
        removeAcademicYear,

        saveNewTerm,
        saveEditedTerm,
        changeTermStatus,
        removeTerm,

        saveNewClass,
        saveEditedClass,
        changeClassStatus,
        removeClass,

        saveNewSection,
        saveEditedSection,
        changeSectionStatus,
        removeSection,

        reloadAll,
    };
}

