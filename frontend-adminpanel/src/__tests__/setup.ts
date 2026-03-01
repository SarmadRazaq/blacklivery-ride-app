import '@testing-library/jest-dom/vitest';

// ─── Mock import.meta.env ────────────────────────────────────────────────────
// Vitest provides import.meta.env automatically; seed required values here
// so that env.ts validation and firebase/config don't throw during tests.
Object.assign(import.meta.env, {
    VITE_API_URL: 'http://localhost:3000/api',
    VITE_SOCKET_URL: 'http://localhost:3000',
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_DATABASE_URL: 'https://test.firebaseio.com',
    VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    VITE_FIREBASE_APP_ID: '1:123:web:abc',
    VITE_GOOGLE_MAPS_API_KEY: 'test-maps-key',
    VITE_APP_NAME: 'TestApp',
});

// ─── Mock Firebase ───────────────────────────────────────────────────────────
vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({
        currentUser: null,
        onAuthStateChanged: vi.fn(),
    })),
    onAuthStateChanged: vi.fn((_auth, callback) => {
        // By default, no user — tests can override
        callback(null);
        return vi.fn(); // unsubscribe
    }),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
}));

// ─── Mock react-toastify ────────────────────────────────────────────────────
vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
    ToastContainer: () => null,
}));

// ─── Mock window.matchMedia ──────────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
