import React, { useMemo, useState } from 'react';
import { useTenantContext } from '../../../app/providers/TenantProvider';
import { DashboardPageHeader } from '../../../components/Dashboards/DashboardPageHeader';
import { PERMISSIONS } from '../../../constants/permissions';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import {
    AcademicConfirmDialog,
} from '../components/AcademicConfirmDialog';
import {
    AcademicDetailModal,
    type AcademicDetailSubject,
} from '../components/AcademicDetailModal';
import {
    AcademicClassFormModal,
    AcademicSectionFormModal,
    AcademicTermFormModal,
    AcademicYearFormModal,
} from '../components/AcademicFormModals';
import { AcademicYearsSection } from '../components/AcademicYearsSection';
import { ClassesSection } from '../components/ClassesSection';
import { SectionsSection } from '../components/SectionsSection';
import { TermsSection } from '../components/TermsSection';
import {
    type AcademicStructurePermissions,
    useAcademicStructure,
} from '../hooks/useAcademicStructure';
import {
    evaluateAcademicYearDeleteEligibility,
    evaluateClassDeleteEligibility,
    evaluateSectionDeleteEligibility,
    evaluateTermDeleteEligibility,
    formatIsoDateDisplay,
} from '../schemas/academic-structure-schema';
import type {
    AcademicCalendarStatus,
    AcademicClass,
    AcademicSection,
    AcademicStructureTabId,
    AcademicTerm,
    AcademicUnitStatus,
    AcademicYear,
} from '../types/academic-structure.types';

type ActiveFormModal =
    | { kind: 'year-create' }
    | { kind: 'year-edit'; year: AcademicYear }
    | { kind: 'term-create' }
    | { kind: 'term-edit'; term: AcademicTerm }
    | { kind: 'class-create' }
    | { kind: 'class-edit'; academicClass: AcademicClass }
    | { kind: 'section-create' }
    | { kind: 'section-edit'; section: AcademicSection };

type PendingConfirmation =
    | { kind: 'year-status'; year: AcademicYear; nextStatus: AcademicCalendarStatus }
    | { kind: 'year-delete'; year: AcademicYear }
    | { kind: 'term-status'; term: AcademicTerm; nextStatus: AcademicCalendarStatus }
    | { kind: 'term-delete'; term: AcademicTerm }
    | { kind: 'class-delete'; academicClass: AcademicClass }
    | { kind: 'section-delete'; section: AcademicSection };

const STRUCTURE_TABS: readonly { id: AcademicStructureTabId; label: string }[] = [
    { id: 'years', label: 'Academic Years' },
    { id: 'terms', label: 'Terms / Periods' },
    { id: 'classes', label: 'Classes / Grade Levels' },
    { id: 'sections', label: 'Sections' },
];

export const AcademicStructurePage: React.FC = () => {
    const { user } = useAuth();
    const { classification, tenantId, schoolName, hostname } = useTenantContext();
    const { hasPermission } = usePermissions();

    const perms: AcademicStructurePermissions = useMemo(
        () => ({
            canReadYears: hasPermission(PERMISSIONS.ACADEMIC_YEARS.READ),
            canCreateYears: hasPermission(PERMISSIONS.ACADEMIC_YEARS.CREATE),
            canUpdateYears: hasPermission(PERMISSIONS.ACADEMIC_YEARS.UPDATE),
            canActivateYears: hasPermission(PERMISSIONS.ACADEMIC_YEARS.ACTIVATE),
            canDeleteYears: hasPermission(PERMISSIONS.ACADEMIC_YEARS.DELETE),
            canReadTerms: hasPermission(PERMISSIONS.TERMS.READ),
            canCreateTerms: hasPermission(PERMISSIONS.TERMS.CREATE),
            canUpdateTerms: hasPermission(PERMISSIONS.TERMS.UPDATE),
            canActivateTerms: hasPermission(PERMISSIONS.TERMS.ACTIVATE),
            canDeleteTerms: hasPermission(PERMISSIONS.TERMS.DELETE),
            canReadClasses: hasPermission(PERMISSIONS.CLASSES.READ),
            canCreateClasses: hasPermission(PERMISSIONS.CLASSES.CREATE),
            canUpdateClasses: hasPermission(PERMISSIONS.CLASSES.UPDATE),
            canDeleteClasses: hasPermission(PERMISSIONS.CLASSES.DELETE),
            canReadSections: hasPermission(PERMISSIONS.SECTIONS.READ),
            canCreateSections: hasPermission(PERMISSIONS.SECTIONS.CREATE),
            canUpdateSections: hasPermission(PERMISSIONS.SECTIONS.UPDATE),
            canDeleteSections: hasPermission(PERMISSIONS.SECTIONS.DELETE),
        }),
        [hasPermission]
    );

    const hasAnyReadAccess =
        perms.canReadYears || perms.canReadTerms || perms.canReadClasses || perms.canReadSections;

    const isVerifiedSchoolSession =
        classification === 'SCHOOL' &&
        Boolean(tenantId) &&
        user?.accountType === 'SCHOOL' &&
        user.tenantId === tenantId;

    const defaultTab: AcademicStructureTabId = perms.canReadYears
        ? 'years'
        : perms.canReadTerms
          ? 'terms'
          : perms.canReadClasses
            ? 'classes'
            : 'sections';

    const [preferredTab, setPreferredTab] = useState<AcademicStructureTabId | null>(null);
    const activeTab = preferredTab ?? defaultTab;

    const [formModal, setFormModal] = useState<ActiveFormModal | null>(null);
    const [detailSubject, setDetailSubject] = useState<AcademicDetailSubject | null>(null);
    const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);

    const {
        academicYears,
        activeAcademicYear,
        selectedYearId,
        selectedAcademicYear,
        setSelectedYearId,
        isLoadingYears,
        yearsError,
        reloadYears,

        terms,
        isLoadingTerms,
        termsError,
        reloadTerms,

        classes,
        isLoadingClasses,
        classesError,
        reloadClasses,

        sections,
        sectionClassFilter,
        setSectionClassFilter,
        isLoadingSections,
        sectionsError,
        reloadSections,

        isMutating,
        mutationNotice,
        mutationError,

        saveNewAcademicYear,
        saveEditedAcademicYear,
        changeAcademicYearStatus,
        removeAcademicYear,

        saveNewTerm,
        saveEditedTerm,
        changeTermStatus,
        removeTerm,

        saveNewClass,
        saveEditedClass,
        changeClassStatus,
        removeClass,

        saveNewSection,
        saveEditedSection,
        changeSectionStatus,
        removeSection,

        reloadAll,
    } = useAcademicStructure({
        tenantId,
        enabled: isVerifiedSchoolSession && hasAnyReadAccess,
        permissions: perms,
    });

    const displaySchoolName = schoolName || hostname || 'Verified School';
    const isAnyLoading = isLoadingYears || isLoadingTerms || isLoadingClasses || isLoadingSections;

    // Navigation helpers
    const handleOpenTermsForYear = (yearId: string) => {
        if (!perms.canReadTerms) return;
        setSelectedYearId(yearId);
        setPreferredTab('terms');
    };

    const handleOpenSectionsForClass = (classId: string) => {
        if (!perms.canReadSections) return;
        setSectionClassFilter(classId);
        setPreferredTab('sections');
    };

    // Permission-enforced UI action handlers
    const handleOpenCreateYear = () => {
        if (!perms.canCreateYears) return;
        setFormModal({ kind: 'year-create' });
    };

    const handleOpenEditYear = (year: AcademicYear) => {
        if (!perms.canUpdateYears) return;
        if (perms.canReadTerms) {
            setSelectedYearId(year.id);
        }
        setFormModal({ kind: 'year-edit', year });
    };

    const handleOpenYearDetails = (year: AcademicYear) => {
        if (!perms.canReadYears) return;
        if (perms.canReadTerms) {
            setSelectedYearId(year.id);
        }
        setDetailSubject({ kind: 'year', record: year });
    };

    const handleRequestYearStatus = (year: AcademicYear, nextStatus: AcademicCalendarStatus) => {
        if (!perms.canActivateYears || isMutating) return;
        setPendingConfirm({ kind: 'year-status', year, nextStatus });
    };

    const handleRequestYearDelete = (year: AcademicYear) => {
        if (isMutating) return;
        const check = evaluateAcademicYearDeleteEligibility({
            year,
            loadedTerms: terms,
            canDeletePermission: perms.canDeleteYears,
        });
        if (!check.allowed) return;
        setPendingConfirm({ kind: 'year-delete', year });
    };

    const handleOpenCreateTerm = () => {
        if (!perms.canCreateTerms || !selectedAcademicYear) return;
        setFormModal({ kind: 'term-create' });
    };

    const handleOpenEditTerm = (term: AcademicTerm) => {
        if (!perms.canUpdateTerms) return;
        setFormModal({ kind: 'term-edit', term });
    };

    const handleRequestTermStatus = (term: AcademicTerm, nextStatus: AcademicCalendarStatus) => {
        if (!perms.canActivateTerms || isMutating) return;
        setPendingConfirm({ kind: 'term-status', term, nextStatus });
    };

    const handleRequestTermDelete = (term: AcademicTerm) => {
        if (isMutating) return;
        const check = evaluateTermDeleteEligibility({
            term,
            canDeletePermission: perms.canDeleteTerms,
        });
        if (!check.allowed) return;
        setPendingConfirm({ kind: 'term-delete', term });
    };

    const handleOpenCreateClass = () => {
        if (!perms.canCreateClasses) return;
        setFormModal({ kind: 'class-create' });
    };

    const handleOpenEditClass = (academicClass: AcademicClass) => {
        if (!perms.canUpdateClasses) return;
        setFormModal({ kind: 'class-edit', academicClass });
    };

    const handleOpenClassDetails = (academicClass: AcademicClass) => {
        if (!perms.canReadClasses) return;
        if (perms.canReadSections) {
            setSectionClassFilter(academicClass.id);
        }
        setDetailSubject({ kind: 'class', record: academicClass });
    };

    const handleChangeClassStatus = (
        academicClass: AcademicClass,
        nextStatus: AcademicUnitStatus
    ) => {
        if (!perms.canUpdateClasses || isMutating) return;
        void changeClassStatus(academicClass, nextStatus);
    };

    const handleRequestClassDelete = (academicClass: AcademicClass) => {
        if (isMutating) return;
        const check = evaluateClassDeleteEligibility({
            academicClass,
            loadedSections: sections,
            canDeletePermission: perms.canDeleteClasses,
        });
        if (!check.allowed) return;
        setPendingConfirm({ kind: 'class-delete', academicClass });
    };

    const handleOpenCreateSection = () => {
        if (!perms.canCreateSections || classes.every((cls) => cls.status !== 'ACTIVE')) return;
        setFormModal({ kind: 'section-create' });
    };

    const handleOpenEditSection = (section: AcademicSection) => {
        if (!perms.canUpdateSections) return;
        setFormModal({ kind: 'section-edit', section });
    };

    const handleChangeSectionStatus = (
        section: AcademicSection,
        nextStatus: AcademicUnitStatus
    ) => {
        if (!perms.canUpdateSections || isMutating) return;
        void changeSectionStatus(section, nextStatus);
    };

    const handleRequestSectionDelete = (section: AcademicSection) => {
        if (isMutating) return;
        const check = evaluateSectionDeleteEligibility({
            section,
            canDeletePermission: perms.canDeleteSections,
        });
        if (!check.allowed) return;
        setPendingConfirm({ kind: 'section-delete', section });
    };

    const handleExecuteConfirm = async () => {
        if (!pendingConfirm || isMutating) return;

        let success = false;
        if (pendingConfirm.kind === 'year-status') {
            success = await changeAcademicYearStatus(
                pendingConfirm.year,
                pendingConfirm.nextStatus
            );
        } else if (pendingConfirm.kind === 'year-delete') {
            success = await removeAcademicYear(pendingConfirm.year);
        } else if (pendingConfirm.kind === 'term-status') {
            success = await changeTermStatus(pendingConfirm.term, pendingConfirm.nextStatus);
        } else if (pendingConfirm.kind === 'term-delete') {
            success = await removeTerm(pendingConfirm.term);
        } else if (pendingConfirm.kind === 'class-delete') {
            success = await removeClass(pendingConfirm.academicClass);
        } else if (pendingConfirm.kind === 'section-delete') {
            success = await removeSection(pendingConfirm.section);
        }

        if (success || pendingConfirm) {
            setPendingConfirm(null);
        }
    };

    const renderConfirmDialog = () => {
        if (!pendingConfirm) return null;

        if (pendingConfirm.kind === 'year-status') {
            const { year, nextStatus } = pendingConfirm;
            const willReplaceActive =
                nextStatus === 'ACTIVE' &&
                Boolean(activeAcademicYear && activeAcademicYear.id !== year.id);

            return (
                <AcademicConfirmDialog
                    title={`Confirm Status Change: ${year.name}`}
                    message={`Change "${year.name}" status from ${year.status} to ${nextStatus}?`}
                    warningNote={
                        willReplaceActive
                            ? `Activating "${year.name}" will deactivate current active year "${activeAcademicYear?.name}". Only one academic year can remain active at a time.`
                            : nextStatus === 'COMPLETED' || nextStatus === 'ARCHIVED'
                              ? 'Changing this calendar period affects active operational defaults on the server.'
                              : undefined
                    }
                    confirmLabel={`Mark as ${nextStatus}`}
                    tone={nextStatus === 'ACTIVE' ? 'primary' : 'warning'}
                    isSubmitting={isMutating}
                    onCancel={() => setPendingConfirm(null)}
                    onConfirm={handleExecuteConfirm}
                />
            );
        }

        if (pendingConfirm.kind === 'term-status') {
            const { term, nextStatus } = pendingConfirm;
            const otherActiveTerm = terms.find(
                (t) =>
                    t.academicYearId === term.academicYearId &&
                    t.id !== term.id &&
                    t.status === 'ACTIVE'
            );

            return (
                <AcademicConfirmDialog
                    title={`Confirm Term Status: ${term.name}`}
                    message={`Change term "${term.name}" status from ${term.status} to ${nextStatus}?`}
                    warningNote={
                        nextStatus === 'ACTIVE' && otherActiveTerm
                            ? `Term "${otherActiveTerm.name}" is currently Active in this academic year. Backend rules may transition sibling terms when activating another.`
                            : undefined
                    }
                    confirmLabel={`Mark as ${nextStatus}`}
                    tone={nextStatus === 'ACTIVE' ? 'primary' : 'warning'}
                    isSubmitting={isMutating}
                    onCancel={() => setPendingConfirm(null)}
                    onConfirm={handleExecuteConfirm}
                />
            );
        }

        if (pendingConfirm.kind === 'year-delete') {
            return (
                <AcademicConfirmDialog
                    title={`Delete Academic Year: ${pendingConfirm.year.name}`}
                    message={`Are you sure you want to permanently delete "${pendingConfirm.year.name}" (${formatIsoDateDisplay(pendingConfirm.year.startDate)} – ${formatIsoDateDisplay(pendingConfirm.year.endDate)})?`}
                    warningNote="Frontend confirms zero loaded child terms. The backend will reject deletion if any server-side terms, enrollments, or historical academic records reference this academic year."
                    confirmLabel="Delete Academic Year"
                    tone="danger"
                    isSubmitting={isMutating}
                    onCancel={() => setPendingConfirm(null)}
                    onConfirm={handleExecuteConfirm}
                />
            );
        }

        if (pendingConfirm.kind === 'term-delete') {
            return (
                <AcademicConfirmDialog
                    title={`Delete Term: ${pendingConfirm.term.name}`}
                    message={`Are you sure you want to permanently delete "${pendingConfirm.term.name}"?`}
                    warningNote="The backend will verify and reject deletion if enrollments, attendance, or assessment schedules depend on this term."
                    confirmLabel="Delete Term"
                    tone="danger"
                    isSubmitting={isMutating}
                    onCancel={() => setPendingConfirm(null)}
                    onConfirm={handleExecuteConfirm}
                />
            );
        }

        if (pendingConfirm.kind === 'class-delete') {
            return (
                <AcademicConfirmDialog
                    title={`Delete Class / Grade Level: ${pendingConfirm.academicClass.name}`}
                    message={`Are you sure you want to permanently delete "${pendingConfirm.academicClass.name}"?`}
                    warningNote="Frontend confirms zero loaded child sections. The backend will reject deletion if sections, enrollments, or curriculum records depend on this class."
                    confirmLabel="Delete Class"
                    tone="danger"
                    isSubmitting={isMutating}
                    onCancel={() => setPendingConfirm(null)}
                    onConfirm={handleExecuteConfirm}
                />
            );
        }

        return (
            <AcademicConfirmDialog
                title={`Delete Section: ${pendingConfirm.section.name}`}
                message={`Are you sure you want to permanently delete section "${pendingConfirm.section.name}"?`}
                warningNote="The backend will reject deletion if students, rosters, or schedules are linked to this section."
                confirmLabel="Delete Section"
                tone="danger"
                isSubmitting={isMutating}
                onCancel={() => setPendingConfirm(null)}
                onConfirm={handleExecuteConfirm}
            />
        );
    };

    if (!isVerifiedSchoolSession) {
        return (
            <div className="mx-auto max-w-6xl">
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: Academic Structure management is restricted to verified school
                    tenant administrator sessions.
                </div>
            </div>
        );
    }

    const defaultActiveOrFirstClassId =
        sectionClassFilter !== 'ALL'
            ? sectionClassFilter
            : classes.find((cls) => cls.status === 'ACTIVE')?.id ?? '';

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <DashboardPageHeader
                    title="Academic Structure"
                    subtitle={`Configure academic years, terms/periods, classes/grade levels, and sections for ${displaySchoolName}.`}
                />

                {hasAnyReadAccess && (
                    <div className="shrink-0">
                        <button
                            type="button"
                            disabled={isAnyLoading || isMutating}
                            onClick={reloadAll}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isAnyLoading ? 'Refreshing...' : 'Refresh All'}
                        </button>
                    </div>
                )}
            </div>

            {!hasAnyReadAccess ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                >
                    Access Denied: Viewing school academic structure requires at least one read
                    permission (
                    <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-xs">
                        {PERMISSIONS.ACADEMIC_YEARS.READ}
                    </code>
                    ,{' '}
                    <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-xs">
                        {PERMISSIONS.TERMS.READ}
                    </code>
                    ,{' '}
                    <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-xs">
                        {PERMISSIONS.CLASSES.READ}
                    </code>
                    , or{' '}
                    <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-xs">
                        {PERMISSIONS.SECTIONS.READ}
                    </code>
                    ).
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Active Academic Year
                            </p>
                            <p className="mt-1 truncate text-base font-semibold text-gray-900">
                                {!perms.canReadYears
                                    ? 'Restricted'
                                    : activeAcademicYear
                                      ? activeAcademicYear.name
                                      : 'None active'}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {perms.canReadYears
                                    ? `${academicYears.length} year(s) loaded`
                                    : 'Requires academic_years.read'}
                            </p>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Terms in Selected Year
                            </p>
                            <p className="mt-1 text-base font-semibold text-gray-900">
                                {!perms.canReadTerms ? 'Restricted' : terms.length}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                                {selectedAcademicYear
                                    ? selectedAcademicYear.name
                                    : 'No year selected'}
                            </p>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Classes / Grade Levels
                            </p>
                            <p className="mt-1 text-base font-semibold text-gray-900">
                                {!perms.canReadClasses ? 'Restricted' : classes.length}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {perms.canReadClasses
                                    ? `${classes.filter((c) => c.status === 'ACTIVE').length} active level(s)`
                                    : 'Requires classes.read'}
                            </p>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Sections
                            </p>
                            <p className="mt-1 text-base font-semibold text-gray-900">
                                {!perms.canReadSections ? 'Restricted' : sections.length}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                                {sectionClassFilter === 'ALL'
                                    ? 'Across all classes'
                                    : classes.find((c) => c.id === sectionClassFilter)?.name ||
                                      'Filtered class'}
                            </p>
                        </div>
                    </div>

                    {mutationNotice && (
                        <div
                            role="status"
                            className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                        >
                            {mutationNotice}
                        </div>
                    )}

                    {mutationError && (
                        <div
                            role="alert"
                            className={`rounded-md border p-4 text-sm ${
                                mutationError.isBackendUnavailable
                                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                                    : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                        >
                            {mutationError.isBackendUnavailable
                                ? `Academic API endpoint is pending backend implementation (${mutationError.message}). No local changes were persisted.`
                                : mutationError.message}
                        </div>
                    )}

                    {/* Section Tabs */}
                    <div className="border-b border-gray-200">
                        <nav
                            role="tablist"
                            aria-label="Academic Structure Areas"
                            className="-mb-px flex flex-wrap gap-2 sm:gap-4"
                        >
                            {STRUCTURE_TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setPreferredTab(tab.id)}
                                        className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                                            isActive
                                                ? 'border-blue-600 text-blue-700'
                                                : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {activeTab === 'years' && (
                        <AcademicYearsSection
                            academicYears={academicYears}
                            activeAcademicYear={activeAcademicYear}
                            loadedTerms={terms}
                            isLoading={isLoadingYears}
                            loadError={yearsError}
                            isMutating={isMutating}
                            canRead={perms.canReadYears}
                            canCreate={perms.canCreateYears}
                            canUpdate={perms.canUpdateYears}
                            canActivate={perms.canActivateYears}
                            canDelete={perms.canDeleteYears}
                            canReadTerms={perms.canReadTerms}
                            onRetry={reloadYears}
                            onOpenCreate={handleOpenCreateYear}
                            onOpenEdit={handleOpenEditYear}
                            onOpenDetails={handleOpenYearDetails}
                            onOpenTermsForYear={handleOpenTermsForYear}
                            onRequestStatusChange={handleRequestYearStatus}
                            onRequestDelete={handleRequestYearDelete}
                        />
                    )}

                    {activeTab === 'terms' && (
                        <TermsSection
                            academicYears={academicYears}
                            selectedYearId={selectedYearId}
                            selectedAcademicYear={selectedAcademicYear}
                            terms={terms}
                            isLoadingYears={isLoadingYears}
                            isLoadingTerms={isLoadingTerms}
                            loadError={termsError}
                            isMutating={isMutating}
                            canReadYears={perms.canReadYears}
                            canReadTerms={perms.canReadTerms}
                            canCreate={perms.canCreateTerms}
                            canUpdate={perms.canUpdateTerms}
                            canActivate={perms.canActivateTerms}
                            canDelete={perms.canDeleteTerms}
                            onSelectYear={setSelectedYearId}
                            onRetry={reloadTerms}
                            onOpenCreate={handleOpenCreateTerm}
                            onOpenEdit={handleOpenEditTerm}
                            onOpenDetails={(term) => setDetailSubject({ kind: 'term', record: term })}
                            onRequestStatusChange={handleRequestTermStatus}
                            onRequestDelete={handleRequestTermDelete}
                        />
                    )}

                    {activeTab === 'classes' && (
                        <ClassesSection
                            classes={classes}
                            loadedSections={sections}
                            isLoading={isLoadingClasses}
                            loadError={classesError}
                            isMutating={isMutating}
                            canRead={perms.canReadClasses}
                            canCreate={perms.canCreateClasses}
                            canUpdate={perms.canUpdateClasses}
                            canDelete={perms.canDeleteClasses}
                            canReadSections={perms.canReadSections}
                            onRetry={reloadClasses}
                            onOpenCreate={handleOpenCreateClass}
                            onOpenEdit={handleOpenEditClass}
                            onOpenDetails={handleOpenClassDetails}
                            onOpenSectionsForClass={handleOpenSectionsForClass}
                            onChangeStatus={handleChangeClassStatus}
                            onRequestDelete={handleRequestClassDelete}
                        />
                    )}

                    {activeTab === 'sections' && (
                        <SectionsSection
                            classes={classes}
                            selectedClassFilter={sectionClassFilter}
                            sections={sections}
                            isLoadingClasses={isLoadingClasses}
                            isLoadingSections={isLoadingSections}
                            loadError={sectionsError}
                            isMutating={isMutating}
                            canReadClasses={perms.canReadClasses}
                            canReadSections={perms.canReadSections}
                            canCreate={perms.canCreateSections}
                            canUpdate={perms.canUpdateSections}
                            canDelete={perms.canDeleteSections}
                            onSelectClassFilter={setSectionClassFilter}
                            onRetry={reloadSections}
                            onOpenCreate={handleOpenCreateSection}
                            onOpenEdit={handleOpenEditSection}
                            onOpenDetails={(section) =>
                                setDetailSubject({ kind: 'section', record: section })
                            }
                            onChangeStatus={handleChangeSectionStatus}
                            onRequestDelete={handleRequestSectionDelete}
                        />
                    )}
                </>
            )}

            {/* Create / Edit Modals */}
            {(formModal?.kind === 'year-create' || formModal?.kind === 'year-edit') && (
                <AcademicYearFormModal
                    editingYear={formModal.kind === 'year-edit' ? formModal.year : null}
                    existingYears={academicYears}
                    loadedTermsForYear={
                        formModal.kind === 'year-edit'
                            ? terms.filter((t) => t.academicYearId === formModal.year.id)
                            : []
                    }
                    canActivate={perms.canActivateYears}
                    isSubmitting={isMutating}
                    onClose={() => setFormModal(null)}
                    onSubmitCreate={saveNewAcademicYear}
                    onSubmitUpdate={(yearId, payload) =>
                        saveEditedAcademicYear(yearId, {
                            name: payload.name,
                            startDate: payload.startDate,
                            endDate: payload.endDate,
                            description: payload.description,
                        })
                    }
                />
            )}

            {(formModal?.kind === 'term-create' || formModal?.kind === 'term-edit') && (
                <AcademicTermFormModal
                    editingTerm={formModal.kind === 'term-edit' ? formModal.term : null}
                    defaultAcademicYearId={selectedYearId ?? ''}
                    academicYears={academicYears}
                    existingTermsInYear={terms}
                    canActivate={perms.canActivateTerms}
                    isSubmitting={isMutating}
                    onClose={() => setFormModal(null)}
                    onSubmitCreate={saveNewTerm}
                    onSubmitUpdate={(termId, payload) =>
                        saveEditedTerm(termId, {
                            academicYearId: payload.academicYearId,
                            name: payload.name,
                            startDate: payload.startDate,
                            endDate: payload.endDate,
                            description: payload.description,
                        })
                    }
                />
            )}

            {(formModal?.kind === 'class-create' || formModal?.kind === 'class-edit') && (
                <AcademicClassFormModal
                    editingClass={formModal.kind === 'class-edit' ? formModal.academicClass : null}
                    existingClasses={classes}
                    isSubmitting={isMutating}
                    onClose={() => setFormModal(null)}
                    onSubmitCreate={saveNewClass}
                    onSubmitUpdate={saveEditedClass}
                />
            )}

            {(formModal?.kind === 'section-create' || formModal?.kind === 'section-edit') && (
                <AcademicSectionFormModal
                    editingSection={formModal.kind === 'section-edit' ? formModal.section : null}
                    defaultClassId={defaultActiveOrFirstClassId}
                    classes={classes}
                    existingSectionsInSchool={sections}
                    isSubmitting={isMutating}
                    onClose={() => setFormModal(null)}
                    onSubmitCreate={saveNewSection}
                    onSubmitUpdate={saveEditedSection}
                />
            )}

            {/* Detail Inspection Modal */}
            {detailSubject && (
                <AcademicDetailModal
                    subject={detailSubject}
                    academicYears={academicYears}
                    terms={terms}
                    classes={classes}
                    sections={sections}
                    onClose={() => setDetailSubject(null)}
                    onOpenTermsForYear={perms.canReadTerms ? handleOpenTermsForYear : undefined}
                    onOpenSectionsForClass={
                        perms.canReadSections ? handleOpenSectionsForClass : undefined
                    }
                />
            )}

            {/* Confirmation Dialog */}
            {renderConfirmDialog()}
        </div>
    );
};

