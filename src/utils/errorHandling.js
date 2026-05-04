/**
 * Standardized error handling utilities for the KaruTeens frontend
 * Matches the backend error response structure for consistent handling
 */

// Error codes that map to specific user actions
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    BAD_REQUEST: 'BAD_REQUEST',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    CACHE_ERROR: 'CACHE_ERROR',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    RESOURCE_LOCKED: 'RESOURCE_LOCKED',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    FEATURE_DISABLED: 'FEATURE_DISABLED',
};

// User-friendly error messages
export const ERROR_MESSAGES = {
    [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
    [ERROR_CODES.UNAUTHORIZED]: 'Please log in to continue.',
    [ERROR_CODES.FORBIDDEN]: "You don't have permission to perform this action.",
    [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
    [ERROR_CODES.CONFLICT]: 'This action conflicts with existing data.',
    [ERROR_CODES.BAD_REQUEST]: 'Invalid request. Please try again.',
    [ERROR_CODES.INTERNAL_ERROR]: 'Something went wrong. Please try again later.',
    [ERROR_CODES.DATABASE_ERROR]: 'Database error. Please try again later.',
    [ERROR_CODES.CACHE_ERROR]: 'Service temporarily unavailable. Please try again.',
    [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'You need higher permissions to perform this action.',
    [ERROR_CODES.RESOURCE_LOCKED]: 'This resource is currently locked. Please try again later.',
    [ERROR_CODES.QUOTA_EXCEEDED]: "You've reached the limit for this action.",
    [ERROR_CODES.FEATURE_DISABLED]: 'This feature is currently disabled.',
};

/**
 * Standardized error class for frontend errors
 */
export class AppError extends Error {
    constructor(error, message, details, code, validationErrors, timestamp, requestId) {
        super(message || error);
        this.name = 'AppError';
        this.error = error;
        this.message = message;
        this.details = details;
        this.code = code;
        this.validationErrors = validationErrors;
        this.timestamp = timestamp;
        this.requestId = requestId;
    }

    /**
     * Get user-friendly error message
     */
    getUserMessage() {
        if (this.code && ERROR_MESSAGES[this.code]) {
            return ERROR_MESSAGES[this.code];
        }
        return this.message || this.error || 'An unknown error occurred.';
    }

    /**
     * Check if this is a validation error
     */
    isValidationError() {
        return this.code === ERROR_CODES.VALIDATION_ERROR || this.validationErrors?.length > 0;
    }

    /**
     * Get validation errors for specific fields
     */
    getFieldErrors(field) {
        if (!this.validationErrors) return [];
        return this.validationErrors.filter((err) => err.field === field);
    }

    /**
     * Check if error requires re-authentication
     */
    requiresAuth() {
        return this.code === ERROR_CODES.UNAUTHORIZED;
    }

    /**
     * Check if error is a server error
     */
    isServerError() {
        return [
            ERROR_CODES.INTERNAL_ERROR,
            ERROR_CODES.DATABASE_ERROR,
            ERROR_CODES.CACHE_ERROR,
        ].includes(this.code);
    }
}

/**
 * Parse API error response into AppError
 */
export function parseApiError(errorResponse) {
    const data = errorResponse?.response?.data || errorResponse?.data || errorResponse;

    if (data instanceof AppError) {
        return data;
    }

    // Handle axios error with response
    if (errorResponse?.response) {
        return new AppError(
            data?.error || 'api_error',
            data?.message || errorResponse.message,
            data?.details,
            data?.code,
            data?.validation_errors,
            data?.timestamp,
            data?.request_id,
        );
    }

    // Handle network errors
    if (errorResponse?.code === 'NETWORK_ERROR') {
        return new AppError('network_error', 'Network connection failed', null, 'NETWORK_ERROR');
    }

    // Handle timeout errors
    if (errorResponse?.code === 'TIMEOUT') {
        return new AppError('timeout_error', 'Request timed out', null, 'TIMEOUT_ERROR');
    }

    // Handle CORS errors (network error with no response)
    if (!errorResponse?.response && errorResponse?.message?.includes('Network Error')) {
        return new AppError(
            'cors_error',
            'Unable to connect to the server. This may be a CORS or network issue.',
            null,
            'CORS_ERROR',
        );
    }

    // Handle CORS preflight failures
    if (errorResponse?.message?.includes('CORS') || errorResponse?.message?.includes('cross-origin')) {
        return new AppError(
            'cors_error',
            'Cross-origin request blocked. Please check server configuration.',
            null,
            'CORS_ERROR',
        );
    }

    // Generic error fallback
    return new AppError(
        'unknown_error',
        errorResponse?.message || 'An unknown error occurred',
        null,
        'UNKNOWN_ERROR',
    );
}

/**
 * Handle API errors with appropriate actions
 */
export function handleApiError(error, options = {}) {
    const appError = parseApiError(error);
    const {
        showToast = true,
        toastMessage = null,
        redirectOnAuth = true,
        onValidationError = null,
        onServerError = null,
    } = options;

    // Handle validation errors
    if (appError.isValidationError()) {
        if (onValidationError) {
            onValidationError(appError);
        }
        if (showToast && !toastMessage) {
            // Show field-specific errors if available
            const fieldErrors = appError.validationErrors || [];
            const message =
                fieldErrors.length > 0
                    ? fieldErrors.map((err) => err.message).join(', ')
                    : appError.getUserMessage();

            return { type: 'validation', message, error: appError };
        }
    }

    // Handle authentication errors
    if (appError.requiresAuth() && redirectOnAuth) {
        // Fire auth:unauthorized event for AuthContext to handle
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return { type: 'auth', message: appError.getUserMessage(), error: appError };
    }

    // Handle server errors
    if (appError.isServerError()) {
        if (onServerError) {
            onServerError(appError);
        }
        if (showToast && !toastMessage) {
            return { type: 'server', message: appError.getUserMessage(), error: appError };
        }
    }

    // Default handling
    const message = toastMessage || appError.getUserMessage();
    const type = appError.isServerError()
        ? 'server'
        : appError.requiresAuth()
          ? 'auth'
          : appError.isValidationError()
            ? 'validation'
            : 'general';

    return { type, message, error: appError };
}

/**
 * Create validation error for form submissions
 */
export function createValidationError(field, message, code = null) {
    return new AppError(
        'validation_error',
        'Validation failed',
        null,
        ERROR_CODES.VALIDATION_ERROR,
        [{ field, message, code }],
    );
}

/**
 * Create multiple validation errors
 */
export function createValidationErrors(errors) {
    const validationErrors = errors.map(({ field, message, code }) => ({
        field,
        message,
        code,
    }));

    return new AppError(
        'validation_error',
        'Validation failed',
        null,
        ERROR_CODES.VALIDATION_ERROR,
        validationErrors,
    );
}

/**
 * Error boundary component helper
 */
export function logError(error, errorInfo = null) {
    console.error('Application Error:', error);
    if (errorInfo) {
        console.error('Error Info:', errorInfo);
    }

    // In production, you would send this to your error tracking service
    // e.g., Sentry, LogRocket, etc.
}

/**
 * Retry utility for failed requests
 */
export async function retryRequest(requestFn, options = {}) {
    const {
        maxRetries = 3,
        delay = 1000,
        backoff = 2,
        retryCondition = (error) => {
            const appError = parseApiError(error);
            return appError.isServerError() || appError.code === ERROR_CODES.CACHE_ERROR;
        },
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries || !retryCondition(error)) {
                throw error;
            }

            // Wait before retrying with exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(backoff, attempt)));
        }
    }

    throw lastError;
}
