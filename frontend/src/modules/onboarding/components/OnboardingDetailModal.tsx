import React, { useEffect, useRef, useState } from 'react';
import { DomainVerificationBadge } from '../../domains/components/DomainVerificationBadge';
import {
    getOnboardingByTenantId,
    getPrimaryAdminInvitationStatus,
    isOnboardingBackendUnavailableError,
    resendPrimaryAdminInvitation,
    revokePrimaryAdminInvitation,
} from '../services/onboarding-service';
import type {
    PrimaryAdminInvitationResponse,
    PrimarySchoolAdminInvitation,
    SchoolOnboardingRecord,
} from '../types/onboarding.types';
import { formatOnboardingDate, formatOnboardingStageLabel } from '../utils/onboarding-formatters';
import { OnboardingStatusBadge } from './OnboardingStatusBadge';

interface OnboardingDetailModalProps {
    record: SchoolOnboardingRecord;
    canManageOnboarding: boolean;
    onClose: () => void;
    onRecordUpdated: (record: SchoolOnboardingRecord, notice?: string) => void;
    onOpenInviteModal: (record: SchoolOnboardingRecord) => void;
}

export const OnboardingDetailModal: React.FC<OnboardingDetailModalProps> = ({
    record,
    canManageOnboarding,
    onClose,
    onRecordUpdated,
    onOpenInviteModal,
}) => {
    const [detail, setDetail] = useState<SchoolOnboardingRecord>(record);
    const [invitationDetail, setInvitationDetail] = useState<PrimarySchoolAdminInvitation | null>(
        record.primaryAdminInvitation ?? null
    );
    const [isLoadingDetail, setIsLoadingDetail] = useState(true);
    const [detailError, setDetailError] = useState('');

    const [actionNotice, setActionNotice] = useState('');
    const [actionError, setActionError] = useState('');
    const [isMutatingInvitation, setIsMutatingInvitation] = useState(false);

    const isBusyRef = useRef(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let isActive = true;

        Promise.allSettled([
            getOnboardingByTenantId(record.tenant.id),
            getPrimaryAdminInvitationStatus(record.tenant.id),
        ])
            .then(([recordResult, invitationResult]) => {
                if (!isActive) return;

                if (recordResult.status === 'fulfilled') {
                    setDetail(recordResult.value.record);
                    if (recordResult.value.record.primaryAdminInvitation !== undefined) {
                        setInvitationDetail(recordResult.value.record.primaryAdminInvitation ?? null);
                    }
                } else {
                    const err: unknown = recordResult.reason;
                    setDetailError(
                        isOnboardingBackendUnavailableError(err)
                            ? 'Onboarding detail endpoint is unavailable or pending backend implementation.'
                            : err instanceof Error && err.message
                              ? err.message
                              : 'Unable to load latest onboarding details.'
                    );
                }

                if (invitationResult.status === 'fulfilled') {
                    setInvitationDetail(invitationResult.value.invitation);
                }
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
            if (event.key === 'Escape' && !isBusyRef.current) {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            isActive = false;
            cancelAnimationFrame(frameId);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [record.tenant.id, onClose]);

    const applyInvitationMutation = (
        response: PrimaryAdminInvitationResponse,
        fallbackMessage: string
    ) => {
        setInvitationDetail(response.invitation);
        const updatedRecord: SchoolOnboardingRecord = response.record
            ? response.record
            : {
                  ...detail,
                  primaryAdminInvitation: response.invitation,
              };
        setDetail(updatedRecord);
        const notice = response.message || fallbackMessage;
        setActionNotice(notice);
        onRecordUpdated(updatedRecord, notice);
    };

    const handleResendInvitation = async () => {
        if (!canManageOnboarding || !invitationDetail || isBusyRef.current || isMutatingInvitation) {
            return;
        }

        isBusyRef.current = true;
        setIsMutatingInvitation(true);
        setActionError('');
        setActionNotice('');

        try {
            const response = await resendPrimaryAdminInvitation({
                tenantId: detail.tenant.id,
                invitationId: invitationDetail.id,
            });
            applyInvitationMutation(
                response,
                `Resent Primary School Admin invitation to ${response.invitation.email}.`
            );
        } catch (error: unknown) {
            setActionError(
                isOnboardingBackendUnavailableError(error)
                    ? 'Resend invitation endpoint is unavailable or pending backend implementation.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to resend invitation.'
            );
        } finally {
            isBusyRef.current = false;
            setIsMutatingInvitation(false);
        }
    };

    const handleRevokeInvitation = async () => {
        if (!canManageOnboarding || !invitationDetail || isBusyRef.current || isMutatingInvitation) {
            return;
        }

        isBusyRef.current = true;
        setIsMutatingInvitation(true);
        setActionError('');
        setActionNotice('');

        try {
            const response = await revokePrimaryAdminInvitation({
                tenantId: detail.tenant.id,
                invitationId: invitationDetail.id,
            });
            applyInvitationMutation(
                response,
                `Revoked Primary School Admin invitation for ${response.invitation.email}.`
            );
        } catch (error: unknown) {
            setActionError(
                isOnboardingBackendUnavailableError(error)
                    ? 'Revoke invitation endpoint is unavailable or pending backend implementation.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to revoke invitation.'
            );
        } finally {
            isBusyRef.current = false;
            setIsMutatingInvitation(false);
        }
    };

    const invitationStatus = invitationDetail?.status.trim().toUpperCase() ?? 'NOT_SENT';
    const canSendNewInvite =
        canManageOnboarding &&
        (!invitationDetail ||
            invitationStatus === 'NOT_SENT' ||
            invitationStatus === 'EXPIRED' ||
            invitationStatus === 'REVOKED');
    const canResend =
        canManageOnboarding &&
        Boolean(invitationDetail) &&
        (invitationStatus === 'PENDING' || invitationStatus === 'EXPIRED');
    const canRevoke =
        canManageOnboarding && Boolean(invitationDetail) && invitationStatus === 'PENDING';

    const guidedSetup = detail.progress.guidedSetup;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
                if (!isMutatingInvitation) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="onboarding-detail-title"
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 id="onboarding-detail-title" className="text-lg font-semibold text-gray-900">
                            {detail.tenant.name}
                        </h2>
                        <p className="mt-0.5 font-mono text-xs text-gray-500">
                            {detail.tenant.slug} · ID: {detail.tenant.id}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        disabled={isMutatingInvitation}
                        onClick={onClose}
                        aria-label="Close onboarding details dialog"
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6 px-6 py-5">
                    {isLoadingDetail && (
                        <div role="status" className="text-sm text-gray-600">
                            Refreshing onboarding progress...
                        </div>
                    )}

                    {detailError && (
                        <div
                            role="alert"
                            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                        >
                            {detailError}
                        </div>
                    )}

                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Onboarding Status
                            </dt>
                            <dd className="mt-1">
                                <OnboardingStatusBadge kind="onboarding" status={detail.onboardingStatus} />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Current Stage
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatOnboardingStageLabel(detail.currentStage)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Associated Domain
                            </dt>
                            <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-900">
                                {detail.primaryDomain ? (
                                    <>
                                        <span className="font-mono text-xs">{detail.primaryDomain.hostname}</span>
                                        <DomainVerificationBadge
                                            status={detail.primaryDomain.verificationStatus}
                                        />
                                    </>
                                ) : (
                                    <span className="text-gray-500">No domain configured yet</span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Launch Readiness
                            </dt>
                            <dd className="mt-1 text-sm font-medium text-gray-900">
                                {detail.isReadyToLaunch ? 'Ready to Launch' : 'Not Ready for Launch'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Tenant Status
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">{detail.tenant.status}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Last Updated
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatOnboardingDate(detail.updatedAt)}
                            </dd>
                        </div>
                    </dl>

                    <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">Onboarding Stages</h3>
                            {detail.progress.completedSteps !== undefined &&
                                detail.progress.completedSteps !== null &&
                                detail.progress.totalSteps !== undefined &&
                                detail.progress.totalSteps !== null && (
                                    <span className="text-xs font-medium text-gray-600">
                                        {detail.progress.completedSteps} / {detail.progress.totalSteps} stages
                                        {detail.progress.percentage !== undefined &&
                                        detail.progress.percentage !== null
                                            ? ` (${detail.progress.percentage}%)`
                                            : ''}
                                    </span>
                                )}
                        </div>

                        {detail.progress.stages.length === 0 ? (
                            <p className="text-xs text-gray-600">
                                No backend stage progress items returned yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {detail.progress.stages.map((item) => (
                                    <li
                                        key={item.stage}
                                        className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {item.label || formatOnboardingStageLabel(item.stage)}
                                            </p>
                                            {item.details && (
                                                <p className="mt-0.5 text-xs text-gray-600">{item.details}</p>
                                            )}
                                            {item.completedAt && (
                                                <p className="mt-0.5 text-xs text-gray-500">
                                                    Completed: {formatOnboardingDate(item.completedAt)}
                                                </p>
                                            )}
                                        </div>
                                        <OnboardingStatusBadge kind="stage" status={item.status} />
                                    </li>
                                ))}
                            </ul>
                        )}

                        {guidedSetup && (
                            <div className="border-t border-gray-200 pt-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    Stage 5 Guided Setup Breakdown (Read-Only)
                                </h4>
                                <ul className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                    <li>
                                        School Information:{' '}
                                        {guidedSetup.schoolInfoCompleted ? 'Completed' : 'Pending'}
                                    </li>
                                    <li>
                                        Branding: {guidedSetup.brandingCompleted ? 'Completed' : 'Pending'}
                                    </li>
                                    <li>
                                        Website Content:{' '}
                                        {guidedSetup.websiteContentCompleted ? 'Completed' : 'Pending'}
                                    </li>
                                    <li>
                                        Initial Settings:{' '}
                                        {guidedSetup.initialSettingsCompleted ? 'Completed' : 'Pending'}
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Primary School Admin Invitation
                                </h3>
                                <p className="text-xs text-gray-600">
                                    Activated via the existing staff invitation flow without platform-supplied passwords.
                                </p>
                            </div>
                            <OnboardingStatusBadge kind="invitation" status={invitationStatus} />
                        </div>

                        {actionNotice && (
                            <div
                                role="status"
                                className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
                            >
                                {actionNotice}
                            </div>
                        )}

                        {actionError && (
                            <div
                                role="alert"
                                aria-live="assertive"
                                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                            >
                                {actionError}
                            </div>
                        )}

                        {invitationDetail ? (
                            <dl className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-white p-3 text-xs sm:grid-cols-2">
                                <div>
                                    <dt className="text-gray-500">Invitee Email</dt>
                                    <dd className="mt-0.5 font-medium text-gray-900">
                                        {invitationDetail.email}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">Sent</dt>
                                    <dd className="mt-0.5 text-gray-900">
                                        {formatOnboardingDate(invitationDetail.sentAt)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">Expires</dt>
                                    <dd className="mt-0.5 text-gray-900">
                                        {formatOnboardingDate(invitationDetail.expiresAt)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">
                                        {invitationDetail.revokedAt ? 'Revoked' : 'Activated'}
                                    </dt>
                                    <dd className="mt-0.5 text-gray-900">
                                        {formatOnboardingDate(
                                            invitationDetail.revokedAt ?? invitationDetail.acceptedAt
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        ) : (
                            <p className="text-xs text-gray-600">
                                No Primary School Admin invitation has been sent for this school yet.
                            </p>
                        )}

                        {canManageOnboarding && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {canSendNewInvite && (
                                    <button
                                        type="button"
                                        disabled={isMutatingInvitation}
                                        onClick={() => onOpenInviteModal(detail)}
                                        className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                                    >
                                        Invite Primary Admin
                                    </button>
                                )}
                                {canResend && (
                                    <button
                                        type="button"
                                        disabled={isMutatingInvitation}
                                        onClick={handleResendInvitation}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                                    >
                                        {isMutatingInvitation ? 'Working...' : 'Resend Invitation'}
                                    </button>
                                )}
                                {canRevoke && (
                                    <button
                                        type="button"
                                        disabled={isMutatingInvitation}
                                        onClick={handleRevokeInvitation}
                                        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
                                    >
                                        Revoke Invitation
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end border-t border-gray-200 pt-4">
                        <button
                            type="button"
                            disabled={isMutatingInvitation}
                            onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

