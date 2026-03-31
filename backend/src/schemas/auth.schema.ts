import { z } from 'zod';

export const signupStartSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        fullName: z.string().min(2, 'Full name is required'),
        phoneNumber: z.string().min(7, 'Valid phone number required'),
        role: z.enum(['rider', 'driver']).optional(),
        region: z.string().trim().min(2).max(32).optional(),
    })
});

export const signupVerifySchema = z.object({
    body: z.object({
        email: z.string().email(),
        otp: z.string().length(6, 'OTP must be 6 digits'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
    })
});

export const loginSchema = z.object({
    body: z.object({}).passthrough() // Login is authenticated via Firebase token, body is flexible
});

export const phoneVerificationSchema = z.object({
    body: z.object({
        phoneNumber: z.string().min(7, 'Valid phone number required'),
    })
});

export const phoneVerifyOtpSchema = z.object({
    body: z.object({
        phoneNumber: z.string().min(7),
        code: z.string().length(6, 'Code must be 6 digits'),
    })
});

export const emailVerificationSchema = z.object({
    body: z.object({
        email: z.string().email(),
        code: z.string().length(6, 'Code must be 6 digits').optional(),
    })
});

export const passwordResetSchema = z.object({
    body: z.object({
        email: z.string().email(),
    })
});

export const phoneSignupSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        fullName: z.string().min(2, 'Full name is required'),
        phoneNumber: z.string().min(7, 'Valid phone number required'),
        role: z.enum(['rider', 'driver']).optional(),
        region: z.string().trim().min(2).max(32).optional(),
    })
});

export const googleSignInSchema = z.object({
    body: z.object({
        idToken: z.string().min(1, 'OAuth ID token is required'),
        role: z.enum(['rider', 'driver']).optional(),
    })
});
