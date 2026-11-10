// frontend/src/config/app-config.ts
import { env } from './env';
import type { DomainClassification } from '../types/tenant.types';

export function normalizeDomainHostname(hostname: string): string {
    return hostname.trim().toLowerCase().replace(/\.+$/, '');
}

function parseExactDomainList(raw: string): string[] {
    return raw
        .split(',')
        .map(normalizeDomainHostname)
        .filter((domain) => domain.length > 0 && !domain.includes('*'));
}

function parseExactDomain(raw: string): string {
    const normalized = normalizeDomainHostname(raw);
    if (!normalized || normalized.includes('*')) {
        return '';
    }
    return normalized;
}

export const appConfig = {
    api: {
        baseUrl: env.API_BASE_URL,
    },
    domains: {
        platform: parseExactDomainList(env.PLATFORM_DOMAINS),
        platformAdmin: parseExactDomain(env.PLATFORM_ADMIN_DOMAIN),
    },
};

export function classifyConfiguredDomain(
    rawHostname: string,
    domains: { platform: readonly string[]; platformAdmin: string } = appConfig.domains
): Extract<DomainClassification, 'PLATFORM_ADMIN' | 'PLATFORM' | 'PENDING_RESOLUTION'> {
    const hostname = normalizeDomainHostname(rawHostname);
    if (!hostname) {
        return 'PENDING_RESOLUTION';
    }

    // Dedicated Platform Admin domain takes precedence over root platform domains.
    if (domains.platformAdmin && hostname === domains.platformAdmin) {
        return 'PLATFORM_ADMIN';
    }

    if (domains.platform.includes(hostname)) {
        return 'PLATFORM';
    }

    return 'PENDING_RESOLUTION';
}
