import type { ValidationErrors } from '../../../services/api/api-error';
import {
    SCHOOL_STAFF_ROLES,
    type CreateSchoolStaffInvitationRequest,
    type SchoolStaffRole,
} from '../types/school-staff.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d()\s-]{7,25}$/;
const STAFF_ROLE_SET = new Set<string>(SCHOOL_STAFF_ROLES);

export const STAFF_NAME_MAX_LENGTH = 100;
export const STAFF_EMAIL_MAX_LENGTH = 254;
export const STAFF_PHONE_MAX_LENGTH = 25;
export const STAFF_PASSWORD_MIN_LENGTH = 8;
export const STAFF_PASSWORD_MAX_LENGTH = 128;
export const STAFF_REASON_MAX_LENGTH = 500;

export interface InviteStaffFormValues {
    email: string;
    firstName: string;
    lastName: string;
    role: '' | SchoolStaffRole;
    phone: string;
}

export type InviteStaffFieldErrors = Partial<Record<keyof InviteStaffFormValues, string>>;

export type InviteStaffValidationResult =
    | { valid: true; payload: CreateSchoolStaffInvitationRequest }
    | { valid: false; fieldErrors: InviteStaffFieldErrors };

export interface StaffActivationFormValues {
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
    confirmPassword: string;
}

export type StaffActivationFieldErrors = Partial<Record<keyof StaffActivationFormValues, string>>;

export interface ValidatedStaffActivationInput {
    firstName: string;
    lastName: string;
    phone?: string;
    password: string;
}

export type StaffActivationValidationResult =
    | { valid: true; payload: ValidatedStaffActivationInput }
    | { valid: false; fieldErrors: StaffActivationFieldErrors };

export function isSchoolStaffRole(value: unknown): value is SchoolStaffRole {
    return typeof value === 'string' && STAFF_ROLE_SET.has(value);
}

function validatePhoneOptional(rawPhone: string): string | null {
    const trimmed = rawPhone.trim();
    if (!trimmed) return null;

    if (trimmed.length > STAFF_PHONE_MAX_LENGTH || !PHONE_PATTERN.test(trimmed)) {
        return 'Enter a valid phone number (digits, spaces, +, -, or parentheses).';
    }
    return null;
}

function validateRequiredName(rawValue: string, label: string): string | null {
    const trimmed = rawValue.trim();
    if (!trimmed) {
        return `${label} is required.`;
    }
    if (trimmed.length > STAFF_NAME_MAX_LENGTH) {
        return `${label} must be ${STAFF_NAME_MAX_LENGTH} characters or fewer.`;
    }
    return null;
}

export function validateInviteStaffForm(
    values: InviteStaffFormValues,
    allowedRoles: readonly SchoolStaffRole[]
): InviteStaffValidationResult {
    const fieldErrors: InviteStaffFieldErrors = {};

    const firstNameError = validateRequiredName(values.firstName, 'First name');
    if (firstNameError) fieldErrors.firstName = firstNameError;

    const lastNameError = validateRequiredName(values.lastName, 'Last name');
    if (lastNameError) fieldErrors.lastName = lastNameError;

    const trimmedEmail = values.email.trim();
    if (!trimmedEmail) {
        fieldErrors.email = 'Email address is required.';
    } else if (trimmedEmail.length > STAFF_EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(trimmedEmail)) {
        fieldErrors.email = 'Enter a valid email address.';
    }

    if (!values.role) {
        fieldErrors.role = 'Select a staff role explicitly before sending the invitation.';
    } else if (!isSchoolStaffRole(values.role)) {
        fieldErrors.role = 'Selected role is not a valid school staff role.';
    } else if (!allowedRoles.includes(values.role)) {
        fieldErrors.role = 'You do not have permission to invite staff members to this role.';
    }

    const phoneError = validatePhoneOptional(values.phone);
    if (phoneError) fieldErrors.phone = phoneError;

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    const trimmedPhone = values.phone.trim();
    return {
        valid: true,
        payload: {
            email: trimmedEmail,
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            role: values.role as SchoolStaffRole,
            ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        },
    };
}

export function mapBackendInviteStaffFieldErrors(
    validationErrors?: ValidationErrors
): InviteStaffFieldErrors {
    if (!validationErrors) return {};

    const mapped: InviteStaffFieldErrors = {};
    if (validationErrors.email?.[0]) mapped.email = validationErrors.email[0];
    if (validationErrors.firstName?.[0]) mapped.firstName = validationErrors.firstName[0];
    if (validationErrors.lastName?.[0]) mapped.lastName = validationErrors.lastName[0];
    if (validationErrors.role?.[0]) mapped.role = validationErrors.role[0];
    if (validationErrors.phone?.[0]) mapped.phone = validationErrors.phone[0];
    return mapped;
}

export function validateStaffPassword(password: string): string | null {
    if (!password) {
        return 'Password is required.';
    }
    if (password.length < STAFF_PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${STAFF_PASSWORD_MIN_LENGTH} characters long.`;
    }
    if (password.length > STAFF_PASSWORD_MAX_LENGTH) {
        return `Password must be ${STAFF_PASSWORD_MAX_LENGTH} characters or fewer.`;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        return 'Password must contain uppercase, lowercase, and numeric characters.';
    }
    return null;
}

export function validateStaffActivationForm(
    values: StaffActivationFormValues
): StaffActivationValidationResult {
    const fieldErrors: StaffActivationFieldErrors = {};

    const firstNameError = validateRequiredName(values.firstName, 'First name');
    if (firstNameError) fieldErrors.firstName = firstNameError;

    const lastNameError = validateRequiredName(values.lastName, 'Last name');
    if (lastNameError) fieldErrors.lastName = lastNameError;

    const phoneError = validatePhoneOptional(values.phone);
    if (phoneError) fieldErrors.phone = phoneError;

    const passwordError = validateStaffPassword(values.password);
    if (passwordError) fieldErrors.password = passwordError;

    if (!values.confirmPassword) {
        fieldErrors.confirmPassword = 'Confirm your password.';
    } else if (values.password !== values.confirmPassword) {
        fieldErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { valid: false, fieldErrors };
    }

    const trimmedPhone = values.phone.trim();
    return {
        valid: true,
        payload: {
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            password: values.password,
            ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        },
    };
}

export function validateStaffActionReason(
    rawReason?: string
): { valid: true; reason?: string } | { valid: false; error: string } {
    if (rawReason === undefined) {
        return { valid: true, reason: undefined };
    }
    const trimmed = rawReason.trim();
    if (!trimmed) {
        return { valid: true, reason: undefined };
    }
    if (trimmed.length > STAFF_REASON_MAX_LENGTH) {
        return {
            valid: false,
            error: `Reason must be ${STAFF_REASON_MAX_LENGTH} characters or fewer.`,
        };
    }
    return { valid: true, reason: trimmed };
}

