import { PERMISSIONS } from '../../../constants/permissions';
import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import type { AuthenticatedUser } from '../../../types/auth';
import { hasPermission } from '../../../utils/authorization';
import { isSchoolStaffBackendUnavailableError } from '../../school-admin/services/school-staff-service';
import type {
    SchoolStaffAccount,
    SchoolStaffAccountStatus,
    SchoolStaffInvitation,
    SchoolStaffRole,
} from '../../school-admin/types/school-staff.types';
import {
    partitionAccountPermissionsByTeacherScope,
    sortTeacherFunctionalPermissions,
    validateTeacherFunctionalPermissions,
    type TeacherFunctionalPermissionKey,
} from '../constants/teacher-permissions';
import type {
    TeacherAssignmentSummary,
    TeacherInvitationRecord,
    TeacherPermissionsUpdateResponse,
    TeacherProfessionalDetails,
    TeacherProfileRecord,
    TeacherProfileResponse,
    UpdateTeacherPermissionsRequest,
    UpdateTeacherProfileRequest,
} from '../types/teacher-management.types';

const VALID_STAFF_ROLES: readonly SchoolStaffRole[] = [
    'SCHOOL_ADMIN',
    'TEACHER',
    'SCHOOL_ACCOUNTANT',
];

const VALID_ACCOUNT_STATUSES: readonly SchoolStaffAccountStatus[] = ['ACTIVE', 'INACTIVE'];

const FORBIDDEN_TEACHER_KEYS = [
    'password',
    'passwordHash',
    'token',
    'invitationToken',
    'tokenHash',
    'refreshToken',
    'secret',
    'accessKey',
    'privateKey',
] as const;

export const isTeacherBackendUnavailableError = isSchoolStaffBackendUnavailableError;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSensitiveFields(obj: Record<string, unknown>, context: string): void {
    for (const key of FORBIDDEN_TEACHER_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                `Security violation: ${context} response exposed sensitive metadata.`,
                502
            );
        }
    }
}

function assertVerifiedTenantId(expectedTenantId: string): string {
    if (typeof expectedTenantId !== 'string' || expectedTenantId.trim() === '') {
        throw new ApiError('Verified school tenant context is required.', 400);
    }
    return expectedTenantId.trim();
}

function assertMatchingTenantId(actualTenantId: string, expectedTenantId: string): void {
    if (actualTenantId !== expectedTenantId) {
        throw new ApiError(
            'Security violation: Teacher record belongs to a different school tenant.',
            502
        );
    }
}

function assertVerifiedFallbackAccount(
    account: SchoolStaffAccount,
    teacherId: string,
    expectedTenantId: string
): SchoolStaffAccount {
    if (account.id !== teacherId) {
        throw new ApiError('Teacher identifier mismatch in directory state.', 400);
    }
    if (typeof account.tenantId !== 'string' || account.tenantId.trim() === '') {
        throw new ApiError('Security violation: Teacher account lacks tenant context.', 502);
    }
    assertMatchingTenantId(account.tenantId, expectedTenantId);
    if (!Array.isArray(account.roles) || !account.roles.includes('TEACHER')) {
        throw new ApiError('Target staff account does not hold the TEACHER role.', 502);
    }
    return account;
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid teacher payload field: ${fieldName}.`, 502);
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function parseRequiredNonEmptyString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError(`Invalid teacher payload: missing ${fieldName}.`, 502);
    }
    return value.trim();
}

function isSchoolStaffRole(value: unknown): value is SchoolStaffRole {
    return typeof value === 'string' && VALID_STAFF_ROLES.includes(value as SchoolStaffRole);
}

function isSchoolStaffAccountStatus(value: unknown): value is SchoolStaffAccountStatus {
    return (
        typeof value === 'string' &&
        VALID_ACCOUNT_STATUSES.includes(value as SchoolStaffAccountStatus)
    );
}

function unwrapTeacherEnvelope(payload: unknown): {
    record: Record<string, unknown>;
    message?: string;
} {
    if (!isPlainObject(payload)) {
        throw new ApiError('Backend teacher endpoint returned an unexpected response.', 502);
    }
    assertNoExposedSensitiveFields(payload, 'Teacher');

    const message =
        typeof payload.message === 'string' && payload.message.trim() !== ''
            ? payload.message
            : undefined;

    let candidate: unknown = payload;
    if ('teacher' in payload && payload.teacher !== undefined) {
        candidate = payload.teacher;
    } else if ('staff' in payload && payload.staff !== undefined && isPlainObject(payload.staff)) {
        candidate = payload.staff;
    } else if ('data' in payload && payload.data !== undefined && isPlainObject(payload.data)) {
        candidate = payload.data;
    }

    if (!isPlainObject(candidate)) {
        throw new ApiError('Invalid backend teacher payload.', 502);
    }
    assertNoExposedSensitiveFields(candidate, 'Teacher');

    return { record: candidate, ...(message ? { message } : {}) };
}

function parseOptionalTeacherPermissions(
    value: unknown
): TeacherFunctionalPermissionKey[] | undefined {
    if (value === undefined || value === null) return undefined;
    const validation = validateTeacherFunctionalPermissions(value);
    if (!validation.valid) {
        throw new ApiError(
            'Security violation: Backend returned unauthorized or malformed teacherPermissions scope.',
            502
        );
    }
    return validation.keys;
}

function assertMultiRolePreservation(
    updatedAccount: SchoolStaffAccount,
    previousAccount: SchoolStaffAccount
): void {
    const previousRoles = new Set(previousAccount.roles);
    const updatedRoles = new Set(updatedAccount.roles);
    if (
        previousRoles.size !== updatedRoles.size ||
        previousAccount.roles.some((role) => !updatedRoles.has(role))
    ) {
        throw new ApiError(
            'Security violation: Teacher permission update attempted to modify assigned staff roles.',
            502
        );
    }

    const previousNonTeacher = new Set(
        partitionAccountPermissionsByTeacherScope(previousAccount.permissions)
            .preservedNonTeacherPermissions
    );
    const updatedNonTeacher = new Set(
        partitionAccountPermissionsByTeacherScope(updatedAccount.permissions)
            .preservedNonTeacherPermissions
    );

    if (
        previousNonTeacher.size !== updatedNonTeacher.size ||
        [...previousNonTeacher].some((perm) => !updatedNonTeacher.has(perm))
    ) {
        throw new ApiError(
            'Security violation: Non-teacher or multi-role account permissions were unexpectedly altered.',
            502
        );
    }
}

function mergeVerifiedAccount(
    rawAccount: unknown,
    fallbackAccount: SchoolStaffAccount,
    teacherId: string,
    expectedTenantId: string
): SchoolStaffAccount {
    if (rawAccount === undefined || rawAccount === null) {
        return fallbackAccount;
    }
    if (!isPlainObject(rawAccount)) {
        throw new ApiError('Invalid teacher account payload.', 502);
    }
    assertNoExposedSensitiveFields(rawAccount, 'Teacher account');

    const id =
        rawAccount.id !== undefined
            ? parseRequiredNonEmptyString(rawAccount.id, 'account.id')
            : fallbackAccount.id;
    if (id !== teacherId) {
        throw new ApiError('Security violation: Teacher account id mismatch.', 502);
    }

    const tenantId =
        rawAccount.tenantId !== undefined
            ? parseRequiredNonEmptyString(rawAccount.tenantId, 'account.tenantId')
            : fallbackAccount.tenantId;
    assertMatchingTenantId(tenantId, expectedTenantId);

    if (rawAccount.accountType !== undefined && rawAccount.accountType !== 'SCHOOL') {
        throw new ApiError('Security violation: Invalid teacher accountType.', 502);
    }

    let roles = fallbackAccount.roles;
    if (rawAccount.roles !== undefined) {
        if (!Array.isArray(rawAccount.roles) || !rawAccount.roles.every(isSchoolStaffRole)) {
            throw new ApiError('Invalid teacher account roles.', 502);
        }
        if (!rawAccount.roles.includes('TEACHER')) {
            throw new ApiError('Security violation: Returned account lacks TEACHER role.', 502);
        }
        roles = rawAccount.roles;
    }

    const primaryRole: SchoolStaffRole =
        rawAccount.primaryRole !== undefined
            ? isSchoolStaffRole(rawAccount.primaryRole)
                ? rawAccount.primaryRole
                : (() => {
                      throw new ApiError('Invalid teacher primaryRole.', 502);
                  })()
            : fallbackAccount.primaryRole;

    let status = fallbackAccount.status;
    let isActive = fallbackAccount.isActive;
    if (rawAccount.status !== undefined) {
        if (!isSchoolStaffAccountStatus(rawAccount.status)) {
            throw new ApiError('Invalid teacher account status.', 502);
        }
        status = rawAccount.status;
        isActive = status === 'ACTIVE';
    } else if (typeof rawAccount.isActive === 'boolean') {
        isActive = rawAccount.isActive;
    }

    let permissions = fallbackAccount.permissions;
    if (rawAccount.permissions !== undefined) {
        if (
            !Array.isArray(rawAccount.permissions) ||
            !rawAccount.permissions.every((item) => typeof item === 'string')
        ) {
            throw new ApiError('Invalid teacher account permissions.', 502);
        }
        permissions = rawAccount.permissions as SchoolStaffAccount['permissions'];
    }

    return {
        ...fallbackAccount,
        id,
        tenantId,
        roles,
        primaryRole,
        status,
        isActive,
        permissions,
        email:
            rawAccount.email !== undefined
                ? parseRequiredNonEmptyString(rawAccount.email, 'account.email')
                : fallbackAccount.email,
        firstName:
            rawAccount.firstName !== undefined
                ? parseRequiredNonEmptyString(rawAccount.firstName, 'account.firstName')
                : fallbackAccount.firstName,
        lastName:
            rawAccount.lastName !== undefined
                ? parseRequiredNonEmptyString(rawAccount.lastName, 'account.lastName')
                : fallbackAccount.lastName,
        phone:
            rawAccount.phone !== undefined
                ? parseOptionalNullableString(rawAccount.phone, 'account.phone')
                : fallbackAccount.phone,
        department:
            rawAccount.department !== undefined
                ? parseOptionalNullableString(rawAccount.department, 'account.department')
                : fallbackAccount.department,
        isPrimaryAdmin:
            typeof rawAccount.isPrimaryAdmin === 'boolean'
                ? rawAccount.isPrimaryAdmin
                : fallbackAccount.isPrimaryAdmin,
        canManageStatus:
            typeof rawAccount.canManageStatus === 'boolean'
                ? rawAccount.canManageStatus
                : fallbackAccount.canManageStatus,
    };
}

function parseTeacherProfileDetails(
    rawProfile: unknown,
    expectedTenantId: string,
    teacherId: string
): TeacherProfessionalDetails & { phone?: string | null; department?: string | null } {
    const profileObj = isPlainObject(rawProfile) ? rawProfile : {};
    assertNoExposedSensitiveFields(profileObj, 'Teacher profile');

    if (typeof profileObj.tenantId === 'string' && profileObj.tenantId.trim() !== '') {
        assertMatchingTenantId(profileObj.tenantId.trim(), expectedTenantId);
    }
    const targetId =
        typeof profileObj.teacherId === 'string' && profileObj.teacherId.trim() !== ''
            ? profileObj.teacherId.trim()
            : typeof profileObj.accountId === 'string' && profileObj.accountId.trim() !== ''
              ? profileObj.accountId.trim()
              : null;
    if (targetId && targetId !== teacherId) {
        throw new ApiError('Security violation: Teacher profile identifier mismatch.', 502);
    }

    const result: TeacherProfessionalDetails & {
        phone?: string | null;
        department?: string | null;
    } = {
        employeeCode: parseOptionalNullableString(profileObj.employeeCode, 'profile.employeeCode'),
        specialization: parseOptionalNullableString(
            profileObj.specialization,
            'profile.specialization'
        ),
        qualification: parseOptionalNullableString(
            profileObj.qualification,
            'profile.qualification'
        ),
        bio: parseOptionalNullableString(profileObj.bio, 'profile.bio'),
        updatedAt: parseOptionalNullableString(profileObj.updatedAt, 'profile.updatedAt'),
    };

    if ('phone' in profileObj) {
        result.phone = parseOptionalNullableString(profileObj.phone, 'profile.phone');
    }
    if ('department' in profileObj) {
        result.department = parseOptionalNullableString(
            profileObj.department,
            'profile.department'
        );
    }

    return result;
}

function parseTeachingAssignments(raw: unknown): TeacherAssignmentSummary[] | undefined {
    if (raw === undefined || raw === null) return undefined;
    if (!Array.isArray(raw)) {
        throw new ApiError('Invalid teacher assignments payload.', 502);
    }

    return raw.map((item, index) => {
        if (!isPlainObject(item)) {
            throw new ApiError(`Invalid teacher assignment entry at index ${index}.`, 502);
        }
        assertNoExposedSensitiveFields(item, 'Teacher assignment');

        let parsedScope: 'PROGRAM_COURSE' | 'STANDALONE_COURSE' | undefined;
        if (item.scope !== undefined && item.scope !== null) {
            if (item.scope !== 'PROGRAM_COURSE' && item.scope !== 'STANDALONE_COURSE') {
                throw new ApiError(
                    `Invalid teacher assignment scope at index ${index}.`,
                    502
                );
            }
            parsedScope = item.scope;
        }

        const programName = parseOptionalNullableString(
            item.programName,
            `teachingAssignments[${index}].programName`
        );
        if (parsedScope === 'STANDALONE_COURSE' && programName) {
            throw new ApiError(
                `Contract violation: Standalone teacher assignment at index ${index} must not include programName.`,
                502
            );
        }

        return {
            id: parseRequiredNonEmptyString(item.id, `teachingAssignments[${index}].id`),
            ...(parsedScope ? { scope: parsedScope } : {}),
            courseTitle: parseRequiredNonEmptyString(
                item.courseTitle,
                `teachingAssignments[${index}].courseTitle`
            ),
            courseCode: parseOptionalNullableString(
                item.courseCode,
                `teachingAssignments[${index}].courseCode`
            ),
            programName,
            academicYearName: parseOptionalNullableString(
                item.academicYearName,
                `teachingAssignments[${index}].academicYearName`
            ),
            termName: parseOptionalNullableString(
                item.termName,
                `teachingAssignments[${index}].termName`
            ),
            sectionName: parseOptionalNullableString(
                item.sectionName,
                `teachingAssignments[${index}].sectionName`
            ),
            assignedAt: parseOptionalNullableString(
                item.assignedAt,
                `teachingAssignments[${index}].assignedAt`
            ),
        };
    });
}

function parseTeacherProfileRecord(
    record: Record<string, unknown>,
    fallbackAccount: SchoolStaffAccount,
    teacherId: string,
    expectedTenantId: string
): TeacherProfileRecord {
    if (typeof record.tenantId === 'string' && record.tenantId.trim() !== '') {
        assertMatchingTenantId(record.tenantId.trim(), expectedTenantId);
    }

    const baseAccount = mergeVerifiedAccount(
        record.account,
        fallbackAccount,
        teacherId,
        expectedTenantId
    );

    const profileSource = 'profile' in record && isPlainObject(record.profile) ? record.profile : record;
    const parsedProfile = parseTeacherProfileDetails(profileSource, expectedTenantId, teacherId);

    const mergedAccount: SchoolStaffAccount = {
        ...baseAccount,
        ...('phone' in parsedProfile ? { phone: parsedProfile.phone } : {}),
        ...('department' in parsedProfile ? { department: parsedProfile.department } : {}),
    };

    const teachingAssignments = parseTeachingAssignments(record.teachingAssignments);
    const teacherPermissions = parseOptionalTeacherPermissions(record.teacherPermissions);

    return {
        account: mergedAccount,
        profile: {
            employeeCode: parsedProfile.employeeCode,
            specialization: parsedProfile.specialization,
            qualification: parsedProfile.qualification,
            bio: parsedProfile.bio,
            updatedAt: parsedProfile.updatedAt,
        },
        ...(teacherPermissions !== undefined ? { teacherPermissions } : {}),
        ...(teachingAssignments !== undefined ? { teachingAssignments } : {}),
    };
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

/**
 * Defensive client filter verifying accounts belong to the verified school tenant
 * and hold the TEACHER role.
 */
export function filterVerifiedTeacherAccounts(
    accounts: readonly SchoolStaffAccount[],
    expectedTenantId?: string | null
): SchoolStaffAccount[] {
    return accounts.filter((account) => {
        if (typeof account.tenantId !== 'string' || account.tenantId.trim() === '') return false;
        if (expectedTenantId && account.tenantId !== expectedTenantId) return false;
        return Array.isArray(account.roles) && account.roles.includes('TEACHER');
    });
}

/**
 * Defensive client filter verifying invitations belong to the verified school tenant
 * and target the TEACHER role.
 */
export function filterVerifiedTeacherInvitations(
    invitations: readonly SchoolStaffInvitation[],
    expectedTenantId?: string | null
): TeacherInvitationRecord[] {
    return invitations.filter((invitation): invitation is TeacherInvitationRecord => {
        if (invitation.role !== 'TEACHER') return false;
        if (expectedTenantId && invitation.tenantId !== expectedTenantId) return false;
        return true;
    });
}

/**
 * Retrieves teacher-specific profile extension details and optional read-only teaching assignments
 * (`GET /school/teachers/:teacherId/profile`), composed with the verified Step 5.3 SchoolStaffAccount.
 */
export async function getTeacherProfile(
    teacherId: string,
    expectedTenantId: string,
    fallbackAccount: SchoolStaffAccount,
    signal?: AbortSignal
): Promise<TeacherProfileResponse> {
    const cleanTenantId = assertVerifiedTenantId(expectedTenantId);
    const cleanTeacherId = teacherId.trim();
    if (!cleanTeacherId) {
        throw new ApiError('Teacher identifier is required.', 400);
    }
    const verifiedAccount = assertVerifiedFallbackAccount(
        fallbackAccount,
        cleanTeacherId,
        cleanTenantId
    );

    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.SCHOOL_TEACHERS.PROFILE(cleanTeacherId),
            { signal }
        );
        const { record, message } = unwrapTeacherEnvelope(response.data);
        return {
            teacher: parseTeacherProfileRecord(
                record,
                verifiedAccount,
                cleanTeacherId,
                cleanTenantId
            ),
            ...(message ? { message } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

/**
 * Updates teacher professional profile details (`PUT /school/teachers/:teacherId/profile`)
 * without modifying roles, permissions, email, or tenant assignment.
 */
export async function updateTeacherProfile(
    teacherId: string,
    request: UpdateTeacherProfileRequest,
    expectedTenantId: string,
    fallbackAccount: SchoolStaffAccount
): Promise<TeacherProfileResponse> {
    const cleanTenantId = assertVerifiedTenantId(expectedTenantId);
    const cleanTeacherId = teacherId.trim();
    if (!cleanTeacherId) {
        throw new ApiError('Teacher identifier is required.', 400);
    }
    const verifiedAccount = assertVerifiedFallbackAccount(
        fallbackAccount,
        cleanTeacherId,
        cleanTenantId
    );

    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.SCHOOL_TEACHERS.PROFILE(cleanTeacherId),
            request
        );
        const { record, message } = unwrapTeacherEnvelope(response.data);
        return {
            teacher: parseTeacherProfileRecord(
                record,
                verifiedAccount,
                cleanTeacherId,
                cleanTenantId
            ),
            ...(message ? { message } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export interface UpdateTeacherFunctionalPermissionsParams {
    teacherId: string;
    nextTeacherPermissions: readonly string[];
    previousTeacherPermissions: readonly string[];
    expectedTenantId: string;
    fallbackAccount: SchoolStaffAccount;
    actor: AuthenticatedUser | null;
}

/**
 * Updates functional permissions within the TEACHER scope (`PUT /school/teachers/:teacherId/permissions`).
 * Enforces `PERMISSIONS.TEACHERS.MANAGE_PERMISSIONS`, verified SCHOOL tenant context,
 * strict allowlist membership, and multi-role non-teacher permission preservation.
 */
export async function updateTeacherFunctionalPermissions({
    teacherId,
    nextTeacherPermissions,
    previousTeacherPermissions,
    expectedTenantId,
    fallbackAccount,
    actor,
}: UpdateTeacherFunctionalPermissionsParams): Promise<TeacherPermissionsUpdateResponse> {
    const cleanTenantId = assertVerifiedTenantId(expectedTenantId);
    const cleanTeacherId = teacherId.trim();
    if (!cleanTeacherId) {
        throw new ApiError('Teacher identifier is required.', 400);
    }

    if (!actor || actor.accountType !== 'SCHOOL' || actor.tenantId !== cleanTenantId) {
        throw new ApiError(
            'Forbidden: Verified school session matching the active tenant is required.',
            403
        );
    }

    if (!hasPermission(actor, PERMISSIONS.TEACHERS.MANAGE_PERMISSIONS)) {
        throw new ApiError(
            `Forbidden: Missing ${PERMISSIONS.TEACHERS.MANAGE_PERMISSIONS} permission.`,
            403
        );
    }

    const verifiedAccount = assertVerifiedFallbackAccount(
        fallbackAccount,
        cleanTeacherId,
        cleanTenantId
    );

    const nextValidation = validateTeacherFunctionalPermissions(nextTeacherPermissions);
    if (!nextValidation.valid) {
        throw new ApiError(
            'Security validation failed: Requested permissions contain invalid, duplicate, or disallowed non-teacher keys.',
            400
        );
    }

    const previousValidation = validateTeacherFunctionalPermissions(previousTeacherPermissions);
    if (!previousValidation.valid) {
        throw new ApiError(
            'Security validation failed: Baseline teacher permissions contain invalid or disallowed keys.',
            400
        );
    }

    const previousSet = new Set(previousValidation.keys);
    const nextSet = new Set(nextValidation.keys);
    const grantPermissions = nextValidation.keys.filter((key) => !previousSet.has(key));
    const revokePermissions = previousValidation.keys.filter((key) => !nextSet.has(key));

    const requestBody: UpdateTeacherPermissionsRequest = {
        teacherPermissions: nextValidation.keys,
        grantPermissions,
        revokePermissions,
    };

    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.SCHOOL_TEACHERS.PERMISSIONS(cleanTeacherId),
            requestBody
        );

        const { record, message } = unwrapTeacherEnvelope(response.data);
        if (typeof record.tenantId === 'string' && record.tenantId.trim() !== '') {
            assertMatchingTenantId(record.tenantId.trim(), cleanTenantId);
        }

        const explicitTeacherPermissions = parseOptionalTeacherPermissions(
            record.teacherPermissions
        );

        const rawAccountCandidate =
            'account' in record && record.account !== undefined
                ? record.account
                : 'roles' in record || 'email' in record || 'permissions' in record
                  ? record
                  : undefined;

        let updatedAccount: SchoolStaffAccount;
        if (rawAccountCandidate !== undefined) {
            updatedAccount = mergeVerifiedAccount(
                rawAccountCandidate,
                verifiedAccount,
                cleanTeacherId,
                cleanTenantId
            );
        } else {
            const resolvedTeacherPerms = explicitTeacherPermissions ?? nextValidation.keys;
            const { preservedNonTeacherPermissions } = partitionAccountPermissionsByTeacherScope(
                verifiedAccount.permissions
            );
            updatedAccount = {
                ...verifiedAccount,
                permissions: [...preservedNonTeacherPermissions, ...resolvedTeacherPerms],
            };
        }

        assertMultiRolePreservation(updatedAccount, verifiedAccount);

        const finalTeacherPermissions =
            explicitTeacherPermissions ??
            sortTeacherFunctionalPermissions(
                partitionAccountPermissionsByTeacherScope(updatedAccount.permissions)
                    .teacherPermissions
            );

        return {
            account: updatedAccount,
            teacherPermissions: finalTeacherPermissions,
            ...(message ? { message } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

