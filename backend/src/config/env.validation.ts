import { logger } from '../utils/logger';

/**
 * Validates that critical environment variables are set before the server starts.
 * Fails fast with a clear error message rather than silently using empty strings.
 */
export function validateEnvironment(): void {
    const required: { key: string; description: string }[] = [
        { key: 'FIREBASE_DATABASE_URL', description: 'Firebase Realtime DB URL' },
        { key: 'GOOGLE_MAPS_API_KEY', description: 'Google Maps API key for geocoding and directions' },
    ];

    // At least one payment provider must be configured
    const paymentProviders = [
        { key: 'STRIPE_SECRET_KEY', name: 'Stripe' },
        { key: 'PAYSTACK_SECRET_KEY', name: 'Paystack' },
    ];

    const missing: string[] = [];

    for (const { key, description } of required) {
        if (!process.env[key]) {
            missing.push(`  - ${key}: ${description}`);
        }
    }

    const hasPaymentProvider = paymentProviders.some(p => !!process.env[p.key]);
    if (!hasPaymentProvider) {
        missing.push(`  - At least one payment provider key (${paymentProviders.map(p => p.key).join(' or ')})`);
    }

    // Warn about optional but important vars
    const warnings: string[] = [];
    const optional = [
        { key: 'CORS_ORIGINS', description: 'CORS allowed origins (defaults to localhost)' },
        { key: 'CRON_SECRET', description: 'Secret for cron route authentication' },
        { key: 'OPENWEATHER_API_KEY', description: 'Weather API for surge pricing' },
        { key: 'SENDGRID_API_KEY', description: 'Email delivery via SendGrid' },
    ];

    for (const { key, description } of optional) {
        if (!process.env[key]) {
            warnings.push(`  - ${key}: ${description}`);
        }
    }

    if (warnings.length > 0) {
        logger.warn(`Missing optional environment variables:\n${warnings.join('\n')}`);
    }

    if (missing.length > 0) {
        logger.fatal(`Missing required environment variables:\n${missing.join('\n')}\n\nSee .env.example for setup instructions.`);
        process.exit(1);
    }

    // Verify NODE_ENV is explicitly set in production
    if (!process.env.NODE_ENV) {
        logger.warn('NODE_ENV is not set — defaulting behaviors may be insecure. Set NODE_ENV=production for production deployments.');
    }

    logger.info({ nodeEnv: process.env.NODE_ENV || 'undefined' }, 'Environment validation passed');
}
