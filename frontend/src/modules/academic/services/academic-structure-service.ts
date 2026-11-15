import { apiClient } from '../../../services/api/api-client';
import { API_ENDPOINTS } from '../../../services/api/api-endpoints';
import { ApiError, normalizeApiError } from '../../../services/api/api-error';
import {
    isAcademicCalendarStatus,
    isAcademicUnitStatus,
    isValidIsoDate,
} from '../schemas/academic-structure-schema';
import type {
    AcademicAuditSummary,
    AcademicCalendarStatus,
    AcademicClass,
    AcademicClassListResponse,
    AcademicClassMutationResponse,
    AcademicSection,
    AcademicSectionListResponse,
    AcademicSectionMutationResponse,
    AcademicTerm,
    AcademicTermListResponse,
    AcademicTermMutationResponse,
    AcademicUnitStatus,
    AcademicYear,
    AcademicYearListResponse,
    AcademicYearMutationResponse,
    CreateAcademicClassRequest,
    CreateAcademicSectionRequest,
    CreateAcademicTermRequest,
    CreateAcademicYearRequest,
    DeleteAcademicRecordResponse,
    UpdateAcademicClassRequest,
    UpdateAcademicSectionRequest,
    UpdateAcademicTermRequest,
    UpdateAcademicYearRequest,
} from '../types/academic-structure.types';

const FORBIDDEN_ACADEMIC_SECRET_KEYS = [
    'token',
    'secret',
    'password',
    'passwordHash',
    'storagePath',
    'diskPath',
    'localPath',
    'accessKey',
    'privateKey',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoExposedSensitiveFields(obj: Record<string, unknown>): void {
    for (const key of FORBIDDEN_ACADEMIC_SECRET_KEYS) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
            throw new ApiError(
                'Security violation: Academic response exposed sensitive metadata.',
                502
            );
        }
    }
}

function assertMatchingTenantId(
    actualTenantId: string,
    expectedTenantId?: string | null,
    contextLabel = 'academic record'
): void {
    if (expectedTenantId === undefined || expectedTenantId === null) return;

    if (typeof expectedTenantId !== 'string' || expectedTenantId.trim() === '') {
        throw new ApiError('Verified school tenant context is required.', 400);
    }
    if (actualTenantId !== expectedTenantId) {
        throw new ApiError(
            `Security violation: ${contextLabel} belongs to a different school tenant.`,
            502
        );
    }
}

function parseRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError(`Invalid academic payload: missing '${fieldName}'.`, 502);
    }
    return value.trim();
}

function parseOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}

function parseOptionalNullableString(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return typeof value === 'string' ? value : undefined;
}

function parseAuditSummary(value: unknown): AcademicAuditSummary | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!isPlainObject(value) || typeof value.id !== 'string' || value.id.trim() === '') {
        return undefined;
    }

    return {
        id: value.id.trim(),
        name: parseOptionalNullableString(value.name),
        email: parseOptionalNullableString(value.email),
    };
}

function parseNormalizedIsoDate(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
        throw new ApiError(`Invalid academic payload: '${fieldName}' must be a date string.`, 502);
    }
    const candidate = value.trim().slice(0, 10);
    if (!isValidIsoDate(candidate)) {
        throw new ApiError(`Invalid academic payload: malformed '${fieldName}'.`, 502);
    }
    return candidate;
}

function parseAcademicYearRecord(
    data: unknown,
    expectedTenantId?: string | null
): AcademicYear {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend academic year payload.', 502);
    }
    assertNoExposedSensitiveFields(data);

    const id = parseRequiredString(data.id, 'academicYear.id');
    const tenantId = parseRequiredString(data.tenantId, 'academicYear.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'academic year');

    const name = parseRequiredString(data.name, 'academicYear.name');
    const startDate = parseNormalizedIsoDate(data.startDate, 'academicYear.startDate');
    const endDate = parseNormalizedIsoDate(data.endDate, 'academicYear.endDate');

    if (!isAcademicCalendarStatus(data.status)) {
        throw new ApiError('Invalid backend academic year payload: unrecognized status.', 502);
    }

    return {
        id,
        tenantId,
        name,
        startDate,
        endDate,
        status: data.status,
        description: parseOptionalString(data.description),
        termCount:
            typeof data.termCount === 'number' && Number.isInteger(data.termCount) && data.termCount >= 0
                ? data.termCount
                : undefined,
        createdAt: parseOptionalNullableString(data.createdAt),
        updatedAt: parseOptionalNullableString(data.updatedAt),
        updatedBy: parseAuditSummary(data.updatedBy),
    };
}

function parseAcademicTermRecord(
    data: unknown,
    expectedTenantId?: string | null
): AcademicTerm {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend term payload.', 502);
    }
    assertNoExposedSensitiveFields(data);

    const id = parseRequiredString(data.id, 'term.id');
    const tenantId = parseRequiredString(data.tenantId, 'term.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'academic term');

    const academicYearId = parseRequiredString(data.academicYearId, 'term.academicYearId');
    const name = parseRequiredString(data.name, 'term.name');
    const startDate = parseNormalizedIsoDate(data.startDate, 'term.startDate');
    const endDate = parseNormalizedIsoDate(data.endDate, 'term.endDate');

    if (!isAcademicCalendarStatus(data.status)) {
        throw new ApiError('Invalid backend term payload: unrecognized status.', 502);
    }

    return {
        id,
        tenantId,
        academicYearId,
        academicYearName: parseOptionalString(data.academicYearName),
        name,
        startDate,
        endDate,
        status: data.status,
        description: parseOptionalString(data.description),
        createdAt: parseOptionalNullableString(data.createdAt),
        updatedAt: parseOptionalNullableString(data.updatedAt),
        updatedBy: parseAuditSummary(data.updatedBy),
    };
}

function parseAcademicClassRecord(
    data: unknown,
    expectedTenantId?: string | null
): AcademicClass {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend class payload.', 502);
    }
    assertNoExposedSensitiveFields(data);

    const id = parseRequiredString(data.id, 'class.id');
    const tenantId = parseRequiredString(data.tenantId, 'class.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'class');

    const name = parseRequiredString(data.name, 'class.name');
    if (!isAcademicUnitStatus(data.status)) {
        throw new ApiError('Invalid backend class payload: unrecognized status.', 502);
    }

    const displayOrder =
        typeof data.displayOrder === 'number' &&
        Number.isInteger(data.displayOrder) &&
        data.displayOrder >= 0
            ? data.displayOrder
            : 0;

    return {
        id,
        tenantId,
        name,
        code: parseOptionalString(data.code),
        description: parseOptionalString(data.description),
        displayOrder,
        status: data.status,
        sectionCount:
            typeof data.sectionCount === 'number' &&
            Number.isInteger(data.sectionCount) &&
            data.sectionCount >= 0
                ? data.sectionCount
                : undefined,
        createdAt: parseOptionalNullableString(data.createdAt),
        updatedAt: parseOptionalNullableString(data.updatedAt),
        updatedBy: parseAuditSummary(data.updatedBy),
    };
}

function parseAcademicSectionRecord(
    data: unknown,
    expectedTenantId?: string | null
): AcademicSection {
    if (!isPlainObject(data)) {
        throw new ApiError('Invalid backend section payload.', 502);
    }
    assertNoExposedSensitiveFields(data);

    const id = parseRequiredString(data.id, 'section.id');
    const tenantId = parseRequiredString(data.tenantId, 'section.tenantId');
    assertMatchingTenantId(tenantId, expectedTenantId, 'section');

    const classId = parseRequiredString(data.classId, 'section.classId');
    const name = parseRequiredString(data.name, 'section.name');
    if (!isAcademicUnitStatus(data.status)) {
        throw new ApiError('Invalid backend section payload: unrecognized status.', 502);
    }

    const capacity =
        data.capacity === null
            ? null
            : typeof data.capacity === 'number' &&
                Number.isInteger(data.capacity) &&
                data.capacity > 0
              ? data.capacity
              : undefined;

    return {
        id,
        tenantId,
        classId,
        className: parseOptionalString(data.className),
        name,
        code: parseOptionalString(data.code),
        capacity,
        description: parseOptionalString(data.description),
        status: data.status,
        createdAt: parseOptionalNullableString(data.createdAt),
        updatedAt: parseOptionalNullableString(data.updatedAt),
        updatedBy: parseAuditSummary(data.updatedBy),
    };
}

function extractArrayCandidate(payload: unknown, keys: readonly string[]): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (!isPlainObject(payload)) {
        throw new ApiError('Invalid backend academic list response.', 502);
    }
    for (const key of keys) {
        if (Array.isArray(payload[key])) {
            return payload[key] as unknown[];
        }
    }
    throw new ApiError('Backend academic list response did not contain items array.', 502);
}

function extractRecordCandidate(payload: unknown, keys: readonly string[]): Record<string, unknown> {
    if (!isPlainObject(payload)) {
        throw new ApiError('Invalid backend academic record response.', 502);
    }
    for (const key of keys) {
        if (key in payload && isPlainObject(payload[key])) {
            return payload[key] as Record<string, unknown>;
        }
    }
    return payload;
}

function extractMessage(payload: unknown): string | undefined {
    if (isPlainObject(payload) && typeof payload.message === 'string' && payload.message.trim() !== '') {
        return payload.message.trim();
    }
    return undefined;
}

function rethrowNormalizedApiError(error: unknown): never {
    if (error instanceof ApiError) {
        throw error;
    }
    throw normalizeApiError(error);
}

export function isAcademicBackendUnavailableError(error: unknown): boolean {
    if (!(error instanceof ApiError) || error.isCancellation) {
        return false;
    }

    return (
        error.isNetworkError ||
        error.statusCode === 404 ||
        error.statusCode === 501 ||
        error.statusCode === 502 ||
        error.statusCode === 503
    );
}

// ==================== ACADEMIC YEARS ====================

export async function listAcademicYears(
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<AcademicYearListResponse> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.ACADEMIC.ACADEMIC_YEARS, {
            signal,
        });
        const items = extractArrayCandidate(response.data, ['academicYears', 'items']);
        return {
            academicYears: items.map((item) => parseAcademicYearRecord(item, expectedTenantId)),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function createAcademicYear(
    request: CreateAcademicYearRequest,
    expectedTenantId?: string | null
): Promise<AcademicYearMutationResponse> {
    try {
        const response = await apiClient.post<unknown>(
            API_ENDPOINTS.ACADEMIC.ACADEMIC_YEARS,
            request
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['academicYear']);
        const previousActive =
            isPlainObject(payload) && isPlainObject(payload.previousActiveAcademicYear)
                ? parseAcademicYearRecord(payload.previousActiveAcademicYear, expectedTenantId)
                : undefined;

        return {
            academicYear: parseAcademicYearRecord(candidate, expectedTenantId),
            ...(previousActive ? { previousActiveAcademicYear: previousActive } : {}),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateAcademicYear(
    academicYearId: string,
    request: UpdateAcademicYearRequest,
    expectedTenantId?: string | null
): Promise<AcademicYearMutationResponse> {
    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.ACADEMIC.ACADEMIC_YEAR_BY_ID(academicYearId),
            request
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['academicYear']);
        return {
            academicYear: parseAcademicYearRecord(candidate, expectedTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateAcademicYearStatus(
    academicYearId: string,
    status: AcademicCalendarStatus,
    expectedTenantId?: string | null
): Promise<AcademicYearMutationResponse> {
    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.ACADEMIC.ACADEMIC_YEAR_STATUS(academicYearId),
            { status }
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['academicYear']);
        const previousActive =
            isPlainObject(payload) && isPlainObject(payload.previousActiveAcademicYear)
                ? parseAcademicYearRecord(payload.previousActiveAcademicYear, expectedTenantId)
                : undefined;

        return {
            academicYear: parseAcademicYearRecord(candidate, expectedTenantId),
            ...(previousActive ? { previousActiveAcademicYear: previousActive } : {}),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function deleteAcademicYear(
    academicYearId: string
): Promise<DeleteAcademicRecordResponse> {
    try {
        const response = await apiClient.delete<unknown>(
            API_ENDPOINTS.ACADEMIC.ACADEMIC_YEAR_BY_ID(academicYearId)
        );
        return {
            deletedId: academicYearId,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

// ==================== TERMS ====================

export async function listTermsByAcademicYear(
    academicYearId: string,
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<AcademicTermListResponse> {
    try {
        const response = await apiClient.get<unknown>(
            API_ENDPOINTS.ACADEMIC.TERMS_BY_ACADEMIC_YEAR(academicYearId),
            { signal }
        );
        const items = extractArrayCandidate(response.data, ['terms', 'items']);
        return {
            terms: items.map((item) => parseAcademicTermRecord(item, expectedTenantId)),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function createAcademicTerm(
    request: CreateAcademicTermRequest,
    expectedTenantId?: string | null
): Promise<AcademicTermMutationResponse> {
    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.ACADEMIC.TERMS, request);
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['term']);
        return {
            term: parseAcademicTermRecord(candidate, expectedTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateAcademicTerm(
    termId: string,
    request: UpdateAcademicTermRequest,
    expectedTenantId?: string | null
): Promise<AcademicTermMutationResponse> {
    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.ACADEMIC.TERM_BY_ID(termId),
            request
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['term']);
        return {
            term: parseAcademicTermRecord(candidate, expectedTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateAcademicTermStatus(
    termId: string,
    status: AcademicCalendarStatus,
    expectedTenantId?: string | null
): Promise<AcademicTermMutationResponse> {
    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.ACADEMIC.TERM_STATUS(termId),
            { status }
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['term']);
        return {
            term: parseAcademicTermRecord(candidate, expectedTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function deleteAcademicTerm(termId: string): Promise<DeleteAcademicRecordResponse> {
    try {
        const response = await apiClient.delete<unknown>(API_ENDPOINTS.ACADEMIC.TERM_BY_ID(termId));
        return {
            deletedId: termId,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

// ==================== CLASSES / GRADE LEVELS ====================

export async function listClasses(
    expectedTenantId?: string | null,
    signal?: AbortSignal
): Promise<AcademicClassListResponse> {
    try {
        const response = await apiClient.get<unknown>(API_ENDPOINTS.ACADEMIC.CLASSES, {
            signal,
        });
        const items = extractArrayCandidate(response.data, ['classes', 'items']);
        return {
            classes: items.map((item) => parseAcademicClassRecord(item, expectedTenantId)),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function createAcademicClass(
    request: CreateAcademicClassRequest,
    expectedTenantId?: string | null
): Promise<AcademicClassMutationResponse> {
    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.ACADEMIC.CLASSES, request);
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['academicClass', 'class']);
        return {
            academicClass: parseAcademicClassRecord(candidate, expectedTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateAcademicClass(
    classId: string,
    request: UpdateAcademicClassRequest,
    expectedTenantId?: string | null
): Promise<AcademicClassMutationResponse> {
    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.ACADEMIC.CLASS_BY_ID(classId),
            request
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['academicClass', 'class']);
        return {
            academicClass: parseAcademicClassRecord(candidate, expectedTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateAcademicClassStatus(
    classId: string,
    status: AcademicUnitStatus,
    expectedTenantId?: string | null
): Promise<AcademicClassMutationResponse> {
    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.ACADEMIC.CLASS_STATUS(classId),
            { status }
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['academicClass', 'class']);
        return {
            academicClass: parseAcademicClassRecord(candidate, expectedTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function deleteAcademicClass(
    classId: string
): Promise<DeleteAcademicRecordResponse> {
    try {
        const response = await apiClient.delete<unknown>(
            API_ENDPOINTS.ACADEMIC.CLASS_BY_ID(classId)
        );
        return {
            deletedId: classId,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

// ==================== SECTIONS ====================

export async function listSections(
    options: {
        classId?: string | null;
        expectedTenantId?: string | null;
        signal?: AbortSignal;
    } = {}
): Promise<AcademicSectionListResponse> {
    const { classId, expectedTenantId, signal } = options;
    try {
        const endpoint = classId
            ? API_ENDPOINTS.ACADEMIC.SECTIONS_BY_CLASS(classId)
            : API_ENDPOINTS.ACADEMIC.SECTIONS;
        const response = await apiClient.get<unknown>(endpoint, { signal });
        const items = extractArrayCandidate(response.data, ['sections', 'items']);
        return {
            sections: items.map((item) => parseAcademicSectionRecord(item, expectedTenantId)),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function createAcademicSection(
    request: CreateAcademicSectionRequest,
    expectedTenantId?: string | null
): Promise<AcademicSectionMutationResponse> {
    try {
        const response = await apiClient.post<unknown>(API_ENDPOINTS.ACADEMIC.SECTIONS, request);
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['section']);
        return {
            section: parseAcademicSectionRecord(candidate, expectedTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateAcademicSection(
    sectionId: string,
    request: UpdateAcademicSectionRequest,
    expectedTenantId?: string | null
): Promise<AcademicSectionMutationResponse> {
    try {
        const response = await apiClient.put<unknown>(
            API_ENDPOINTS.ACADEMIC.SECTION_BY_ID(sectionId),
            request
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['section']);
        return {
            section: parseAcademicSectionRecord(candidate, expectedTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function updateAcademicSectionStatus(
    sectionId: string,
    status: AcademicUnitStatus,
    expectedTenantId?: string | null
): Promise<AcademicSectionMutationResponse> {
    try {
        const response = await apiClient.patch<unknown>(
            API_ENDPOINTS.ACADEMIC.SECTION_STATUS(sectionId),
            { status }
        );
        const payload = response.data;
        const candidate = extractRecordCandidate(payload, ['section']);
        return {
            section: parseAcademicSectionRecord(candidate, expectedTenantId),
            ...(extractMessage(payload) ? { message: extractMessage(payload) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

export async function deleteAcademicSection(
    sectionId: string
): Promise<DeleteAcademicRecordResponse> {
    try {
        const response = await apiClient.delete<unknown>(
            API_ENDPOINTS.ACADEMIC.SECTION_BY_ID(sectionId)
        );
        return {
            deletedId: sectionId,
            ...(extractMessage(response.data) ? { message: extractMessage(response.data) } : {}),
        };
    } catch (error: unknown) {
        rethrowNormalizedApiError(error);
    }
}

