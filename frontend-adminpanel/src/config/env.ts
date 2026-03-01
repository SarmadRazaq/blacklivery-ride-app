// ─── Environment Validation ──────────────────────────────────────────────────
// Fails fast at build time / app startup if critical env vars are missing.
// Import this module in main.tsx to ensure validation runs early.

const requiredVars = [
    'VITE_API_URL',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
] as const;

const warnings: string[] = [];
const errors: string[] = [];

for (const key of requiredVars) {
    if (!import.meta.env[key]) {
        errors.push(`Missing required env var: ${key}`);
    }
}

// Optional but recommended
const optionalVars = [
    'VITE_SOCKET_URL',
    'VITE_GOOGLE_MAPS_API_KEY',
    'VITE_APP_NAME',
] as const;

for (const key of optionalVars) {
    if (!import.meta.env[key]) {
        warnings.push(`Missing optional env var: ${key} — feature may be degraded`);
    }
}

if (warnings.length > 0) {
    console.warn('[env] Warnings:\n' + warnings.join('\n'));
}

if (errors.length > 0 && import.meta.env.PROD) {
    // In production, throw hard to prevent a broken deployment
    throw new Error('[env] Missing required environment variables:\n' + errors.join('\n'));
}

if (errors.length > 0) {
    console.error('[env] Missing required environment variables:\n' + errors.join('\n'));
}

// ─── Typed Env Access ────────────────────────────────────────────────────────
export const ENV = {
    API_URL: import.meta.env.VITE_API_URL as string,
    SOCKET_URL: (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '')) as string,
    GOOGLE_MAPS_API_KEY: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '') as string,
} as const;
