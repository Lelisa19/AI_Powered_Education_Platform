import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    useSchoolStaffDirectory,
    type StaffDirectoryQueryState,
} from '../../school-admin/hooks/useSchoolStaffDirectory';
import type { SchoolStaffAccount } from '../../school-admin/types/school-staff.types';
import { ApiError } from '../../../services/api/api-error';
import type { AuthenticatedUser } from '../../../types/auth';
import {
    TEACHER_PERMISSION_CATEGORY_GROUPS,
    areTeacherPermissionSetsEqual,
    isTeacherFunctionalPermissionKey,
    partitionAccountPermissionsByTeacherScope,
    sortTeacherFunctionalPermissions,
    validateTeacherFunctionalPermissions,
    type TeacherFunctionalPermissionKey,
    type TeacherPermissionCategory,
} from '../constants/teacher-permissions';
import {
    areTeacherProfileFormsEqual,
    createEmptyTeacherProfileFormValues,
    createTeacherProfileFormValues,
    mapBackendTeacherProfileFieldErrors,
    validateTeacherProfileForm,
} from '../schemas/teacher-profile-schema';
import {
    filterVerifiedTeacherAccounts,
    filterVerifiedTeacherInvitations,
    getTeacherProfile,
    isTeacherBackendUnavailableError,
    updateTeacherFunctionalPermissions,
    updateTeacherProfile,
} from '../services/teacher-management-service';
import type {
    TeacherDirectoryStatusFilter,
    TeacherProfileFieldErrors,
    TeacherProfileFormValues,
    TeacherProfileRecord,
} from '../types/teacher-management.types';

export interface TeacherOperationErrorState {
    message: string;
    isBackendUnavailable: boolean;
}

export interface TeacherDirectoryQueryState {
    accountsPage: number;
    invitationsPage: number;
    limit: number;
    search: string;
    statusFilter: TeacherDirectoryStatusFilter;
}

interface UseTeacherManagementOptions {
    actor: AuthenticatedUser | null;
    expectedTenantId: string | null;
    enabled: boolean;
    canReadTeachers: boolean;
    canUpdateTeacher: boolean;
    canManageTeacherPermissions: boolean;
}

const DEFAULT_TEACHER_DIRECTORY_QUERY: TeacherDirectoryQueryState = {
    accountsPage: 1,
    invitationsPage: 1,
    limit: 10,
    search: '',
    statusFilter: 'ALL',
};

export function useTeacherManagement({
    actor,
    expectedTenantId,
    enabled,
    canReadTeachers,
    canUpdateTeacher,
    canManageTeacherPermissions,
}: UseTeacherManagementOptions) {
    const [query, setQuery] = useState<TeacherDirectoryQueryState>(
        DEFAULT_TEACHER_DIRECTORY_QUERY
    );

    const staffDirectoryQuery = useMemo<StaffDirectoryQueryState>(
        () => ({
            accountsPage: query.accountsPage,
            invitationsPage: query.invitationsPage,
            limit: query.limit,
            search: query.search,
            role: 'TEACHER',
            statusFilter: query.statusFilter,
        }),
        [query]
    );

    const directoryEnabled = enabled && canReadTeachers && Boolean(expectedTenantId);

    const {
        accounts: rawAccounts,
        setAccounts,
        accountsPagination,
        accountsLoading,
        accountsError,
        showAccountsSection,
        invitations: rawInvitations,
        invitationsPagination,
        invitationsLoading,
        invitationsError,
        showInvitationsSection,
        reloadDirectory,
    } = useSchoolStaffDirectory(staffDirectoryQuery, expectedTenantId, directoryEnabled);

    const teachers = useMemo(
        () => filterVerifiedTeacherAccounts(rawAccounts, expectedTenantId),
        [rawAccounts, expectedTenantId]
    );

    const teacherInvitations = useMemo(
        () => filterVerifiedTeacherInvitations(rawInvitations, expectedTenantId),
        [rawInvitations, expectedTenantId]
    );

    const excludedNonTeacherCount = Math.max(0, rawAccounts.length - teachers.length);
    const excludedNonTeacherInvitationCount = Math.max(
        0,
        rawInvitations.length - teacherInvitations.length
    );

    const [selectedAccount, setSelectedAccount] = useState<SchoolStaffAccount | null>(null);
    const [teacherRecord, setTeacherRecord] = useState<TeacherProfileRecord | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
    const [profileError, setProfileError] = useState<TeacherOperationErrorState | null>(null);

    const [formValues, setFormValues] = useState<TeacherProfileFormValues>(
        createEmptyTeacherProfileFormValues
    );
    const [savedFormValues, setSavedFormValues] = useState<TeacherProfileFormValues>(
        createEmptyTeacherProfileFormValues
    );
    const [fieldErrors, setFieldErrors] = useState<TeacherProfileFieldErrors>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<TeacherOperationErrorState | null>(null);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

    const [savedTeacherPermissions, setSavedTeacherPermissions] = useState<
        TeacherFunctionalPermissionKey[]
    >([]);
    const [draftTeacherPermissions, setDraftTeacherPermissions] = useState<
        TeacherFunctionalPermissionKey[]
    >([]);
    const [hasExplicitTeacherPermissionScope, setHasExplicitTeacherPermissionScope] =
        useState(false);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    const [permissionsSaveError, setPermissionsSaveError] =
        useState<TeacherOperationErrorState | null>(null);
    const [permissionsSaveSuccessMessage, setPermissionsSaveSuccessMessage] = useState<
        string | null
    >(null);

    const profileAbortRef = useRef<AbortController | null>(null);
    const profileRequestSeqRef = useRef(0);
    const isSavingRef = useRef(false);
    const isSavingPermissionsRef = useRef(false);
    const userEditedPermissionsDuringLoadRef = useRef(false);

    const isProfileDirty = useMemo(
        () => hasLoadedProfile && !areTeacherProfileFormsEqual(formValues, savedFormValues),
        [formValues, hasLoadedProfile, savedFormValues]
    );

    const isPermissionsDirty = useMemo(
        () => !areTeacherPermissionSetsEqual(draftTeacherPermissions, savedTeacherPermissions),
        [draftTeacherPermissions, savedTeacherPermissions]
    );

    const isDirty = isProfileDirty || isPermissionsDirty;

    const preservedNonTeacherPermissions = useMemo(
        () =>
            selectedAccount
                ? partitionAccountPermissionsByTeacherScope(selectedAccount.permissions)
                      .preservedNonTeacherPermissions
                : [],
        [selectedAccount]
    );

    const loadTeacherProfileForAccount = useCallback(
        async (account: SchoolStaffAccount) => {
            if (!directoryEnabled || !expectedTenantId) {
                return;
            }

            profileAbortRef.current?.abort();
            const controller = new AbortController();
            profileAbortRef.current = controller;
            const requestSeq = ++profileRequestSeqRef.current;

            const fallbackInitial = createTeacherProfileFormValues(account, null);
            const fallbackPartition = partitionAccountPermissionsByTeacherScope(
                account.permissions
            );

            userEditedPermissionsDuringLoadRef.current = false;

            setSelectedAccount(account);
            setTeacherRecord({ account, profile: {} });
            setProfileLoading(true);
            setHasLoadedProfile(false);
            setProfileError(null);
            setFieldErrors({});
            setSaveError(null);
            setSaveSuccessMessage(null);
            setFormValues(fallbackInitial);
            setSavedFormValues(fallbackInitial);
            setSavedTeacherPermissions(fallbackPartition.teacherPermissions);
            setDraftTeacherPermissions(fallbackPartition.teacherPermissions);
            setHasExplicitTeacherPermissionScope(false);
            setPermissionsSaveError(null);
            setPermissionsSaveSuccessMessage(null);

            try {
                const response = await getTeacherProfile(
                    account.id,
                    expectedTenantId,
                    account,
                    controller.signal
                );
                if (controller.signal.aborted || requestSeq !== profileRequestSeqRef.current) {
                    return;
                }

                const nextValues = createTeacherProfileFormValues(
                    response.teacher.account,
                    response.teacher.profile
                );
                const explicitScope = response.teacher.teacherPermissions !== undefined;
                const resolvedTeacherPerms =
                    response.teacher.teacherPermissions ??
                    partitionAccountPermissionsByTeacherScope(response.teacher.account.permissions)
                        .teacherPermissions;

                setSelectedAccount(response.teacher.account);
                setTeacherRecord(response.teacher);
                setFormValues(nextValues);
                setSavedFormValues(nextValues);
                setSavedTeacherPermissions(resolvedTeacherPerms);
                setHasExplicitTeacherPermissionScope(explicitScope);
                if (!userEditedPermissionsDuringLoadRef.current) {
                    setDraftTeacherPermissions(resolvedTeacherPerms);
                }
                setHasLoadedProfile(true);
                setProfileError(null);
            } catch (error: unknown) {
                if (error instanceof ApiError && error.isCancellation) {
                    return;
                }
                if (controller.signal.aborted || requestSeq !== profileRequestSeqRef.current) {
                    return;
                }

                const unavailable = isTeacherBackendUnavailableError(error);
                setHasLoadedProfile(false);
                setProfileError({
                    message: unavailable
                        ? 'Teacher professional profile endpoint is currently unavailable or pending backend implementation.'
                        : error instanceof Error && error.message
                          ? error.message
                          : 'Unable to load teacher professional profile details.',
                    isBackendUnavailable: unavailable,
                });
            } finally {
                if (requestSeq === profileRequestSeqRef.current) {
                    setProfileLoading(false);
                }
            }
        },
        [directoryEnabled, expectedTenantId]
    );

    const openTeacherDetail = useCallback(
        (account: SchoolStaffAccount) => {
            if (!directoryEnabled) return;
            void loadTeacherProfileForAccount(account);
        },
        [directoryEnabled, loadTeacherProfileForAccount]
    );

    const retryLoadTeacherProfile = useCallback(() => {
        if (!selectedAccount || !directoryEnabled) return;
        void loadTeacherProfileForAccount(selectedAccount);
    }, [directoryEnabled, loadTeacherProfileForAccount, selectedAccount]);

    const closeTeacherDetail = useCallback(() => {
        profileAbortRef.current?.abort();
        profileRequestSeqRef.current += 1;
        setSelectedAccount(null);
        setTeacherRecord(null);
        setProfileLoading(false);
        setHasLoadedProfile(false);
        setProfileError(null);
        setFieldErrors({});
        setSaveError(null);
        setSaveSuccessMessage(null);
        setFormValues(createEmptyTeacherProfileFormValues());
        setSavedFormValues(createEmptyTeacherProfileFormValues());
        setSavedTeacherPermissions([]);
        setDraftTeacherPermissions([]);
        setHasExplicitTeacherPermissionScope(false);
        setPermissionsSaveError(null);
        setPermissionsSaveSuccessMessage(null);
        userEditedPermissionsDuringLoadRef.current = false;
    }, []);

    const updateFormField = useCallback(
        <K extends keyof TeacherProfileFormValues>(
            field: K,
            value: TeacherProfileFormValues[K]
        ) => {
            setFormValues((prev) => ({ ...prev, [field]: value }));
            setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
            setSaveError(null);
            setSaveSuccessMessage(null);
        },
        []
    );

    const resetProfileForm = useCallback(() => {
        setFormValues(savedFormValues);
        setFieldErrors({});
        setSaveError(null);
        setSaveSuccessMessage(null);
    }, [savedFormValues]);

    const saveTeacherProfile = useCallback(async (): Promise<boolean> => {
        if (isSavingRef.current || isSaving) {
            return false;
        }
        if (!directoryEnabled || !expectedTenantId || !selectedAccount) {
            setSaveError({
                message: 'A verified school session and selected teacher are required.',
                isBackendUnavailable: false,
            });
            return false;
        }
        if (!canUpdateTeacher) {
            setSaveError({
                message: 'Your account lacks teachers.update permission to modify teacher profiles.',
                isBackendUnavailable: false,
            });
            return false;
        }
        if (!hasLoadedProfile || profileError) {
            setSaveError({
                message:
                    'Teacher professional profile must be loaded from the backend before saving edits.',
                isBackendUnavailable: Boolean(profileError?.isBackendUnavailable),
            });
            return false;
        }

        const validation = validateTeacherProfileForm(formValues);
        if (!validation.valid) {
            setFieldErrors(validation.fieldErrors);
            setSaveError({
                message: 'Please correct the highlighted teacher profile validation errors.',
                isBackendUnavailable: false,
            });
            return false;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        setFieldErrors({});
        setSaveError(null);
        setSaveSuccessMessage(null);

        try {
            const response = await updateTeacherProfile(
                selectedAccount.id,
                validation.payload,
                expectedTenantId,
                selectedAccount
            );
            const nextValues = createTeacherProfileFormValues(
                response.teacher.account,
                response.teacher.profile
            );
            setTeacherRecord(response.teacher);
            setSelectedAccount(response.teacher.account);
            setFormValues(nextValues);
            setSavedFormValues(nextValues);
            setSaveSuccessMessage(response.message ?? 'Teacher professional profile updated.');

            setAccounts((prev) =>
                prev.map((item) =>
                    item.id === response.teacher.account.id ? response.teacher.account : item
                )
            );
            return true;
        } catch (error: unknown) {
            if (error instanceof ApiError && error.validationErrors) {
                setFieldErrors(mapBackendTeacherProfileFieldErrors(error.validationErrors));
            }
            const unavailable = isTeacherBackendUnavailableError(error);
            setSaveError({
                message: unavailable
                    ? 'Teacher profile update endpoint is currently unavailable or pending backend implementation. Changes were not saved.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to update teacher professional profile.',
                isBackendUnavailable: unavailable,
            });
            return false;
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [
        canUpdateTeacher,
        directoryEnabled,
        expectedTenantId,
        formValues,
        hasLoadedProfile,
        isSaving,
        profileError,
        selectedAccount,
        setAccounts,
    ]);

    const applyAccountUpdate = useCallback(
        (updatedAccount: SchoolStaffAccount) => {
            setAccounts((prev) =>
                prev.map((item) => (item.id === updatedAccount.id ? updatedAccount : item))
            );
            setSelectedAccount((prev) => (prev && prev.id === updatedAccount.id ? updatedAccount : prev));
            setTeacherRecord((prev) =>
                prev && prev.account.id === updatedAccount.id
                    ? { ...prev, account: updatedAccount }
                    : prev
            );
        },
        [setAccounts]
    );

    const toggleTeacherPermission = useCallback(
        (permission: TeacherFunctionalPermissionKey) => {
            if (
                !directoryEnabled ||
                !canManageTeacherPermissions ||
                !selectedAccount ||
                isSavingPermissionsRef.current ||
                !isTeacherFunctionalPermissionKey(permission)
            ) {
                return;
            }

            userEditedPermissionsDuringLoadRef.current = true;
            setPermissionsSaveError(null);
            setPermissionsSaveSuccessMessage(null);
            setDraftTeacherPermissions((prev) => {
                if (prev.includes(permission)) {
                    return prev.filter((item) => item !== permission);
                }
                return sortTeacherFunctionalPermissions([...prev, permission]);
            });
        },
        [canManageTeacherPermissions, directoryEnabled, selectedAccount]
    );

    const setTeacherPermissionCategorySelection = useCallback(
        (category: TeacherPermissionCategory, selected: boolean) => {
            if (
                !directoryEnabled ||
                !canManageTeacherPermissions ||
                !selectedAccount ||
                isSavingPermissionsRef.current
            ) {
                return;
            }

            const group = TEACHER_PERMISSION_CATEGORY_GROUPS.find(
                (item) => item.category === category
            );
            if (!group) return;

            const categoryKeys = group.definitions.map((def) => def.key);
            const categorySet = new Set<string>(categoryKeys);

            userEditedPermissionsDuringLoadRef.current = true;
            setPermissionsSaveError(null);
            setPermissionsSaveSuccessMessage(null);
            setDraftTeacherPermissions((prev) => {
                const remaining = prev.filter((item) => !categorySet.has(item));
                return selected
                    ? sortTeacherFunctionalPermissions([...remaining, ...categoryKeys])
                    : sortTeacherFunctionalPermissions(remaining);
            });
        },
        [canManageTeacherPermissions, directoryEnabled, selectedAccount]
    );

    const resetTeacherPermissions = useCallback(() => {
        setDraftTeacherPermissions(savedTeacherPermissions);
        setPermissionsSaveError(null);
        setPermissionsSaveSuccessMessage(null);
    }, [savedTeacherPermissions]);

    const saveTeacherPermissions = useCallback(async (): Promise<boolean> => {
        if (isSavingPermissionsRef.current || isSavingPermissions) {
            return false;
        }
        if (!directoryEnabled || !expectedTenantId || !selectedAccount || !actor) {
            setPermissionsSaveError({
                message: 'A verified school session and selected teacher are required.',
                isBackendUnavailable: false,
            });
            return false;
        }
        if (!canManageTeacherPermissions) {
            setPermissionsSaveError({
                message:
                    'Your account lacks teachers.manage_permissions permission to modify teacher permissions.',
                isBackendUnavailable: false,
            });
            return false;
        }
        if (!isPermissionsDirty) {
            return false;
        }

        const validation = validateTeacherFunctionalPermissions(draftTeacherPermissions);
        if (!validation.valid) {
            setPermissionsSaveError({
                message:
                    'Security validation failed: Only allowlisted Teacher functional permissions may be saved.',
                isBackendUnavailable: false,
            });
            return false;
        }

        isSavingPermissionsRef.current = true;
        setIsSavingPermissions(true);
        setPermissionsSaveError(null);
        setPermissionsSaveSuccessMessage(null);

        try {
            const response = await updateTeacherFunctionalPermissions({
                teacherId: selectedAccount.id,
                nextTeacherPermissions: validation.keys,
                previousTeacherPermissions: savedTeacherPermissions,
                expectedTenantId,
                fallbackAccount: selectedAccount,
                actor,
            });

            setSavedTeacherPermissions(response.teacherPermissions);
            setDraftTeacherPermissions(response.teacherPermissions);
            setHasExplicitTeacherPermissionScope(true);
            setPermissionsSaveSuccessMessage(
                response.message ?? 'Teacher functional permissions updated.'
            );

            setAccounts((prev) =>
                prev.map((item) => (item.id === response.account.id ? response.account : item))
            );
            setSelectedAccount((prev) =>
                prev && prev.id === response.account.id ? response.account : prev
            );
            setTeacherRecord((prev) =>
                prev && prev.account.id === response.account.id
                    ? {
                          ...prev,
                          account: response.account,
                          teacherPermissions: response.teacherPermissions,
                      }
                    : prev
            );
            return true;
        } catch (error: unknown) {
            const unavailable = isTeacherBackendUnavailableError(error);
            setPermissionsSaveError({
                message: unavailable
                    ? 'Teacher permissions update endpoint is currently unavailable or pending backend implementation. Changes were not saved.'
                    : error instanceof Error && error.message
                      ? error.message
                      : 'Unable to update teacher functional permissions.',
                isBackendUnavailable: unavailable,
            });
            return false;
        } finally {
            isSavingPermissionsRef.current = false;
            setIsSavingPermissions(false);
        }
    }, [
        actor,
        canManageTeacherPermissions,
        directoryEnabled,
        draftTeacherPermissions,
        expectedTenantId,
        isPermissionsDirty,
        isSavingPermissions,
        savedTeacherPermissions,
        selectedAccount,
        setAccounts,
    ]);

    useEffect(() => {
        return () => {
            profileAbortRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        if (!selectedAccount || !isDirty) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty, selectedAccount]);

    return {
        query,
        setQuery,
        teachers,
        accountsPagination,
        accountsLoading,
        accountsError,
        showAccountsSection,
        teacherInvitations,
        invitationsPagination,
        invitationsLoading,
        invitationsError,
        showInvitationsSection,
        excludedNonTeacherCount,
        excludedNonTeacherInvitationCount,
        reloadDirectory,
        selectedAccount,
        teacherRecord,
        profileLoading,
        hasLoadedProfile,
        profileError,
        formValues,
        fieldErrors,
        isDirty,
        isProfileDirty,
        isSaving,
        saveError,
        saveSuccessMessage,
        savedTeacherPermissions,
        draftTeacherPermissions,
        preservedNonTeacherPermissions,
        hasExplicitTeacherPermissionScope,
        isPermissionsDirty,
        isSavingPermissions,
        permissionsSaveError,
        permissionsSaveSuccessMessage,
        openTeacherDetail,
        retryLoadTeacherProfile,
        closeTeacherDetail,
        updateFormField,
        resetProfileForm,
        saveTeacherProfile,
        toggleTeacherPermission,
        setTeacherPermissionCategorySelection,
        resetTeacherPermissions,
        saveTeacherPermissions,
        applyAccountUpdate,
    };
}

