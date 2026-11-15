import React, { useMemo, useState } from 'react';
import { ApiError } from '../../../services/api/api-error';
import { AcademicModalShell } from '../../academic/components/AcademicConfirmDialog';
import { formatStudentFullName } from '../../students/schemas/student-management-schema';
import type { ProgramChangeDecisionOutcome } from '../hooks/useProgramChangeQueue';
import {
    ENROLLMENT_LIMITS,
    evaluateProgramChangeDecisionEligibility,
    formatAcademicTimestamp,
    mapBackendFieldValidationErrors,
    validateProgramChangeDecisionForm,
} from '../schemas/enrollment-schema';
import type {
    ProgramChangeDecisionFieldErrors,
    ProgramChangeDecisionRequest,
    ProgramChangeRequestRecord,
} from '../types/enrollment.types';
import { ProgramChangeStatusBadge } from './EnrollmentBadges';

const DECISION_ERROR_FIELDS = ['note'] as const;

interface ProgramChangeDecisionModalProps {
    request: ProgramChangeRequestRecord;
    currentActorId: string | null | undefined;
    canApproveProgramChange: boolean;
    isSubmitting: boolean;
    onSubmitDecision: (
        requestRecord: ProgramChangeRequestRecord,
        decisionPayload: ProgramChangeDecisionRequest
    ) => Promise<ProgramChangeDecisionOutcome>;
    onClose: () => void;
}

export const ProgramChangeDecisionModal: React.FC<ProgramChangeDecisionModalProps> = ({
    request,
    currentActorId,
    canApproveProgramChange,
    isSubmitting,
    onSubmitDecision,
    onClose,
}) => {
    const [decisionMode, setDecisionMode] = useState<'APPROVE' | 'REJECT'>('APPROVE');
    const [confirmedAtomicApprove, setConfirmedAtomicApprove] = useState(false);
    const [note, setNote] = useState('');
    const [fieldErrors, setFieldErrors] = useState<ProgramChangeDecisionFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const studentLabel = request.student
        ? formatStudentFullName(
              request.student.firstName,
              request.student.lastName,
              request.student.email
          )
        : request.studentId;

    const baseEligibility = useMemo(
        () =>
            evaluateProgramChangeDecisionEligibility({
                request,
                currentActorId,
                canApproveProgramChange,
            }),
        [canApproveProgramChange, currentActorId, request]
    );

    const modeEligibility = useMemo(
        () =>
            evaluateProgramChangeDecisionEligibility({
                request,
                decision: decisionMode,
                currentActorId,
                canApproveProgramChange,
            }),
        [canApproveProgramChange, currentActorId, decisionMode, request]
    );

    const isPending = request.status === 'PENDING';
    const isSelfSubmitted =
        Boolean(currentActorId) && request.requestedBy.id === currentActorId;

    const handleModeChange = (nextMode: 'APPROVE' | 'REJECT') => {
        setDecisionMode(nextMode);
        setFieldErrors({});
        setSubmitError(null);
        if (nextMode === 'REJECT') {
            setConfirmedAtomicApprove(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting || !isPending) return;

        setSubmitError(null);

        if (decisionMode === 'APPROVE' && !confirmedAtomicApprove) {
            setSubmitError(
                'Confirm that you understand approval atomically withdraws the active enrollment and activates the new Program enrollment.'
            );
            return;
        }

        const validation = validateProgramChangeDecisionForm({
            request,
            decision: decisionMode,
            values: { note },
            currentActorId,
            canApproveProgramChange,
        });

        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            if (validation.generalError) {
                setSubmitError(validation.generalError);
            }
            return;
        }
        setFieldErrors({});

        const outcome = await onSubmitDecision(request, validation.payload);
        if (outcome.ok) {
            onClose();
            return;
        }

        if (outcome.error instanceof ApiError && outcome.error.validationErrors) {
            setFieldErrors(
                mapBackendFieldValidationErrors(
                    outcome.error.validationErrors,
                    DECISION_ERROR_FIELDS
                )
            );
        }
        setSubmitError(
            outcome.errorMessage ?? 'Unable to submit Program Change decision.'
        );
    };

    return (
        <AcademicModalShell
            title={
                isPending
                    ? 'Review Program Change Request'
                    : 'Program Change Request Details'
            }
            subtitle={`Request ID: ${request.id} · ${
                request.academicYearName ?? request.academicYearId
            }`}
            isSubmitting={isSubmitting}
            onClose={onClose}
            maxWidthClass="max-w-2xl"
        >
            <div className="space-y-4 text-sm text-gray-700">
                {/* Student & Status Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 p-3.5">
                    <div>
                        <p className="text-xs font-medium text-gray-500">Student</p>
                        <p className="text-sm font-semibold text-gray-900">{studentLabel}</p>
                        {request.student?.email && (
                            <p className="text-xs text-gray-600">{request.student.email}</p>
                        )}
                        {request.student?.studentCode && (
                            <p className="mt-0.5 font-mono text-[11px] text-gray-500">
                                Student Code: {request.student.studentCode}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <ProgramChangeStatusBadge status={request.status} />
                        <span className="text-[11px] text-gray-600">
                            Academic Year:{' '}
                            <strong>
                                {request.academicYearName ?? request.academicYearId}
                            </strong>
                            {request.academicYearStatus
                                ? ` (${request.academicYearStatus})`
                                : ''}
                        </span>
                    </div>
                </div>

                {/* Source vs Target Comparison */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-gray-200 bg-white p-3 text-xs">
                        <p className="font-semibold uppercase tracking-wide text-gray-500">
                            Current Active Placement
                        </p>
                        <dl className="mt-2 space-y-1">
                            <div>
                                <dt className="text-gray-500">Program:</dt>
                                <dd className="font-semibold text-gray-900">
                                    {request.sourceProgramName ?? request.sourceProgramId}
                                    {request.sourceProgramCode
                                        ? ` (${request.sourceProgramCode})`
                                        : ''}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-gray-500">Academic Class:</dt>
                                <dd className="font-medium text-gray-800">
                                    {request.sourceAcademicClassName ??
                                        request.sourceAcademicClassId}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-gray-500">Section:</dt>
                                <dd className="font-medium text-gray-800">
                                    {request.sourceSectionName ??
                                        request.sourceSectionId ??
                                        'Unassigned'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-gray-500">Source Enrollment ID:</dt>
                                <dd className="font-mono text-[11px] text-gray-600">
                                    {request.sourceEnrollmentId}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="rounded-md border border-indigo-200 bg-indigo-50/40 p-3 text-xs">
                        <p className="font-semibold uppercase tracking-wide text-indigo-800">
                            Requested Target Placement
                        </p>
                        <dl className="mt-2 space-y-1">
                            <div>
                                <dt className="text-indigo-700">Target Program:</dt>
                                <dd className="font-semibold text-gray-900">
                                    {request.targetProgramName ?? request.targetProgramId}
                                    {request.targetProgramCode
                                        ? ` (${request.targetProgramCode})`
                                        : ''}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-indigo-700">Target Academic Class:</dt>
                                <dd className="font-medium text-gray-800">
                                    {request.targetAcademicClassName ??
                                        request.targetAcademicClassId}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-indigo-700">Target Section:</dt>
                                <dd className="font-medium text-gray-800">
                                    {request.targetSectionName ??
                                        request.targetSectionId ??
                                        'Unassigned (No Section)'}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Request Audit Info & Reason */}
                <div className="rounded-md border border-gray-200 bg-white p-3 text-xs space-y-1.5">
                    <p>
                        <strong>Request Reason:</strong> {request.reason}
                    </p>
                    <p className="text-gray-600">
                        <strong>Requested By:</strong>{' '}
                        {request.requestedBy.name ??
                            request.requestedBy.email ??
                            request.requestedBy.id}{' '}
                        on {formatAcademicTimestamp(request.requestedAt)}
                    </p>
                </div>

                {/* Finalized Decision Read-Only Summary */}
                {!isPending && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5 text-xs space-y-1.5">
                        <p className="font-semibold uppercase tracking-wide text-gray-600">
                            Finalized Decision Record (Read-Only)
                        </p>
                        <p>
                            <strong>Status:</strong> {request.status}
                        </p>
                        <p>
                            <strong>Reviewed By:</strong>{' '}
                            {request.reviewedBy?.name ??
                                request.reviewedBy?.email ??
                                request.reviewedBy?.id ??
                                '—'}
                        </p>
                        <p>
                            <strong>Reviewed At:</strong>{' '}
                            {formatAcademicTimestamp(request.reviewedAt)}
                        </p>
                        {request.decisionNote && (
                            <p>
                                <strong>Decision Note:</strong> {request.decisionNote}
                            </p>
                        )}
                        {request.resultingEnrollmentId && (
                            <p>
                                <strong>Resulting Active Enrollment ID:</strong>{' '}
                                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-gray-800">
                                    {request.resultingEnrollmentId}
                                </code>
                            </p>
                        )}
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Pending Decision Form or Blocked Alert */}
                {isPending && !baseEligibility.allowed && (
                    <div className="space-y-3">
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
                        >
                            {isSelfSubmitted
                                ? 'Self-review is blocked: the School Admin who submitted this Program Change Request cannot approve or reject it. Another authorized reviewer must complete the decision.'
                                : baseEligibility.reason ??
                                  'This Program Change Request cannot be decided right now.'}
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {isPending && baseEligibility.allowed && (
                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        <div className="flex gap-2 rounded-md border border-gray-200 bg-gray-50 p-1.5">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleModeChange('APPROVE')}
                                className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    decisionMode === 'APPROVE'
                                        ? 'bg-emerald-700 text-white shadow-sm'
                                        : 'text-gray-700 hover:bg-white'
                                }`}
                            >
                                Approve Program Change
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleModeChange('REJECT')}
                                className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    decisionMode === 'REJECT'
                                        ? 'bg-rose-700 text-white shadow-sm'
                                        : 'text-gray-700 hover:bg-white'
                                }`}
                            >
                                Reject Request
                            </button>
                        </div>

                        {!modeEligibility.allowed && (
                            <div
                                role="alert"
                                className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                            >
                                {modeEligibility.reason}
                            </div>
                        )}

                        {decisionMode === 'APPROVE' && (
                            <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
                                <p>
                                    Approving atomically withdraws the student&apos;s current{' '}
                                    <strong>ACTIVE</strong> enrollment in{' '}
                                    <strong>
                                        {request.sourceProgramName ?? request.sourceProgramId}
                                    </strong>{' '}
                                    and activates a new enrollment in{' '}
                                    <strong>
                                        {request.targetProgramName ?? request.targetProgramId}
                                    </strong>
                                    .
                                </p>
                                <label className="flex items-start gap-2 font-medium">
                                    <input
                                        type="checkbox"
                                        checked={confirmedAtomicApprove}
                                        disabled={isSubmitting}
                                        onChange={(e) => {
                                            setConfirmedAtomicApprove(e.target.checked);
                                            setSubmitError(null);
                                        }}
                                        className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-700 focus:ring-emerald-600"
                                    />
                                    <span>
                                        I understand approving will atomically withdraw the
                                        student&apos;s current active enrollment and activate a new
                                        enrollment in the target Program.
                                    </span>
                                </label>
                            </div>
                        )}

                        {decisionMode === 'REJECT' && (
                            <div
                                role="note"
                                className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
                            >
                                Rejecting keeps the student&apos;s existing{' '}
                                <strong>ACTIVE</strong> enrollment unchanged and records your
                                rejection reason in history.
                            </div>
                        )}

                        {submitError && (
                            <div
                                role="alert"
                                className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                            >
                                {submitError}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="program-change-decision-note"
                                className="block text-xs font-semibold uppercase tracking-wide text-gray-700"
                            >
                                {decisionMode === 'REJECT' ? (
                                    <>
                                        Rejection Reason <span className="text-red-600">*</span>
                                    </>
                                ) : (
                                    'Approval Note (Optional)'
                                )}
                            </label>
                            <textarea
                                id="program-change-decision-note"
                                rows={3}
                                maxLength={ENROLLMENT_LIMITS.ACTION_REASON_MAX}
                                value={note}
                                disabled={isSubmitting || !modeEligibility.allowed}
                                onChange={(e) => {
                                    setNote(e.target.value);
                                    setFieldErrors({});
                                    setSubmitError(null);
                                }}
                                placeholder={
                                    decisionMode === 'REJECT'
                                        ? 'Provide a clear reason for rejecting this Program Change Request...'
                                        : 'Optional review note for the enrollment audit log...'
                                }
                                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 ${
                                    fieldErrors.note ? 'border-red-400' : 'border-gray-300'
                                }`}
                            />
                            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                                <span className="text-red-700">{fieldErrors.note ?? ''}</span>
                                <span>
                                    {note.length}/{ENROLLMENT_LIMITS.ACTION_REASON_MAX}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-3">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={onClose}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    !modeEligibility.allowed ||
                                    (decisionMode === 'APPROVE' && !confirmedAtomicApprove)
                                }
                                className={`rounded-md px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                                    decisionMode === 'APPROVE'
                                        ? 'bg-emerald-700 hover:bg-emerald-800'
                                        : 'bg-rose-700 hover:bg-rose-800'
                                }`}
                            >
                                {isSubmitting
                                    ? 'Submitting Decision...'
                                    : decisionMode === 'APPROVE'
                                      ? 'Confirm Approval'
                                      : 'Confirm Rejection'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AcademicModalShell>
    );
};

