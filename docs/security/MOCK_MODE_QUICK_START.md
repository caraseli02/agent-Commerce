# Mock Mode Security Implementation - Quick Start Guide

This document provides a quick reference for implementing mock mode with comprehensive security measures.

## 🚀 Quick Setup

### 1. Install Security Files

The following files have been created:

```
docs/security/MOCK_MODE_SECURITY.md        # Comprehensive security requirements
composables/useMockMode.ts               # Mock mode composable with validation
utils/sanitizeMockData.ts                # Mock data sanitization utilities
utils/errorSanitizer.ts                 # Error message sanitization
scripts/setup-security-hooks.sh           # Git hooks setup script
```

### 2. Update Environment Variables

Add to `.env.template`:

```bash
# Mock Mode - MUST be 'false' or undefined in production
NUXT_PUBLIC_MOCK_MODE=false
NUXT_PUBLIC_MOCK_MODE_ENABLED=false  # Alias for redundancy
```

Add to `.env` (development only):

```bash
# Enable mock mode for development
NUXT_PUBLIC_MOCK_MODE=true
NUXT_PUBLIC_MOCK_MODE_ENABLED=true
```

### 3. Update nuxt.config.ts

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      MOCK_MODE: process.env.NUXT_PUBLIC_MOCK_MODE || 'false',
      MOCK_MODE_ENABLED: process.env.NUXT_PUBLIC_MOCK_MODE_ENABLED || 'false',
      // ... other config
    },
  },
});
```

### 4. Set Up Git Hooks

Run the setup script:

```bash
./scripts/setup-security-hooks.sh
```

This will:

- Install pre-commit hooks to prevent committing mock mode or secrets
- Install pre-push hooks for production branch protection
- Update .gitignore to prevent committing .env files

## 📋 Core Security Features

### 1. Multi-Layer Mock Mode Validation

The `useMockMode` composable provides 4-layer validation:

```typescript
const { isMockMode, getMockMode, assertMockMode } = useMockMode();

// Layer 1: Environment variable check
// Layer 2: Runtime environment check (dev/test only)
// Layer 3: Domain/IP whitelist check (localhost, 127.0.0.1, dev domains)
// Layer 4: Process environment check (not CI environment)
```

**Usage:**

```typescript
// Check if mock mode is enabled
if (isMockMode.value) {
  // Use mock data
} else {
  // Use real data
}

// Assert that mock mode is active
assertMockMode('This feature requires mock mode');

// Assert that mock mode is NOT active
assertNotMockMode('Mock mode cannot be enabled for this operation');
```

### 2. Mock Data Sanitization

The `sanitizeMockData` utility provides comprehensive sanitization:

```typescript
import { sanitizeMockData } from '~/utils/sanitizeMockData';

const mockData = {
  id: '1',
  name: '<script>alert("XSS")</script>',
  password: 'secret123',
  nullValue: null,
  emptyArray: [],
};

const sanitized = sanitizeMockData(mockData, {
  removeNulls: true,
  removeEmptyArrays: true,
  sanitizeHTML: true,
});

// Result:
// {
//     id: '1',
//     name: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
//     // password is removed (blocked key)
//     // nullValue and emptyArray are removed
// }
```

### 3. Error Message Sanitization

The `errorSanitizer` utility provides secure error logging:

```typescript
import { logErrorSafely, sanitizeErrorMessage } from '~/utils/errorSanitizer';

// Log errors safely
logErrorSafely(new Error('Authentication failed: password=secret123'), 'AuthContext');

// In development: Logs sanitized message
// In production: Removes passwords, file paths, stack traces

// Sanitize error messages manually
const sanitized = sanitizeErrorMessage(error, {
  removeStackTraces: true,
  removeFilePaths: true,
  maskSensitiveData: true,
});
```

## 🔒 Security Checklist

### Before Implementation

- [ ] Review `docs/security/MOCK_MODE_SECURITY.md` thoroughly
- [ ] Ensure `.env` is in `.gitignore`
- [ ] Set up git hooks
- [ ] Review team on security best practices

### During Implementation

- [ ] Use `useMockMode` composable for all mock mode checks
- [ ] Sanitize all mock data before returning
- [ ] Use `logErrorSafely` for all error logging
- [ ] Implement CSRF protection for mock endpoints
- [ ] Add security headers to all mock endpoints

### After Implementation

- [ ] Run comprehensive security tests
- [ ] Test mock mode in development environment
- [ ] Verify mock mode is disabled in production builds
- [ ] Review git logs for any security issues
- [ ] Update documentation

## 🧪 Testing

### Manual Testing

```bash
# Enable mock mode (development)
NUXT_PUBLIC_MOCK_MODE=true npm run dev

# Test that mock mode works
# Check console for mock mode warnings

# Disable mock mode
NUXT_PUBLIC_MOCK_MODE=false npm run dev

# Test that real API is used
```

### Automated Testing

```typescript
// tests/security/mock-mode.test.ts
import { describe, it, expect } from 'vitest';

describe('Mock Mode Security', () => {
  it('should not enable mock mode in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NUXT_PUBLIC_MOCK_MODE = 'false';

    const { isMockMode } = useMockMode();

    expect(isMockMode.value).toBe(false);
  });

  it('should sanitize mock data', () => {
    const mockData = {
      password: 'secret123',
      description: '<script>alert("XSS")</script>',
    };

    const sanitized = sanitizeMockData(mockData);

    expect(sanitized.password).toBeUndefined();
    expect(sanitized.description).not.toContain('<script>');
  });
});
```

## 🚨 Common Security Issues

### Issue: Mock mode enabled in production

**Symptoms:** Seeing mock data in production

**Solution:**

```bash
# 1. Check environment variables
echo $NUXT_PUBLIC_MOCK_MODE

# 2. Disable mock mode
NUXT_PUBLIC_MOCK_MODE=false

# 3. Rebuild application
npm run build

# 4. Redeploy
```

### Issue: Sensitive data in error messages

**Symptoms:** Seeing passwords, tokens, or file paths in logs

**Solution:**

```typescript
// Use logErrorSafely instead of console.error
import { logErrorSafely } from '~/utils/errorSanitizer';

logErrorSafely(error, 'Context');
```

### Issue: XSS vulnerabilities through mock data

**Symptoms:** Potential script injection through mock responses

**Solution:**

```typescript
// Always sanitize mock data
import { sanitizeMockData } from '~/utils/sanitizeMockData';

const sanitized = sanitizeMockData(mockData, {
  sanitizeHTML: true,
});
```

## 📚 Additional Resources

- Full security requirements: `docs/security/MOCK_MODE_SECURITY.md`
- Mock mode composable: `composables/useMockMode.ts`
- Data sanitization: `utils/sanitizeMockData.ts`
- Error sanitization: `utils/errorSanitizer.ts`

## 🆘 Support

If you encounter security issues:

1. **Do NOT commit or push** the affected code
2. Review the comprehensive security requirements document
3. Run the security test suite
4. Contact the security team for review
5. Follow the incident response procedures

## ⚠️ Critical Reminders

- **NEVER** enable mock mode in production
- **ALWAYS** sanitize mock data before returning
- **NEVER** commit `.env` files
- **ALWAYS** use `logErrorSafely` for error logging
- **NEVER** hardcode credentials or API keys
- **ALWAYS** review code with security mindset

---

**Last Updated:** 2026-02-14
**Version:** 1.0.0
**Security Level:** CRITICAL
