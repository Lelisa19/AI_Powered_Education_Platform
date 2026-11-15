import {
    formatIsoDateDisplay,
    isValidIsoDate,
    mapBackendFieldValidationErrors,
} from '../../academic/schemas/academic-structure-schema';
import {
    formatStaffDate,
    formatStaffDateTime,
} from '../../school-admin/utils/school-staff-formatters';
import type {
    CreateStudentFieldErrors,
    CreateStudentFormValues,
    CreateStudentRequest,
    StudentAccountStatus,
    StudentActionEligibility,
    StudentDirectoryItem,
    StudentGender,
    StudentProfileDetails,
    StudentProfileFieldErrors,
    StudentProfileFormValues,
    StudentRegistrationSource,
    UpdateStudentProfileRequest,
} from '../types/student-management.types';

export {
    formatIsoDateDisplay,
    formatStaffDate,
    formatStaffDateTime,
    isValidIsoDate,
    mapBackendFieldValidationErrors,
};

export const STUDENT_LIMITS = {
    NAME_MIN: 1,
    NAME_MAX: 100,
    EMAIL_MAX: 254,
    STUDENT_CODE_MAX: 40,
    PHONE_MAX: 25,
    GENDER_MAX: 40,
    ADDRESS_MAX: 300,
    EMERGENCY_NAME_MAX: 100,
    EMERGENCY_RELATION_MAX: 60,
    NOTES_MAX: 1000,
    ACTION_REASON_MAX: 500,
} as const;

export const STUDENT_ACCOUNT_STATUSES: readonly StudentAccountStatus[] = [
    'PENDING_ACTIVATION',
    'PENDING_APPROVAL',
    'ACTIVE',
    'SUSPENDED',
    'REJECTED',
];

export const STUDENT_GENDERS: readonly StudentGender[] = [
    'FEMALE',
    'MALE',
    'NON_BINARY',
    'PREFER_NOT_TO_SAY',
];

const STUDENT_STATUS_LABELS: Readonly<Record<StudentAccountStatus, string>> = {
    PENDING_ACTIVATION: 'Pending Activation',
    PENDING_APPROVAL: 'Pending Approval',
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    REJECTED: 'Rejected',
};

const STUDENT_GENDER_LABELS: Readonly<Record<StudentGender, string>> = {
    FEMALE: 'Female',
    MALE: 'Male',
    NON_BINARY: 'Non-Binary',
    PREFER_NOT_TO_SAY: 'Prefer Not to Say',
};

const STUDENT_SOURCE_LABELS: Readonly<Record<StudentRegistrationSource, string>> = {
    SELF_REGISTRATION: 'Self-Registered',
    ADMIN_ACTIVATION: 'Admin Activation Link',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d()\s-]{7,25}$/;
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _/-]{0,39}$/;

export function isStudentAccountStatus(value: unknown): value is StudentAccountStatus {
    return (
        value === 'PENDING_ACTIVATION' ||
        value === 'PENDING_APPROVAL' ||
        value === 'ACTIVE' ||
        value === 'SUSPENDED' ||
        value === 'REJECTED'
    );
}

export function formatStudentStatusLabel(status: StudentAccountStatus): string {
    return STUDENT_STATUS_LABELS[status] ?? status;
}

export function formatStudentGenderLabel(gender?: string | null): string {
    if (!gender) return '—';
    return STUDENT_GENDER_LABELS[gender as StudentGender] ?? gender;
}

export function formatStudentSourceLabel(source?: StudentRegistrationSource): string {
    if (!source) return 'Not recorded';
    return STUDENT_SOURCE_LABELS[source] ?? source;
}

export function formatStudentFullName(
    firstName?: string | null,
    lastName?: string | null,
    fallbackEmail?: string
): string {
    const combined = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    if (combined) return combined;
    return fallbackEmail || 'Student';
}

function normalizeNullableString(raw: string): string | null {
    const trimmed = raw.trim();
    return trimmed === '' ? null : trimmed;
}

export function createEmptyCreateStudentFormValues(): CreateStudentFormValues {
    return {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        studentCode: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
        notes: '',
    };
}

export function toStudentProfileFormValues(
    student: Pick<StudentDirectoryItem, 'firstName' | 'lastName' | 'studentCode' | 'phone'>,
    profile?: StudentProfileDetails | null
): StudentProfileFormValues {
    return {
        firstName: student.firstName ?? '',
        lastName: student.lastName ?? '',
        phone: profile?.phone ?? student.phone ?? '',
        studentCode: profile?.studentCode ?? student.studentCode ?? '',
        dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
        gender: profile?.gender ?? '',
        address: profile?.address ?? '',
        emergencyContactName: profile?.emergencyContactName ?? '',
        emergencyContactPhone: profile?.emergencyContactPhone ?? '',
        emergencyContactRelation: profile?.emergencyContactRelation ?? '',
        notes: profile?.notes ?? '',
    };
}

export function areStudentProfileFormsEqual(
    a: StudentProfileFormValues,
    b: StudentProfileFormValues
): boolean {
    return (
        a.firstName.trim() === b.firstName.trim() &&
        a.lastName.trim() === b.lastName.trim() &&
        a.phone.trim() === b.phone.trim() &&
        a.studentCode.trim() === b.studentCode.trim() &&
        a.dateOfBirth.trim() === b.dateOfBirth.trim() &&
        a.gender.trim() === b.gender.trim() &&
        a.address.trim() === b.address.trim() &&
        a.emergencyContactName.trim() === b.emergencyContactName.trim() &&
        a.emergencyContactPhone.trim() === b.emergencyContactPhone.trim() &&
        a.emergencyContactRelation.trim() === b.emergencyContactRelation.trim() &&
        a.notes.trim() === b.notes.trim()
    );
}

function validateSharedStudentProfileFields(
    values: StudentProfileFormValues
):
    | { valid: true; payload: UpdateStudentProfileRequest }
    | { valid: false; fieldErrors: StudentProfileFieldErrors } {
    const fieldErrors: StudentProfileFieldErrors = {};

    const firstName = values.firstName.trim();
    if (firstName.length < STUDENT_LIMITS.NAME_MIN) {
        fieldErrors.firstName = 'First name is required.';
    } else if (firstName.length > STUDENT_LIMITS.NAME_MAX) {
        fieldErrors.firstName = `First name must be ${STUDENT_LIMITS.NAME_MAX} characters or fewer.`;
    }

    const lastName = values.lastName.trim();
    if (lastName.length < STUDENT_LIMITS.NAME_MIN) {
        fieldErrors.lastName = 'Last name is required.';
    } else if (lastName.length > STUDENT_LIMITS.NAME_MAX) {
        fieldErrors.lastName = `Last name must be ${STUDENT_LIMITS.NAME_MAX} characters or fewer.`;
    }

    const phone = values.phone.trim();
    if (phone !== '' && (phone.length > STUDENT_LIMITS.PHONE_MAX || !PHONE_PATTERN.test(phone))) {
        fieldErrors.phone =
            'Enter a valid phone number (7–25 chars: digits, spaces, +, -, or parentheses).';
    }

    const studentCode = values.studentCode.trim();
    if (studentCode.length > STUDENT_LIMITS.STUDENT_CODE_MAX) {
        fieldErrors.studentCode = `Student code must be ${STUDENT_LIMITS.STUDENT_CODE_MAX} characters or fewer.`;
    } else if (studentCode !== '' && !CODE_PATTERN.test(studentCode)) {
        fieldErrors.studentCode =
            'Student code may only contain letters, numbers, spaces, hyphens, underscores, or slashes.';
    }

    const dateOfBirth = values.dateOfBirth.trim();
    if (dateOfBirth !== '') {
        if (!isValidIsoDate(dateOfBirth)) {
            fieldErrors.dateOfBirth = 'Enter a valid date of birth (YYYY-MM-DD).';
        } else {
            const todayIso = new Date().toISOString().slice(0, 10);
            if (dateOfBirth > todayIso) {
                fieldErrors.dateOfBirth = 'Date of birth cannot be in the future.';
            }
        }
    }

    const gender = values.gender.trim();
    if (gender.length > STUDENT_LIMITS.GENDER_MAX) {
        fieldErrors.gender = `Gender selection must be ${STUDENT_LIMITS.GENDER_MAX} characters or fewer.`;
    }

    const address = values.address.trim();
    if (address.length > STUDENT_LIMITS.ADDRESS_MAX) {
        fieldErrors.address = `Address must be ${STUDENT_LIMITS.ADDRESS_MAX} characters or fewer.`;
    }

    const emergencyName = values.emergencyContactName.trim();
    if (emergencyName.length > STUDENT_LIMITS.EMERGENCY_NAME_MAX) {
        fieldErrors.emergencyContactName = `Emergency contact name must be ${STUDENT_LIMITS.EMERGENCY_NAME_MAX} characters or fewer.`;
    }

    const emergencyPhone = values.emergencyContactPhone.trim();
    if (
        emergencyPhone !== '' &&
        (emergencyPhone.length > STUDENT_LIMITS.PHONE_MAX || !PHONE_PATTERN.test(emergencyPhone))
    ) {
        fieldErrors.emergencyContactPhone =
            'Enter a valid emergency contact phone number (7–25 chars).';
    }

    const emergencyRelation = values.emergencyContactRelation.trim();
    if (emergencyRelation.length > STUDENT_LIMITS.EMERGENCY_RELATION_MAX) {
        fieldErrors.emergencyContactRelation = `Relationship must be ${STUDENT_LIMITS.EMERGENCY_RELATION_MAX} characters or fewer.`;
    }

    const notes = values.notes.trim();
    if (notes.length > STUDENT_LIMITS.NOTES_MAX) {
        fieldErrors.notes = `Notes must be ${STUDENT_LIMITS.NOTES_MAX} characters or fewer.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: {
            firstName,
            lastName,
            phone: normalizeNullableString(values.phone),
            studentCode: normalizeNullableString(values.studentCode),
            dateOfBirth: normalizeNullableString(values.dateOfBirth),
            gender: normalizeNullableString(values.gender),
            address: normalizeNullableString(values.address),
            emergencyContactName: normalizeNullableString(values.emergencyContactName),
            emergencyContactPhone: normalizeNullableString(values.emergencyContactPhone),
            emergencyContactRelation: normalizeNullableString(values.emergencyContactRelation),
            notes: normalizeNullableString(values.notes),
        },
    };
}

export function validateCreateStudentForm(
    values: CreateStudentFormValues
):
    | { valid: true; payload: CreateStudentRequest }
    | { valid: false; fieldErrors: CreateStudentFieldErrors } {
    const fieldErrors: CreateStudentFieldErrors = {};

    const cleanEmail = values.email.trim();
    if (!cleanEmail) {
        fieldErrors.email = 'Student email address is required for activation onboarding.';
    } else if (
        cleanEmail.length > STUDENT_LIMITS.EMAIL_MAX ||
        !EMAIL_PATTERN.test(cleanEmail)
    ) {
        fieldErrors.email = 'Enter a valid email address.';
    }

    const profileValidation = validateSharedStudentProfileFields(values);
    if (!profileValidation.valid) {
        Object.assign(fieldErrors, profileValidation.fieldErrors);
    }

    if (Object.keys(fieldErrors).length > 0 || !profileValidation.valid) {
        return { valid: false, fieldErrors };
    }

    const normalized = profileValidation.payload;
    return {
        valid: true,
        payload: {
            firstName: normalized.firstName,
            lastName: normalized.lastName,
            email: cleanEmail,
            onboardingMode: 'ACTIVATION_LINK',
            ...(normalized.studentCode ? { studentCode: normalized.studentCode } : {}),
            ...(normalized.phone ? { phone: normalized.phone } : {}),
            ...(normalized.dateOfBirth ? { dateOfBirth: normalized.dateOfBirth } : {}),
            ...(normalized.gender ? { gender: normalized.gender } : {}),
            ...(normalized.address ? { address: normalized.address } : {}),
            ...(normalized.emergencyContactName
                ? { emergencyContactName: normalized.emergencyContactName }
                : {}),
            ...(normalized.emergencyContactPhone
                ? { emergencyContactPhone: normalized.emergencyContactPhone }
                : {}),
            ...(normalized.emergencyContactRelation
                ? { emergencyContactRelation: normalized.emergencyContactRelation }
                : {}),
            ...(normalized.notes ? { notes: normalized.notes } : {}),
        },
    };
}

export function validateStudentProfileForm(
    values: StudentProfileFormValues
):
    | { valid: true; payload: UpdateStudentProfileRequest }
    | { valid: false; fieldErrors: StudentProfileFieldErrors } {
    return validateSharedStudentProfileFields(values);
}

export function validateStudentActionReason(
    rawReason?: string
): { valid: true; reason?: string } | { valid: false; error: string } {
    const trimmed = (rawReason ?? '').trim();
    if (!trimmed) {
        return { valid: true };
    }
    if (trimmed.length > STUDENT_LIMITS.ACTION_REASON_MAX) {
        return {
            valid: false,
            error: `Reason must be ${STUDENT_LIMITS.ACTION_REASON_MAX} characters or fewer.`,
        };
    }
    return { valid: true, reason: trimmed };
}

export function evaluateRegistrationDecisionEligibility(
    student: Pick<StudentDirectoryItem, 'status' | 'roles' | 'registrationSource'>,
    canApprove: boolean
): StudentActionEligibility {
    if (!canApprove) {
        return {
            allowed: false,
            reason: 'Requires students.approve permission.',
        };
    }
    if (!student.roles.includes('STUDENT')) {
        return {
            allowed: false,
            reason: 'Target account does not hold the STUDENT role.',
        };
    }
    if (student.status === 'PENDING_ACTIVATION' || student.registrationSource === 'ADMIN_ACTIVATION') {
        return {
            allowed: false,
            reason:
                'Admin-created Pending Activation accounts are activated by the student via their activation link, not through self-registration approval.',
        };
    }
    if (student.status !== 'PENDING_APPROVAL') {
        return {
            allowed: false,
            reason: 'Only self-registered accounts in Pending Approval status can be approved or rejected.',
        };
    }
    return { allowed: true, reason: null };
}

export function evaluateStudentStatusToggleEligibility(
    student: Pick<
        StudentDirectoryItem,
        'id' | 'status' | 'roles' | 'registrationSource' | 'activatedAt'
    >,
    currentActorId: string | null | undefined,
    canDisable: boolean
): StudentActionEligibility & { nextStatus?: 'ACTIVE' | 'SUSPENDED' } {
    if (!canDisable) {
        return {
            allowed: false,
            reason: 'Requires students.disable permission.',
        };
    }
    if (!student.roles.includes('STUDENT')) {
        return {
            allowed: false,
            reason: 'Target account does not hold the STUDENT role.',
        };
    }
    if (currentActorId && student.id === currentActorId && student.status === 'ACTIVE') {
        return {
            allowed: false,
            reason: 'You cannot suspend your own currently signed-in multi-role account.',
        };
    }
    if (student.status === 'PENDING_ACTIVATION') {
        return {
            allowed: false,
            reason:
                'Pending Activation accounts cannot be suspended or manually activated before the student completes activation via their setup link.',
        };
    }
    if (student.status === 'PENDING_APPROVAL') {
        return {
            allowed: false,
            reason:
                'Pending self-registrations must be approved or rejected via Registration Approval rather than suspension/reactivation.',
        };
    }
    if (student.status === 'ACTIVE') {
        return { allowed: true, reason: null, nextStatus: 'SUSPENDED' };
    }
    if (student.status === 'SUSPENDED') {
        if (student.registrationSource === 'ADMIN_ACTIVATION' && !student.activatedAt) {
            return {
                allowed: false,
                reason:
                    'This admin-created account has not completed student activation yet and cannot be reactivated manually.',
            };
        }
        return { allowed: true, reason: null, nextStatus: 'ACTIVE' };
    }
    return {
        allowed: false,
        reason: 'Rejected student registrations cannot be reactivated or toggled directly.',
    };
}

/**
 * Determines whether a student account has satisfied onboarding/activation/approval
 * requirements and is eligible for academic enrollment (Step 5.10.3+).
 * Strictly excludes PENDING_ACTIVATION, PENDING_APPROVAL, SUSPENDED, and REJECTED accounts.
 */
export function isStudentEligibleForEnrollment(
    student: Pick<StudentDirectoryItem, 'status' | 'roles'>
): StudentActionEligibility {
    if (!student.roles.includes('STUDENT')) {
        return {
            allowed: false,
            reason: 'Account does not hold the STUDENT role.',
        };
    }
    if (student.status === 'PENDING_ACTIVATION') {
        return {
            allowed: false,
            reason:
                'Not eligible for enrollment until the student activates their account via their activation link.',
        };
    }
    if (student.status === 'PENDING_APPROVAL') {
        return {
            allowed: false,
            reason:
                'Not eligible for enrollment until self-registration is approved by a School Admin.',
        };
    }
    if (student.status !== 'ACTIVE') {
        return {
            allowed: false,
            reason: `Not eligible for enrollment while account status is ${formatStudentStatusLabel(student.status)}.`,
        };
    }
    return { allowed: true, reason: null };
}

