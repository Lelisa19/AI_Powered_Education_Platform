import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { ProgramChangeDecisionModal } from '../../enrollment/components/ProgramChangeDecisionModal';
import { ProgramChangeQueueSection } from '../../enrollment/components/ProgramChangeQueueSection';
import { useProgramChangeQueue } from '../../enrollment/hooks/useProgramChangeQueue';
import {
    type StudentEnrollmentPermissions,
    useStudentEnrollments,
} from '../../enrollment/hooks/useStudentEnrollments';
import { CreateStudentModal } from '../components/CreateStudentModal';
import {
    type PendingStudentLifecycleAction,
    StudentDetailModal,
    StudentLifecycleConfirmDialog,
} from '../components/StudentDetailModal';
import { StudentDirectorySection } from '../components/StudentDirectorySection';
import {
    type StudentManagementPermissions,
    useStudentManagement,
} from '../hooks/useStudentManagement';

type StudentWorkspaceTabId = 'directory' | 'approvals' | 'program-changes';

export const StudentManagementPage: React.FC = () => {
    const { user } = useAuth();
    const { classification, tenantId, schoolName, hostname } = useTenantContext();
    const { hasPermission } = usePermissions();

    const perms: StudentManagementPermissions = useMemo(
        () => ({
            canReadStudents: hasPermission(PERMISSIONS.STUDENTS.READ),
            canCreateStudents: hasPermission(PERMISSIONS.STUDENTS.CREATE),
            canUpdateStudents: hasPermission(PERMISSIONS.STUDENTS.UPDATE),
            canApproveStudents: hasPermission(PERMISSIONS.STUDENTS.APPROVE),
            canDisableStudents: hasPermission(PERMISSIONS.STUDENTS.DISABLE),
        }),
        [hasPermission]
    );

    const enrollmentPerms: StudentEnrollmentPermissions = useMemo(
        () => ({
            canReadStudents: perms.canReadStudents,
            canReadEnrollments: hasPermission(PERMISSIONS.ENROLLMENTS.READ),
            canCreateEnrollments: hasPermission(PERMISSIONS.ENROLLMENTS.CREATE),
            canUpdateEnrollments: hasPermission(PERMISSIONS.ENROLLMENTS.UPDATE),
            canCancelEnrollments: hasPermission(PERMISSIONS.ENROLLMENTS.CANCEL),
            canApproveProgramChange: hasPermission(
                PERMISSIONS.ENROLLMENTS.APPROVE_PROGRAM_CHANGE
            ),
            canReadPrograms: hasPermission(PERMISSIONS.PROGRAMS.READ),
            canReadCourses: hasPermission(PERMISSIONS.COURSES.READ),
            canReadAcademicYears: hasPermission(PERMISSIONS.ACADEMIC_YEARS.READ),
            canReadSections: hasPermission(PERMISSIONS.SECTIONS.READ),
        }),
        [hasPermission, perms.canReadStudents]
    );

    const isVerifiedSchoolSession =
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user?.accountType === 'SCHOOL' &&
        user.tenantId === tenantId;

    const canAccessDirectoryOrApprovals = perms.canReadStudents || perms.canApproveStudents;
    const hasAnyStudentAccess =
        canAccessDirectoryOrApprovals || enrollmentPerms.canApproveProgramChange;

    const visibleTabs = useMemo(() => {
        const tabs: { id: StudentWorkspaceTabId; label: string }[] = [];
        if (perms.canReadStudents) {
            tabs.push({ id: 'directory', label: 'Student Directory' });
        }
        if (perms.canApproveStudents || perms.canReadStudents) {
            tabs.push({ id: 'approvals', label: 'Registration Approvals' });
        }
        if (enrollmentPerms.canApproveProgramChange) {
            tabs.push({ id: 'program-changes', label: 'Program Change Queue' });
        }
        return tabs;
    }, [
        enrollmentPerms.canApproveProgramChange,
        perms.canApproveStudents,
        perms.canReadStudents,
    ]);

    const [preferredTab, setPreferredTab] = useState<StudentWorkspaceTabId | null>(null);
    const activeTab: StudentWorkspaceTabId | null = useMemo(() => {
        if (visibleTabs.length === 0) return null;
        if (preferredTab && visibleTabs.some((t) => t.id === preferredTab)) {
            return preferredTab;
        }
        return visibleTabs[0].id;
    }, [preferredTab, visibleTabs]);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [pendingQueueAction, setPendingQueueAction] =
        useState<PendingStudentLifecycleAction | null>(null);

    const {
        directoryQuery,
        setDirectoryQuery,
        students,
        directoryPagination,
        isLoadingDirectory,
        directoryError,

        approvalsQuery,
        setApprovalsQuery,
        pendingStudents,
        approvalsPagination,
        isLoadingApprovals,
        approvalsError,

        selectedSummary,
        detailRecord,
        hasVerifiedProfile,
        savedProfileValues,
        isLoadingDetail,
        detailError,
        openStudentDetails,
        retrySelectedStudentDetails,
        closeStudentDetails,

        isMutating,
        pageNotice,
        pageError,
        clearPageFeedback,
        createStudentAccount,
        saveStudentProfile,
        decideStudentRegistration,
        toggleStudentAccountStatus,
        reloadAll,
    } = useStudentManagement({
        actor: user,
        tenantId,
        enabled: isVerifiedSchoolSession && canAccessDirectoryOrApprovals,
        permissions: perms,
    });

    const reloadProgramChangeQueueRef = useRef<() => void>(() => {});
    const handleProgramChangeCreated = useCallback(() => {
        reloadProgramChangeQueueRef.current();
    }, []);

    const enrollmentState = useStudentEnrollments({
        actor: user,
        tenantId,
        enabled: isVerifiedSchoolSession && perms.canReadStudents,
        student: detailRecord ?? selectedSummary,
        permissions: enrollmentPerms,
        onProgramChangeCreated: handleProgramChangeCreated,
    });

    const queueState = useProgramChangeQueue({
        actor: user,
        tenantId,
        enabled: isVerifiedSchoolSession && enrollmentPerms.canApproveProgramChange,
        canApproveProgramChange: enrollmentPerms.canApproveProgramChange,
        onDecisionCompleted: (decidedStudentId) => {
            const openStudentId = detailRecord?.id ?? selectedSummary?.id ?? null;
            if (
                openStudentId &&
                openStudentId === decidedStudentId &&
                enrollmentPerms.canReadStudents &&
                enrollmentPerms.canReadEnrollments
            ) {
                enrollmentState.reloadAllStudentEnrollmentData();
            }
        },
    });

    useEffect(() => {
        reloadProgramChangeQueueRef.current = queueState.reloadQueue;
    }, [queueState.reloadQueue]);

    const displaySchoolName = schoolName || hostname || 'Verified School';
    const isAnyLoading =
        isLoadingDirectory || isLoadingApprovals || queueState.isLoadingQueue;
    const pendingTotalCount = approvalsPagination?.total;
    const pendingProgramChangesCount = queueState.pendingCount;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="Students Management"
                    subtitle={`Manage student accounts, registration approvals, enrollments, and Program Change approvals for ${displaySchoolName}.`}
                />

                {isVerifiedSchoolSession && hasAnyStudentAccess && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            disabled={isAnyLoading || isMutating || queueState.isDeciding}
                            onClick={() => {
                                if (canAccessDirectoryOrApprovals) {
                                    reloadAll();
                                }
                                if (enrollmentPerms.canApproveProgramChange) {
                                    queueState.reloadQueue();
                                }
                            }}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isAnyLoading ? 'Refreshing...' : 'Refresh All'}
                        </button>
                    </div>
                )}
            </div>

            {!isVerifiedSchoolSession ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Verified School Context Required: Student Management requires an authenticated
                    School Admin session matching the active school tenant.
                </div>
            ) : !hasAnyStudentAccess ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: Viewing Student Management requires{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.STUDENTS.READ}
                    </code>
                    ,{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.STUDENTS.APPROVE}
                    </code>
                    , or{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.ENROLLMENTS.APPROVE_PROGRAM_CHANGE}
                    </code>
                    .
                </div>
            ) : (
                <>
                    <div
                        role="note"
                        className="flex flex-col gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-950 sm:flex-row sm:items-center sm:justify-between"
                    >
                        {canAccessDirectoryOrApprovals ? (
                            <>
                                <span>
                                    Admin-created students enter{' '}
                                    <code className="font-mono">PENDING_ACTIVATION</code> until they
                                    complete email activation and set their own password.
                                    Self-registered students requiring review enter{' '}
                                    <code className="font-mono">PENDING_APPROVAL</code> for separate
                                    Registration Approval.
                                </span>
                                {!perms.canReadStudents && (
                                    <span className="shrink-0 font-semibold text-blue-900">
                                        Approval-Only View (directory &amp; profile edits require{' '}
                                        {PERMISSIONS.STUDENTS.READ} / {PERMISSIONS.STUDENTS.UPDATE})
                                    </span>
                                )}
                            </>
                        ) : (
                            <span>
                                Program Change Review View: you have{' '}
                                <code className="font-mono">
                                    {PERMISSIONS.ENROLLMENTS.APPROVE_PROGRAM_CHANGE}
                                </code>{' '}
                                access to review pending Grade-Based Program Change Requests across
                                the school.
                            </span>
                        )}
                    </div>

                    {pageNotice && (
                        <div
                            role="status"
                            className="flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                        >
                            <span>{pageNotice}</span>
                            <button
                                type="button"
                                onClick={clearPageFeedback}
                                className="text-xs font-medium text-emerald-800 underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    {pageError && (
                        <div
                            role={pageError.isBackendUnavailable ? 'status' : 'alert'}
                            className={`flex items-center justify-between gap-2 rounded-md border p-4 text-sm ${
                                pageError.isBackendUnavailable
                                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                                    : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                        >
                            <span>
                                {pageError.isBackendUnavailable
                                    ? `Student Management API endpoint is pending backend implementation (${pageError.message}). No local changes were persisted.`
                                    : pageError.message}
                            </span>
                            <button
                                type="button"
                                onClick={clearPageFeedback}
                                className="text-xs font-medium underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    <div className="border-b border-gray-200">
                        <nav
                            role="tablist"
                            aria-label="Student Management Sections"
                            className="-mb-px flex flex-wrap gap-2 sm:gap-4"
                        >
                            {visibleTabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setPreferredTab(tab.id)}
                                        className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                                            isActive
                                                ? 'border-blue-600 text-blue-700'
                                                : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        {tab.id === 'approvals' &&
                                            typeof pendingTotalCount === 'number' &&
                                            pendingTotalCount > 0 && (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                                    {pendingTotalCount}
                                                </span>
                                            )}
                                        {tab.id === 'program-changes' &&
                                            typeof pendingProgramChangesCount === 'number' &&
                                            pendingProgramChangesCount > 0 && (
                                                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                                                    {pendingProgramChangesCount}
                                                </span>
                                            )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {activeTab === 'directory' && perms.canReadStudents && (
                        <StudentDirectorySection
                            mode="directory"
                            students={students}
                            pagination={directoryPagination}
                            search={directoryQuery.search}
                            statusFilter={directoryQuery.status}
                            isLoading={isLoadingDirectory}
                            loadError={directoryError}
                            isMutating={isMutating}
                            canAccess={perms.canReadStudents}
                            canCreate={perms.canCreateStudents}
                            canApprove={perms.canApproveStudents}
                            onSearchSubmit={(search) =>
                                setDirectoryQuery((prev) => ({ ...prev, page: 1, search }))
                            }
                            onResetFilters={() =>
                                setDirectoryQuery((prev) => ({
                                    ...prev,
                                    page: 1,
                                    search: '',
                                    status: 'ALL',
                                }))
                            }
                            onStatusFilterChange={(status) =>
                                setDirectoryQuery((prev) => ({ ...prev, page: 1, status }))
                            }
                            onPageChange={(page) =>
                                setDirectoryQuery((prev) => ({ ...prev, page }))
                            }
                            onRetry={reloadAll}
                            onOpenCreate={() => setShowCreateModal(true)}
                            onOpenDetails={openStudentDetails}
                            onRequestDecision={(student, decision) =>
                                setPendingQueueAction({ kind: decision, student })
                            }
                        />
                    )}

                    {activeTab === 'approvals' &&
                        (perms.canApproveStudents || perms.canReadStudents) && (
                            <StudentDirectorySection
                                mode="approvals"
                                students={pendingStudents}
                                pagination={approvalsPagination}
                                search={approvalsQuery.search}
                                isLoading={isLoadingApprovals}
                                loadError={approvalsError}
                                isMutating={isMutating}
                                canAccess={perms.canApproveStudents || perms.canReadStudents}
                                canApprove={perms.canApproveStudents}
                                onSearchSubmit={(search) =>
                                    setApprovalsQuery((prev) => ({ ...prev, page: 1, search }))
                                }
                                onResetFilters={() =>
                                    setApprovalsQuery((prev) => ({
                                        ...prev,
                                        page: 1,
                                        search: '',
                                    }))
                                }
                                onPageChange={(page) =>
                                    setApprovalsQuery((prev) => ({ ...prev, page }))
                                }
                                onRetry={reloadAll}
                                onOpenDetails={openStudentDetails}
                                onRequestDecision={(student, decision) =>
                                    setPendingQueueAction({ kind: decision, student })
                                }
                            />
                        )}

                    {activeTab === 'program-changes' &&
                        enrollmentPerms.canApproveProgramChange && (
                            <ProgramChangeQueueSection
                                canApproveProgramChange={
                                    enrollmentPerms.canApproveProgramChange
                                }
                                currentActorId={user?.id ?? null}
                                items={queueState.queueItems}
                                pagination={queueState.queuePagination}
                                query={queueState.queueQuery}
                                isLoading={queueState.isLoadingQueue}
                                loadError={queueState.queueError}
                                isDeciding={queueState.isDeciding}
                                notice={queueState.queueNotice}
                                actionError={queueState.queueActionError}
                                onClearFeedback={queueState.clearQueueFeedback}
                                onQueryChange={queueState.setQueueQuery}
                                onRetry={queueState.reloadQueue}
                                onOpenReview={queueState.openReviewModal}
                            />
                        )}
                </>
            )}

            {showCreateModal && perms.canCreateStudents && (
                <CreateStudentModal
                    schoolDisplayName={displaySchoolName}
                    isSubmitting={isMutating}
                    onClose={() => setShowCreateModal(false)}
                    onSubmitCreate={createStudentAccount}
                />
            )}

            {selectedSummary && savedProfileValues && (
                <StudentDetailModal
                    key={selectedSummary.id}
                    summary={selectedSummary}
                    detailRecord={detailRecord}
                    hasVerifiedProfile={hasVerifiedProfile}
                    savedProfileValues={savedProfileValues}
                    isLoadingDetail={isLoadingDetail}
                    detailError={detailError}
                    currentActorId={user?.id ?? null}
                    canUpdateStudents={perms.canUpdateStudents}
                    canApproveStudents={perms.canApproveStudents}
                    canDisableStudents={perms.canDisableStudents}
                    enrollmentPermissions={enrollmentPerms}
                    enrollment={enrollmentState}
                    isMutating={isMutating}
                    onRetryDetail={retrySelectedStudentDetails}
                    onSaveProfile={saveStudentProfile}
                    onDecideRegistration={decideStudentRegistration}
                    onToggleStatus={toggleStudentAccountStatus}
                    onClose={closeStudentDetails}
                />
            )}

            {pendingQueueAction && (
                <StudentLifecycleConfirmDialog
                    action={pendingQueueAction}
                    isSubmitting={isMutating}
                    onCancel={() => setPendingQueueAction(null)}
                    onConfirm={async (reason) => {
                        const target = pendingQueueAction;
                        const outcome = await decideStudentRegistration(
                            target.student,
                            target.kind === 'APPROVE' ? 'APPROVE' : 'REJECT',
                            reason
                        );
                        if (outcome.ok || pendingQueueAction) {
                            setPendingQueueAction(null);
                        }
                    }}
                />
            )}

            {queueState.reviewTarget && enrollmentPerms.canApproveProgramChange && (
                <ProgramChangeDecisionModal
                    request={queueState.reviewTarget}
                    currentActorId={user?.id ?? null}
                    canApproveProgramChange={enrollmentPerms.canApproveProgramChange}
                    isSubmitting={queueState.isDeciding}
                    onSubmitDecision={queueState.submitProgramChangeDecision}
                    onClose={queueState.closeReviewModal}
                />
            )}
        </div>
    );
};

