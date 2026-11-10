const VERIFICATION_LABEL_MAP: Record<string, string> = {
    UNVERIFIED: 'Unverified',
    PENDING_VERIFICATION: 'Pending Verification',
    VERIFIED: 'Verified',
    FAILED: 'Failed Verification',
};

export function formatDomainVerificationLabel(status: string): string {
    const normalized = status.trim().toUpperCase();
    if (VERIFICATION_LABEL_MAP[normalized]) {
        return VERIFICATION_LABEL_MAP[normalized];
    }

    if (!normalized) return 'Unknown';

    return normalized
        .toLowerCase()
        .split(/[_-]+/)
        .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : ''))
        .join(' ');
}

export function formatDomainDate(value?: string | null): string {
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

