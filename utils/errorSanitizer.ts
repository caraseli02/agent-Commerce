/**
 * Error Message Sanitization Utilities
 *
 * CRITICAL: All error messages must be sanitized before logging or displaying
 * to prevent exposure of sensitive information such as:
 * - Passwords and tokens
 * - File paths (in production)
 * - Stack traces (in production)
 * - Internal implementation details
 */

export interface ErrorSanitizeOptions {
    /** Remove stack traces from error messages */
    removeStackTraces?: boolean;
    /** Remove file paths from error messages */
    removeFilePaths?: boolean;
    /** Remove internal error details */
    removeInternalDetails?: boolean;
    /** Mask sensitive data patterns */
    maskSensitiveData?: boolean;
    /** Replace line breaks with spaces */
    normalizeLineBreaks?: boolean;
    /** Truncate long error messages */
    truncateTo?: number;
}

/**
 * Sensitive data patterns to detect and mask
 */
const SENSITIVE_PATTERNS = [
    /password[=:]\s*[^\s]+/gi,
    /token[=:]\s*[^\s]+/gi,
    /secret[=:]\s*[^\s]+/gi,
    /api[_-]?key[=:]\s*[^\s]+/gi,
    /\d{16}/g, // Potential credit card numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, // Bearer tokens
    /sk_test_[a-zA-Z0-9]{24,}/g, // Stripe test keys
    /pk_test_[a-zA-Z0-9]{24,}/g, // Stripe publishable keys
    /firebase[a-z0-9-]{20,}/gi, // Firebase keys
];

/**
 * Internal error messages that should be replaced with generic messages
 */
const INTERNAL_ERROR_PATTERNS = [
    { pattern: /Internal Server Error/gi, replacement: 'An error occurred' },
    { pattern: /Database Error/gi, replacement: 'A data error occurred' },
    { pattern: /Network Error/gi, replacement: 'A connection error occurred' },
    { pattern: /Validation Error/gi, replacement: 'Please check your input' },
    { pattern: /Authentication Error/gi, replacement: 'Authentication failed' },
    { pattern: /Authorization Error/gi, replacement: 'Access denied' },
    { pattern: /Forbidden/gi, replacement: 'Access denied' },
    { pattern: /Unauthorized/gi, replacement: 'Authentication required' },
];

/**
 * File path patterns to remove
 */
const FILE_PATH_PATTERNS = [
    /\/[a-zA-Z0-9_\-/.]+\.(ts|js|vue|json|css)/g,
    /[A-Za-z]:\\[a-zA-Z0-9_\-\\.]+\.(ts|js|vue|json|css)/g,
    /\/[a-zA-Z0-9_\-/.]+\/node_modules\//g,
    /[a-zA-Z0-9_\-\\.]+\\node_modules\\/g,
];

/**
 * CRITICAL: Sanitize error messages before logging or displaying
 *
 * @param error - Error object or string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(error: Error | string, options: ErrorSanitizeOptions = {}): string {
    const isProd = typeof import.meta.env?.MODE === 'string' && import.meta.env.MODE === 'production';
    const {
        removeStackTraces = isProd,
        removeFilePaths = isProd,
        removeInternalDetails = isProd,
        maskSensitiveData = true,
        normalizeLineBreaks = true,
        truncateTo = 500,
    } = options;

    let message = typeof error === 'string' ? error : error.message;

    // Step 1: Mask sensitive data
    if (maskSensitiveData) {
        message = maskSensitiveDataInMessage(message);
    }

    // Step 2: Remove stack traces
    if (removeStackTraces && typeof error !== 'string' && error.stack) {
        message = message.replace(error.stack, '[Stack trace removed]');
    }

    // Step 3: Remove file paths
    if (removeFilePaths) {
        message = removeFilePathsFromMessage(message);
    }

    // Step 4: Remove internal details
    if (removeInternalDetails) {
        message = replaceInternalErrorMessages(message);
    }

    // Step 5: Normalize line breaks
    if (normalizeLineBreaks) {
        message = message.replace(/[\r\n]+/g, ' ');
    }

    // Step 6: Truncate long messages
    if (truncateTo && message.length > truncateTo) {
        message = message.slice(0, truncateTo) + '... [truncated]';
    }

    return message.trim();
}

/**
 * Mask sensitive data in error message
 *
 * @param message - Error message to mask
 * @returns Message with sensitive data masked
 */
function maskSensitiveDataInMessage(message: string): string {
    let masked = message;

    for (const pattern of SENSITIVE_PATTERNS) {
        masked = masked.replace(pattern, '[REDACTED]');
    }

    return masked;
}

/**
 * Remove file paths from error message
 *
 * @param message - Error message to sanitize
 * @returns Message with file paths removed
 */
function removeFilePathsFromMessage(message: string): string {
    let sanitized = message;

    for (const pattern of FILE_PATH_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[file]');
    }

    return sanitized;
}

/**
 * Replace internal error messages with user-friendly ones
 *
 * @param message - Error message to replace
 * @returns Message with internal details replaced
 */
function replaceInternalErrorMessages(message: string): string {
    let sanitized = message;

    for (const { pattern, replacement } of INTERNAL_ERROR_PATTERNS) {
        sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
}

/**
 * Safe error logger with sanitization
 *
 * Logs errors to console with sensitive data removed.
 * In production, sends to error tracking service.
 *
 * @param error - Error to log
 * @param context - Context or category of the error
 * @param options - Sanitization options
 */
export function logErrorSafely(error: Error | string, context: string = 'Unknown', options: ErrorSanitizeOptions = {}): void {
    const isProd = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
    const sanitizedMessage = sanitizeErrorMessage(error, {
        removeStackTraces: isProd,
        removeFilePaths: isProd,
        maskSensitiveData: true,
        ...options,
    });

    // Log to console
    console.error(`[${context}] ${sanitizedMessage}`);

    // In production, send to error tracking service
    if (isProd) {
        sendToErrorTrackingService(error, context, sanitizedMessage);
    }
}

/**
 * Send error to error tracking service (placeholder)
 *
 * In a real application, this would send to Sentry, LogRocket, etc.
 *
 * @param error - Original error
 * @param context - Error context
 * @param sanitizedMessage - Sanitized error message
 */
function sendToErrorTrackingService(_error: Error | string, _context: string, _sanitizedMessage: string): void {
    // TODO: Implement error tracking service integration
    // Example with Sentry:
    // Sentry.captureException(error, {
    //     tags: { context },
    //     extra: { sanitizedMessage }
    // });

    // For now, just log to console
    console.warn('Error tracking service not configured');
}

/**
 * Create safe error handler component
 *
 * Returns a function that safely handles errors by logging them
 * and optionally displaying a user-friendly message.
 *
 * @param defaultContext - Default context for error logging
 * @returns Error handler function
 */
export function createErrorHandler(defaultContext: string = 'Application') {
    return (error: Error | string, userMessage?: string) => {
        logErrorSafely(error, defaultContext);

        if (userMessage && import.meta.client) {
            // Show user-friendly message (toast, alert, etc.)
            console.warn('User message:', userMessage);
        }
    };
}

/**
 * Validate error message for safe display
 *
 * Checks if an error message is safe to display to users
 * (no sensitive data, internal details, etc.)
 *
 * @param message - Error message to validate
 * @returns True if message is safe to display
 */
export function isErrorMessageSafe(message: string): boolean {
    // Check for sensitive data patterns
    for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(message)) {
            return false;
        }
    }

    // Check for file paths
    for (const pattern of FILE_PATH_PATTERNS) {
        if (pattern.test(message)) {
            return false;
        }
    }

    // Check for internal error patterns
    for (const { pattern } of INTERNAL_ERROR_PATTERNS) {
        if (pattern.test(message)) {
            return false;
        }
    }

    // Check for stack traces
    if ((message.includes('at ') && message.includes('.ts:')) || message.includes('.js:')) {
        return false;
    }

    return true;
}
