import React from 'react';
import {
    formatSupportMessageAuthorType,
    formatSupportTicketPriority,
    formatSupportTicketStatus,
} from '../utils/platform-support-formatters';

interface BadgeProps {
    value: string;
}

const STATUS_STYLES: Record<string, string> = {
    OPEN: 'border-blue-200 bg-blue-50 text-blue-700',
    IN_PROGRESS: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    AWAITING_SCHOOL: 'border-amber-200 bg-amber-50 text-amber-800',
    RESOLVED: 'border-green-200 bg-green-50 text-green-700',
    CLOSED: 'border-gray-300 bg-gray-100 text-gray-700',
};

const PRIORITY_STYLES: Record<string, string> = {
    URGENT: 'border-red-300 bg-red-100 text-red-900',
    HIGH: 'border-red-200 bg-red-50 text-red-700',
    MEDIUM: 'border-amber-200 bg-amber-50 text-amber-800',
    LOW: 'border-gray-200 bg-gray-100 text-gray-700',
};

const AUTHOR_STYLES: Record<string, string> = {
    PLATFORM_ADMIN: 'border-blue-200 bg-blue-50 text-blue-800',
    SCHOOL_USER: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    SYSTEM: 'border-gray-200 bg-gray-100 text-gray-700',
};

export const SupportTicketStatusBadge: React.FC<BadgeProps> = ({ value }) => {
    const normalized = value.trim().toUpperCase();
    const classes = STATUS_STYLES[normalized] ?? 'border-slate-200 bg-slate-50 text-slate-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
        >
            {formatSupportTicketStatus(value)}
        </span>
    );
};

export const SupportTicketPriorityBadge: React.FC<BadgeProps> = ({ value }) => {
    const normalized = value.trim().toUpperCase();
    const classes =
        PRIORITY_STYLES[normalized] ?? 'border-slate-200 bg-slate-50 text-slate-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
        >
            {formatSupportTicketPriority(value)}
        </span>
    );
};

export const SupportMessageAuthorBadge: React.FC<BadgeProps> = ({ value }) => {
    const normalized = value.trim().toUpperCase();
    const classes =
        AUTHOR_STYLES[normalized] ?? 'border-slate-200 bg-slate-50 text-slate-700';

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}
        >
            {formatSupportMessageAuthorType(value)}
        </span>
    );
};

