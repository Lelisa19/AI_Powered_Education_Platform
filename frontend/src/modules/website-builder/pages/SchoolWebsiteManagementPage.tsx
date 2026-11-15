import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PERMISSIONS, SCHOOL_ADMIN_ROUTE_PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { WebsiteAboutEditor } from '../components/editor/WebsiteAboutEditor';
import { WebsiteDraftPreviewPane } from '../components/editor/WebsiteDraftPreviewPane';
import { WebsiteHeroEditor } from '../components/editor/WebsiteHeroEditor';
import { WebsiteProgramsEditor } from '../components/editor/WebsiteProgramsEditor';
import { WebsiteSocialLinksEditor } from '../components/editor/WebsiteSocialLinksEditor';
import { useSchoolWebsiteCms } from '../hooks/useSchoolWebsiteCms';
import {
    formatWebsiteTimestamp,
    hasAnyWebsiteValidationError,
} from '../schemas/website-cms-schema';
import type { WebsiteCmsSectionId, WebsitePublicationStatus } from '../types/website.types';

type WebsiteEditorTab = WebsiteCmsSectionId | 'preview';

interface PendingDiscardConfirmation {
    action: 'reload' | 'discard' | 'navigate-profile';
}

const SECTION_TABS: readonly { id: WebsiteCmsSectionId; label: string }[] = [
    { id: 'hero', label: 'Hero Banner' },
    { id: 'about', label: 'About & Mission' },
    { id: 'programs', label: 'Featured Programs' },
    { id: 'social', label: 'Social Links' },
];

function getPublicationBadgeConfig(
    status: WebsitePublicationStatus,
    hasUnpublishedChanges: boolean
): { label: string; className: string } {
    if (status === 'PUBLISHED' && !hasUnpublishedChanges) {
        return {
            label: 'Published Live',
            className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        };
    }

    if (status === 'DRAFT_CHANGES' || (status === 'PUBLISHED' && hasUnpublishedChanges)) {
        return {
            label: 'Published (Draft Ahead of Live)',
            className: 'border-amber-200 bg-amber-50 text-amber-800',
        };
    }

    return {
        label: 'Not Yet Published',
        className: 'border-gray-300 bg-gray-100 text-gray-800',
    };
}

export const SchoolWebsiteManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { classification, tenantId, schoolName, hostname } = useTenantContext();
    const { hasPermission, hasAnyPermission } = usePermissions();

    const canReadWebsite = hasPermission(PERMISSIONS.WEBSITE.READ);
    const canUpdateWebsite = hasPermission(PERMISSIONS.WEBSITE.UPDATE);
    const canPublishWebsite = hasPermission(PERMISSIONS.WEBSITE.PUBLISH);
    const canReadSchoolProfile = hasPermission(PERMISSIONS.SCHOOL_PROFILE.READ);
    const canAccessProfileRoute = hasAnyPermission([...SCHOOL_ADMIN_ROUTE_PERMISSIONS.PROFILE]);

    const isVerifiedSchoolSession =
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user?.accountType === 'SCHOOL' &&
        user.tenantId === tenantId;

    const [activeTab, setActiveTab] = useState<WebsiteEditorTab>('hero');
    const [pendingConfirmation, setPendingConfirmation] =
        useState<PendingDiscardConfirmation | null>(null);

    const {
        savedState,
        draftForm,
        previewConfig,
        validationErrors,
        sectionErrorCounts,
        sectionUnsavedMap,
        hasUnsavedChanges,
        isLoading,
        loadError,
        isSavingDraft,
        isPublishing,
        actionError,
        actionNotice,
        updateScalarField,
        addFeaturedProgram,
        updateFeaturedProgramField,
        moveFeaturedProgram,
        removeFeaturedProgram,
        addSocialLink,
        changeSocialLinkPlatform,
        updateSocialLinkUrl,
        removeSocialLink,
        discardLocalChanges,
        saveDraft,
        publishWebsite,
        reloadAll,
    } = useSchoolWebsiteCms({
        tenantId,
        enabled: isVerifiedSchoolSession && canReadWebsite,
        canUpdate: canUpdateWebsite,
        canPublish: canPublishWebsite,
        canReadSchoolProfile,
    });

    const isBusy = isLoading || isSavingDraft || isPublishing;
    const resolvedSchoolName =
        previewConfig?.identity.name || schoolName || hostname || 'Verified School';
    const hasValidationErrors = hasAnyWebsiteValidationError(validationErrors);

    const handleRefreshClick = () => {
        if (isBusy) return;
        if (hasUnsavedChanges) {
            setPendingConfirmation({ action: 'reload' });
            return;
        }
        setPendingConfirmation(null);
        reloadAll();
    };

    const handleDiscardClick = () => {
        if (isBusy || !hasUnsavedChanges) return;
        setPendingConfirmation({ action: 'discard' });
    };

    const handleConfirmPendingDiscard = () => {
        if (!pendingConfirmation) return;
        const action = pendingConfirmation.action;
        setPendingConfirmation(null);
        if (action === 'reload') {
            reloadAll();
        } else if (action === 'navigate-profile') {
            navigate('/admin/profile');
        } else {
            discardLocalChanges();
        }
    };

    const handleOpenProfileClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (hasUnsavedChanges) {
            event.preventDefault();
            setPendingConfirmation({ action: 'navigate-profile' });
        }
    };

    const handleSaveDraft = async () => {
        if (!canUpdateWebsite) return;
        setPendingConfirmation(null);
        const result = await saveDraft();
        if (!result.ok && result.firstErrorSection) {
            setActiveTab(result.firstErrorSection);
        }
    };

    const handlePublish = async () => {
        if (!canPublishWebsite) return;
        setPendingConfirmation(null);
        const result = await publishWebsite();
        if (!result.ok && result.firstErrorSection) {
            setActiveTab(result.firstErrorSection);
        }
    };

    if (!isVerifiedSchoolSession) {
        return (
            <div className="mx-auto max-w-6xl">
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: School Website Management can only be accessed inside a verified
                    school tenant administrator session.
                </div>
            </div>
        );
    }

    const publicationBadge = savedState
        ? getPublicationBadgeConfig(
              savedState.publicationStatus,
              savedState.hasUnpublishedChanges
          )
        : null;
    const draftSavedLabel = formatWebsiteTimestamp(savedState?.lastDraftSavedAt);
    const publishedAtLabel = formatWebsiteTimestamp(savedState?.publishedAt);
    const lastDraftByLabel = savedState?.lastDraftSavedBy
        ? savedState.lastDraftSavedBy.name || savedState.lastDraftSavedBy.email || null
        : null;
    const publishedByLabel = savedState?.publishedBy
        ? savedState.publishedBy.name || savedState.publishedBy.email || null
        : null;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <DashboardPageHeader
                        title="School Website Builder"
                        subtitle={`Manage public landing page content, preview drafts, and publish updates for ${resolvedSchoolName}.`}
                    />

                    {savedState && (
                        <div className="-mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            {publicationBadge && (
                                <span
                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${publicationBadge.className}`}
                                >
                                    {publicationBadge.label}
                                </span>
                            )}
                            {hasUnsavedChanges && (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-800">
                                    Unsaved Local Edits
                                </span>
                            )}
                            {draftSavedLabel && (
                                <span>
                                    Draft saved: {draftSavedLabel}
                                    {lastDraftByLabel ? ` by ${lastDraftByLabel}` : ''}
                                </span>
                            )}
                            {publishedAtLabel && (
                                <span>
                                    Last published: {publishedAtLabel}
                                    {publishedByLabel ? ` by ${publishedByLabel}` : ''}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {canReadWebsite && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={handleRefreshClick}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </button>

                        {savedState && draftForm && (
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveTab((prev) =>
                                        prev === 'preview' ? 'hero' : 'preview'
                                    )
                                }
                                className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                            >
                                {activeTab === 'preview' ? 'Back to Editor' : 'Preview Draft'}
                            </button>
                        )}

                        {savedState && draftForm && hasUnsavedChanges && (
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={handleDiscardClick}
                                className="rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:opacity-50"
                            >
                                Discard Edits
                            </button>
                        )}

                        {savedState && draftForm && canUpdateWebsite && (
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={handleSaveDraft}
                                className="rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
                            </button>
                        )}

                        {savedState && draftForm && canPublishWebsite && (
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={handlePublish}
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isPublishing ? 'Publishing...' : 'Publish Website'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {!canReadWebsite ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: Viewing School Website Management requires the{' '}
                    <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                        {PERMISSIONS.WEBSITE.READ}
                    </code>{' '}
                    permission.
                </div>
            ) : (
                <>
                    <div
                        role="note"
                        className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-100 p-4 text-xs text-gray-700 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <span>
                            Single source of truth: School name, logo, favicon, brand colors, and
                            contact address come from School Profile &amp; Branding and are applied
                            automatically in your public landing page preview and live site.
                        </span>
                        {canAccessProfileRoute && (
                            <Link
                                to="/admin/profile"
                                onClick={handleOpenProfileClick}
                                className="shrink-0 font-semibold text-blue-700 hover:underline"
                            >
                                Open School Profile &amp; Branding
                            </Link>
                        )}
                    </div>

                    {!canUpdateWebsite && savedState && (
                        <div
                            role="note"
                            className="rounded-md border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900"
                        >
                            Read-only editing mode: modifying website section fields requires the{' '}
                            <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">
                                {PERMISSIONS.WEBSITE.UPDATE}
                            </code>{' '}
                            permission.
                            {canPublishWebsite
                                ? ' You can review and publish the currently saved draft.'
                                : ''}
                        </div>
                    )}

                    {pendingConfirmation && hasUnsavedChanges && (
                        <div
                            role="alertdialog"
                            aria-label="Confirm discarding unsaved website edits"
                            className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <p className="text-sm text-amber-900">
                                {pendingConfirmation.action === 'reload'
                                    ? 'You have unsaved draft edits. Reloading from the server will discard your local changes.'
                                    : pendingConfirmation.action === 'navigate-profile'
                                      ? 'You have unsaved draft edits. Opening School Profile & Branding will discard your unsaved local changes.'
                                      : 'Discard your unsaved local edits and revert all sections to the last saved backend draft?'}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPendingConfirmation(null)}
                                    className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                >
                                    Keep Editing
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmPendingDiscard}
                                    className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
                                >
                                    {pendingConfirmation.action === 'reload'
                                        ? 'Discard & Reload'
                                        : pendingConfirmation.action === 'navigate-profile'
                                          ? 'Discard & Leave'
                                          : 'Discard Edits'}
                                </button>
                            </div>
                        </div>
                    )}

                    {actionNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                        >
                            {actionNotice}
                        </div>
                    )}

                    {actionError && (
                        <div
                            role="alert"
                            className={`rounded-md border p-4 text-sm ${
                                actionError.isBackendUnavailable
                                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                                    : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                        >
                            {actionError.message}
                        </div>
                    )}

                    {hasValidationErrors && (
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                        >
                            Please review and fix the highlighted validation errors across the marked
                            sections before saving or publishing.
                        </div>
                    )}

                    {isLoading ? (
                        <div
                            role="status"
                            className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center shadow-sm"
                        >
                            <div
                                className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                                aria-hidden="true"
                            />
                            <p className="text-sm font-medium text-gray-700">
                                Loading website draft and publication status...
                            </p>
                        </div>
                    ) : loadError ? (
                        <div
                            role="alert"
                            className={`rounded-lg border p-6 shadow-sm ${
                                loadError.isBackendUnavailable
                                    ? 'border-amber-200 bg-amber-50 text-amber-950'
                                    : 'border-red-200 bg-red-50 text-red-900'
                            }`}
                        >
                            <h2 className="text-base font-semibold">
                                {loadError.isBackendUnavailable
                                    ? 'School Website CMS Service Pending Backend Implementation'
                                    : 'Unable to Load School Website CMS'}
                            </h2>
                            <p className="mt-2 text-sm">
                                {loadError.isBackendUnavailable
                                    ? 'The backend website management endpoint (GET /api/school/website) is not yet available in this environment. No mock website content has been substituted.'
                                    : loadError.message}
                            </p>
                            <button
                                type="button"
                                onClick={reloadAll}
                                className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                Retry Connection
                            </button>
                        </div>
                    ) : savedState && draftForm ? (
                        <div className="space-y-6">
                            {/* Section Navigation Tabs */}
                            <div className="border-b border-gray-200">
                                <nav
                                    role="tablist"
                                    aria-label="Website CMS Sections"
                                    className="-mb-px flex flex-wrap gap-2 sm:gap-4"
                                >
                                    {SECTION_TABS.map((tab) => {
                                        const isActive = activeTab === tab.id;
                                        const isDirty = sectionUnsavedMap[tab.id];
                                        const errorCount = sectionErrorCounts[tab.id];

                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={isActive}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                                                    isActive
                                                        ? 'border-blue-600 text-blue-700'
                                                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                                                }`}
                                            >
                                                <span>{tab.label}</span>
                                                {isDirty && (
                                                    <span
                                                        className="h-2 w-2 rounded-full bg-amber-500"
                                                        title="Section has unsaved edits"
                                                        aria-label="Unsaved changes"
                                                    />
                                                )}
                                                {errorCount > 0 && (
                                                    <span
                                                        className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700"
                                                        aria-label={`${errorCount} validation error(s)`}
                                                    >
                                                        {errorCount}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={activeTab === 'preview'}
                                        onClick={() => setActiveTab('preview')}
                                        className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                                            activeTab === 'preview'
                                                ? 'border-blue-600 text-blue-700'
                                                : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                                        }`}
                                    >
                                        <span>Draft Preview</span>
                                    </button>
                                </nav>
                            </div>

                            {/* Active Tab Panel */}
                            {activeTab === 'hero' && (
                                <WebsiteHeroEditor
                                    values={draftForm}
                                    errors={validationErrors}
                                    disabled={!canUpdateWebsite || isSavingDraft || isPublishing}
                                    onFieldChange={(field, value) => {
                                        setPendingConfirmation(null);
                                        updateScalarField(field, value);
                                    }}
                                />
                            )}

                            {activeTab === 'about' && (
                                <WebsiteAboutEditor
                                    schoolName={resolvedSchoolName}
                                    values={draftForm}
                                    errors={validationErrors}
                                    disabled={!canUpdateWebsite || isSavingDraft || isPublishing}
                                    onFieldChange={(field, value) => {
                                        setPendingConfirmation(null);
                                        updateScalarField(field, value);
                                    }}
                                />
                            )}

                            {activeTab === 'programs' && (
                                <WebsiteProgramsEditor
                                    values={draftForm}
                                    errors={validationErrors}
                                    disabled={!canUpdateWebsite || isSavingDraft || isPublishing}
                                    onHeadingChange={(value) => {
                                        setPendingConfirmation(null);
                                        updateScalarField('featuredProgramsHeading', value);
                                    }}
                                    onAddProgram={() => {
                                        setPendingConfirmation(null);
                                        addFeaturedProgram();
                                    }}
                                    onUpdateProgram={(programId, field, value) => {
                                        setPendingConfirmation(null);
                                        updateFeaturedProgramField(programId, field, value);
                                    }}
                                    onMoveProgram={(index, direction) => {
                                        setPendingConfirmation(null);
                                        moveFeaturedProgram(index, direction);
                                    }}
                                    onRemoveProgram={(programId) => {
                                        setPendingConfirmation(null);
                                        removeFeaturedProgram(programId);
                                    }}
                                />
                            )}

                            {activeTab === 'social' && (
                                <WebsiteSocialLinksEditor
                                    values={draftForm}
                                    errors={validationErrors}
                                    disabled={!canUpdateWebsite || isSavingDraft || isPublishing}
                                    onAddSocialLink={() => {
                                        setPendingConfirmation(null);
                                        addSocialLink();
                                    }}
                                    onChangePlatform={(currentPlatform, nextPlatform) => {
                                        setPendingConfirmation(null);
                                        changeSocialLinkPlatform(currentPlatform, nextPlatform);
                                    }}
                                    onUpdateUrl={(platform, url) => {
                                        setPendingConfirmation(null);
                                        updateSocialLinkUrl(platform, url);
                                    }}
                                    onRemoveSocialLink={(platform) => {
                                        setPendingConfirmation(null);
                                        removeSocialLink(platform);
                                    }}
                                />
                            )}

                            {activeTab === 'preview' && previewConfig && (
                                <WebsiteDraftPreviewPane
                                    config={previewConfig}
                                    canAccessSchoolProfile={canAccessProfileRoute}
                                    onOpenSchoolProfile={handleOpenProfileClick}
                                />
                            )}
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
};
