import React from 'react';
import {
    formatInvitationStatusLabel,
    formatOnboardingStatusLabel,
    formatStageStatusLabel,
} from '../utils/onboarding-formatters';

interface OnboardingStatusBadgeProps {
    kind: 'onboarding' | 'stage' | 'invitation';
    status: string;
}

const STYLE_MAP: Record<string, string> = {
    READY_FOR_LAUNCH: 'border-green-200 bg-green-50 text-green-700',
    LAUNCHED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    COMPLETED: 'border-green-200 bg-green-50 text-green-700',
    ACCEPTED: 'border-green-200 bg-green-50 text-green-700',
    IN_PROGRESS: 'border-blue-200 bg-blue-50 text-blue-700',
    AWAITING_ACTIVATION: 'border-amber-200 bg-amber-50 text-amber-800',
    PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
    NOT_STARTED: 'border-gray-200 bg-gray-100 text-gray-700',
    NOT_SENT: 'border-gray-200 bg-gray-100 text-gray-700',
    BLOCKED: 'border-red-200 bg-red-50 text-red-700',
    EXPIRED: 'border-red-200 bg-red-50 text-red-700',
    REVOKED: 'border-red-200 bg-red-50 text-red-700',
};

export const OnboardingStatusBadge: React.FC<OnboardingStatusBadgeProps> = ({ kind, status }) => {
    const normalizedKey = status.trim().toUpperCase();
    const classes = STYLE_MAP[normalizedKey] ?? 'border-slate-200 bg-slate-50 text-slate-700';

    const label =
        kind === 'onboarding'
            ? formatOnboardingStatusLabel(status)
            : kind === 'stage'
              ? formatStageStatusLabel(status)
              : formatInvitationStatusLabel(status);

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}>
            {label}
        </span>
    );
};

