import React from 'react';
import { formatTenantStatusLabel } from '../utils/tenant-formatters';

interface TenantStatusBadgeProps {
    status: string;
}

const STATUS_STYLE_MAP: Record<string, string> = {
    ACTIVE: 'border-green-200 bg-green-50 text-green-700',
    PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
    INACTIVE: 'border-gray-200 bg-gray-100 text-gray-700',
    SUSPENDED: 'border-red-200 bg-red-50 text-red-700',
};

export const TenantStatusBadge: React.FC<TenantStatusBadgeProps> = ({ status }) => {
    const normalizedKey = status.trim().toUpperCase();
    const badgeClasses =
        STATUS_STYLE_MAP[normalizedKey] ?? 'border-slate-200 bg-slate-50 text-slate-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClasses}`}
        >
            {formatTenantStatusLabel(status)}
        </span>
    );
};

