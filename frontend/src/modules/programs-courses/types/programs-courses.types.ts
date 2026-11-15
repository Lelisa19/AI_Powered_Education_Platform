import type { PaginatedResponse } from '../../../types/api.types';
import type { SchoolRole } from '../../../types/auth';

export type OfferingLifecycleStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ProgramType = 'GRADE_BASED' | 'SKILL_BASED';
export type ProgramsCoursesTabId = 'programs' | 'courses';
export type StandaloneFilterValue = 'ALL' | 'STANDALONE_ONLY' | 'PROGRAM_ONLY';

export interface CatalogAuditSummary {
    id: string;
    name?: string | null;
    email?: string | null;
}

/**
 * Reusable school educational program (`GRADE_BASED` or `SKILL_BASED`).
 * Intentionally decoupled from permanent Academic Year ownership;
 * grade-based programs reference a single AcademicClass from Step 5.6.
 */
export interface Program {
    id: string;
    tenantId: string;
    name: string;
    code?: string;
    programType: ProgramType;
    academicClassId?: string | null;
    academicClassName?: string | null;
    academicClassCode?: string | null;
    description?: string;
    status: OfferingLifecycleStatus;
    courseCount?: number;
    enrollmentCount?: number;
    createdAt?: string | null;
    updatedAt?: string | null;
    updatedBy?: CatalogAuditSummary | null;
}

/**
 * Independent reusable course catalog record.
 * May belong to zero, one, or multiple Programs and/or be offered standalone (`allowStandalone`).
 * Never stores a scalar `programId` or `teacherId`.
 */
export interface Course {
    id: string;
    tenantId: string;
    title: string;
    code?: string;
    description?: string;
    creditHours?: number | null;
    allowStandalone: boolean;
    status: OfferingLifecycleStatus;
    programCount?: number;
    standaloneTeacherCount?: number;
    enrollmentCount?: number;
    createdAt?: string | null;
    updatedAt?: string | null;
    updatedBy?: CatalogAuditSummary | null;
}

export interface ProgramFormValues {
    name: string;
    code: string;
    programType: '' | ProgramType;
    academicClassId: string;
    description: string;
    status: OfferingLifecycleStatus;
}

export type ProgramFieldName = keyof ProgramFormValues;
export type ProgramFieldErrors = Partial<Record<ProgramFieldName, string>>;

export interface CourseFormValues {
    title: string;
    code: string;
    description: string;
    creditHours: string;
    allowStandalone: boolean;
    status: OfferingLifecycleStatus;
}

export type CourseFieldName = keyof CourseFormValues;
export type CourseFieldErrors = Partial<Record<CourseFieldName, string>>;

export interface ListProgramsQuery {
    page?: number;
    limit?: number;
    search?: string;
    programType?: ProgramType;
    status?: OfferingLifecycleStatus;
}

export interface ListCoursesQuery {
    page?: number;
    limit?: number;
    search?: string;
    allowStandalone?: boolean;
    status?: OfferingLifecycleStatus;
}

export type ProgramListResponse = PaginatedResponse<Program>;
export type CourseListResponse = PaginatedResponse<Course>;

export interface CreateProgramRequest {
    name: string;
    code?: string | null;
    programType: ProgramType;
    academicClassId: string | null;
    description?: string | null;
    status: OfferingLifecycleStatus;
}

export type UpdateProgramRequest = CreateProgramRequest;

export interface CreateCourseRequest {
    title: string;
    code?: string | null;
    description?: string | null;
    creditHours: number | null;
    allowStandalone: boolean;
    status: OfferingLifecycleStatus;
}

export type UpdateCourseRequest = CreateCourseRequest;

export interface UpdateOfferingStatusRequest {
    status: OfferingLifecycleStatus;
}

export interface ProgramMutationResponse {
    program: Program;
    message?: string;
}

export interface CourseMutationResponse {
    course: Course;
    message?: string;
}

export interface DeleteCatalogRecordResponse {
    deletedId: string;
    message?: string;
}

export interface CatalogDeleteEligibility {
    allowed: boolean;
    reason: string | null;
    warningNote: string;
}

/**
 * Reusable curriculum membership linking one Course to one Program.
 * Deliberately decoupled from Academic Year / Term so curriculum stays reusable across periods.
 */
export interface ProgramCourse {
    id: string;
    tenantId: string;
    programId: string;
    courseId: string;
    courseTitle: string;
    courseCode?: string | null;
    courseStatus?: OfferingLifecycleStatus;
    allowStandalone?: boolean;
    isRequired: boolean;
    displayOrder: number;
    notes?: string | null;
    assignedTeachersCount?: number;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface AddProgramCourseFormValues {
    courseId: string;
    isRequired: boolean;
    displayOrder: string;
    notes: string;
}

export interface EditProgramCourseFormValues {
    isRequired: boolean;
    displayOrder: string;
    notes: string;
}

export type ProgramCourseFieldName = keyof AddProgramCourseFormValues;
export type ProgramCourseFieldErrors = Partial<Record<ProgramCourseFieldName, string>>;

export interface AddProgramCourseRequest {
    courseId: string;
    isRequired: boolean;
    displayOrder: number;
    notes?: string | null;
}

export interface UpdateProgramCourseRequest {
    isRequired: boolean;
    displayOrder: number;
    notes: string | null;
}

export interface ReorderProgramCoursesRequest {
    orderedProgramCourseIds: string[];
}

export interface ProgramCourseListResponse {
    items: ProgramCourse[];
}

export interface ProgramCourseMutationResponse {
    programCourse: ProgramCourse;
    message?: string;
}

export interface RemoveProgramCourseResponse {
    removedId: string;
    message?: string;
}

export type TeacherAssignmentScope = 'PROGRAM_COURSE' | 'STANDALONE_COURSE';

/**
 * Minimal verified active teacher returned by the lightweight assignable-teachers lookup.
 * Supports multi-role accounts (e.g. SCHOOL_ADMIN + TEACHER) while strictly excluding
 * accounts without ACTIVE status or TEACHER role.
 */
export interface AssignableTeacher {
    id: string;
    tenantId: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string | null;
    roles: SchoolRole[];
    status: 'ACTIVE';
}

export interface AssignableTeachersQuery {
    search?: string;
    page?: number;
    limit?: number;
}

export interface AssignableTeacherListResponse extends PaginatedResponse<AssignableTeacher> {
    items: AssignableTeacher[];
}

export interface TeacherCourseAssignment {
    id: string;
    tenantId: string;
    scope: TeacherAssignmentScope;
    programCourseId?: string | null;
    programId?: string | null;
    programName?: string | null;
    programType?: ProgramType | null;
    courseId: string;
    courseTitle: string;
    courseCode?: string | null;
    teacherId: string;
    teacherName: string;
    teacherEmail?: string | null;
    teacherDepartment?: string | null;
    academicYearId?: string | null;
    academicYearName?: string | null;
    termId?: string | null;
    termName?: string | null;
    sectionId?: string | null;
    sectionName?: string | null;
    isPrimaryInstructor?: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
    assignedBy?: CatalogAuditSummary | null;
}

export interface ListTeacherAssignmentsQuery {
    scope?: TeacherAssignmentScope;
    programId?: string;
    programCourseId?: string;
    courseId?: string;
    teacherId?: string;
    academicYearId?: string;
    termId?: string;
    sectionId?: string;
}

export interface TeacherAssignmentListResponse {
    items: TeacherCourseAssignment[];
}

export interface CreateTeacherAssignmentRequest {
    scope: TeacherAssignmentScope;
    programCourseId?: string | null;
    programId?: string | null;
    courseId: string;
    teacherId: string;
    academicYearId?: string | null;
    termId?: string | null;
    sectionId?: string | null;
    isPrimaryInstructor?: boolean;
}

export interface TeacherAssignmentFormValues {
    academicYearId: string;
    termId: string;
    sectionId: string;
    isPrimaryInstructor: boolean;
}

export type TeacherAssignmentFieldName = keyof TeacherAssignmentFormValues | 'teacherIds';
export type TeacherAssignmentFieldErrors = Partial<
    Record<TeacherAssignmentFieldName, string>
>;

export interface TeacherAssignmentMutationResponse {
    assignment: TeacherCourseAssignment;
    message?: string;
}

export interface DeleteTeacherAssignmentResponse {
    removedId: string;
    message?: string;
}


