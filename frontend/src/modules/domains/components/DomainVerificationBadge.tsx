import React from 'react';
import { formatDomainVerificationLabel } from '../utils/domain-formatters';

interface DomainVerificationBadgeProps {
    status: string;
}

const VERIFICATION_STYLE_MAP: Record<string, string> = {
    VERIFIED: 'border-green-200 bg-green-50 text-green-700',
    PENDING_VERIFICATION: 'border-amber-200 bg-amber-50 text-amber-800',
    UNVERIFIED: 'border-gray-200 bg-gray-100 text-gray-700',
    FAILED: 'border-red-200 bg-red-50 text-red-700',
};

export const DomainVerificationBadge: React.FC<DomainVerificationBadgeProps> = ({ status }) => {
    const normalizedKey = status.trim().toUpperCase();
    const badgeClasses =
        VERIFICATION_STYLE_MAP[normalizedKey] ?? 'border-slate-200 bg-slate-50 text-slate-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClasses}`}
        >
            {formatDomainVerificationLabel(status)}
        </span>
    );
};

