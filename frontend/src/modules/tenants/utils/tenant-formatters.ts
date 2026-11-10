export function formatTenantStatusLabel(status: string): string {
    const trimmed = status.trim();
    if (!trimmed) return 'Unknown';

    return trimmed
        .toLowerCase()
        .split(/[_-]+/)
        .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : ''))
        .join(' ');
}

export function formatTenantDate(value?: string | null): string {
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

export function deriveTenantSlug(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 63);
}

