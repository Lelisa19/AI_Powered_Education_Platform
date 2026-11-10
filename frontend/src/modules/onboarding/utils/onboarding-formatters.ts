const ONBOARDING_STATUS_LABELS: Record<string, string> = {
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In Progress',
    AWAITING_ACTIVATION: 'Awaiting Activation',
    READY_FOR_LAUNCH: 'Ready for Launch',
    LAUNCHED: 'Launched',
};

const ONBOARDING_STAGE_LABELS: Record<string, string> = {
    SCHOOL_PROVISIONED: '1. School Provisioned',
    DOMAIN_CONFIGURATION: '2. Domain Configuration',
    PRIMARY_ADMIN_INVITATION: '3. Primary Admin Invitation',
    PRIMARY_ADMIN_ACTIVATION: '4. Primary Admin Activation',
    GUIDED_SCHOOL_SETUP: '5. Guided School Setup',
    READY_FOR_LAUNCH: '6. Ready for Launch',
};

const STAGE_STATUS_LABELS: Record<string, string> = {
    COMPLETED: 'Completed',
    IN_PROGRESS: 'In Progress',
    PENDING: 'Pending',
    BLOCKED: 'Blocked',
};

const INVITATION_STATUS_LABELS: Record<string, string> = {
    NOT_SENT: 'Not Sent',
    PENDING: 'Pending Activation',
    ACCEPTED: 'Activated',
    EXPIRED: 'Expired',
    REVOKED: 'Revoked',
};

function fallbackTitleCase(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return 'Unknown';

    return trimmed
        .toLowerCase()
        .split(/[_-]+/)
        .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : ''))
        .join(' ');
}

export function formatOnboardingStatusLabel(status: string): string {
    const normalized = status.trim().toUpperCase();
    return ONBOARDING_STATUS_LABELS[normalized] ?? fallbackTitleCase(status);
}

export function formatOnboardingStageLabel(stage: string): string {
    const normalized = stage.trim().toUpperCase();
    return ONBOARDING_STAGE_LABELS[normalized] ?? fallbackTitleCase(stage);
}

export function formatStageStatusLabel(status: string): string {
    const normalized = status.trim().toUpperCase();
    return STAGE_STATUS_LABELS[normalized] ?? fallbackTitleCase(status);
}

export function formatInvitationStatusLabel(status: string): string {
    const normalized = status.trim().toUpperCase();
    return INVITATION_STATUS_LABELS[normalized] ?? fallbackTitleCase(status);
}

export function formatOnboardingDate(value?: string | null): string {
    if (!value) return '—';

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

