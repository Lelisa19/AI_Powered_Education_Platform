import React from 'react';
import { formatAuditOutcomeLabel } from '../utils/platform-audit-log-formatters';

interface AuditOutcomeBadgeProps {
    outcome?: string | null;
}

const OUTCOME_STYLES: Record<string, string> = {
    SUCCESS: 'border-green-200 bg-green-50 text-green-700',
    FAILURE: 'border-red-200 bg-red-50 text-red-700',
    DENIED: 'border-amber-200 bg-amber-50 text-amber-800',
};

export const AuditOutcomeBadge: React.FC<AuditOutcomeBadgeProps> = ({ outcome }) => {
    if (!outcome || outcome.trim() === '') {
        return (
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                Not recorded
            </span>
        );
    }

    const normalizedKey = outcome.trim().toUpperCase();
    const classes =
        OUTCOME_STYLES[normalizedKey] ?? 'border-slate-200 bg-slate-50 text-slate-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
        >
            {formatAuditOutcomeLabel(outcome)}
        </span>
    );
};

