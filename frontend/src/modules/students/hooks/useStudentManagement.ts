import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { ApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import type { AuthenticatedUser } from '../../../types/auth';
import {
    evaluateRegistrationDecisionEligibility,
    evaluateStudentStatusToggleEligibility,
    toStudentProfileFormValues,
    validateStudentActionReason,
} from '../schemas/student-management-schema';
import {
    createStudent,
    formatStudentOperationError,
    getStudentById,
    isStudentBackendUnavailableError,
    listStudents,
    submitStudentRegistrationDecision,
    updateStudentAccountStatus,
    updateStudentProfile,
} from '../services/student-management-service';
import type {
    CreateStudentRequest,
    StudentAccountStatusFilter,
    StudentDetailRecord,
    StudentDirectoryItem,
    StudentProfileFormValues,
    UpdateStudentProfileRequest,
} from '../types/student-management.types';

export interface StudentManagementPermissions {
    canReadStudents: boolean;
    canCreateStudents: boolean;
    canUpdateStudents: boolean;
    canApproveStudents: boolean;
    canDisableStudents: boolean;
}

export interface StudentFetchError {
    message: string;
    isBackendUnavailable: boolean;
}

export interface StudentSubmitOutcome {
    ok: boolean;
    errorMessage: string | null;
    isBackendUnavailable: boolean;
    error: unknown;
}

export interface StudentDirectoryQueryState {
    page: number;
    limit: number;
    search: string;
    status: StudentAccountStatusFilter;
}

export interface StudentApprovalsQueryState {
    page: number;
    limit: number;
    search: string;
}

const DEFAULT_DIRECTORY_QUERY: StudentDirectoryQueryState = {
    page: 1,
    limit: 10,
    search: '',
    status: 'ALL',
};

const DEFAULT_APPROVALS_QUERY: StudentApprovalsQueryState = {
    page: 1,
    limit: 10,
    search: '',
};

function toFetchError(error: unknown, fallback: string): StudentFetchError {
    return {
        message: formatStudentOperationError(error, fallback),
        isBackendUnavailable: isStudentBackendUnavailableError(error),
    };
}

export function useStudentManagement(options: {
    actor: AuthenticatedUser | null;
    tenantId: string | null;
    enabled: boolean;
    permissions: StudentManagementPermissions;
}) {
    const { actor, tenantId, enabled, permissions } = options;

    const [directoryQuery, setDirectoryQuery] = useState<StudentDirectoryQueryState>(
        DEFAULT_DIRECTORY_QUERY
    );
    const [approvalsQuery, setApprovalsQuery] = useState<StudentApprovalsQueryState>(
        DEFAULT_APPROVALS_QUERY
    );
    const [reloadCounter, setReloadCounter] = useState(0);

    // Full Directory State (`students.read`)
    const [students, setStudents] = useState<StudentDirectoryItem[]>([]);
    const [directoryPagination, setDirectoryPagination] = useState<PaginationMeta | null>(null);
    const [directoryError, setDirectoryError] = useState<StudentFetchError | null>(null);
    const [settledDirectoryKey, setSettledDirectoryKey] = useState<string | null>(null);

    // Pending Registration Approval Queue (`students.read` or `students.approve`)
    const [pendingStudents, setPendingStudents] = useState<StudentDirectoryItem[]>([]);
    const [approvalsPagination, setApprovalsPagination] = useState<PaginationMeta | null>(null);
    const [approvalsError, setApprovalsError] = useState<StudentFetchError | null>(null);
    const [settledApprovalsKey, setSettledApprovalsKey] = useState<string | null>(null);

    // Selected Detail Inspection & Profile State
    const [selectedSummary, setSelectedSummary] = useState<StudentDirectoryItem | null>(null);
    const [detailRecord, setDetailRecord] = useState<StudentDetailRecord | null>(null);
    const [hasVerifiedProfile, setHasVerifiedProfile] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState<StudentFetchError | null>(null);

    // Mutations
    const [isMutating, setIsMutating] = useState(false);
    const [pageNotice, setPageNotice] = useState<string | null>(null);
    const [pageError, setPageError] = useState<StudentFetchError | null>(null);

    const directoryVersionRef = useRef(0);
    const approvalsVersionRef = useRef(0);
    const detailAbortRef = useRef<AbortController | null>(null);
    const detailSeqRef = useRef(0);
    const isMutatingRef = useRef(false);

    const directoryLoadKey =
        enabled && tenantId && actor && permissions.canReadStudents
            ? JSON.stringify({
                  scope: 'directory',
                  tenantId,
                  reloadCounter,
                  page: directoryQuery.page,
                  limit: directoryQuery.limit,
                  search: directoryQuery.search.trim(),
                  status: directoryQuery.status,
              })
            : null;

    useEffect(() => {
        if (!directoryLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++directoryVersionRef.current;

        listStudents(
            {
                page: directoryQuery.page,
                limit: directoryQuery.limit,
                ...(directoryQuery.search.trim() !== ''
                    ? { search: directoryQuery.search.trim() }
                    : {}),
                ...(directoryQuery.status !== 'ALL' ? { status: directoryQuery.status } : {}),
            },
            tenantId,
            actor,
            controller.signal
        )
            .then((res) => {
                if (version !== directoryVersionRef.current) return;
                setStudents(res.items);
                setDirectoryPagination(res.pagination);
                setDirectoryError(null);
                setSettledDirectoryKey(directoryLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== directoryVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setStudents([]);
                setDirectoryPagination(null);
                setDirectoryError(toFetchError(error, 'Unable to load student directory.'));
                setSettledDirectoryKey(directoryLoadKey);
            });

        return () => controller.abort();
    }, [actor, directoryLoadKey, directoryQuery, tenantId]);

    const canAccessApprovalsQueue =
        permissions.canReadStudents || permissions.canApproveStudents;
    const approvalsLoadKey =
        enabled && tenantId && actor && canAccessApprovalsQueue
            ? JSON.stringify({
                  scope: 'approvals',
                  tenantId,
                  reloadCounter,
                  page: approvalsQuery.page,
                  limit: approvalsQuery.limit,
                  search: approvalsQuery.search.trim(),
              })
            : null;

    useEffect(() => {
        if (!approvalsLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++approvalsVersionRef.current;

        listStudents(
            {
                page: approvalsQuery.page,
                limit: approvalsQuery.limit,
                status: 'PENDING_APPROVAL',
                ...(approvalsQuery.search.trim() !== ''
                    ? { search: approvalsQuery.search.trim() }
                    : {}),
            },
            tenantId,
            actor,
            controller.signal
        )
            .then((res) => {
                if (version !== approvalsVersionRef.current) return;
                setPendingStudents(res.items);
                setApprovalsPagination(res.pagination);
                setApprovalsError(null);
                setSettledApprovalsKey(approvalsLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== approvalsVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setPendingStudents([]);
                setApprovalsPagination(null);
                setApprovalsError(
                    toFetchError(error, 'Unable to load pending student registrations.')
                );
                setSettledApprovalsKey(approvalsLoadKey);
            });

        return () => controller.abort();
    }, [actor, approvalsLoadKey, approvalsQuery, tenantId]);

    const effectiveStudents = useMemo(
        () => (directoryLoadKey ? students : []),
        [directoryLoadKey, students]
    );
    const effectivePendingStudents = useMemo(
        () => (approvalsLoadKey ? pendingStudents : []),
        [approvalsLoadKey, pendingStudents]
    );

    const isLoadingDirectory = Boolean(
        directoryLoadKey && settledDirectoryKey !== directoryLoadKey
    );
    const isLoadingApprovals = Boolean(
        approvalsLoadKey && settledApprovalsKey !== approvalsLoadKey
    );

    const reloadAll = useCallback(() => {
        setReloadCounter((c) => c + 1);
    }, []);

    const fetchStudentDetail = useCallback(
        (summary: StudentDirectoryItem) => {
            if (!enabled || !tenantId || !actor) return;

            detailAbortRef.current?.abort();
            const controller = new AbortController();
            detailAbortRef.current = controller;
            const seq = ++detailSeqRef.current;

            setSelectedSummary(summary);
            setDetailRecord(null);
            setHasVerifiedProfile(false);
            setIsLoadingDetail(true);
            setDetailError(null);

            getStudentById(summary.id, tenantId, actor, controller.signal)
                .then((fresh) => {
                    if (controller.signal.aborted || seq !== detailSeqRef.current) return;
                    setDetailRecord(fresh);
                    setSelectedSummary(fresh);
                    setHasVerifiedProfile(true);
                    setDetailError(null);
                })
                .catch((error: unknown) => {
                    if (controller.signal.aborted || seq !== detailSeqRef.current) return;
                    if (error instanceof ApiError && error.isCancellation) return;
                    setDetailError(toFetchError(error, 'Unable to load full student profile.'));
                })
                .finally(() => {
                    if (seq === detailSeqRef.current) {
                        setIsLoadingDetail(false);
                    }
                });
        },
        [actor, enabled, tenantId]
    );

    const openStudentDetails = useCallback(
        (summary: StudentDirectoryItem) => {
            if (!permissions.canReadStudents) {
                if (!permissions.canApproveStudents || summary.status !== 'PENDING_APPROVAL') {
                    return;
                }
            }
            fetchStudentDetail(summary);
        },
        [fetchStudentDetail, permissions.canApproveStudents, permissions.canReadStudents]
    );

    const retrySelectedStudentDetails = useCallback(() => {
        if (!selectedSummary) return;
        fetchStudentDetail(selectedSummary);
    }, [fetchStudentDetail, selectedSummary]);

    const closeStudentDetails = useCallback(() => {
        detailAbortRef.current?.abort();
        detailSeqRef.current += 1;
        setSelectedSummary(null);
        setDetailRecord(null);
        setHasVerifiedProfile(false);
        setIsLoadingDetail(false);
        setDetailError(null);
    }, []);

    useEffect(() => {
        return () => {
            detailAbortRef.current?.abort();
        };
    }, []);

    const runMutation = useCallback(
        async (
            hasPerm: boolean,
            permissionName: string,
            task: () => Promise<string>
        ): Promise<StudentSubmitOutcome> => {
            if (!enabled || !tenantId || !actor) {
                const msg = 'Verified school session is required.';
                setPageError({ message: msg, isBackendUnavailable: false });
                return { ok: false, errorMessage: msg, isBackendUnavailable: false, error: null };
            }
            if (!hasPerm) {
                const msg = `Access Denied: Requires ${permissionName} permission.`;
                setPageError({ message: msg, isBackendUnavailable: false });
                return { ok: false, errorMessage: msg, isBackendUnavailable: false, error: null };
            }
            if (isMutatingRef.current) {
                const msg = 'Another student management operation is currently in progress.';
                return { ok: false, errorMessage: msg, isBackendUnavailable: false, error: null };
            }

            isMutatingRef.current = true;
            setIsMutating(true);
            setPageNotice(null);
            setPageError(null);

            try {
                const message = await task();
                setPageNotice(message);
                return { ok: true, errorMessage: null, isBackendUnavailable: false, error: null };
            } catch (error: unknown) {
                const mapped = toFetchError(error, 'Student operation failed.');
                setPageError(mapped);
                return {
                    ok: false,
                    errorMessage: mapped.message,
                    isBackendUnavailable: mapped.isBackendUnavailable,
                    error,
                };
            } finally {
                isMutatingRef.current = false;
                setIsMutating(false);
            }
        },
        [actor, enabled, tenantId]
    );

    const createStudentAccount = useCallback(
        (payload: CreateStudentRequest) =>
            runMutation(permissions.canCreateStudents, PERMISSIONS.STUDENTS.CREATE, async () => {
                const res = await createStudent(payload, tenantId, actor);
                reloadAll();
                return (
                    res.message ??
                    `Student record created in Pending Activation and activation email queued for ${res.student.email}.`
                );
            }),
        [actor, permissions.canCreateStudents, reloadAll, runMutation, tenantId]
    );

    const saveStudentProfile = useCallback(
        (studentId: string, payload: UpdateStudentProfileRequest) =>
            runMutation(permissions.canUpdateStudents, PERMISSIONS.STUDENTS.UPDATE, async () => {
                const res = await updateStudentProfile(studentId, payload, tenantId, actor);
                setDetailRecord(res.student);
                setSelectedSummary(res.student);
                setHasVerifiedProfile(true);
                reloadAll();
                return (
                    res.message ??
                    `Updated profile details for ${res.student.firstName} ${res.student.lastName}.`
                );
            }),
        [actor, permissions.canUpdateStudents, reloadAll, runMutation, tenantId]
    );

    const decideStudentRegistration = useCallback(
        (
            student: StudentDirectoryItem,
            decision: 'APPROVE' | 'REJECT',
            rawReason?: string
        ): Promise<StudentSubmitOutcome> => {
            const eligibility = evaluateRegistrationDecisionEligibility(
                student,
                permissions.canApproveStudents
            );
            if (!eligibility.allowed) {
                const msg = eligibility.reason || 'Registration decision is not permitted.';
                setPageError({ message: msg, isBackendUnavailable: false });
                return Promise.resolve({
                    ok: false,
                    errorMessage: msg,
                    isBackendUnavailable: false,
                    error: null,
                });
            }

            const reasonCheck = validateStudentActionReason(rawReason);
            if (!reasonCheck.valid) {
                setPageError({ message: reasonCheck.error, isBackendUnavailable: false });
                return Promise.resolve({
                    ok: false,
                    errorMessage: reasonCheck.error,
                    isBackendUnavailable: false,
                    error: null,
                });
            }

            return runMutation(
                permissions.canApproveStudents,
                PERMISSIONS.STUDENTS.APPROVE,
                async () => {
                    const res = await submitStudentRegistrationDecision(
                        student.id,
                        {
                            decision,
                            ...(reasonCheck.reason ? { reason: reasonCheck.reason } : {}),
                        },
                        tenantId,
                        actor
                    );
                    if (selectedSummary?.id === student.id) {
                        if (permissions.canReadStudents) {
                            setDetailRecord(res.student);
                            setSelectedSummary(res.student);
                        } else {
                            // Approver without `students.read` cannot inspect post-approval non-pending record.
                            closeStudentDetails();
                        }
                    }
                    reloadAll();
                    return (
                        res.message ??
                        `Registration ${decision === 'APPROVE' ? 'approved' : 'rejected'} for ${res.student.firstName} ${res.student.lastName}.`
                    );
                }
            );
        },
        [
            actor,
            closeStudentDetails,
            permissions.canApproveStudents,
            permissions.canReadStudents,
            reloadAll,
            runMutation,
            selectedSummary?.id,
            tenantId,
        ]
    );

    const toggleStudentAccountStatus = useCallback(
        (
            student: StudentDirectoryItem,
            rawReason?: string
        ): Promise<StudentSubmitOutcome> => {
            const eligibility = evaluateStudentStatusToggleEligibility(
                student,
                actor?.id,
                permissions.canDisableStudents
            );
            if (!eligibility.allowed || !eligibility.nextStatus) {
                const msg = eligibility.reason || 'Account status change is not permitted.';
                setPageError({ message: msg, isBackendUnavailable: false });
                return Promise.resolve({
                    ok: false,
                    errorMessage: msg,
                    isBackendUnavailable: false,
                    error: null,
                });
            }
            const nextStatus = eligibility.nextStatus;

            const reasonCheck = validateStudentActionReason(rawReason);
            if (!reasonCheck.valid) {
                setPageError({ message: reasonCheck.error, isBackendUnavailable: false });
                return Promise.resolve({
                    ok: false,
                    errorMessage: reasonCheck.error,
                    isBackendUnavailable: false,
                    error: null,
                });
            }

            return runMutation(
                permissions.canDisableStudents,
                PERMISSIONS.STUDENTS.DISABLE,
                async () => {
                    const res = await updateStudentAccountStatus(
                        student.id,
                        {
                            status: nextStatus,
                            ...(reasonCheck.reason ? { reason: reasonCheck.reason } : {}),
                        },
                        tenantId,
                        actor
                    );
                    if (selectedSummary?.id === student.id) {
                        setDetailRecord(res.student);
                        setSelectedSummary(res.student);
                    }
                    reloadAll();
                    return (
                        res.message ??
                        `Account ${nextStatus === 'ACTIVE' ? 'reactivated' : 'suspended'} for ${res.student.firstName} ${res.student.lastName}.`
                    );
                }
            );
        },
        [
            actor,
            permissions.canDisableStudents,
            reloadAll,
            runMutation,
            selectedSummary?.id,
            tenantId,
        ]
    );

    const savedProfileValues: StudentProfileFormValues | null = useMemo(() => {
        if (!selectedSummary) return null;
        return toStudentProfileFormValues(
            detailRecord ?? selectedSummary,
            detailRecord?.profile ?? null
        );
    }, [detailRecord, selectedSummary]);

    return {
        directoryQuery,
        setDirectoryQuery,
        students: effectiveStudents,
        directoryPagination,
        isLoadingDirectory,
        directoryError,

        approvalsQuery,
        setApprovalsQuery,
        pendingStudents: effectivePendingStudents,
        approvalsPagination,
        isLoadingApprovals,
        approvalsError,

        selectedSummary,
        detailRecord,
        hasVerifiedProfile,
        savedProfileValues,
        isLoadingDetail,
        detailError,
        openStudentDetails,
        retrySelectedStudentDetails,
        closeStudentDetails,

        isMutating,
        pageNotice,
        pageError,
        clearPageFeedback: () => {
            setPageNotice(null);
            setPageError(null);
        },
        createStudentAccount,
        saveStudentProfile,
        decideStudentRegistration,
        toggleStudentAccountStatus,
        reloadAll,
    };
}

