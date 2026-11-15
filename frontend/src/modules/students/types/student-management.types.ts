import type { PaginatedResponse } from '../../../types/api.types';
import type { SchoolRole } from '../../../types/auth';

export type StudentAccountStatus =
    | 'PENDING_ACTIVATION'
    | 'PENDING_APPROVAL'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'REJECTED';

export type StudentAccountStatusFilter = 'ALL' | StudentAccountStatus;

export type StudentRegistrationSource = 'SELF_REGISTRATION' | 'ADMIN_ACTIVATION';

export type StudentGender =
    | 'FEMALE'
    | 'MALE'
    | 'NON_BINARY'
    | 'PREFER_NOT_TO_SAY';

export interface StudentAuditSummary {
    id: string;
    name?: string | null;
    email?: string | null;
}

export interface StudentProfileDetails {
    studentCode?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: StudentGender | (string & {}) | null;
    address?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;
    notes?: string | null;
    updatedAt?: string | null;
}

/**
 * School-scoped student directory record.
 * Reuses SchoolRole so multi-role accounts (e.g. TEACHER + STUDENT) retain all non-STUDENT roles.
 * Never holds plaintext passwords, activation tokens, or permissions overrides.
 */
export interface StudentDirectoryItem {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: SchoolRole[];
    status: StudentAccountStatus;
    registrationSource?: StudentRegistrationSource;
    studentCode?: string | null;
    phone?: string | null;
    createdAt: string;
    activatedAt?: string | null;
    lastLoginAt?: string | null;
}

export interface StudentDetailRecord extends StudentDirectoryItem {
    profile: StudentProfileDetails;
    approvedBy?: StudentAuditSummary | null;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    rejectionReason?: string | null;
    suspendedReason?: string | null;
}

export interface ListStudentsQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: StudentAccountStatus;
}

export type StudentListResponse = PaginatedResponse<StudentDirectoryItem>;

export interface StudentProfileFormValues {
    firstName: string;
    lastName: string;
    phone: string;
    studentCode: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
    notes: string;
}

export interface CreateStudentFormValues extends StudentProfileFormValues {
    email: string;
}

export type CreateStudentFieldName = keyof CreateStudentFormValues;
export type CreateStudentFieldErrors = Partial<Record<CreateStudentFieldName, string>>;

export type StudentProfileFieldName = keyof StudentProfileFormValues;
export type StudentProfileFieldErrors = Partial<Record<StudentProfileFieldName, string>>;

export interface CreateStudentRequest {
    firstName: string;
    lastName: string;
    email: string;
    onboardingMode: 'ACTIVATION_LINK';
    studentCode?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;
    notes?: string | null;
}

export interface UpdateStudentProfileRequest {
    firstName: string;
    lastName: string;
    phone: string | null;
    studentCode: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelation: string | null;
    notes: string | null;
}

export interface StudentRegistrationDecisionRequest {
    decision: 'APPROVE' | 'REJECT';
    reason?: string;
}

export interface UpdateStudentStatusRequest {
    status: 'ACTIVE' | 'SUSPENDED';
    reason?: string;
}

export interface CreateStudentResponse {
    student: StudentDetailRecord;
    deliveryChannel?: 'EMAIL' | (string & {});
    message?: string;
}

export interface StudentMutationResponse {
    student: StudentDetailRecord;
    message?: string;
}

export interface StudentActionEligibility {
    allowed: boolean;
    reason: string | null;
}

