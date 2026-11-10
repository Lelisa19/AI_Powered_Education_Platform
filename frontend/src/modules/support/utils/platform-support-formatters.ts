import type {
    PlatformSupportTicket,
    SupportAssigneeSummary,
    SupportTicketMessage,
} from '../types/platform-support.types';

const STATUS_LABELS: Record<string, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    AWAITING_SCHOOL: 'Awaiting School',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
};

const PRIORITY_LABELS: Record<string, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    URGENT: 'Urgent',
};

const CATEGORY_LABELS: Record<string, string> = {
    ONBOARDING: 'School Onboarding',
    DOMAIN_DNS: 'Domain & DNS',
    ACCESS_ACCOUNT: 'Access & Accounts',
    TECHNICAL_ISSUE: 'Technical Issue',
    BILLING_SUBSCRIPTION: 'Billing & Subscription',
    GENERAL: 'General Inquiry',
};

const SORT_FIELD_LABELS: Record<string, string> = {
    updatedAt: 'Last Updated',
    createdAt: 'Created Date',
    priority: 'Priority',
    status: 'Status',
};

const AUTHOR_TYPE_LABELS: Record<string, string> = {
    SCHOOL_USER: 'School Contact',
    PLATFORM_ADMIN: 'Platform Admin',
    SYSTEM: 'System Event',
};

function titleCaseEnum(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return 'Not recorded';

    return trimmed
        .toLowerCase()
        .split(/[_-]+/)
        .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : ''))
        .join(' ');
}

export function formatSupportTicketStatus(status?: string | null): string {
    if (!status || status.trim() === '') return 'Unknown';
    const normalized = status.trim().toUpperCase();
    return STATUS_LABELS[normalized] ?? titleCaseEnum(status);
}

export function formatSupportTicketPriority(priority?: string | null): string {
    if (!priority || priority.trim() === '') return 'Unknown';
    const normalized = priority.trim().toUpperCase();
    return PRIORITY_LABELS[normalized] ?? titleCaseEnum(priority);
}

export function formatSupportTicketCategory(category?: string | null): string {
    if (!category || category.trim() === '') return 'Not specified';
    const normalized = category.trim().toUpperCase();
    return CATEGORY_LABELS[normalized] ?? titleCaseEnum(category);
}

export function formatSupportSortField(sortBy: string): string {
    return SORT_FIELD_LABELS[sortBy] ?? sortBy;
}

export function formatSupportMessageAuthorType(authorType?: string | null): string {
    if (!authorType || authorType.trim() === '') return 'Participant';
    const normalized = authorType.trim().toUpperCase();
    return AUTHOR_TYPE_LABELS[normalized] ?? titleCaseEnum(authorType);
}

export function formatSupportTimestamp(value?: string | null): string {
    if (!value || value.trim() === '') return 'Not recorded';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatSupportDate(value?: string | null): string {
    if (!value || value.trim() === '') return 'Not recorded';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatAssigneeDisplay(assignee?: SupportAssigneeSummary | null): string {
    if (!assignee) return 'Unassigned';
    const name = assignee.name?.trim();
    const email = assignee.email?.trim();

    if (name && email && name !== email) {
        return `${name} (${email})`;
    }
    return name || email || assignee.id;
}

export function formatSchoolTicketDisplay(ticket: PlatformSupportTicket): {
    primary: string;
    secondary: string;
} {
    const name = ticket.schoolName?.trim();
    const slug = ticket.schoolSlug?.trim();

    if (name && slug) {
        return {
            primary: name,
            secondary: `${slug} · ${ticket.tenantId}`,
        };
    }

    if (name) {
        return {
            primary: name,
            secondary: ticket.tenantId,
        };
    }

    return {
        primary: ticket.tenantId,
        secondary: slug ? `Slug: ${slug}` : 'School name not reported',
    };
}

export function sortSupportMessagesChronologically(
    messages: readonly SupportTicketMessage[]
): SupportTicketMessage[] {
    return [...messages].sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
            return a.createdAt.localeCompare(b.createdAt);
        }
        return timeA - timeB;
    });
}

