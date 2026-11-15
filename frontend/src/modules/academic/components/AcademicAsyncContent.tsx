import React from 'react';
import { DashboardEmptyState } from '../../../components/Dashboards/DashboardEmptyState';
import type { AcademicFetchError } from '../hooks/useAcademicStructure';

interface AcademicAsyncContentProps {
    canRead: boolean;
    requiredPermission: string;
    isLoading: boolean;
    loadingMessage: string;
    loadError: AcademicFetchError | null;
    backendPendingEndpoint: string;
    onRetry: () => void;
    isEmpty: boolean;
    emptyTitle: string;
    emptyDescription: string;
    children: React.ReactNode;
}

export const AcademicAsyncContent: React.FC<AcademicAsyncContentProps> = ({
    canRead,
    requiredPermission,
    isLoading,
    loadingMessage,
    loadError,
    backendPendingEndpoint,
    onRetry,
    isEmpty,
    emptyTitle,
    emptyDescription,
    children,
}) => {
    if (!canRead) {
        return (
            <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
            >
                Access Denied: Viewing this section requires the{' '}
                <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                    {requiredPermission}
                </code>{' '}
                permission.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div
                role="status"
                className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-12 text-center shadow-sm"
            >
                <div
                    className="mb-3 h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                    aria-hidden="true"
                />
                <p className="text-sm font-medium text-gray-700">{loadingMessage}</p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div
                role="alert"
                className={`rounded-lg border p-6 shadow-sm ${
                    loadError.isBackendUnavailable
                        ? 'border-amber-200 bg-amber-50 text-amber-950'
                        : 'border-red-200 bg-red-50 text-red-900'
                }`}
            >
                <h3 className="text-sm font-semibold">
                    {loadError.isBackendUnavailable
                        ? 'Backend Academic Endpoint Pending Implementation'
                        : 'Unable to Load Records'}
                </h3>
                <p className="mt-1.5 text-sm">
                    {loadError.isBackendUnavailable
                        ? `Endpoint (${backendPendingEndpoint}) is pending backend implementation. No mock data has been substituted.`
                        : loadError.message}
                </p>
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-4 rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (isEmpty) {
        return <DashboardEmptyState title={emptyTitle} description={emptyDescription} headingLevel="h3" />;
    }

    return <>{children}</>;
};

