import type {
    SchoolStaffAccount,
    SchoolStaffInvitation,
    StaffDirectoryStatusFilter,
} from '../../school-admin/types/school-staff.types';
import type { TeacherFunctionalPermissionKey } from '../constants/teacher-permissions';

export type TeacherDirectoryStatusFilter = StaffDirectoryStatusFilter;

/**
 * Optional read-only summary of a teacher's course/section assignments.
 * Returned only when the backend supplies it; assignment creation/editing
 * belongs to Programs & Courses Management (out of scope for Step 5.8.1).
 */
export interface TeacherAssignmentSummary {
    id: string;
    scope?: 'PROGRAM_COURSE' | 'STANDALONE_COURSE';
    courseTitle: string;
    courseCode?: string | null;
    programName?: string | null;
    academicYearName?: string | null;
    termName?: string | null;
    sectionName?: string | null;
    assignedAt?: string | null;
}

/**
 * Teacher-specific professional profile fields that extend SchoolStaffAccount
 * without duplicating identity, auth, tenant, role, status, or permissions fields.
 */
export interface TeacherProfessionalDetails {
    employeeCode?: string | null;
    specialization?: string | null;
    qualification?: string | null;
    bio?: string | null;
    updatedAt?: string | null;
}

/**
 * Composed view model uniting canonical Step 5.3 SchoolStaffAccount identity/lifecycle
 * with Teacher professional profile attributes and optional read-only teaching assignments.
 */
export interface TeacherProfileRecord {
    account: SchoolStaffAccount;
    profile: TeacherProfessionalDetails;
    teacherPermissions?: TeacherFunctionalPermissionKey[];
    teachingAssignments?: TeacherAssignmentSummary[];
}

export interface TeacherProfileFormValues {
    phone: string;
    department: string;
    employeeCode: string;
    specialization: string;
    qualification: string;
    bio: string;
}

export type TeacherProfileFieldName = keyof TeacherProfileFormValues;
export type TeacherProfileFieldErrors = Partial<Record<TeacherProfileFieldName, string>>;

export interface UpdateTeacherProfileRequest {
    phone: string | null;
    department: string | null;
    employeeCode: string | null;
    specialization: string | null;
    qualification: string | null;
    bio: string | null;
}

export interface TeacherProfileResponse {
    teacher: TeacherProfileRecord;
    message?: string;
}

export interface TeacherInvitationRecord extends SchoolStaffInvitation {
    role: 'TEACHER';
}

/**
 * Teacher-scoped permission update payload designed to protect multi-role accounts
 * (`SCHOOL_ADMIN` + `TEACHER`). Never sends a whole-account `permissions` overwrite.
 */
export interface UpdateTeacherPermissionsRequest {
    teacherPermissions: TeacherFunctionalPermissionKey[];
    grantPermissions: TeacherFunctionalPermissionKey[];
    revokePermissions: TeacherFunctionalPermissionKey[];
}

export interface TeacherPermissionsUpdateResponse {
    account: SchoolStaffAccount;
    teacherPermissions: TeacherFunctionalPermissionKey[];
    message?: string;
}

