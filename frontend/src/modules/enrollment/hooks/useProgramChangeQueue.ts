import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import { ApiError } from '../../../services/api/api-error';
import type { PaginationMeta } from '../../../types/api.types';
import type { AuthenticatedUser } from '../../../types/auth';
import { evaluateProgramChangeDecisionEligibility } from '../schemas/enrollment-schema';
import {
    decideProgramChangeRequest,
    formatEnrollmentOperationError,
    isEnrollmentBackendUnavailableError,
    listPendingProgramChangeQueue,
} from '../services/enrollment-service';
import type {
    ProgramChangeDecisionRequest,
    ProgramChangeRequestRecord,
    ProgramChangeRequestStatus,
} from '../types/enrollment.types';
import type { EnrollmentFetchError } from './useStudentEnrollments';

export interface ProgramChangeQueueQueryState {
    page: number;
    limit: number;
    search: string;
    status: 'ALL' | ProgramChangeRequestStatus;
}

export interface ProgramChangeDecisionOutcome {
    ok: boolean;
    errorMessage: string | null;
    isBackendUnavailable: boolean;
    error: unknown;
    request?: ProgramChangeRequestRecord;
}

const DEFAULT_QUEUE_QUERY: ProgramChangeQueueQueryState = {
    page: 1,
    limit: 10,
    search: '',
    status: 'PENDING',
};

function toFetchError(error: unknown, fallback: string): EnrollmentFetchError {
    return {
        message: formatEnrollmentOperationError(error, fallback),
        isBackendUnavailable: isEnrollmentBackendUnavailableError(error),
    };
}

/**
 * Cross-student Grade-Based Program Change Approval Queue hook inside `/admin/students`.
 * Strictly requires `enrollments.approve_program_change` and never depends on
 * `students.read`, `enrollments.read`, `students.approve`, or `enrollments.update`.
 */
export function useProgramChangeQueue(options: {
    actor: AuthenticatedUser | null;
    tenantId: string | null;
    enabled: boolean;
    canApproveProgramChange: boolean;
    onDecisionCompleted?: (studentId: string) => void;
}) {
    const { actor, tenantId, enabled, canApproveProgramChange, onDecisionCompleted } = options;

    const [queueQuery, setQueueQuery] = useState<ProgramChangeQueueQueryState>(
        DEFAULT_QUEUE_QUERY
    );
    const [queueReload, setQueueReload] = useState(0);
    const [queueItems, setQueueItems] = useState<ProgramChangeRequestRecord[]>([]);
    const [queuePagination, setQueuePagination] = useState<PaginationMeta | null>(null);
    const [queueError, setQueueError] = useState<EnrollmentFetchError | null>(null);
    const [settledQueueKey, setSettledQueueKey] = useState<string | null>(null);

    const [reviewTarget, setReviewTarget] = useState<ProgramChangeRequestRecord | null>(null);
    const [isDeciding, setIsDeciding] = useState(false);
    const [queueNotice, setQueueNotice] = useState<string | null>(null);
    const [queueActionError, setQueueActionError] = useState<EnrollmentFetchError | null>(null);

    const queueVersionRef = useRef(0);
    const isDecidingRef = useRef(false);

    const queueLoadKey =
        enabled && tenantId && actor && canApproveProgramChange
            ? JSON.stringify({
                  scope: 'program-change-queue',
                  tenantId,
                  reload: queueReload,
                  page: queueQuery.page,
                  limit: queueQuery.limit,
                  search: queueQuery.search.trim(),
                  status: queueQuery.status,
              })
            : null;

    useEffect(() => {
        if (!queueLoadKey || !tenantId || !actor) return;

        const controller = new AbortController();
        const version = ++queueVersionRef.current;

        listPendingProgramChangeQueue(
            {
                page: queueQuery.page,
                limit: queueQuery.limit,
                status: queueQuery.status,
                ...(queueQuery.search.trim() !== ''
                    ? { search: queueQuery.search.trim() }
                    : {}),
            },
            tenantId,
            actor,
            controller.signal
        )
            .then((res) => {
                if (version !== queueVersionRef.current) return;
                setQueueItems(res.items);
                setQueuePagination(res.pagination ?? null);
                setQueueError(null);
                setSettledQueueKey(queueLoadKey);
            })
            .catch((error: unknown) => {
                if (version !== queueVersionRef.current) return;
                if (error instanceof ApiError && error.isCancellation) return;
                setQueueItems([]);
                setQueuePagination(null);
                setQueueError(
                    toFetchError(error, 'Unable to load Program Change approval queue.')
                );
                setSettledQueueKey(queueLoadKey);
            });

        return () => controller.abort();
    }, [actor, queueLoadKey, queueQuery, tenantId]);

    const effectiveQueueItems = useMemo(
        () => (queueLoadKey && settledQueueKey === queueLoadKey ? queueItems : []),
        [queueItems, queueLoadKey, settledQueueKey]
    );
    const effectiveQueuePagination = useMemo(
        () => (queueLoadKey && settledQueueKey === queueLoadKey ? queuePagination : null),
        [queueLoadKey, queuePagination, settledQueueKey]
    );
    const isLoadingQueue = Boolean(queueLoadKey && settledQueueKey !== queueLoadKey);

    const pendingCount = useMemo(() => {
        if (!queueLoadKey || settledQueueKey !== queueLoadKey) return undefined;
        if (queueQuery.status === 'PENDING' && queuePagination) {
            return queuePagination.total;
        }
        return undefined;
    }, [queueLoadKey, queuePagination, queueQuery.status, settledQueueKey]);

    const reloadQueue = useCallback(() => {
        setQueueReload((c) => c + 1);
    }, []);

    const clearQueueFeedback = useCallback(() => {
        setQueueNotice(null);
        setQueueActionError(null);
    }, []);

    const openReviewModal = useCallback(
        (request: ProgramChangeRequestRecord) => {
            if (!enabled || !canApproveProgramChange) return;
            setQueueActionError(null);
            setReviewTarget(request);
        },
        [canApproveProgramChange, enabled]
    );

    const closeReviewModal = useCallback(() => {
        if (isDecidingRef.current) return;
        setReviewTarget(null);
    }, []);

    const submitProgramChangeDecision = useCallback(
        async (
            requestRecord: ProgramChangeRequestRecord,
            decisionPayload: ProgramChangeDecisionRequest
        ): Promise<ProgramChangeDecisionOutcome> => {
            if (!enabled || !tenantId || !actor) {
                const msg = 'Verified school session is required.';
                const err = { message: msg, isBackendUnavailable: false };
                setQueueActionError(err);
                return { ok: false, errorMessage: msg, isBackendUnavailable: false, error: null };
            }
            if (!canApproveProgramChange) {
                const msg = `Access Denied: Reviewing Program Changes requires ${PERMISSIONS.ENROLLMENTS.APPROVE_PROGRAM_CHANGE}.`;
                const err = { message: msg, isBackendUnavailable: false };
                setQueueActionError(err);
                return { ok: false, errorMessage: msg, isBackendUnavailable: false, error: null };
            }

            const eligibility = evaluateProgramChangeDecisionEligibility({
                request: requestRecord,
                decision: decisionPayload.decision,
                currentActorId: actor.id,
                canApproveProgramChange,
            });
            if (!eligibility.allowed) {
                const msg =
                    eligibility.reason ?? 'Program Change decision is not permitted.';
                const err = { message: msg, isBackendUnavailable: false };
                setQueueActionError(err);
                return { ok: false, errorMessage: msg, isBackendUnavailable: false, error: null };
            }

            if (isDecidingRef.current) {
                const msg = 'Another Program Change decision is already in progress.';
                return { ok: false, errorMessage: msg, isBackendUnavailable: false, error: null };
            }

            isDecidingRef.current = true;
            setIsDeciding(true);
            setQueueNotice(null);
            setQueueActionError(null);

            try {
                const res = await decideProgramChangeRequest(
                    requestRecord,
                    decisionPayload,
                    {},
                    tenantId,
                    actor
                );
                const msg =
                    res.message ??
                    `Program Change Request ${
                        res.request.status === 'APPROVED' ? 'approved' : 'rejected'
                    } successfully.`;
                setQueueNotice(msg);
                reloadQueue();
                onDecisionCompleted?.(requestRecord.studentId);
                return {
                    ok: true,
                    errorMessage: null,
                    isBackendUnavailable: false,
                    error: null,
                    request: res.request,
                };
            } catch (error: unknown) {
                const mapped = toFetchError(
                    error,
                    'Unable to process Program Change decision.'
                );
                setQueueActionError(mapped);
                return {
                    ok: false,
                    errorMessage: mapped.message,
                    isBackendUnavailable: mapped.isBackendUnavailable,
                    error,
                };
            } finally {
                isDecidingRef.current = false;
                setIsDeciding(false);
            }
        },
        [actor, canApproveProgramChange, enabled, onDecisionCompleted, reloadQueue, tenantId]
    );

    return {
        queueQuery,
        setQueueQuery,
        queueItems: effectiveQueueItems,
        queuePagination: effectiveQueuePagination,
        pendingCount,
        isLoadingQueue,
        queueError,
        reloadQueue,

        reviewTarget,
        openReviewModal,
        closeReviewModal,

        isDeciding,
        queueNotice,
        queueActionError,
        clearQueueFeedback,
        submitProgramChangeDecision,
    };
}

