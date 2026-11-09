import axios, { AxiosError } from 'axios';

export interface ValidationErrors {
    [field: string]: string[];
}

export class ApiError extends Error {
    public statusCode?: number;
    public validationErrors?: ValidationErrors;
    public isNetworkError: boolean;
    public isCancellation: boolean;
    public rawData?: unknown;

    constructor(
        message: string,
        statusCode?: number,
        validationErrors?: ValidationErrors,
        isNetworkError = false,
        isCancellation = false,
        rawData?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.validationErrors = validationErrors;
        this.isNetworkError = isNetworkError;
        this.isCancellation = isCancellation;
        this.rawData = rawData;

        // Maintain proper prototype chain for instanceof checks in TypeScript
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

// Type guard to safely check if an unknown value is a plain object
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Safely extract and validate the structure of validation errors
function parseValidationErrors(data: unknown): ValidationErrors | undefined {
    if (!isPlainObject(data)) return undefined;

    const errors = data.errors ?? data.validationErrors;
    if (!isPlainObject(errors)) return undefined;

    const result: ValidationErrors = {};
    let hasErrors = false;

    for (const key in errors) {
        if (Object.prototype.hasOwnProperty.call(errors, key)) {
            const value = errors[key];
            // Only accept string arrays to guarantee predictable UI rendering
            if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
                result[key] = value;
                hasErrors = true;
            }
        }
    }

    return hasErrors ? result : undefined;
}

export function normalizeApiError(error: unknown): ApiError {
    // 1. Handle Axios request cancellation cleanly
    if (axios.isCancel(error)) {
        return new ApiError('Request was cancelled', undefined, undefined, false, true);
    }

    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // 2. Handle HTTP errors returned by the backend
        if (axiosError.response) {
            const status = axiosError.response.status;
            const data = axiosError.response.data;

            let message = `Request failed with status ${status}`;
            let validationErrors: ValidationErrors | undefined;

            if (isPlainObject(data)) {
                if (typeof data.message === 'string' && data.message.trim() !== '') {
                    message = data.message;
                } else if (typeof data.error === 'string' && data.error.trim() !== '') {
                    message = data.error;
                }
                validationErrors = parseValidationErrors(data);
            }

            return new ApiError(message, status, validationErrors, false, false, data);
        }

        // 3. Handle Network and Timeout errors
        if (axiosError.request) {
            const isTimeout = axiosError.code === 'ECONNABORTED';
            const message = isTimeout
                ? 'Request timed out. Please try again.'
                : 'Network error. Please check your connection.';

            return new ApiError(message, undefined, undefined, true, false);
        }
    }

    // 4. Handle unexpected runtime or non-Axios exceptions
    const fallbackMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new ApiError(fallbackMessage);
}