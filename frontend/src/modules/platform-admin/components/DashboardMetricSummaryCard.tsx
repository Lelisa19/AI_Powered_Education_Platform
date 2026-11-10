import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardOverviewCard } from '../../../components/Dashboards/DashboardOverviewCard';
import {
    formatDashboardMetricValue,
    isReportedMetricNumber,
} from '../utils/platform-dashboard-helpers';

export type MetricTone = 'neutral' | 'positive' | 'warning' | 'danger';

export interface DashboardMetricRow {
    label: string;
    value: number | null | undefined;
    tone?: MetricTone;
}

export interface DashboardMetricSummaryCardProps {
    title: string;
    description: string;
    status: 'loading' | 'unavailable' | 'error' | 'loaded';
    primaryLabel: string;
    primaryValue: number | null | undefined;
    breakdownRows: readonly DashboardMetricRow[];
    actionLabel: string;
    actionTo: string;
    unavailableMessage?: string;
}

function getValueClassName(value: number | null | undefined, tone: MetricTone = 'neutral'): string {
    if (!isReportedMetricNumber(value)) {
        return 'text-xs font-medium text-gray-500';
    }

    if (value === 0 || tone === 'neutral') {
        return 'text-sm font-semibold tabular-nums text-gray-900';
    }

    if (tone === 'positive') {
        return 'text-sm font-semibold tabular-nums text-emerald-700';
    }

    if (tone === 'warning') {
        return 'text-sm font-semibold tabular-nums text-amber-700';
    }

    return 'text-sm font-semibold tabular-nums text-red-700';
}

export const DashboardMetricSummaryCard: React.FC<DashboardMetricSummaryCardProps> = ({
    title,
    description,
    status,
    primaryLabel,
    primaryValue,
    breakdownRows,
    actionLabel,
    actionTo,
    unavailableMessage = 'Metrics pending backend summary API support.',
}) => {
    const primaryIsNumber = isReportedMetricNumber(primaryValue);

    return (
        <DashboardOverviewCard title={title} headingLevel="h3">
            <div className="space-y-4">
                <p className="text-sm text-gray-600">{description}</p>

                {status === 'loading' ? (
                    <div role="status" className="space-y-3 py-1">
                        <span className="sr-only">Loading {title} metrics...</span>
                        <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
                            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" aria-hidden="true" />
                            <div className="h-7 w-14 animate-pulse rounded bg-gray-200" aria-hidden="true" />
                        </div>
                        <div className="space-y-2.5">
                            {breakdownRows.map((row) => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100" aria-hidden="true" />
                                    <div className="h-3.5 w-10 animate-pulse rounded bg-gray-200" aria-hidden="true" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : status === 'unavailable' ? (
                    <div className="space-y-3">
                        <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
                            <span className="text-sm font-medium text-gray-600">{primaryLabel}</span>
                            <span
                                className="text-base font-medium text-gray-400"
                                aria-label={`${primaryLabel}: unavailable`}
                            >
                                —
                            </span>
                        </div>
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            {unavailableMessage}
                        </p>
                    </div>
                ) : status === 'error' ? (
                    <div className="space-y-3">
                        <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
                            <span className="text-sm font-medium text-gray-600">{primaryLabel}</span>
                            <span
                                className="text-base font-medium text-gray-400"
                                aria-label={`${primaryLabel}: unavailable due to error`}
                            >
                                —
                            </span>
                        </div>
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            Unable to load metrics for this section.
                        </p>
                    </div>
                ) : (
                    <dl className="space-y-3">
                        <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
                            <dt className="text-sm font-medium text-gray-600">{primaryLabel}</dt>
                            <dd
                                className={
                                    primaryIsNumber
                                        ? 'text-2xl font-bold tabular-nums text-gray-900'
                                        : 'text-xs font-medium text-gray-500'
                                }
                            >
                                {formatDashboardMetricValue(primaryValue)}
                            </dd>
                        </div>

                        <div className="space-y-2">
                            {breakdownRows.map((row) => (
                                <div key={row.label} className="flex items-center justify-between gap-4">
                                    <dt className="text-sm text-gray-600">{row.label}</dt>
                                    <dd className={getValueClassName(row.value, row.tone)}>
                                        {formatDashboardMetricValue(row.value)}
                                    </dd>
                                </div>
                            ))}
                        </div>
                    </dl>
                )}

                <div className="border-t border-gray-100 pt-3">
                    <Link
                        to={actionTo}
                        className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                        <span>{actionLabel}</span>
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </Link>
                </div>
            </div>
        </DashboardOverviewCard>
    );
};

