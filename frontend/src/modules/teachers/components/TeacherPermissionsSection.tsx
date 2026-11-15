import React from 'react';
import { PERMISSIONS } from '../../../constants/permissions';
import type { Permission, SchoolRole } from '../../../types/auth';
import {
    TEACHER_DEFAULT_PERMISSIONS_POLICY,
    TEACHER_FUNCTIONAL_PERMISSION_ALLOWLIST,
    TEACHER_PERMISSION_CATEGORY_GROUPS,
    type TeacherFunctionalPermissionKey,
    type TeacherPermissionCategory,
} from '../constants/teacher-permissions';
import type { TeacherOperationErrorState } from '../hooks/useTeacherManagement';

interface TeacherPermissionsSectionProps {
    accountRoles: readonly SchoolRole[];
    canManageTeacherPermissions: boolean;
    hasExplicitTeacherPermissionScope: boolean;
    savedTeacherPermissions: readonly TeacherFunctionalPermissionKey[];
    draftTeacherPermissions: readonly TeacherFunctionalPermissionKey[];
    preservedNonTeacherPermissions: readonly Permission[];
    isPermissionsDirty: boolean;
    isSavingPermissions: boolean;
    permissionsSaveError: TeacherOperationErrorState | null;
    permissionsSaveSuccessMessage: string | null;
    onTogglePermission: (permission: TeacherFunctionalPermissionKey) => void;
    onSetCategorySelection: (category: TeacherPermissionCategory, selected: boolean) => void;
    onResetPermissions: () => void;
    onSavePermissions: () => Promise<boolean>;
}

export const TeacherPermissionsSection: React.FC<TeacherPermissionsSectionProps> = ({
    accountRoles,
    canManageTeacherPermissions,
    hasExplicitTeacherPermissionScope,
    savedTeacherPermissions,
    draftTeacherPermissions,
    preservedNonTeacherPermissions,
    isPermissionsDirty,
    isSavingPermissions,
    permissionsSaveError,
    permissionsSaveSuccessMessage,
    onTogglePermission,
    onSetCategorySelection,
    onResetPermissions,
    onSavePermissions,
}) => {
    const savedSet = new Set<string>(savedTeacherPermissions);
    const draftSet = new Set<string>(draftTeacherPermissions);

    const pendingGrantsCount = draftTeacherPermissions.filter((perm) => !savedSet.has(perm)).length;
    const pendingRevokesCount = savedTeacherPermissions.filter((perm) => !draftSet.has(perm)).length;
    const isMultiRoleAccount = accountRoles.length > 1;
    const hasSchoolAdminRole = accountRoles.includes('SCHOOL_ADMIN');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canManageTeacherPermissions || !isPermissionsDirty || isSavingPermissions) {
            return;
        }
        await onSavePermissions();
    };

    return (
        <section
            aria-labelledby="teacher-permissions-section-heading"
            className="space-y-4 border-t border-gray-200 pt-5"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3
                        id="teacher-permissions-section-heading"
                        className="text-sm font-semibold text-gray-900"
                    >
                        Teacher Functional Permissions
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                        Granular Teacher Portal capabilities scoped strictly to teaching operations.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {isPermissionsDirty && (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                            Unsaved Permission Changes (+{pendingGrantsCount} / -{pendingRevokesCount})
                        </span>
                    )}
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
                        {draftTeacherPermissions.length} of{' '}
                        {TEACHER_FUNCTIONAL_PERMISSION_ALLOWLIST.length} Enabled
                    </span>
                </div>
            </div>

            {!canManageTeacherPermissions ? (
                <div
                    role="note"
                    className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"
                >
                    Read-only view: Granting or revoking functional Teacher permissions requires the{' '}
                    <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">
                        {PERMISSIONS.TEACHERS.MANAGE_PERMISSIONS}
                    </code>{' '}
                    permission.
                </div>
            ) : (
                <div
                    role="note"
                    className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700"
                >
                    Only allowlisted Teacher Portal permissions (Courses, Programs view, Students
                    view, Attendance, Assignments, Assessments, Announcements) may be granted here.
                    School Admin, Platform Admin, Accountant, Settings, Payment, Staff, Website, and
                    Role management permissions cannot be assigned from this panel.
                </div>
            )}

            {isMultiRoleAccount && (
                <div
                    role="note"
                    className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-950"
                >
                    <p className="font-semibold">
                        Multi-Role Protection Active ({accountRoles.join(' + ')}):
                    </p>
                    <p className="mt-1">
                        {hasSchoolAdminRole
                            ? 'Updating Teacher permissions submits only allowlisted Teacher scope changes and will never remove School Admin role membership or alter School Admin/non-teacher permissions.'
                            : 'Updating Teacher permissions submits only allowlisted Teacher scope changes and preserves other staff roles and non-teacher permissions.'}
                    </p>
                    {!hasExplicitTeacherPermissionScope && (
                        <p className="mt-1 text-indigo-900">
                            Scope Limitation Notice: The current staff account model reports a
                            single flat <code className="font-mono">permissions</code> list without
                            role-scope separation. Backend enforcement of scoped{' '}
                            <code className="font-mono">teacherPermissions</code> storage is
                            required so revoking an overlapping permission under Teacher does not
                            affect other roles.
                        </p>
                    )}
                </div>
            )}

            {savedTeacherPermissions.length === 0 && draftTeacherPermissions.length === 0 && (
                <div
                    role="note"
                    className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700"
                >
                    <span className="font-semibold">Zero Functional Permissions Assigned:</span>{' '}
                    {TEACHER_DEFAULT_PERMISSIONS_POLICY.summary}
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {permissionsSaveSuccessMessage && (
                    <div
                        role="status"
                        className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                    >
                        {permissionsSaveSuccessMessage}
                    </div>
                )}

                {permissionsSaveError && (
                    <div
                        role={permissionsSaveError.isBackendUnavailable ? 'status' : 'alert'}
                        className={`rounded-md border p-3 text-sm ${
                            permissionsSaveError.isBackendUnavailable
                                ? 'border-amber-200 bg-amber-50 text-amber-900'
                                : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                    >
                        {permissionsSaveError.message}
                    </div>
                )}

                <div className="space-y-3">
                    {TEACHER_PERMISSION_CATEGORY_GROUPS.map((group) => {
                        const selectedInGroup = group.definitions.filter((def) =>
                            draftSet.has(def.key)
                        ).length;
                        const allSelected = selectedInGroup === group.definitions.length;
                        const noneSelected = selectedInGroup === 0;

                        return (
                            <div
                                key={group.category}
                                className="overflow-hidden rounded-md border border-gray-200 bg-white"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-900">
                                                {group.title}
                                            </h4>
                                            <span className="rounded-full bg-gray-200/80 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                                                {selectedInGroup}/{group.definitions.length}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600">{group.description}</p>
                                    </div>

                                    {canManageTeacherPermissions && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                disabled={isSavingPermissions || allSelected}
                                                onClick={() =>
                                                    onSetCategorySelection(group.category, true)
                                                }
                                                className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isSavingPermissions || noneSelected}
                                                onClick={() =>
                                                    onSetCategorySelection(group.category, false)
                                                }
                                                className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <ul className="divide-y divide-gray-100">
                                    {group.definitions.map((def) => {
                                        const isChecked = draftSet.has(def.key);
                                        const wasSaved = savedSet.has(def.key);
                                        const isPendingGrant = isChecked && !wasSaved;
                                        const isPendingRevoke = !isChecked && wasSaved;
                                        const inputId = `teacher-perm-${def.key}`;

                                        return (
                                            <li
                                                key={def.key}
                                                className={`flex items-start justify-between gap-3 px-4 py-2.5 ${
                                                    isPendingGrant
                                                        ? 'bg-emerald-50/50'
                                                        : isPendingRevoke
                                                          ? 'bg-amber-50/50'
                                                          : ''
                                                }`}
                                            >
                                                <div className="flex items-start gap-2.5">
                                                    {canManageTeacherPermissions && (
                                                        <input
                                                            id={inputId}
                                                            type="checkbox"
                                                            disabled={isSavingPermissions}
                                                            checked={isChecked}
                                                            onChange={() =>
                                                                onTogglePermission(def.key)
                                                            }
                                                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
                                                        />
                                                    )}
                                                    <div>
                                                        {canManageTeacherPermissions ? (
                                                            <label
                                                                htmlFor={inputId}
                                                                className="block cursor-pointer text-xs font-medium text-gray-900"
                                                            >
                                                                {def.label}
                                                            </label>
                                                        ) : (
                                                            <p className="text-xs font-medium text-gray-900">
                                                                {def.label}
                                                            </p>
                                                        )}
                                                        {def.description && (
                                                            <p className="mt-0.5 text-xs text-gray-600">
                                                                {def.description}
                                                            </p>
                                                        )}
                                                        <p className="mt-0.5 font-mono text-[11px] text-gray-400">
                                                            {def.key}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 pt-0.5">
                                                    {isPendingGrant ? (
                                                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                                            Pending Grant
                                                        </span>
                                                    ) : isPendingRevoke ? (
                                                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                                            Pending Revoke
                                                        </span>
                                                    ) : isChecked ? (
                                                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                                            Granted
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                                            Not Granted
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                {canManageTeacherPermissions && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
                        <button
                            type="button"
                            disabled={!isPermissionsDirty || isSavingPermissions}
                            onClick={onResetPermissions}
                            className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel Changes
                        </button>
                        <button
                            type="submit"
                            disabled={!isPermissionsDirty || isSavingPermissions}
                            className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSavingPermissions
                                ? 'Saving Permissions...'
                                : 'Save Teacher Permissions'}
                        </button>
                    </div>
                )}
            </form>

            {preservedNonTeacherPermissions.length > 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-slate-900">
                            Preserved Role &amp; Non-Teacher Permissions (Read-Only)
                        </h4>
                        <span className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            Protected · Never Modified Here
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                        These permissions are outside the Teacher functional allowlist and remain
                        strictly preserved on this account.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {preservedNonTeacherPermissions.map((perm) => (
                            <span
                                key={perm}
                                className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-700"
                            >
                                {perm}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};

