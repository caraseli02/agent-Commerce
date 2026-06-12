/**
 * Mock Data Sanitization Utilities
 *
 * CRITICAL: All mock data must be sanitized before being returned to prevent:
 * - XSS attacks through malicious mock data
 * - Sensitive data leakage
 * - Null/undefined values in responses
 * - Empty arrays in responses
 */

export interface SanitizeOptions {
    removeNulls?: boolean;
    removeEmptyArrays?: boolean;
    removeEmptyStrings?: boolean;
    sanitizeHTML?: boolean;
    maxDepth?: number;
    /**
     * Keys that should always be removed from mock data
     */
    blockedKeys?: string[];
    /**
     * Keys that should be masked (values replaced with [MASKED])
     */
    maskedKeys?: string[];
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
];

/**
 * Keys that should always be removed from mock data
 */
const BLOCKED_KEYS = ['password', 'secret', 'token', 'apiKey', 'creditCard', 'cvv', 'ssn'];

/**
 * Keys that should be masked (values replaced with [MASKED])
 */
const MASKED_KEYS = ['email', 'phone', 'phoneMobile', 'mobile'];

/**
 * CRITICAL: Sanitize all mock data before returning
 *
 * @param data - Data to sanitize
 * @param options - Sanitization options
 * @returns Sanitized data
 */
export function sanitizeMockData<T>(data: T, options: SanitizeOptions = {}): T {
    const {
        removeNulls = true,
        removeEmptyArrays = true,
        removeEmptyStrings = false,
        sanitizeHTML = true,
        maxDepth = 10,
        blockedKeys = BLOCKED_KEYS,
        maskedKeys = MASKED_KEYS,
    } = options;

    // Prevent infinite recursion
    if (maxDepth <= 0) {
        return data;
    }

    // Handle null values
    if (data === null) {
        return removeNulls ? (undefined as T) : data;
    }

    // Handle undefined values
    if (data === undefined) {
        return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        const sanitized = data
            .map((item) =>
                sanitizeMockData(item, {
                    ...options,
                    maxDepth: maxDepth - 1,
                })
            )
            .filter((item) => {
                // Remove null/undefined items if removeNulls is enabled
                if (removeNulls && (item === null || item === undefined)) {
                    return false;
                }
                // Remove empty arrays if removeEmptyArrays is enabled
                if (removeEmptyArrays && Array.isArray(item) && item.length === 0) {
                    return false;
                }
                // Remove empty strings if removeEmptyStrings is enabled
                if (removeEmptyStrings && item === '') {
                    return false;
                }
                return true;
            });

        return (removeEmptyArrays && sanitized.length === 0 ? undefined : sanitized) as T;
    }

    // Handle objects
    if (typeof data === 'object') {
        const sanitized: Record<string, unknown> = {};

        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const record = data as Record<string, unknown>;
                const value = record[key];

                // Security: Check for blocked keys
                const isBlocked = blockedKeys.some((bk) => key.toLowerCase().includes(bk.toLowerCase()));
                if (isBlocked) {
                    continue;
                }

                // Security: Check for masked keys
                const isMasked = maskedKeys.some((mk) => key.toLowerCase().includes(mk.toLowerCase()));
                if (isMasked && typeof value === 'string') {
                    sanitized[key] = '[MASKED]';
                    continue;
                }

                // Sanitize the value recursively
                const sanitizedValue = sanitizeMockData(value, {
                    ...options,
                    maxDepth: maxDepth - 1,
                });

                // Sanitize HTML strings
                if (sanitizeHTML && typeof value === 'string') {
                    sanitized[key] = sanitizeHTMLContent(value);
                } else {
                    sanitized[key] = sanitizedValue;
                }
            }
        }

        // Remove empty objects if removeEmptyArrays is enabled
        if (removeEmptyArrays && Object.keys(sanitized).length === 0) {
            return undefined as T;
        }

        return sanitized as T;
    }

    // Sanitize strings
    if (sanitizeHTML && typeof data === 'string') {
        return sanitizeHTMLContent(data) as T;
    }

    // Return primitive values as-is
    return data;
}

/**
 * HTML sanitization utility
 *
 * @param input - String to sanitize
 * @returns Sanitized string with HTML entities escaped
 */
function sanitizeHTMLContent(input: string): string {
    // Basic HTML sanitization - escape all HTML tags
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize string by removing sensitive patterns
 *
 * @param input - String to sanitize
 * @returns Sanitized string with sensitive data masked
 */
export function sanitizeSensitiveData(input: string): string {
    let sanitized = input;

    for (const pattern of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
}

/**
 * Validate mock data structure
 *
 * @param data - Data to validate
 * @returns True if data is valid mock data
 */
export function validateMockDataStructure(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
        return false;
    }

    // Check for common mock data patterns
    if (Array.isArray(data)) {
        // Arrays are valid if all elements are valid
        return data.every(validateMockDataStructure);
    }

    // Objects are valid if all values are valid
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const record = data as Record<string, unknown>;
            const value = record[key];

            // Check for blocked keys
            if (BLOCKED_KEYS.some((bk) => key.toLowerCase().includes(bk.toLowerCase()))) {
                console.error(`SECURITY: Blocked key found in mock data: ${key}`);
                return false;
            }

            // Recursively validate nested objects
            if (typeof value === 'object' && value !== null) {
                if (!validateMockDataStructure(value)) {
                    return false;
                }
            }
        }
    }

    return true;
}

/**
 * Create mock data generator with automatic sanitization
 *
 * @param mockData - Raw mock data to use as template
 * @param options - Sanitization options
 * @returns Function that generates sanitized mock data
 */
export function createMockDataGenerator<T>(mockData: T, options: SanitizeOptions = {}) {
    return (): T => {
        const sanitized = sanitizeMockData(mockData, options);

        if (!validateMockDataStructure(sanitized)) {
            console.error('SECURITY: Mock data validation failed');
            throw new Error('Mock data validation failed');
        }

        return sanitized;
    };
}
