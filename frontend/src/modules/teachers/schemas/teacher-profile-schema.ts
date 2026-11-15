import type { SchoolStaffAccount } from '../../school-admin/types/school-staff.types';
import type {
    TeacherProfessionalDetails,
    TeacherProfileFieldErrors,
    TeacherProfileFieldName,
    TeacherProfileFormValues,
    UpdateTeacherProfileRequest,
} from '../types/teacher-management.types';

export const TEACHER_PHONE_MAX_LENGTH = 25;
export const TEACHER_DEPARTMENT_MAX_LENGTH = 100;
export const TEACHER_EMPLOYEE_CODE_MAX_LENGTH = 40;
export const TEACHER_SPECIALIZATION_MAX_LENGTH = 150;
export const TEACHER_QUALIFICATION_MAX_LENGTH = 150;
export const TEACHER_BIO_MAX_LENGTH = 1000;

export const TEACHER_PHONE_PATTERN = /^[+\d()\s-]{7,25}$/;
export const TEACHER_EMPLOYEE_CODE_PATTERN = /^[A-Za-z0-9_-]{2,40}$/;

export type ValidateTeacherProfileResult =
    | {
          valid: true;
          payload: UpdateTeacherProfileRequest;
          fieldErrors: TeacherProfileFieldErrors;
      }
    | {
          valid: false;
          fieldErrors: TeacherProfileFieldErrors;
      };

const BACKEND_FIELD_MAP: Record<string, TeacherProfileFieldName> = {
    phone: 'phone',
    department: 'department',
    employeeCode: 'employeeCode',
    employee_code: 'employeeCode',
    specialization: 'specialization',
    qualification: 'qualification',
    bio: 'bio',
};

function toNormalizedNullableString(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

export function createEmptyTeacherProfileFormValues(): TeacherProfileFormValues {
    return {
        phone: '',
        department: '',
        employeeCode: '',
        specialization: '',
        qualification: '',
        bio: '',
    };
}

export function createTeacherProfileFormValues(
    account?: Pick<SchoolStaffAccount, 'phone' | 'department'> | null,
    profile?: TeacherProfessionalDetails | null
): TeacherProfileFormValues {
    return {
        phone: account?.phone ?? '',
        department: account?.department ?? '',
        employeeCode: profile?.employeeCode ?? '',
        specialization: profile?.specialization ?? '',
        qualification: profile?.qualification ?? '',
        bio: profile?.bio ?? '',
    };
}

export function normalizeTeacherProfilePayload(
    values: TeacherProfileFormValues
): UpdateTeacherProfileRequest {
    return {
        phone: toNormalizedNullableString(values.phone),
        department: toNormalizedNullableString(values.department),
        employeeCode: toNormalizedNullableString(values.employeeCode),
        specialization: toNormalizedNullableString(values.specialization),
        qualification: toNormalizedNullableString(values.qualification),
        bio: toNormalizedNullableString(values.bio),
    };
}

export function areTeacherProfileFormsEqual(
    a: TeacherProfileFormValues,
    b: TeacherProfileFormValues
): boolean {
    const normalizedA = normalizeTeacherProfilePayload(a);
    const normalizedB = normalizeTeacherProfilePayload(b);

    return (
        normalizedA.phone === normalizedB.phone &&
        normalizedA.department === normalizedB.department &&
        normalizedA.employeeCode === normalizedB.employeeCode &&
        normalizedA.specialization === normalizedB.specialization &&
        normalizedA.qualification === normalizedB.qualification &&
        normalizedA.bio === normalizedB.bio
    );
}

export function validateTeacherProfileForm(
    values: TeacherProfileFormValues
): ValidateTeacherProfileResult {
    const fieldErrors: TeacherProfileFieldErrors = {};

    const phone = values.phone.trim();
    if (phone !== '') {
        const digitCount = phone.replace(/\D/g, '').length;
        if (
            phone.length > TEACHER_PHONE_MAX_LENGTH ||
            !TEACHER_PHONE_PATTERN.test(phone) ||
            digitCount < 7
        ) {
            fieldErrors.phone =
                'Enter a valid phone number (7-25 digits, spaces, parentheses, +, or hyphens).';
        }
    }

    const department = values.department.trim();
    if (department.length > TEACHER_DEPARTMENT_MAX_LENGTH) {
        fieldErrors.department = `Department must be at most ${TEACHER_DEPARTMENT_MAX_LENGTH} characters.`;
    }

    const employeeCode = values.employeeCode.trim();
    if (employeeCode !== '') {
        if (
            employeeCode.length > TEACHER_EMPLOYEE_CODE_MAX_LENGTH ||
            !TEACHER_EMPLOYEE_CODE_PATTERN.test(employeeCode)
        ) {
            fieldErrors.employeeCode =
                'Employee code must be 2-40 characters using letters, numbers, hyphens, or underscores.';
        }
    }

    const specialization = values.specialization.trim();
    if (specialization.length > TEACHER_SPECIALIZATION_MAX_LENGTH) {
        fieldErrors.specialization = `Specialization must be at most ${TEACHER_SPECIALIZATION_MAX_LENGTH} characters.`;
    }

    const qualification = values.qualification.trim();
    if (qualification.length > TEACHER_QUALIFICATION_MAX_LENGTH) {
        fieldErrors.qualification = `Qualification must be at most ${TEACHER_QUALIFICATION_MAX_LENGTH} characters.`;
    }

    const bio = values.bio.trim();
    if (bio.length > TEACHER_BIO_MAX_LENGTH) {
        fieldErrors.bio = `Bio must be at most ${TEACHER_BIO_MAX_LENGTH} characters.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    return {
        valid: true,
        payload: normalizeTeacherProfilePayload(values),
        fieldErrors: {},
    };
}

export function mapBackendTeacherProfileFieldErrors(
    validationErrors?: Record<string, string[]>
): TeacherProfileFieldErrors {
    if (!validationErrors) return {};

    const mapped: TeacherProfileFieldErrors = {};
    for (const [key, messages] of Object.entries(validationErrors)) {
        const field = BACKEND_FIELD_MAP[key];
        if (!field || !Array.isArray(messages) || messages.length === 0) continue;
        const firstMessage = messages.find((msg) => typeof msg === 'string' && msg.trim() !== '');
        if (firstMessage) {
            mapped[field] = firstMessage;
        }
    }
    return mapped;
}

