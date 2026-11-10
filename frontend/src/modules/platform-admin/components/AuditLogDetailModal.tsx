import React, { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import {
    getPlatformAuditLogById,
    isPlatformAuditLogBackendUnavailableError,
} from '../services/platform-audit-log-service';
import type { PlatformAuditLogRecord } from '../types/platform-audit-log.types';
import {
    formatActorAccountType,
    formatActorPrimaryDisplay,
    formatAuditActionCategory,
    formatAuditActionLabel,
    formatAuditMetadataValue,
    formatAuditResourceType,
    formatAuditTimestamp,
    formatOptionalAuditText,
    formatResourceIdentifierDisplay,
} from '../utils/platform-audit-log-formatters';
import { AuditOutcomeBadge } from './AuditOutcomeBadge';

interface AuditLogDetailModalProps {
    record: PlatformAuditLogRecord;
    onClose: () => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({ record, onClose }) => {
    const [detail, setDetail] = useState<PlatformAuditLogRecord>(record);
    const [isLoadingDetail, setIsLoadingDetail] = useState(true);
    const [detailError, setDetailError] = useState<string | null>(null);

    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let isActive = true;
        const controller = new AbortController();

        getPlatformAuditLogById(record.id, controller.signal)
            .then((response) => {
                if (!isActive) return;
                setDetail(response.auditLog);
                setDetailError(null);
            })
            .catch((err: unknown) => {
                if (!isActive) return;
                if (err instanceof ApiError && err.isCancellation) return;

                setDetailError(
                    isPlatformAuditLogBackendUnavailableError(err)
                        ? 'Audit log detail endpoint is unavailable; showing list summary fields only.'
                        : err instanceof Error && err.message
                          ? err.message
                          : 'Unable to fetch full audit record details.'
                );
            })
            .finally(() => {
                if (isActive) {
                    setIsLoadingDetail(false);
                }
            });

        const frameId = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            isActive = false;
            controller.abort();
            cancelAnimationFrame(frameId);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, record.id]);

    const actorDisplay = formatActorPrimaryDisplay(detail);
    const resourceDisplay = formatResourceIdentifierDisplay(detail);
    const metadataEntries = detail.metadata ? Object.entries(detail.metadata) : [];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="audit-log-detail-title"
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2
                                id="audit-log-detail-title"
                                className="text-lg font-semibold text-gray-900"
                            >
                                {formatAuditActionLabel(detail.action)}
                            </h2>
                            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                Read-Only
                            </span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-gray-500">
                            Audit ID: {detail.id}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close audit record details dialog"
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6 px-6 py-5">
                    {isLoadingDetail && (
                        <div role="status" className="text-xs text-gray-600">
                            Loading full audit record details...
                        </div>
                    )}

                    {detailError && (
                        <div
                            role="status"
                            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                        >
                            {detailError}
                        </div>
                    )}

                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Timestamp
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <div>{formatAuditTimestamp(detail.occurredAt)}</div>
                                <div className="mt-0.5 font-mono text-xs text-gray-500">
                                    {detail.occurredAt}
                                </div>
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Outcome
                            </dt>
                            <dd className="mt-1">
                                <AuditOutcomeBadge outcome={detail.outcome} />
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Action / Event Type
                            </dt>
                            <dd className="mt-1 font-mono text-xs font-medium text-gray-900">
                                {detail.action}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Action Category
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatAuditActionCategory(detail.actionCategory)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Actor
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <div>{actorDisplay.primary}</div>
                                {actorDisplay.secondary && (
                                    <div className="text-xs text-gray-500">
                                        {actorDisplay.secondary}
                                    </div>
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Actor Account Type
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatActorAccountType(detail.actorAccountType)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Affected Resource Type
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatAuditResourceType(detail.resourceType)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Affected Resource
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <div>{resourceDisplay.primary}</div>
                                {resourceDisplay.secondary && (
                                    <div className="font-mono text-xs text-gray-500">
                                        {resourceDisplay.secondary}
                                    </div>
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Source IP
                            </dt>
                            <dd className="mt-1 font-mono text-xs text-gray-900">
                                {formatOptionalAuditText(detail.sourceIp)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Request ID
                            </dt>
                            <dd className="mt-1 font-mono text-xs text-gray-900">
                                {formatOptionalAuditText(detail.requestId)}
                            </dd>
                        </div>

                        <div className="sm:col-span-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Event Summary
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatOptionalAuditText(detail.summary)}
                            </dd>
                        </div>
                    </dl>

                    <div className="space-y-2 border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900">
                            Safe Event Metadata
                        </h3>
                        {metadataEntries.length === 0 ? (
                            <p className="text-xs text-gray-500">
                                No additional metadata recorded for this event.
                            </p>
                        ) : (
                            <dl className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-gray-50">
                                {metadataEntries.map(([key, value]) => (
                                    <div
                                        key={key}
                                        className="grid grid-cols-1 gap-1 px-3 py-2 text-xs sm:grid-cols-3 sm:gap-4"
                                    >
                                        <dt className="font-mono font-medium text-gray-700">
                                            {key}
                                        </dt>
                                        <dd className="break-words text-gray-900 sm:col-span-2">
                                            {formatAuditMetadataValue(value)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-500">
                        Audit entries are immutable and cannot be modified or deleted.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

