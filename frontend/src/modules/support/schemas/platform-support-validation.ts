import {
    PROPOSED_SUPPORT_TICKET_PRIORITIES,
    PROPOSED_SUPPORT_TICKET_STATUSES,
    type ProposedSupportTicketPriority,
    type ProposedSupportTicketStatus,
} from '../types/platform-support.types';

export const SUPPORT_REPLY_MAX_LENGTH = 4000;
export const SUPPORT_REASON_MAX_LENGTH = 500;
export const SUPPORT_ASSIGNEE_ID_MAX_LENGTH = 128;

export function isProposedSupportTicketStatus(
    value: unknown
): value is ProposedSupportTicketStatus {
    return (
        typeof value === 'string' &&
        (PROPOSED_SUPPORT_TICKET_STATUSES as readonly string[]).includes(value)
    );
}

export function isProposedSupportTicketPriority(
    value: unknown
): value is ProposedSupportTicketPriority {
    return (
        typeof value === 'string' &&
        (PROPOSED_SUPPORT_TICKET_PRIORITIES as readonly string[]).includes(value)
    );
}

export function validateSupportReplyBody(
    rawBody: string
): { valid: true; body: string } | { valid: false; error: string } {
    if (typeof rawBody !== 'string') {
        return { valid: false, error: 'Reply message is required.' };
    }

    const trimmed = rawBody.trim();
    if (!trimmed) {
        return { valid: false, error: 'Reply message cannot be empty.' };
    }

    if (trimmed.length > SUPPORT_REPLY_MAX_LENGTH) {
        return {
            valid: false,
            error: `Reply message must be ${SUPPORT_REPLY_MAX_LENGTH.toLocaleString()} characters or fewer.`,
        };
    }

    return { valid: true, body: trimmed };
}

export function validateSupportReason(
    rawReason?: string
): { valid: true; reason?: string } | { valid: false; error: string } {
    if (rawReason === undefined) {
        return { valid: true, reason: undefined };
    }

    const trimmed = rawReason.trim();
    if (!trimmed) {
        return { valid: true, reason: undefined };
    }

    if (trimmed.length > SUPPORT_REASON_MAX_LENGTH) {
        return {
            valid: false,
            error: `Note or reason must be ${SUPPORT_REASON_MAX_LENGTH} characters or fewer.`,
        };
    }

    return { valid: true, reason: trimmed };
}

export function validateSupportAssigneeId(
    rawAssigneeId: string | null
): { valid: true; assigneeId: string | null } | { valid: false; error: string } {
    if (rawAssigneeId === null) {
        return { valid: true, assigneeId: null };
    }

    const trimmed = rawAssigneeId.trim();
    if (!trimmed) {
        return { valid: true, assigneeId: null };
    }

    if (trimmed.length > SUPPORT_ASSIGNEE_ID_MAX_LENGTH || /\s/.test(trimmed)) {
        return {
            valid: false,
            error: 'Enter a valid Platform Admin identifier without spaces.',
        };
    }

    return { valid: true, assigneeId: trimmed };
}

/**
 * Determines whether transitioning between two lifecycle statuses is significant enough
 * to require explicit operator confirmation before sending the mutation request.
 */
export function requiresStatusChangeConfirmation(
    currentStatus: string,
    nextStatus: ProposedSupportTicketStatus
): boolean {
    const normalizedCurrent = currentStatus.trim().toUpperCase();
    if (normalizedCurrent === nextStatus) {
        return false;
    }

    if (nextStatus === 'CLOSED' || nextStatus === 'RESOLVED') {
        return true;
    }

    if (normalizedCurrent === 'CLOSED' || normalizedCurrent === 'RESOLVED') {
        return true;
    }

    return false;
}

