export type AcademicCalendarStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type AcademicUnitStatus = 'ACTIVE' | 'INACTIVE';

export type AcademicStructureTabId = 'years' | 'terms' | 'classes' | 'sections';

export interface AcademicAuditSummary {
    id: string;
    name?: string | null;
    email?: string | null;
}

export interface AcademicYear {
    id: string;
    tenantId: string;
    name: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    status: AcademicCalendarStatus;
    description?: string;
    termCount?: number;
    createdAt?: string | null;
    updatedAt?: string | null;
    updatedBy?: AcademicAuditSummary | null;
}

export interface AcademicTerm {
    id: string;
    tenantId: string;
    academicYearId: string;
    academicYearName?: string;
    name: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    status: AcademicCalendarStatus;
    description?: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    updatedBy?: AcademicAuditSummary | null;
}

export interface AcademicClass {
    id: string;
    tenantId: string;
    name: string;
    code?: string;
    description?: string;
    displayOrder: number;
    status: AcademicUnitStatus;
    sectionCount?: number;
    createdAt?: string | null;
    updatedAt?: string | null;
    updatedBy?: AcademicAuditSummary | null;
}

export interface AcademicSection {
    id: string;
    tenantId: string;
    classId: string;
    className?: string;
    name: string;
    code?: string;
    capacity?: number | null;
    description?: string;
    status: AcademicUnitStatus;
    createdAt?: string | null;
    updatedAt?: string | null;
    updatedBy?: AcademicAuditSummary | null;
}

// Form values & field errors
export interface AcademicYearFormValues {
    name: string;
    startDate: string;
    endDate: string;
    status: AcademicCalendarStatus;
    description: string;
}

export type AcademicYearFieldErrors = Partial<
    Record<keyof AcademicYearFormValues, string>
>;

export interface AcademicTermFormValues {
    academicYearId: string;
    name: string;
    startDate: string;
    endDate: string;
    status: AcademicCalendarStatus;
    description: string;
}

export type AcademicTermFieldErrors = Partial<
    Record<keyof AcademicTermFormValues, string>
>;

export interface AcademicClassFormValues {
    name: string;
    code: string;
    displayOrder: string;
    status: AcademicUnitStatus;
    description: string;
}

export type AcademicClassFieldErrors = Partial<
    Record<keyof AcademicClassFormValues, string>
>;

export interface AcademicSectionFormValues {
    classId: string;
    name: string;
    code: string;
    capacity: string;
    status: AcademicUnitStatus;
    description: string;
}

export type AcademicSectionFieldErrors = Partial<
    Record<keyof AcademicSectionFormValues, string>
>;

// Request & response contracts
export interface CreateAcademicYearRequest {
    name: string;
    startDate: string;
    endDate: string;
    status: Extract<AcademicCalendarStatus, 'PLANNED' | 'ACTIVE'>;
    description?: string;
}

export interface UpdateAcademicYearRequest {
    name: string;
    startDate: string;
    endDate: string;
    description?: string;
}

export interface UpdateAcademicCalendarStatusRequest {
    status: AcademicCalendarStatus;
}

export interface AcademicYearMutationResponse {
    academicYear: AcademicYear;
    previousActiveAcademicYear?: AcademicYear | null;
    message?: string;
}

export interface AcademicYearListResponse {
    academicYears: AcademicYear[];
}

export interface CreateAcademicTermRequest {
    academicYearId: string;
    name: string;
    startDate: string;
    endDate: string;
    status: Extract<AcademicCalendarStatus, 'PLANNED' | 'ACTIVE'>;
    description?: string;
}

export interface UpdateAcademicTermRequest {
    academicYearId: string;
    name: string;
    startDate: string;
    endDate: string;
    description?: string;
}

export interface AcademicTermMutationResponse {
    term: AcademicTerm;
    message?: string;
}

export interface AcademicTermListResponse {
    terms: AcademicTerm[];
}

export interface CreateAcademicClassRequest {
    name: string;
    code?: string;
    displayOrder: number;
    status: AcademicUnitStatus;
    description?: string;
}

export type UpdateAcademicClassRequest = CreateAcademicClassRequest;

export interface UpdateAcademicUnitStatusRequest {
    status: AcademicUnitStatus;
}

export interface AcademicClassMutationResponse {
    academicClass: AcademicClass;
    message?: string;
}

export interface AcademicClassListResponse {
    classes: AcademicClass[];
}

export interface CreateAcademicSectionRequest {
    classId: string;
    name: string;
    code?: string;
    capacity?: number | null;
    status: AcademicUnitStatus;
    description?: string;
}

export type UpdateAcademicSectionRequest = CreateAcademicSectionRequest;

export interface AcademicSectionMutationResponse {
    section: AcademicSection;
    message?: string;
}

export interface AcademicSectionListResponse {
    sections: AcademicSection[];
}

export interface DeleteAcademicRecordResponse {
    deletedId: string;
    message?: string;
}

export interface DependencyEligibility {
    allowed: boolean;
    reason: string | null;
}

