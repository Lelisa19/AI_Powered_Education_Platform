import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import { formatPlatformAdminName } from '../../platform-admin/utils/platform-admin-formatters';
import { usePlatformAdminAssignees } from '../hooks/usePlatformAdminAssignees';
import {
    isProposedSupportTicketPriority,
    isProposedSupportTicketStatus,
    requiresStatusChangeConfirmation,
    SUPPORT_REPLY_MAX_LENGTH,
    validateSupportAssigneeId,
    validateSupportReason,
    validateSupportReplyBody,
} from '../schemas/platform-support-validation';
import {
    getSupportTicketById,
    isPlatformSupportBackendUnavailableError,
    replyToSupportTicket,
    updateSupportTicketAssignment,
    updateSupportTicketPriority,
    updateSupportTicketStatus,
} from '../services/platform-support-service';
import {
    PROPOSED_SUPPORT_TICKET_PRIORITIES,
    PROPOSED_SUPPORT_TICKET_STATUSES,
    type PlatformSupportTicket,
    type ProposedSupportTicketPriority,
    type ProposedSupportTicketStatus,
    type SupportTicketMessage,
} from '../types/platform-support.types';
import {
    formatAssigneeDisplay,
    formatSchoolTicketDisplay,
    formatSupportTicketCategory,
    formatSupportTicketPriority,
    formatSupportTicketStatus,
    formatSupportTimestamp,
    sortSupportMessagesChronologically,
} from '../utils/platform-support-formatters';
import {
    SupportMessageAuthorBadge,
    SupportTicketPriorityBadge,
    SupportTicketStatusBadge,
} from './SupportStatusBadge';

interface SupportTicketDetailModalProps {
    ticket: PlatformSupportTicket;
    canManageSupport: boolean;
    canManageAdmins: boolean;
    onClose: () => void;
    onTicketUpdated: (ticket: PlatformSupportTicket, notice?: string) => void;
}

export const SupportTicketDetailModal: React.FC<SupportTicketDetailModalProps> = ({
    ticket,
    canManageSupport,
    canManageAdmins,
    onClose,
    onTicketUpdated,
}) => {
    const [detail, setDetail] = useState<PlatformSupportTicket>(ticket);
    const [messages, setMessages] = useState<SupportTicketMessage[]>(ticket.messages ?? []);
    const [isLoadingDetail, setIsLoadingDetail] = useState(true);
    const [detailError, setDetailError] = useState<string | null>(null);

    const [selectedStatus, setSelectedStatus] = useState<ProposedSupportTicketStatus>(
        isProposedSupportTicketStatus(ticket.status) ? ticket.status : 'OPEN'
    );
    const [statusReason, setStatusReason] = useState('');
    const [pendingConfirmStatus, setPendingConfirmStatus] =
        useState<ProposedSupportTicketStatus | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const [selectedPriority, setSelectedPriority] = useState<ProposedSupportTicketPriority>(
        isProposedSupportTicketPriority(ticket.priority) ? ticket.priority : 'MEDIUM'
    );
    const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

    const [assigneeInput, setAssigneeInput] = useState(ticket.assignedAdmin?.id ?? '');
    const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);

    const [replyDraft, setReplyDraft] = useState('');
    const [replyValidationError, setReplyValidationError] = useState<string | null>(null);
    const [isSendingReply, setIsSendingReply] = useState(false);

    const [actionNotice, setActionNotice] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const { admins, isLoadingAdmins, adminsLoadNote } = usePlatformAdminAssignees(
        canManageSupport && canManageAdmins
    );

    const isBusyRef = useRef(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    const isBusy =
        isUpdatingStatus || isUpdatingPriority || isUpdatingAssignment || isSendingReply;

    useEffect(() => {
        let isActive = true;
        const controller = new AbortController();

        getSupportTicketById(ticket.id, controller.signal)
            .then((response) => {
                if (!isActive) return;

                setDetail(response.ticket);
                const resolvedMessages = response.messages ?? response.ticket.messages ?? [];
                setMessages(sortSupportMessagesChronologically(resolvedMessages));

                if (isProposedSupportTicketStatus(response.ticket.status)) {
                    setSelectedStatus(response.ticket.status);
                }
                if (isProposedSupportTicketPriority(response.ticket.priority)) {
                    setSelectedPriority(response.ticket.priority);
                }
                setAssigneeInput(response.ticket.assignedAdmin?.id ?? '');
                setDetailError(null);
            })
            .catch((err: unknown) => {
                if (!isActive) return;
                if (err instanceof ApiError && err.isCancellation) return;

                setDetailError(
                    isPlatformSupportBackendUnavailableError(err)
                        ? 'Support ticket detail endpoint is unavailable; showing list summary fields only.'
                        : err instanceof Error && err.message
                          ? err.message
                          : 'Unable to load full support ticket details.'
                );
            })
            .finally(() => {
                if (isActive) {
                    setIsLoadingDetail(false);
                }
            });

        const frameId = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isBusyRef.current) {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            isActive = false;
            controller.abort();
            cancelAnimationFrame(frameId);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, ticket.id]);

    const sortedMessages = useMemo(
        () => sortSupportMessagesChronologically(messages),
        [messages]
    );

    const schoolDisplay = formatSchoolTicketDisplay(detail);

    const formatActionFailure = (err: unknown, fallbackMessage: string): string => {
        if (isPlatformSupportBackendUnavailableError(err)) {
            return 'Support endpoint is unavailable or pending backend implementation. No changes were saved.';
        }
        if (err instanceof ApiError && err.validationErrors) {
            const firstValidationMessage = Object.values(err.validationErrors)
                .flat()
                .find((item) => typeof item === 'string' && item.trim() !== '');
            if (firstValidationMessage) return firstValidationMessage;
        }
        return err instanceof Error && err.message ? err.message : fallbackMessage;
    };

    const commitStatusTransition = async (nextStatus: ProposedSupportTicketStatus) => {
        if (!canManageSupport || isBusyRef.current || isBusy) return;

        const reasonCheck = validateSupportReason(statusReason);
        if (!reasonCheck.valid) {
            setActionError(reasonCheck.error);
            return;
        }

        isBusyRef.current = true;
        setIsUpdatingStatus(true);
        setActionError(null);
        setActionNotice(null);

        try {
            const response = await updateSupportTicketStatus({
                ticketId: detail.id,
                status: nextStatus,
                reason: reasonCheck.reason,
            });
            setDetail(response.ticket);
            if (isProposedSupportTicketStatus(response.ticket.status)) {
                setSelectedStatus(response.ticket.status);
            }
            setPendingConfirmStatus(null);
            setStatusReason('');
            const notice =
                response.message ||
                `Ticket ${response.ticket.referenceNumber} status updated to ${formatSupportTicketStatus(response.ticket.status)}.`;
            setActionNotice(notice);
            onTicketUpdated(response.ticket, notice);
        } catch (err: unknown) {
            setActionError(formatActionFailure(err, 'Unable to update support ticket status.'));
        } finally {
            isBusyRef.current = false;
            setIsUpdatingStatus(false);
        }
    };

    const handleRequestStatusTransition = (nextStatus: ProposedSupportTicketStatus) => {
        if (!canManageSupport || isBusyRef.current || isBusy) return;

        setSelectedStatus(nextStatus);
        setActionError(null);
        setActionNotice(null);

        if (nextStatus.toUpperCase() === detail.status.trim().toUpperCase()) {
            setPendingConfirmStatus(null);
            return;
        }

        if (requiresStatusChangeConfirmation(detail.status, nextStatus)) {
            setPendingConfirmStatus(nextStatus);
            return;
        }

        void commitStatusTransition(nextStatus);
    };

    const handlePriorityUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canManageSupport || isBusyRef.current || isBusy) return;

        isBusyRef.current = true;
        setIsUpdatingPriority(true);
        setActionError(null);
        setActionNotice(null);

        try {
            const response = await updateSupportTicketPriority({
                ticketId: detail.id,
                priority: selectedPriority,
            });
            setDetail(response.ticket);
            if (isProposedSupportTicketPriority(response.ticket.priority)) {
                setSelectedPriority(response.ticket.priority);
            }
            const notice =
                response.message ||
                `Ticket ${response.ticket.referenceNumber} priority updated to ${formatSupportTicketPriority(response.ticket.priority)}.`;
            setActionNotice(notice);
            onTicketUpdated(response.ticket, notice);
        } catch (err: unknown) {
            setActionError(formatActionFailure(err, 'Unable to update support ticket priority.'));
        } finally {
            isBusyRef.current = false;
            setIsUpdatingPriority(false);
        }
    };

    const handleAssignmentUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canManageSupport || isBusyRef.current || isBusy) return;

        const assigneeCheck = validateSupportAssigneeId(assigneeInput || null);
        if (!assigneeCheck.valid) {
            setActionError(assigneeCheck.error);
            return;
        }

        isBusyRef.current = true;
        setIsUpdatingAssignment(true);
        setActionError(null);
        setActionNotice(null);

        try {
            const response = await updateSupportTicketAssignment({
                ticketId: detail.id,
                assigneeId: assigneeCheck.assigneeId,
            });
            setDetail(response.ticket);
            setAssigneeInput(response.ticket.assignedAdmin?.id ?? '');
            const notice =
                response.message ||
                (response.ticket.assignedAdmin
                    ? `Assigned ticket ${response.ticket.referenceNumber} to ${formatAssigneeDisplay(response.ticket.assignedAdmin)}.`
                    : `Cleared assignment on ticket ${response.ticket.referenceNumber}.`);
            setActionNotice(notice);
            onTicketUpdated(response.ticket, notice);
        } catch (err: unknown) {
            setActionError(formatActionFailure(err, 'Unable to update ticket assignment.'));
        } finally {
            isBusyRef.current = false;
            setIsUpdatingAssignment(false);
        }
    };

    const handleSendReply = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canManageSupport || isBusyRef.current || isBusy) return;

        const bodyCheck = validateSupportReplyBody(replyDraft);
        if (!bodyCheck.valid) {
            setReplyValidationError(bodyCheck.error);
            return;
        }

        setReplyValidationError(null);
        isBusyRef.current = true;
        setIsSendingReply(true);
        setActionError(null);
        setActionNotice(null);

        try {
            const response = await replyToSupportTicket({
                ticketId: detail.id,
                body: bodyCheck.body,
            });
            setMessages((prev) =>
                sortSupportMessagesChronologically([
                    ...prev.filter((item) => item.id !== response.message.id),
                    response.message,
                ])
            );
            setReplyDraft('');

            const nextTicket = response.ticket ?? {
                ...detail,
                updatedAt: response.message.createdAt,
            };
            setDetail(nextTicket);
            const notice = `Response sent on ticket ${nextTicket.referenceNumber}.`;
            setActionNotice(notice);
            onTicketUpdated(nextTicket, notice);
        } catch (err: unknown) {
            setActionError(formatActionFailure(err, 'Unable to send support response.'));
        } finally {
            isBusyRef.current = false;
            setIsSendingReply(false);
        }
    };

    const normalizedCurrentStatus = detail.status.trim().toUpperCase();
    const canCloseTicket = normalizedCurrentStatus !== 'CLOSED';
    const canReopenTicket =
        normalizedCurrentStatus === 'CLOSED' || normalizedCurrentStatus === 'RESOLVED';

    const currentAssigneeMissingFromList =
        Boolean(detail.assignedAdmin?.id) &&
        !admins.some((item) => item.id === detail.assignedAdmin?.id);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
                if (!isBusy) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="support-ticket-detail-title"
                className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-gray-600">
                                {detail.referenceNumber}
                            </span>
                            <SupportTicketStatusBadge value={detail.status} />
                            <SupportTicketPriorityBadge value={detail.priority} />
                        </div>
                        <h2
                            id="support-ticket-detail-title"
                            className="text-lg font-semibold text-gray-900"
                        >
                            {detail.subject}
                        </h2>
                        <p className="font-mono text-xs text-gray-500">Ticket ID: {detail.id}</p>
                    </div>

                    <button
                        ref={closeButtonRef}
                        type="button"
                        disabled={isBusy}
                        onClick={onClose}
                        aria-label="Close support ticket details dialog"
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-6 px-6 py-5">
                    {isLoadingDetail && (
                        <div role="status" className="text-xs text-gray-600">
                            Loading ticket details and conversation history...
                        </div>
                    )}

                    {detailError && (
                        <div
                            role="status"
                            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                        >
                            {detailError}
                        </div>
                    )}

                    {actionNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900"
                        >
                            {actionNotice}
                        </div>
                    )}

                    {actionError && (
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                        >
                            {actionError}
                        </div>
                    )}

                    {/* Ticket Metadata */}
                    <dl className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                School / Tenant
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <div className="font-medium">{schoolDisplay.primary}</div>
                                <div className="font-mono text-xs text-gray-500">
                                    {schoolDisplay.secondary}
                                </div>
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Category
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatSupportTicketCategory(detail.category)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Assigned Platform Admin
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatAssigneeDisplay(detail.assignedAdmin)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Submitted By
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {detail.submittedByName || detail.submittedByEmail ? (
                                    <>
                                        {detail.submittedByName && (
                                            <div>{detail.submittedByName}</div>
                                        )}
                                        {detail.submittedByEmail && (
                                            <div className="text-xs text-gray-600">
                                                {detail.submittedByEmail}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-gray-500">Not recorded</span>
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Created
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatSupportTimestamp(detail.createdAt)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Last Updated
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatSupportTimestamp(detail.updatedAt)}
                            </dd>
                        </div>
                    </dl>

                    {/* Original Request */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                            Original Support Request
                        </h3>
                        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm whitespace-pre-wrap text-gray-800">
                            {detail.description && detail.description.trim() !== ''
                                ? detail.description
                                : 'No detailed request description was recorded.'}
                        </div>
                    </div>

                    {/* Lifecycle Management Actions */}
                    {canManageSupport && (
                        <div className="space-y-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Ticket Lifecycle &amp; Triage
                                </h3>
                                <div className="flex flex-wrap items-center gap-2">
                                    {canReopenTicket && (
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => handleRequestStatusTransition('OPEN')}
                                            className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                                        >
                                            Reopen Ticket
                                        </button>
                                    )}
                                    {canCloseTicket && (
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => handleRequestStatusTransition('CLOSED')}
                                            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
                                        >
                                            Close Ticket
                                        </button>
                                    )}
                                </div>
                            </div>

                            {pendingConfirmStatus && (
                                <div
                                    role="alertdialog"
                                    aria-label="Confirm support ticket status change"
                                    className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4"
                                >
                                    <p className="text-sm font-medium text-amber-900">
                                        Confirm changing ticket status from{' '}
                                        <strong>{formatSupportTicketStatus(detail.status)}</strong> to{' '}
                                        <strong>
                                            {formatSupportTicketStatus(pendingConfirmStatus)}
                                        </strong>
                                        ?
                                    </p>
                                    <div>
                                        <label
                                            htmlFor="ticket-status-reason"
                                            className="block text-xs font-medium text-amber-900"
                                        >
                                            Optional Status Change Reason
                                        </label>
                                        <input
                                            id="ticket-status-reason"
                                            type="text"
                                            maxLength={500}
                                            disabled={isBusy}
                                            value={statusReason}
                                            onChange={(event) => setStatusReason(event.target.value)}
                                            placeholder="Brief reason recorded for audit history"
                                            className="mt-1 block w-full rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                        />
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => {
                                                setPendingConfirmStatus(null);
                                                if (isProposedSupportTicketStatus(detail.status)) {
                                                    setSelectedStatus(detail.status);
                                                }
                                            }}
                                            className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() =>
                                                void commitStatusTransition(pendingConfirmStatus)
                                            }
                                            className="rounded-md bg-amber-800 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-600 disabled:opacity-50"
                                        >
                                            {isUpdatingStatus
                                                ? 'Updating Status...'
                                                : 'Confirm Status Change'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {/* Status Form */}
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        handleRequestStatusTransition(selectedStatus);
                                    }}
                                    className="space-y-2"
                                >
                                    <label
                                        htmlFor="ticket-status-select"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Ticket Status
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            id="ticket-status-select"
                                            disabled={isBusy}
                                            value={selectedStatus}
                                            onChange={(event) => {
                                                if (
                                                    isProposedSupportTicketStatus(
                                                        event.target.value
                                                    )
                                                ) {
                                                    setSelectedStatus(event.target.value);
                                                }
                                            }}
                                            className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            {PROPOSED_SUPPORT_TICKET_STATUSES.map((statusOption) => (
                                                <option key={statusOption} value={statusOption}>
                                                    {formatSupportTicketStatus(statusOption)}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="submit"
                                            disabled={
                                                isBusy ||
                                                selectedStatus === detail.status.trim().toUpperCase()
                                            }
                                            className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                                        >
                                            {isUpdatingStatus ? 'Saving...' : 'Update'}
                                        </button>
                                    </div>
                                </form>

                                {/* Priority Form */}
                                <form onSubmit={handlePriorityUpdate} className="space-y-2">
                                    <label
                                        htmlFor="ticket-priority-select"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Ticket Priority
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            id="ticket-priority-select"
                                            disabled={isBusy}
                                            value={selectedPriority}
                                            onChange={(event) => {
                                                if (
                                                    isProposedSupportTicketPriority(
                                                        event.target.value
                                                    )
                                                ) {
                                                    setSelectedPriority(event.target.value);
                                                }
                                            }}
                                            className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            {PROPOSED_SUPPORT_TICKET_PRIORITIES.map(
                                                (priorityOption) => (
                                                    <option
                                                        key={priorityOption}
                                                        value={priorityOption}
                                                    >
                                                        {formatSupportTicketPriority(
                                                            priorityOption
                                                        )}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                        <button
                                            type="submit"
                                            disabled={
                                                isBusy ||
                                                selectedPriority ===
                                                    detail.priority.trim().toUpperCase()
                                            }
                                            className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                                        >
                                            {isUpdatingPriority ? 'Saving...' : 'Update'}
                                        </button>
                                    </div>
                                </form>

                                {/* Assignment Form */}
                                <form onSubmit={handleAssignmentUpdate} className="space-y-2">
                                    <label
                                        htmlFor="ticket-assignee-control"
                                        className="block text-xs font-medium text-gray-700"
                                    >
                                        Assigned Platform Admin
                                    </label>
                                    {canManageAdmins && admins.length > 0 ? (
                                        <div className="flex gap-2">
                                            <select
                                                id="ticket-assignee-control"
                                                disabled={isBusy || isLoadingAdmins}
                                                value={assigneeInput}
                                                onChange={(event) =>
                                                    setAssigneeInput(event.target.value)
                                                }
                                                className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            >
                                                <option value="">Unassigned</option>
                                                {currentAssigneeMissingFromList &&
                                                    detail.assignedAdmin && (
                                                        <option value={detail.assignedAdmin.id}>
                                                            {formatAssigneeDisplay(
                                                                detail.assignedAdmin
                                                            )}
                                                        </option>
                                                    )}
                                                {admins.map((admin) => (
                                                    <option key={admin.id} value={admin.id}>
                                                        {formatPlatformAdminName(
                                                            admin.firstName,
                                                            admin.lastName,
                                                            admin.email
                                                        )}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="submit"
                                                disabled={isBusy}
                                                className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                                            >
                                                {isUpdatingAssignment ? 'Saving...' : 'Assign'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <div className="flex gap-2">
                                                <input
                                                    id="ticket-assignee-control"
                                                    type="text"
                                                    disabled={isBusy}
                                                    value={assigneeInput}
                                                    onChange={(event) =>
                                                        setAssigneeInput(event.target.value)
                                                    }
                                                    placeholder="Admin ID (blank = unassign)"
                                                    className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isBusy}
                                                    className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                                                >
                                                    {isUpdatingAssignment ? 'Saving...' : 'Assign'}
                                                </button>
                                            </div>
                                            {adminsLoadNote && (
                                                <p className="text-[11px] text-gray-500">
                                                    {adminsLoadNote}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Chronological Conversation History */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                            Conversation History
                        </h3>

                        {sortedMessages.length === 0 ? (
                            <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-500">
                                No conversation messages have been recorded on this ticket yet.
                            </p>
                        ) : (
                            <ol className="space-y-3">
                                {sortedMessages.map((msg) => {
                                    const normalizedAuthor = msg.authorType.trim().toUpperCase();
                                    const isPlatformAdmin = normalizedAuthor === 'PLATFORM_ADMIN';
                                    const isSystem = normalizedAuthor === 'SYSTEM';

                                    return (
                                        <li
                                            key={msg.id}
                                            className={`rounded-lg border p-4 text-sm ${
                                                isPlatformAdmin
                                                    ? 'border-blue-200 bg-blue-50/50'
                                                    : isSystem
                                                      ? 'border-gray-200 bg-gray-50'
                                                      : 'border-emerald-200 bg-emerald-50/40'
                                            }`}
                                        >
                                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <SupportMessageAuthorBadge
                                                        value={msg.authorType}
                                                    />
                                                    <span className="font-medium text-gray-900">
                                                        {msg.authorName ||
                                                            msg.authorId ||
                                                            'Participant'}
                                                    </span>
                                                    {msg.authorRoleLabel && (
                                                        <span className="text-xs text-gray-500">
                                                            ({msg.authorRoleLabel})
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {formatSupportTimestamp(msg.createdAt)}
                                                </span>
                                            </div>
                                            <p className="whitespace-pre-wrap text-gray-800">
                                                {msg.body}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}

                        <p className="text-xs text-gray-500">
                            Attachments are intentionally disabled until a secure backend signed upload/download and tenant-ownership verification contract is implemented.
                        </p>
                    </div>

                    {/* Reply Composer */}
                    {canManageSupport && (
                        <form
                            onSubmit={handleSendReply}
                            className="space-y-3 border-t border-gray-200 pt-4"
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor="support-reply-body"
                                        className="block text-sm font-medium text-gray-900"
                                    >
                                        Send Platform Admin Response
                                    </label>
                                    <span className="text-xs text-gray-500">
                                        {replyDraft.trim().length} /{' '}
                                        {SUPPORT_REPLY_MAX_LENGTH.toLocaleString()}
                                    </span>
                                </div>
                                <textarea
                                    id="support-reply-body"
                                    rows={3}
                                    maxLength={SUPPORT_REPLY_MAX_LENGTH}
                                    disabled={isBusy}
                                    value={replyDraft}
                                    onChange={(event) => {
                                        setReplyDraft(event.target.value);
                                        if (replyValidationError) setReplyValidationError(null);
                                    }}
                                    placeholder="Write a clear, tenant-appropriate support response..."
                                    aria-invalid={Boolean(replyValidationError)}
                                    aria-describedby={
                                        replyValidationError ? 'support-reply-error' : undefined
                                    }
                                    className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-50"
                                />
                                {replyValidationError && (
                                    <p
                                        id="support-reply-error"
                                        role="alert"
                                        className="mt-1 text-xs text-red-700"
                                    >
                                        {replyValidationError}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isBusy || replyDraft.trim().length === 0}
                                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSendingReply ? 'Sending Response...' : 'Send Response'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
                    <p className="text-xs text-gray-500">
                        Support actions are audited and restricted strictly to authorized school support records.
                    </p>
                    <button
                        type="button"
                        disabled={isBusy}
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

