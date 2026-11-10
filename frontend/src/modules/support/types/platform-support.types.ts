import type { PaginatedResponse } from '../../../types/api.types';

/**
 * Proposed Platform Support Management contracts (pending backend implementation).
 * File attachments are intentionally excluded until a secure signed upload/download
 * and tenant-ownership verification contract is defined on the backend.
 */

export type ProposedSupportTicketStatus =
    | 'OPEN'
    | 'IN_PROGRESS'
    | 'AWAITING_SCHOOL'
    | 'RESOLVED'
    | 'CLOSED';

export const PROPOSED_SUPPORT_TICKET_STATUSES: readonly ProposedSupportTicketStatus[] = [
    'OPEN',
    'IN_PROGRESS',
    'AWAITING_SCHOOL',
    'RESOLVED',
    'CLOSED',
];

export type ProposedSupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const PROPOSED_SUPPORT_TICKET_PRIORITIES: readonly ProposedSupportTicketPriority[] = [
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT',
];

export type ProposedSupportTicketCategory =
    | 'ONBOARDING'
    | 'DOMAIN_DNS'
    | 'ACCESS_ACCOUNT'
    | 'TECHNICAL_ISSUE'
    | 'BILLING_SUBSCRIPTION'
    | 'GENERAL';

export const PROPOSED_SUPPORT_TICKET_CATEGORIES: readonly ProposedSupportTicketCategory[] = [
    'ONBOARDING',
    'DOMAIN_DNS',
    'ACCESS_ACCOUNT',
    'TECHNICAL_ISSUE',
    'BILLING_SUBSCRIPTION',
    'GENERAL',
];

export type SupportSortField = 'updatedAt' | 'createdAt' | 'priority' | 'status';

export const SUPPORT_SORT_FIELDS: readonly SupportSortField[] = [
    'updatedAt',
    'createdAt',
    'priority',
    'status',
];

export type SupportSortOrder = 'desc' | 'asc';

export type SupportMessageAuthorType = 'SCHOOL_USER' | 'PLATFORM_ADMIN' | 'SYSTEM';

export interface SupportAssigneeSummary {
    id: string;
    name?: string | null;
    email?: string | null;
}

export interface SupportTicketMessage {
    id: string;
    ticketId: string;
    authorType: SupportMessageAuthorType | (string & {});
    authorId?: string | null;
    authorName?: string | null;
    authorRoleLabel?: string | null;
    body: string;
    createdAt: string;
}

export interface PlatformSupportTicket {
    id: string;
    referenceNumber: string;
    tenantId: string;
    schoolName?: string | null;
    schoolSlug?: string | null;
    subject: string;
    description?: string | null;
    category: ProposedSupportTicketCategory | (string & {});
    priority: ProposedSupportTicketPriority | (string & {});
    status: ProposedSupportTicketStatus | (string & {});
    assignedAdmin?: SupportAssigneeSummary | null;
    submittedByName?: string | null;
    submittedByEmail?: string | null;
    createdAt: string;
    updatedAt: string;
    closedAt?: string | null;
    messages?: SupportTicketMessage[] | null;
}

export interface ListPlatformSupportTicketsQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: ProposedSupportTicketStatus;
    priority?: ProposedSupportTicketPriority;
    category?: ProposedSupportTicketCategory;
    tenantId?: string;
    sortBy?: SupportSortField;
    sortOrder?: SupportSortOrder;
}

export type PlatformSupportTicketListResponse = PaginatedResponse<PlatformSupportTicket>;

export interface PlatformSupportTicketDetailResponse {
    ticket: PlatformSupportTicket;
    messages?: SupportTicketMessage[];
}

export interface CreateSupportReplyRequest {
    ticketId: string;
    body: string;
}

export interface CreateSupportReplyResponse {
    message: SupportTicketMessage;
    ticket?: PlatformSupportTicket;
}

export interface UpdateSupportTicketStatusRequest {
    ticketId: string;
    status: ProposedSupportTicketStatus;
    reason?: string;
}

export interface UpdateSupportTicketPriorityRequest {
    ticketId: string;
    priority: ProposedSupportTicketPriority;
    reason?: string;
}

export interface UpdateSupportTicketAssignmentRequest {
    ticketId: string;
    assigneeId: string | null;
}

export interface PlatformSupportTicketMutationResponse {
    ticket: PlatformSupportTicket;
    message?: string;
}

