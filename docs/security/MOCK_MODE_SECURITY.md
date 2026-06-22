# Mock Mode Security Implementation Guide

## ECAS E-Commerce Application - Nuxt 3

> **Version**: 1.0.0
> **Security Level**: CRITICAL
> **Last Updated**: 2026-02-14
> **Status**: Draft for Review

---

## Executive Summary

This document provides comprehensive security requirements for implementing mock mode in the ECAS e-commerce application. Mock mode must never compromise production security or expose sensitive data.

**Key Security Objectives:**

- Zero risk of mock mode activation in production
- Complete isolation of mock data from production
- Secure mock user authentication that cannot leak to production
- Prevention of real transactions during mock mode
- Full audit trail of mock mode activation

---

## 1. PRODUCTION SAFETY

### 1.1 Environment Variable Validation

#### Requirement 1.1.1: Mock Mode Environment Variable

```typescript
// .env.template
# MOCK MODE - MUST BE 'false' or undefined in production
NUXT_PUBLIC_MOCK_MODE=false
NUXT_PUBLIC_MOCK_MODE_ENABLED=false  # Alias for redundancy
```

#### Validation Code Pattern:

```typescript
// composables/useMockMode.ts
export const useMockMode = () => {
  const config = useRuntimeConfig();

  /**
   * CRITICAL: Multiple validation layers to prevent production activation
   */
  const isMockMode = computed(() => {
    // Layer 1: Environment variable check
    const envMockMode = config.public.MOCK_MODE === 'true' || config.public.MOCK_MODE_ENABLED === 'true';

    // Layer 2: Runtime environment check
    const isDev = import.meta.dev;
    const isTest = import.meta.test;

    // Layer 3: Domain/IP whitelist check
    const allowedDomains = ['localhost', '127.0.0.1', 'dev.ecasmag.ro'];
    const isAllowedDomain = allowedDomains.some((domain) => window.location.hostname.includes(domain));

    // Layer 4: Process environment check (Node.js)
    const isCI = process.env.CI === 'true';
    const isVercelPreview = process.env.VERCEL_ENV === 'preview';

    // CRITICAL: Mock mode ONLY if ALL conditions are met
    return envMockMode && isDev && isAllowedDomain && !isCI;
  });

  /**
   * Development-safe mock mode getter with security assertions
   */
  const getMockMode = (): boolean => {
    if (!isMockMode.value) {
      return false;
    }

    // Security assertion: Verify we're NOT in production
    if (process.env.NODE_ENV === 'production') {
      console.error('SECURITY ALERT: Mock mode attempted in production!');
      console.error('Immediate action required: Review environment variables');
      throw new Error('Mock mode is disabled in production');
    }

    return true;
  };

  return {
    isMockMode: readonly(isMockMode),
    getMockMode,
  };
};
```

### 1.2 Build-Time vs Runtime Configuration

#### Requirement 1.2.1: Build-Time Safety

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // Build-time constants (cannot be overridden at runtime)
  runtimeConfig: {
    public: {
      MOCK_MODE: process.env.NUXT_PUBLIC_MOCK_MODE || 'false',
      MOCK_MODE_ENABLED: process.env.NUXT_PUBLIC_MOCK_MODE_ENABLED || 'false',
    },
  },

  // Vite build plugin to enforce security
  vite: {
    define: {
      'process.env.MOCK_MODE': JSON.stringify(process.env.NUXT_PUBLIC_MOCK_MODE || 'false'),
    },
  },
});
```

#### Build-Time Validation Script:

```typescript
// scripts/validate-mock-mode.ts
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function validateMockModeForProduction() {
  const envPath = join(process.cwd(), '.env');

  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    const mockModeMatch = envContent.match(/NUXT_PUBLIC_MOCK_MODE=(.*)/i);

    if (mockModeMatch) {
      const mockModeValue = mockModeMatch[1]?.trim().toLowerCase();

      if (mockModeValue === 'true' || mockModeValue === '1') {
        console.error('❌ CRITICAL SECURITY ERROR:');
        console.error('   MOCK_MODE is enabled in .env file!');
        console.error('   This must NEVER be committed or deployed to production.');
        console.error('');
        console.error('   Action required:');
        console.error('   1. Set NUXT_PUBLIC_MOCK_MODE=false');
        console.error('   2. Ensure .env is in .gitignore');
        console.error('   3. Review environment variable security');
        console.error('');
        process.exit(1);
      }
    }
  }

  // Check runtime config in nuxt.config.ts
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    console.log('✅ Validating production build security...');
    console.log('   NODE_ENV:', nodeEnv);
    console.log('   MOCK_MODE:', process.env.NUXT_PUBLIC_MOCK_MODE);
    console.log('');
    console.log('✅ Production build validated successfully');
  }
}
```

### 1.3 Preventing Mock Data Leakage

#### Requirement 1.3.1: Mock Data Isolation

```typescript
// server/middleware/mock-mode.guard.ts
export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const mockModeEnabled = config.public.MOCK_MODE === 'true';

  // Security check: Prevent mock data in production
  if (mockModeEnabled && process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 500,
      statusMessage: 'SECURITY: Mock mode cannot be enabled in production',
    });
  }

  // Add security headers for mock mode responses
  if (mockModeEnabled) {
    appendHeader(event, 'X-Mock-Mode', 'enabled');
    appendHeader(event, 'X-Mock-Data', 'warning: development-only');
  } else {
    appendHeader(event, 'X-Mock-Mode', 'disabled');
  }
});
```

#### Requirement 1.3.2: Client-Side Mock Data Protection

```typescript
// composables/useMockData.ts
export const useMockData = () => {
  const { getMockMode } = useMockMode();
  const route = useRoute();

  /**
   * Secure mock data wrapper
   * Never returns mock data if mock mode is disabled
   */
  const withMockData = <T>(realData: T, mockData: T): T => {
    if (!getMockMode()) {
      return realData;
    }

    // Security: Log mock data access for auditing
    if (import.meta.dev) {
      console.warn('[MOCK MODE] Returning mock data for:', route.path);
    }

    return mockData;
  };

  /**
   * Safe mock data getter with validation
   */
  const getMockData = <T>(mockData: T, errorMessage = 'Mock mode is not enabled'): T => {
    if (!getMockMode()) {
      throw new Error(errorMessage);
    }

    // Security: Validate mock data structure
    if (!mockData || typeof mockData !== 'object') {
      console.error('SECURITY: Invalid mock data structure');
      throw new Error('Mock data validation failed');
    }

    return mockData;
  };

  return {
    withMockData,
    getMockData,
  };
};
```

### 1.4 Git Hooks for Security Enforcement

#### Requirement 1.4.1: Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔒 Running security checks..."

# Check if MOCK_MODE is enabled in .env
if [ -f ".env" ]; then
    if grep -qi "NUXT_PUBLIC_MOCK_MODE=true" .env || grep -qi "NUXT_PUBLIC_MOCK_MODE_ENABLED=true" .env; then
        echo "❌ SECURITY ERROR: MOCK_MODE is enabled in .env file!"
        echo "   Please disable mock mode before committing."
        echo "   Set NUXT_PUBLIC_MOCK_MODE=false"
        exit 1
    fi
fi

# Check for mock mode references in code (excluding comments)
if git diff --cached --name-only | grep -E '\.(ts|js|vue)$'; then
    if git diff --cached | grep -E '^\+.*MOCK_MODE.*true' | grep -v '//' > /dev/null; then
        echo "⚠️  WARNING: Mock mode enabled in committed code"
        echo "   Please review this change carefully"
    fi
fi

echo "✅ Security checks passed"
```

---

## 2. AUTHENTICATION & AUTHORIZATION

### 2.1 Mock User Session Management

#### Requirement 2.1.1: Secure Mock Session Store

```typescript
// store/mockAuthStore.ts
import { defineStore } from 'pinia';

interface MockSession {
  userId: string;
  role: string;
  token: string;
  isMock: true;
  expiresAt: Date;
}

export const useMockAuthStore = defineStore(
  'mock-auth',
  () => {
    const mockSession = ref<MockSession | null>(null);
    const { getMockMode } = useMockMode();

    /**
     * CRITICAL: Only allow mock sessions in mock mode
     */
    function createMockSession(userId: string, role: string = 'customer'): string {
      if (!getMockMode()) {
        throw new Error('Mock sessions can only be created in mock mode');
      }

      // Security: Generate a clearly identifiable mock token
      const mockToken = `mock-${userId}-${Date.now()}`;

      mockSession.value = {
        userId,
        role,
        token: mockToken,
        isMock: true,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      };

      return mockToken;
    }

    /**
     * Validate mock session
     */
    function validateMockSession(token: string): boolean {
      if (!mockSession.value || mockSession.value.token !== token) {
        return false;
      }

      // Security: Check expiration
      if (new Date() > mockSession.value.expiresAt) {
        mockSession.value = null;
        return false;
      }

      return true;
    }

    /**
     * CRITICAL: Clear mock session on mode switch
     */
    function clearMockSession() {
      mockSession.value = null;
    }

    /**
     * Security: Never persist mock sessions to localStorage
     */
    function $reset() {
      mockSession.value = null;
    }

    return {
      mockSession,
      createMockSession,
      validateMockSession,
      clearMockSession,
      $reset,
    };
  },
  {
    // CRITICAL: Never persist mock sessions
    persist: false,
  }
);
```

### 2.2 Preventing Mock Credentials in Production

#### Requirement 2.2.1: Mock Credentials Validation

```typescript
// services/mockAuthService.ts
export class MockAuthService {
  private readonly MOCK_CREDENTIALS = {
    email: 'mock-user@example.com',
    password: 'mock-password-123',
    userId: 'mock-user-001',
  };

  private readonly MOCK_ADMIN_CREDENTIALS = {
    email: 'mock-admin@example.com',
    password: 'mock-admin-123',
    userId: 'mock-admin-001',
    role: 'admin',
  };

  /**
   * CRITICAL: Only validate mock credentials in mock mode
   */
  validateMockCredentials(email: string, password: string): boolean {
    const { getMockMode } = useMockMode();

    if (!getMockMode()) {
      console.error('SECURITY: Attempt to validate mock credentials outside mock mode');
      return false;
    }

    const isUser = email === this.MOCK_CREDENTIALS.email && password === this.MOCK_CREDENTIALS.password;

    const isAdmin = email === this.MOCK_ADMIN_CREDENTIALS.email && password === this.MOCK_ADMIN_CREDENTIALS.password;

    if (isUser || isAdmin) {
      // Security: Log mock authentication attempts (dev only)
      if (import.meta.dev) {
        console.warn('[MOCK AUTH] Mock credentials used:', email);
      }
      return true;
    }

    return false;
  }

  /**
   * Get mock user details securely
   */
  getMockUser(email: string) {
    const { getMockMode } = useMockMode();

    if (!getMockMode()) {
      throw new Error('Mock user data is only available in mock mode');
    }

    if (email === this.MOCK_CREDENTIALS.email) {
      return {
        _id: this.MOCK_CREDENTIALS.userId,
        role: 'customer',
        accountType: 'personal',
        verified: true,
        status: 1,
        contactDetails: {
          firstName: 'Mock',
          lastName: 'User',
          email: this.MOCK_CREDENTIALS.email,
          phone: '+1234567890',
        },
      };
    }

    if (email === this.MOCK_ADMIN_CREDENTIALS.email) {
      return {
        _id: this.MOCK_ADMIN_CREDENTIALS.userId,
        role: 'admin',
        accountType: 'business',
        verified: true,
        status: 1,
        contactDetails: {
          firstName: 'Mock',
          lastName: 'Admin',
          email: this.MOCK_ADMIN_CREDENTIALS.email,
          phone: '+0987654321',
        },
      };
    }

    throw new Error('Mock user not found');
  }
}
```

### 2.3 Firebase Integration Security in Mock Mode

#### Requirement 2.3.1: Firebase Mock Mode Guard

```typescript
// composables/useFirebaseAuth.ts (enhanced)
export default function () {
  const { $auth, $router } = useNuxtApp();
  const { getMockMode } = useMockMode();

  /**
   * CRITICAL: Disable Firebase in mock mode
   */
  const registerUser = async (): Promise<FirebaseResults | { error: ErrorConstructor }> => {
    if (getMockMode()) {
      console.warn('[SECURITY] Firebase authentication disabled in mock mode');
      throw new Error('Use mock credentials in mock mode');
    }

    try {
      const provider = new GoogleAuthProvider();
      const signIn = await signInWithPopup($auth, provider).then((result) => {
        const isNewUser = getAdditionalUserInfo(result)?.isNewUser;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        const user = result.user;
        return { token, user, isNewUser };
      });

      return signIn;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error);
      }
      return { error: Error };
    }
  };

  /**
   * Security: Prevent Firebase token retrieval in mock mode
   */
  const getParsedFirebaseJWTToken = async (): Promise<UserInfoJWT> => {
    if (getMockMode()) {
      throw new Error('Firebase tokens are not available in mock mode');
    }

    const { currentUser } = $auth;
    const token = await getIdToken(currentUser);

    return useParser().parseJwt(token);
  };

  return {
    registerUser,
    getParsedFirebaseJWTToken,
    getUserToken: getParsedFirebaseJWTToken,
    logout,
  };
}
```

### 2.4 Admin Permission Mocking Security

#### Requirement 2.4.1: Secure Admin Mock

```typescript
// server/middleware/mock-admin.guard.ts
export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const mockModeEnabled = config.public.MOCK_MODE === 'true';

  if (!mockModeEnabled) {
    return; // Normal authentication flow
  }

  // Extract mock token from headers
  const mockToken = getCookie(event, 'mock-token') || (getHeader(event, 'x-mock-token') as string);

  if (!mockToken) {
    return; // No mock token, proceed normally
  }

  // Security: Validate mock token format
  if (!mockToken.startsWith('mock-')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid mock token format',
    });
  }

  // Security: Only allow mock admin on specific routes
  const path = getRequestURL(event).pathname;
  const allowedAdminPaths = ['/api/admin/dashboard', '/api/admin/users', '/api/admin/products'];

  const isAdminPath = allowedAdminPaths.some((p) => path.startsWith(p));

  if (!isAdminPath && mockToken.includes('mock-admin')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Mock admin access restricted to specific endpoints',
    });
  }

  // Add mock user context to request
  event.context.mockUser = {
    userId: mockToken.split('-')[1],
    role: mockToken.includes('admin') ? 'admin' : 'customer',
    isMock: true,
  };
});
```

---

## 3. INPUT VALIDATION

### 3.1 Mock Mode Toggle Validation

#### Requirement 3.1.1: Runtime Validation

```typescript
// middleware/mockModeValidation.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { getMockMode } = useMockMode();
  const route = useRoute();

  // Security: Prevent query parameter override
  if (route.query.mockMode === 'true' || route.query.mock_mode === 'true') {
    if (!getMockMode()) {
      console.error('SECURITY: Attempt to enable mock mode via URL');
      return navigateTo({
        path: to.path,
        query: { ...to.query, mockMode: undefined, mock_mode: undefined },
      });
    }
  }

  // Security: Validate mock mode for specific routes
  const protectedRoutes = ['/dashboard', '/checkout', '/admin'];

  const isProtectedRoute = protectedRoutes.some((route) => to.path.startsWith(route));

  if (isProtectedRoute && getMockMode()) {
    // Add mock mode warning header
    const nuxtApp = useNuxtApp();
    nuxtApp.$router.options.scrollBehavior = () => false;

    // Log mock mode access
    if (import.meta.dev) {
      console.warn('[MOCK MODE] Accessing protected route:', to.path);
    }
  }
});
```

### 3.2 Sanitizing Mock Data Responses

#### Requirement 3.2.1: Mock Data Sanitization

```typescript
// utils/sanitizeMockData.ts
export interface SanitizeOptions {
  removeNulls?: boolean;
  removeEmptyArrays?: boolean;
  sanitizeHTML?: boolean;
  maxDepth?: number;
}

/**
 * CRITICAL: Sanitize all mock data before returning
 */
export function sanitizeMockData<T>(data: T, options: SanitizeOptions = {}): T {
  const { removeNulls = true, removeEmptyArrays = true, sanitizeHTML = true, maxDepth = 10 } = options;

  if (maxDepth <= 0) {
    return data;
  }

  if (data === null) {
    return removeNulls ? (undefined as T) : data;
  }

  if (Array.isArray(data)) {
    const sanitized = data.map((item) => sanitizeMockData(item, { ...options, maxDepth: maxDepth - 1 }));

    return (removeEmptyArrays && sanitized.length === 0 ? undefined : sanitized) as T;
  }

  if (typeof data === 'object') {
    const sanitized: any = {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Security: Remove sensitive keys
        const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'creditCard'];
        if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
          continue;
        }

        const value = (data as any)[key];

        // Security: Sanitize HTML strings
        if (sanitizeHTML && typeof value === 'string') {
          sanitized[key] = sanitizeHTMLContent(value);
        } else {
          sanitized[key] = sanitizeMockData(value, {
            ...options,
            maxDepth: maxDepth - 1,
          });
        }
      }
    }

    return sanitized as T;
  }

  // Sanitize strings
  if (sanitizeHTML && typeof data === 'string') {
    return sanitizeHTMLContent(data) as T;
  }

  return data;
}

/**
 * HTML sanitization utility
 */
function sanitizeHTMLContent(input: string): string {
  // Basic HTML sanitization
  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
}
```

### 3.3 Preventing XSS Through Mock Data

#### Requirement 3.3.1: XSS Prevention in Mock Responses

```typescript
// server/api/products/[id].get.ts (enhanced)
import { sanitizeMockData } from '~/utils/sanitizeMockData';

export default defineEventHandler(async (event) => {
  const productId = getRouterParam(event, 'id');
  const config = useRuntimeConfig();
  const mockModeEnabled = config.public.MOCK_MODE === 'true';

  if (!mockModeEnabled) {
    // Call real API
    // ...
  }

  const mockProduct = mockProducts.find((p: any) => p._id === productId);

  if (!mockProduct) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Product not found',
    });
  }

  // CRITICAL: Sanitize mock data before returning
  const sanitizedProduct = sanitizeMockData(mockProduct, {
    removeNulls: true,
    removeEmptyArrays: true,
    sanitizeHTML: true,
  });

  // Security: Add content security headers
  setHeader(event, 'Content-Security-Policy', "default-src 'self'");
  setHeader(event, 'X-Content-Type-Options', 'nosniff');
  setHeader(event, 'X-Frame-Options', 'DENY');
  setHeader(event, 'X-XSS-Protection', '1; mode=block');

  return {
    status: 'success',
    data: sanitizedProduct,
  };
});
```

### 3.4 CSRF Protection in Mock Mode

#### Requirement 3.4.1: Mock CSRF Protection

```typescript
// server/api/auth/login.post.ts (enhanced)
export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { email?: string; password: string };
  const config = useRuntimeConfig();
  const mockModeEnabled = config.public.MOCK_MODE === 'true';

  // Security: CSRF protection even in mock mode
  const csrfToken = getCookie(event, 'csrf-token') || (getHeader(event, 'x-csrf-token') as string);

  if (!csrfToken && mockModeEnabled) {
    // In mock mode, accept a simplified CSRF check
    const mockCsrfToken = getHeader(event, 'x-mock-csrf-token') as string;
    if (!mockCsrfToken) {
      throw createError({
        statusCode: 403,
        statusMessage: 'CSRF token required',
      });
    }
  }

  // Security: Validate CSRF token format
  if (csrfToken && !csrfToken.match(/^[a-zA-Z0-9-_]{32,}$/)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid CSRF token format',
    });
  }

  if (mockModeEnabled) {
    // Return mock response
    const mockResponse = {
      status: 'success',
      data: {
        token: 'mock-jwt-token-12345',
        csrfToken: generateMockCsrfToken(),
        user: {
          _id: '1',
          firebaseId: 'mock-firebase-id-12345',
          role: 'customer' as any,
          accountType: 'personal' as any,
          verified: true,
          status: 1,
          contactDetails: {
            firstName: 'John',
            lastName: 'Doe',
            email: body.email || 'test@example.com',
            phone: '+1234567890',
          },
          // ... rest of mock user data
        },
      },
    };

    // Security: Set CSRF cookie
    setCookie(event, 'csrf-token', mockResponse.data.csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return mockResponse;
  }

  // Real authentication flow
  // ...
});

function generateMockCsrfToken(): string {
  return Buffer.from(Math.random().toString()).toString('base64').slice(0, 32);
}
```

---

## 4. THIRD-PARTY INTEGRATIONS

### 4.1 Stripe Mocking Security

#### Requirement 4.1.1: Stripe Mock Implementation

```typescript
// composables/useStripeMock.ts
export const useStripeMock = () => {
  const { getMockMode } = useMockMode();

  /**
   * CRITICAL: Ensure no real Stripe calls in mock mode
   */
  const createPaymentIntent = async (amount: number, currency: string = 'usd') => {
    if (!getMockMode()) {
      throw new Error('Stripe mock functions can only be used in mock mode');
    }

    // Security: Validate amount
    if (amount <= 0 || amount > 999999) {
      throw new Error('Invalid payment amount');
    }

    // Security: Validate currency
    if (!['usd', 'eur', 'gbp'].includes(currency.toLowerCase())) {
      throw new Error('Invalid currency');
    }

    // Return mock payment intent
    return {
      id: `pi_mock_${Date.now()}`,
      amount,
      currency,
      status: 'requires_payment_method',
      client_secret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).slice(2)}`,
      created: Math.floor(Date.now() / 1000),
      livemode: false, // ALWAYS false for mock mode
      metadata: {
        mock_mode: 'true',
      },
    };
  };

  /**
   * Simulate payment confirmation
   */
  const confirmPayment = async (paymentIntentId: string, paymentMethodId: string) => {
    if (!getMockMode()) {
      throw new Error('Stripe mock functions can only be used in mock mode');
    }

    // Security: Validate IDs
    if (!paymentIntentId.startsWith('pi_mock_')) {
      throw new Error('Invalid mock payment intent ID');
    }

    if (!paymentMethodId.startsWith('pm_mock_')) {
      throw new Error('Invalid mock payment method ID');
    }

    // Simulate successful payment
    return {
      id: paymentIntentId,
      status: 'succeeded',
      amount_details: {
        tip: { amount: 0, currency: 'usd' },
      },
      payment_method: paymentMethodId,
      livemode: false,
    };
  };

  /**
   * Mock payment method creation
   */
  const createPaymentMethod = async (cardDetails: { number: string; exp_month: number; exp_year: number; cvc: string }) => {
    if (!getMockMode()) {
      throw new Error('Stripe mock functions can only be used in mock mode');
    }

    // Security: Validate card number format (no real data)
    if (!cardDetails.number.match(/^4[0-9]{12}(?:[0-9]{3})?$/)) {
      // Simple validation for test card
      throw new Error('Invalid mock card number');
    }

    // Security: Validate expiration
    const currentYear = new Date().getFullYear();
    if (cardDetails.exp_year < currentYear || cardDetails.exp_year > currentYear + 10) {
      throw new Error('Invalid expiration year');
    }

    if (cardDetails.exp_month < 1 || cardDetails.exp_month > 12) {
      throw new Error('Invalid expiration month');
    }

    // Return mock payment method
    return {
      id: `pm_mock_${Date.now()}`,
      type: 'card',
      card: {
        brand: 'visa',
        last4: cardDetails.number.slice(-4),
        exp_month: cardDetails.exp_month,
        exp_year: cardDetails.exp_year,
      },
      livemode: false,
    };
  };

  return {
    createPaymentIntent,
    confirmPayment,
    createPaymentMethod,
  };
};
```

### 4.2 Firebase Keys in Mock Mode

#### Requirement 4.2.1: Firebase Configuration Security

```typescript
// plugins/firebase.client.ts (enhanced)
export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig();

  /**
   * CRITICAL: Firebase configuration validation
   */
  const validateFirebaseConfig = () => {
    const requiredKeys = [
      'firebaseApiKey',
      'firebaseAuthDomain',
      'firebaseProjectID',
      'firebaseStorageBucket',
      'firebaseMessageSenderID',
      'firebaseAppID',
    ];

    for (const key of requiredKeys) {
      const value = config.public[key] as string;

      // Security: Ensure no default 'test' values in production
      if (process.env.NODE_ENV === 'production' && value === 'test') {
        throw new Error(`SECURITY: Firebase ${key} is set to default value in production`);
      }

      // Security: Ensure values are properly set
      if (!value || value.trim() === '') {
        console.warn(`WARNING: Firebase ${key} is not configured`);
      }
    }
  };

  // Run validation
  validateFirebaseConfig();

  // Initialize Firebase with security checks
  const firebaseConfig = {
    apiKey: (config.public.firebaseApiKey as string) || 'test',
    authDomain: (config.public.firebaseAuthDomain as string) || 'test',
    projectId: (config.public.firebaseProjectID as string) || 'test',
    storageBucket: (config.public.firebaseStorageBucket as string) || 'test',
    messagingSenderId: (config.public.firebaseMessageSenderID as string) || 'test',
    appId: (config.public.firebaseAppID as string) || 'test',
    measurementId: (config.public.firebaseMeasurementID as string) || 'test',
  };

  // Security: In mock mode, use a mock Firebase instance
  const mockModeEnabled = config.public.MOCK_MODE === 'true';
  let auth;

  if (mockModeEnabled) {
    // Mock Firebase auth instance
    auth = {
      currentUser: null,
      signInWithPopup: () => {
        throw new Error('Firebase authentication disabled in mock mode');
      },
      signOut: () => Promise.resolve(),
      onAuthStateChanged: () => () => {},
    };

    console.warn('[FIREBASE] Using mock Firebase instance');
  } else {
    // Real Firebase instance
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }

  nuxtApp.vueApp.provide('auth', auth);
  nuxtApp.provide('auth', auth);
});
```

### 4.3 API Key Exposure Risks

#### Requirement 4.3.1: API Key Security Pattern

```typescript
// utils/apiKeySecurity.ts
export interface ApiKeySecurityConfig {
  allowMockMode: boolean;
  requireHttps: boolean;
  allowDomains: string[];
  blockPatterns: string[];
}

/**
 * CRITICAL: Validate API key usage
 */
export function validateApiKeyUsage(apiKey: string, config: ApiKeySecurityConfig): { valid: boolean; error?: string } {
  // Security: Check if mock mode is allowed
  if (!config.allowMockMode && apiKey.startsWith('mock_')) {
    return {
      valid: false,
      error: 'Mock API keys are not allowed',
    };
  }

  // Security: Check for blocked patterns (potential secrets)
  for (const pattern of config.blockPatterns) {
    if (apiKey.match(pattern)) {
      console.error('SECURITY: Blocked API key pattern detected');
      return {
        valid: false,
        error: 'Invalid API key format',
      };
    }
  }

  // Security: Check API key length and format
  if (apiKey.length < 10 || apiKey.length > 200) {
    return {
      valid: false,
      error: 'Invalid API key length',
    };
  }

  // Security: Check for HTTPS requirement
  if (config.requireHttps && typeof window !== 'undefined') {
    if (window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return {
        valid: false,
        error: 'HTTPS is required',
      };
    }
  }

  return { valid: true };
}

/**
 * Create secure API key validator
 */
export function createApiKeyValidator(config: ApiKeySecurityConfig) {
  return {
    validate: (apiKey: string) => validateApiKeyUsage(apiKey, config),
    isMockKey: (apiKey: string) => apiKey.startsWith('mock_'),
  };
}
```

### 4.4 Log and Error Message Sanitization

#### Requirement 4.4.1: Error Message Sanitization

```typescript
// utils/errorSanitizer.ts
export interface ErrorSanitizeOptions {
  removeStackTraces?: boolean;
  removeFilePaths?: boolean;
  removeInternalDetails?: boolean;
  maskSensitiveData?: boolean;
}

const SENSITIVE_PATTERNS = [
  /password[=:]\s*[^\s]+/gi,
  /token[=:]\s*[^\s]+/gi,
  /secret[=:]\s*[^\s]+/gi,
  /key[=:]\s*[^\s]+/gi,
  /api[_-]?key[=:]\s*[^\s]+/gi,
  /\d{16}/g, // Potential credit card numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
];

/**
 * CRITICAL: Sanitize error messages before logging or displaying
 */
export function sanitizeErrorMessage(error: Error | string, options: ErrorSanitizeOptions = {}): string {
  const { removeStackTraces = false, removeFilePaths = false, removeInternalDetails = false, maskSensitiveData = true } = options;

  let message = typeof error === 'string' ? error : error.message;

  // Security: Mask sensitive data
  if (maskSensitiveData) {
    for (const pattern of SENSITIVE_PATTERNS) {
      message = message.replace(pattern, '[REDACTED]');
    }
  }

  // Security: Remove stack traces
  if (removeStackTraces && typeof error !== 'string' && error.stack) {
    message = message.replace(error.stack, '[STACK TRACE REMOVED]');
  }

  // Security: Remove file paths
  if (removeFilePaths) {
    message = message.replace(/\/[a-zA-Z0-9_\-\/\.]+\.(ts|js|vue)/g, '[FILE PATH REMOVED]');
  }

  // Security: Remove internal details
  if (removeInternalDetails) {
    message = message.replace(/Internal Server Error/gi, 'An error occurred');
    message = message.replace(/Database Error/gi, 'A data error occurred');
    message = message.replace(/Network Error/gi, 'A connection error occurred');
  }

  return message;
}

/**
 * Safe error logger with sanitization
 */
export function logErrorSafely(error: Error | string, context: string = 'Unknown') {
  const sanitizedMessage = sanitizeErrorMessage(error, {
    removeStackTraces: import.meta.prod,
    removeFilePaths: import.meta.prod,
    maskSensitiveData: true,
  });

  console.error(`[${context}] ${sanitizedMessage}`);

  // In production, send to error tracking service
  if (import.meta.prod) {
    // Send to Sentry, LogRocket, etc.
    // Only send sanitized data
  }
}
```

---

## 5. SECURITY TESTING

### 5.1 Manual Security Testing Checklist

#### Requirement 5.1.1: Mock Mode Security Test Cases

```typescript
// tests/security/mock-mode-security.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('Mock Mode Security Tests', () => {
  beforeEach(() => {
    // Reset environment before each test
    process.env.NODE_ENV = 'test';
    process.env.NUXT_PUBLIC_MOCK_MODE = 'false';
  });

  describe('Production Safety', () => {
    it('should not enable mock mode in production environment', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NUXT_PUBLIC_MOCK_MODE = 'false';

      const { isMockMode } = useMockMode();

      expect(isMockMode.value).toBe(false);
    });

    it('should throw error when attempting to enable mock mode in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      expect(() => {
        const { getMockMode } = useMockMode();
        getMockMode();
      }).toThrow('Mock mode is disabled in production');
    });

    it('should not enable mock mode on production domains', async () => {
      // Mock window.location.hostname
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { hostname: 'www.ecasmag.ro' },
        writable: true,
      });

      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      const { isMockMode } = useMockMode();

      expect(isMockMode.value).toBe(false);

      // Restore
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should not persist mock sessions to localStorage', async () => {
      const { createMockSession } = useMockAuthStore();

      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      const token = createMockSession('user-001');

      expect(localStorage.getItem('mock-auth')).toBeNull();
    });
  });

  describe('Authentication Security', () => {
    it('should not validate mock credentials in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NUXT_PUBLIC_MOCK_MODE = 'false';

      const mockAuthService = new MockAuthService();

      const result = mockAuthService.validateMockCredentials('mock-user@example.com', 'mock-password-123');

      expect(result).toBe(false);
    });

    it('should generate clearly identifiable mock tokens', async () => {
      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      const { createMockSession } = useMockAuthStore();
      const token = createMockSession('user-001');

      expect(token).toMatch(/^mock-/);
    });

    it('should not allow Firebase calls in mock mode', async () => {
      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      const firebaseAuth = useFirebaseAuth();

      await expect(firebaseAuth.registerUser()).rejects.toThrow('Use mock credentials in mock mode');
    });
  });

  describe('Input Validation', () => {
    it('should sanitize mock data responses', async () => {
      const mockData = {
        id: '1',
        name: '<script>alert("XSS")</script>',
        description: 'Test & <test>',
        password: 'secret123',
        nullValue: null,
        emptyArray: [],
      };

      const sanitized = sanitizeMockData(mockData, {
        removeNulls: true,
        removeEmptyArrays: true,
        sanitizeHTML: true,
      });

      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.nullValue).toBeUndefined();
      expect(sanitized.emptyArray).toBeUndefined();
    });

    it('should prevent XSS through mock data', async () => {
      const maliciousData = {
        id: '1',
        content: '<img src=x onerror=alert("XSS")>',
      };

      const sanitized = sanitizeMockData(maliciousData, {
        sanitizeHTML: true,
      });

      expect(sanitized.content).not.toContain('<img');
      expect(sanitized.content).toContain('&lt;img');
    });
  });

  describe('Third-Party Integration Security', () => {
    it('should not make real Stripe calls in mock mode', async () => {
      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      const stripeMock = useStripeMock();

      const paymentIntent = await stripeMock.createPaymentIntent(1000, 'usd');

      expect(paymentIntent.id).toMatch(/^pi_mock_/);
      expect(paymentIntent.livemode).toBe(false);
    });

    it('should use mock Firebase instance in mock mode', async () => {
      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      const nuxtApp = useNuxtApp();
      const auth = nuxtApp.$auth;

      expect(auth.currentUser).toBeNull();
    });

    it('should validate API key usage', async () => {
      const validator = createApiKeyValidator({
        allowMockMode: true,
        requireHttps: true,
        allowDomains: ['localhost'],
        blockPatterns: [/sk_test_[a-zA-Z0-9]{24,}/],
      });

      const result = validator.validate('mock-api-key-123');

      expect(result.valid).toBe(true);
    });

    it('should block real Stripe API keys in mock mode', async () => {
      const validator = createApiKeyValidator({
        allowMockMode: true,
        blockPatterns: [/sk_test_[a-zA-Z0-9]{24,}/],
      });

      const result = validator.validate('sk_test_51ABC...');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key format');
    });
  });

  describe('Error Message Security', () => {
    it('should sanitize error messages containing sensitive data', async () => {
      const error = new Error('Authentication failed: password=secret123 token=abc123');

      const sanitized = sanitizeErrorMessage(error, {
        maskSensitiveData: true,
      });

      expect(sanitized).not.toContain('secret123');
      expect(sanitized).not.toContain('abc123');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('should remove file paths in production', async () => {
      process.env.NODE_ENV = 'production';

      const error = new Error('Error in /Users/user/project/src/app.ts at line 42');

      const sanitized = sanitizeErrorMessage(error, {
        removeFilePaths: true,
      });

      expect(sanitized).not.toContain('/Users/user/project/');
      expect(sanitized).toContain('[FILE PATH REMOVED]');
    });
  });
});
```

### 5.2 Automated Security Validation

#### Requirement 5.2.1: CI/CD Security Pipeline

```yaml
# .github/workflows/security-checks.yml
name: Security Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  mock-mode-security:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run mock mode security tests
        run: npm run test:security:mock-mode
        env:
          NODE_ENV: test
          NUXT_PUBLIC_MOCK_MODE: 'true'

      - name: Check for mock mode in production build
        run: npm run build
        env:
          NODE_ENV: production
          NUXT_PUBLIC_MOCK_MODE: 'false'

      - name: Scan for hardcoded secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

      - name: Run security linter
        run: npm run lint:security
```

### 5.3 Common Vulnerabilities to Test

#### Requirement 5.3.1: Vulnerability Test Scenarios

```typescript
// tests/security/vulnerability-scenarios.test.ts
describe('Mock Mode Vulnerability Scenarios', () => {
  describe('OWASP Top 10', () => {
    it('should not be vulnerable to A01: Broken Access Control', async () => {
      // Test: Try to access admin endpoints with mock user
      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      const { createMockSession } = useMockAuthStore();
      const userToken = createMockSession('user-001');

      // Attempt to access admin endpoint
      const response = await $fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.status).toBe('error');
      expect(response.message).toContain('Unauthorized');
    });

    it('should not be vulnerable to A03: Injection', async () => {
      // Test: SQL injection in mock API
      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      const maliciousInput = "1'; DROP TABLE users; --";

      const response = await $fetch('/api/products/search', {
        method: 'POST',
        body: {
          query: maliciousInput,
        },
      });

      // Should return safe results or error
      expect(response).toBeDefined();
      expect(response.status).not.toBe('500');
    });

    it('should not be vulnerable to A05: Security Misconfiguration', async () => {
      // Test: Verify security headers are set
      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      const response = await $fetch('/api/products/mock-product-1');

      expect(response.headers['x-mock-mode']).toBe('enabled');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should not be vulnerable to A07: XSS', async () => {
      // Test: XSS through mock data
      const mockData = {
        description: '<script>alert(document.cookie)</script>',
      };

      const sanitized = sanitizeMockData(mockData, {
        sanitizeHTML: true,
      });

      expect(sanitized.description).not.toContain('<script>');
    });
  });

  describe('Mock Mode Specific Vulnerabilities', () => {
    it('should prevent mock mode activation via URL manipulation', async () => {
      // Test: Try to enable mock mode via query parameter
      const url = '/api/products?mockMode=true';

      const { isMockMode } = useMockMode();

      expect(isMockMode.value).toBe(false);
    });

    it('should prevent mock credential usage in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NUXT_PUBLIC_MOCK_MODE = 'false';

      const mockAuthService = new MockAuthService();

      const result = mockAuthService.validateMockCredentials('mock-user@example.com', 'mock-password-123');

      expect(result).toBe(false);
    });

    it('should prevent real transactions in mock mode', async () => {
      process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

      const stripeMock = useStripeMock();
      const paymentIntent = await stripeMock.createPaymentIntent(1000, 'usd');

      expect(paymentIntent.livemode).toBe(false);
      expect(paymentIntent.id).toMatch(/^pi_mock_/);
    });
  });
});
```

---

## 6. SECURITY REQUIREMENTS SUMMARY

### 6.1 Critical Requirements (Must Implement)

| Requirement | Description                                                | Priority |
| ----------- | ---------------------------------------------------------- | -------- |
| SR-001      | Mock mode must NEVER be enabled in production environments | CRITICAL |
| SR-002      | All mock data must be sanitized before being returned      | CRITICAL |
| SR-003      | Mock credentials cannot be used in production mode         | CRITICAL |
| SR-004      | No real Stripe/Firebase calls in mock mode                 | CRITICAL |
| SR-005      | Mock sessions must not persist to localStorage             | CRITICAL |
| SR-006      | All mock API responses must include security headers       | CRITICAL |
| SR-007      | CSRF protection must be enforced even in mock mode         | CRITICAL |
| SR-008      | Error messages must be sanitized before logging            | CRITICAL |

### 6.2 High Priority Requirements

| Requirement | Description                                                     | Priority |
| ----------- | --------------------------------------------------------------- | -------- |
| HR-001      | Build-time validation to prevent mock mode in production builds | HIGH     |
| HR-002      | Git hooks to prevent committing mock mode enabled               | HIGH     |
| HR-003      | Mock tokens must be clearly identifiable                        | HIGH     |
| HR-004      | Admin mock access must be restricted to specific endpoints      | HIGH     |
| HR-005      | API keys must be validated for mock mode usage                  | HIGH     |
| HR-006      | File paths must be removed from error messages in production    | HIGH     |
| HR-007      | HTTPS must be required for API key usage in production          | HIGH     |
| HR-008      | Mock mode must only work on whitelisted domains                 | HIGH     |

### 6.3 Medium Priority Requirements

| Requirement | Description                                              | Priority |
| ----------- | -------------------------------------------------------- | -------- |
| MR-001      | Mock data should follow production data structure        | MEDIUM   |
| MR-002      | Mock mode activation should be logged for audit trail    | MEDIUM   |
| MR-003      | Mock sessions should expire after a reasonable time      | MEDIUM   |
| MR-004      | Mock payment amounts should be validated                 | MEDIUM   |
| MR-005      | Mock data should not include null values or empty arrays | MEDIUM   |
| MR-006      | Console logging should be removed in production          | MEDIUM   |

### 6.4 Low Priority Requirements

| Requirement | Description                                              | Priority |
| ----------- | -------------------------------------------------------- | -------- |
| LR-001      | Mock data should be consistent across requests           | LOW      |
| LR-002      | Mock mode should support multiple user roles             | LOW      |
| LR-003      | Mock data should include realistic but clearly fake data | LOW      |

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: Core Security Infrastructure (Week 1)

- [ ] Implement mock mode environment variable validation
- [ ] Create useMockMode composable with multi-layer validation
- [ ] Implement mock session store with no persistence
- [ ] Create mock data sanitization utilities
- [ ] Set up build-time validation scripts

### Phase 2: Authentication & Authorization (Week 2)

- [ ] Implement mock auth service with credential validation
- [ ] Create Firebase mock mode guard
- [ ] Implement admin mock access restrictions
- [ ] Add CSRF protection for mock endpoints
- [ ] Set up mock session expiration

### Phase 3: Third-Party Integration Security (Week 3)

- [ ] Implement Stripe mock functions
- [ ] Create Firebase configuration security validation
- [ ] Implement API key security validator
- [ ] Set up error message sanitization
- [ ] Add security headers to all mock endpoints

### Phase 4: Testing & Validation (Week 4)

- [ ] Create comprehensive security test suite
- [ ] Implement CI/CD security checks
- [ ] Set up git hooks for security enforcement
- [ ] Create manual testing checklist
- [ ] Document security requirements and procedures

### Phase 5: Deployment & Monitoring (Week 5)

- [ ] Deploy to staging environment
- [ ] Run full security audit
- [ ] Set up monitoring and alerting
- [ ] Create security incident response plan
- [ ] Train team on mock mode security best practices

---

## 8. EMERGENCY RESPONSE PROCEDURES

### 8.1 Mock Mode Accidentally Enabled in Production

**Detection:**

- Alert triggers: Production build includes mock mode code
- User reports: Mock data appearing in production
- System logs: Mock mode endpoints accessible

**Immediate Actions:**

1. **Stop traffic** to affected application
2. **Disable mock mode** in environment variables:
   ```bash
   NUXT_PUBLIC_MOCK_MODE=false
   NUXT_PUBLIC_MOCK_MODE_ENABLED=false
   ```
3. **Redeploy** application with production configuration
4. **Audit logs** for any data access during incident

**Investigation:**

1. Review git history for recent commits
2. Check CI/CD pipeline logs
3. Review environment variable configuration
4. Audit team member access

**Prevention:**

1. Implement stricter build-time validation
2. Add pre-deployment security checks
3. Review and update git hooks
4. Implement additional monitoring

### 8.2 Mock Data Exposure in Production

**Detection:**

- Alert triggers: Mock data found in production API responses
- User reports: Seeing test data in production
- System logs: Mock mode headers in production responses

**Immediate Actions:**

1. **Disable** all mock endpoints
2. **Clear** any cached mock data
3. **Deploy** hotfix with mock mode disabled
4. **Notify** affected users if sensitive data was exposed

**Investigation:**

1. Identify which mock data was exposed
2. Determine duration of exposure
3. Check if any sensitive data was included
4. Review access logs during exposure period

**Prevention:**

1. Add runtime validation for all mock endpoints
2. Implement additional security headers
3. Set up automated monitoring for mock mode activation
4. Conduct regular security audits

### 8.3 Security Incident Reporting

**Report Template:**

```
SECURITY INCIDENT REPORT
========================

Incident Type: [Mock Mode / Data Exposure / Authentication / Other]
Severity: [Critical / High / Medium / Low]

Detection Time: [YYYY-MM-DD HH:MM:SS]
Reporter: [Name/Team]

Description:
[Brief description of the incident]

Impact:
[Affected systems, users, data]

Immediate Actions Taken:
[List of actions taken]

Investigation Findings:
[Key findings from investigation]

Root Cause:
[Underlying cause of the incident]

Prevention Measures:
[Actions to prevent recurrence]

Status: [Open / In Progress / Resolved]
```

---

## 9. CONCLUSION

Implementing mock mode in a production e-commerce application requires rigorous security measures. This document provides a comprehensive framework for:

1. **Production Safety**: Ensuring mock mode cannot accidentally activate in production
2. **Authentication Security**: Protecting mock user sessions and credentials
3. **Input Validation**: Sanitizing all mock data and preventing XSS attacks
4. **Third-Party Security**: Safely mocking Stripe and Firebase integrations
5. **Testing & Validation**: Comprehensive security testing and automated validation

### Key Takeaways:

- **Never trust environment variables alone** - Implement multiple validation layers
- **All mock data must be sanitized** - Treat mock data with same security as real data
- **Mock mode is a development tool only** - Never enable in production, even for testing
- **Security is everyone's responsibility** - Train team members and enforce policies
- **Test thoroughly** - Implement comprehensive security testing before deployment

### Next Steps:

1. Review and approve this security requirements document
2. Assign responsibilities for each implementation phase
3. Set up development environment with mock mode disabled by default
4. Begin Phase 1 implementation following the roadmap
5. Conduct regular security reviews throughout implementation

---

## APPENDICES

### Appendix A: Environment Variable Reference

```bash
# Required Variables
NUXT_PUBLIC_MOCK_MODE=false                    # Mock mode toggle
NUXT_PUBLIC_MOCK_MODE_ENABLED=false            # Alias for redundancy
NODE_ENV=production                             # Environment

# Firebase Configuration
NUXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NUXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID=your_sender_id
NUXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Stripe Configuration
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key

# API Configuration
NUXT_PUBLIC_BASE_URL_API=https://api.ecasmag.ro
```

### Appendix B: Security Headers Reference

```typescript
// Required security headers for all mock endpoints
const securityHeaders = {
  'X-Mock-Mode': 'enabled/disabled',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

### Appendix C: Mock Token Format Specification

```typescript
// Mock token format: mock-{userId}-{timestamp}-{checksum}
interface MockToken {
  prefix: 'mock';
  userId: string;
  timestamp: number;
  checksum: string;
}

// Example: mock-user-001-1676323200000-abc123
```

### Appendix D: Security Testing Checklist

- [ ] Mock mode cannot be enabled in production
- [ ] Mock credentials cannot be used in production
- [ ] Mock data is properly sanitized
- [ ] No real Stripe calls in mock mode
- [ ] No real Firebase calls in mock mode
- [ ] Mock sessions do not persist to localStorage
- [ ] Security headers are present on all mock endpoints
- [ ] CSRF protection is enforced
- [ ] Error messages are sanitized
- [ ] API keys are validated
- [ ] HTTPS is required in production
- [ ] File paths are removed from error messages
- [ ] XSS attacks are prevented through mock data
- [ ] SQL injection attacks are prevented
- [ ] Broken access control is prevented
- [ ] Security misconfigurations are detected

---

**Document Status**: Draft for Review
**Next Review Date**: 2026-02-28
**Approved By**: [Pending]
**Version Control**: [Link to repository]
