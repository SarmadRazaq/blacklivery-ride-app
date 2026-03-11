import { Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import * as admin from 'firebase-admin';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db, auth } from '../config/firebase';
import { IUser } from '../models/User';
import { RegionCode, CurrencyCode } from '../config/region.config';
import { logger } from '../utils/logger';
import { smsService } from '../services/SmsService';
import { emailService } from '../services/EmailService';

const PHONE_VERIFICATION_TTL_MS = 5 * 60 * 1000;
const PHONE_VERIFICATION_RESEND_MS = 60 * 1000;
const REGION_CHANGE_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const REGION_MAP: Record<string, { country: string; currency: CurrencyCode; code: RegionCode }> = {
    NG: { country: 'Nigeria', currency: 'NGN', code: 'NG' },
    US: { country: 'United States', currency: 'USD', code: 'US-CHI' }
};

/** Parse a human-readable device name from user-agent string */
function parseDeviceName(userAgent: string): string {
    if (!userAgent || userAgent === 'unknown') return 'Unknown Device';
    // Android device model
    const androidMatch = userAgent.match(/Android[^;]*;\s*([^)]+)\)/);
    if (androidMatch) return androidMatch[1].trim();
    // iOS device
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    // Desktop browsers
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    // Flutter/Dart client
    if (userAgent.includes('Dart') || userAgent.includes('Flutter')) return 'Mobile App';
    return 'Unknown Device';
}

/** Parse device type (mobile/tablet/desktop) from user-agent string */
function parseDeviceType(userAgent: string): string {
    if (!userAgent || userAgent === 'unknown') return 'unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet';
    if (ua.includes('android') || ua.includes('iphone') || ua.includes('mobile') || ua.includes('dart') || ua.includes('flutter')) return 'mobile';
    if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) return 'desktop';
    return 'unknown';
}

/** Format a date as a human-readable time-ago string */
function formatTimeAgo(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
}

const normalizePhone = (phone?: string) => phone?.replace(/\D/g, '') ?? '';

const normalizeRegionInput = (value?: string): string =>
    (value ?? '').trim().toUpperCase().replace(/[_\s-]+/g, '');

const NIGERIA_REGION_ALIASES = new Set([
    'NG',
    'NIGERIA',
    'NGA',
    'NIG',
    'LAGOS',
]);

const US_REGION_ALIASES = new Set([
    'US',
    'USA',
    'UNITEDSTATES',
    'UNITEDSTATESOFAMERICA',
    'USCHI',
    'CHICAGO',
]);

const detectRegion = (explicit?: string, phone?: string) => {
    const normalized = normalizeRegionInput(explicit);

    if (NIGERIA_REGION_ALIASES.has(normalized)) return REGION_MAP.NG;
    if (US_REGION_ALIASES.has(normalized)) return REGION_MAP.US;

    // Prefix support for future variants like NG-LAG / US-NYC
    if (normalized.startsWith('NG')) return REGION_MAP.NG;
    if (normalized.startsWith('US')) return REGION_MAP.US;

    if (phone?.startsWith('+234') || normalizePhone(phone).startsWith('234')) return REGION_MAP.NG;
    if (phone?.startsWith('+1') || normalizePhone(phone).startsWith('1')) return REGION_MAP.US;

    return REGION_MAP.NG; // default market
};

const ensureUniqueUser = async (email?: string, phoneNumber?: string) => {
    if (email) {
        const emailSnapshot = await db
            .collection('users')
            .where('emailLowercase', '==', email.toLowerCase())
            .limit(1)
            .get();
        if (!emailSnapshot.empty) {
            throw new Error('Email already registered');
        }
    }

    if (phoneNumber) {
        const phoneSnapshot = await db.collection('users').where('phoneNumberNormalized', '==', phoneNumber).limit(1).get();
        if (!phoneSnapshot.empty) {
            throw new Error('Phone number already registered');
        }
    }
};

export const startPhoneVerification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }

        const normalized = normalizePhone(phoneNumber);

        // Rate limit: prevent rapid re-sends (minimum 60 seconds between requests)
        const existingDoc = await db.collection('phone_verifications').doc(normalized).get();
        if (existingDoc.exists) {
            const lastSentAt = existingDoc.data()?.lastSentAt;
            if (lastSentAt) {
                const lastSentTime = lastSentAt?.toDate?.() ?? new Date(lastSentAt);
                const elapsed = Date.now() - lastSentTime.getTime();
                if (elapsed < PHONE_VERIFICATION_RESEND_MS) {
                    res.status(429).json({ error: 'Please wait before requesting a new code' });
                    return;
                }
            }
        }

        const verification = await smsService.startVerification(phoneNumber);
        if (!verification.success) {
            const errorText = (verification.error || '').toLowerCase();
            const isClientInputError =
                errorText.includes('invalid parameter') ||
                errorText.includes('invalid phone') ||
                errorText.includes('not a valid') ||
                errorText.includes('unsupported') ||
                errorText.includes('landline');

            res.status(isClientInputError ? 400 : 500).json({
                error: verification.error || 'Unable to send verification code'
            });
            return;
        }

        await db.collection('phone_verifications').doc(normalized).set(
            {
                verified: false,
                attempts: 0,
                expiresAt: new Date(Date.now() + PHONE_VERIFICATION_TTL_MS),
                lastSentAt: new Date(),
                provider: verification.provider,
                sid: verification.messageId || null
            },
            { merge: true }
        );

        logger.info({ phoneNumber: normalized }, 'Phone verification started with Twilio Verify');
        res.status(200).json({
            message: 'Verification code sent'
        });
    } catch (error) {
        logger.error({ err: error }, 'startPhoneVerification failed');
        res.status(500).json({ error: 'Unable to start phone verification' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        // User is already authenticated via verifyToken middleware
        const { uid } = (req as any).user;

        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            res.status(404).json({ error: 'User profile not found' });
            return;
        }

        const userData = userDoc.data();
        const normalizedEmail = userData?.email || '';

        logger.info({ uid, email: normalizedEmail }, 'User login');

        // Parse device info from headers and user-agent
        const userAgent = (req.headers['user-agent'] as string) || 'unknown';
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
        const deviceName = (req.headers['x-device-name'] as string) || parseDeviceName(userAgent);
        const deviceType = (req.headers['x-device-type'] as string) || parseDeviceType(userAgent);

        // Record login history
        const loginEntry = {
            loginAt: new Date(),
            timestamp: new Date().toISOString(),
            ipAddress,
            userAgent,
            deviceName,
            deviceType,
            location: ipAddress !== 'unknown' ? `IP: ${ipAddress}` : 'Unknown location',
            status: 'success',
        };
        try {
            await db.collection('users').doc(uid)
                .collection('loginHistory').add(loginEntry);
        } catch (histErr) {
            logger.warn({ err: histErr }, 'Failed to record login history');
        }

        // Record/upsert active session
        const sessionData = {
            createdAt: new Date(),
            lastActiveAt: new Date(),
            ipAddress,
            userAgent,
            deviceName,
            deviceType,
            location: loginEntry.location,
        };
        try {
            await db.collection('users').doc(uid)
                .collection('sessions').add(sessionData);
        } catch (sessErr) {
            logger.warn({ err: sessErr }, 'Failed to record session');
        }

        res.status(200).json({
            message: 'Login successful',
            data: {
                uid,
                email: userData?.email,
                displayName: userData?.displayName,
                role: userData?.role,
                phoneNumber: userData?.phoneNumber,
                region: userData?.region,
                currency: userData?.currency,
                twoFactorEnabled: userData?.twoFactorEnabled || false
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'Login failed');
        res.status(500).json({ error: 'Login failed' });
    }
};

export const signupStart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, fullName, phoneNumber, role, region: explicitRegion } = req.body;

        // Validate required fields
        if (!email || !password || !fullName || !phoneNumber) {
            res.status(400).json({ error: 'Email, password, full name, and phone number are required' });
            return;
        }

        if (password.length < 8) {
            res.status(400).json({ error: 'Password must be at least 8 characters' });
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedPhone = normalizePhone(phoneNumber);

        // Check if email or phone already exists in users collection
        // If user exists but hasn't verified phone, allow re-registration
        try {
            await ensureUniqueUser(normalizedEmail, normalizedPhone);
        } catch (uniqueError: any) {
            if (uniqueError.message?.includes('already registered')) {
                // Clean up ALL incomplete user docs that match email OR phone
                const snapsToClean: FirebaseFirestore.QuerySnapshot[] = [];

                const emailSnap = await db.collection('users')
                    .where('emailLowercase', '==', normalizedEmail)
                    .limit(1)
                    .get();
                if (!emailSnap.empty) snapsToClean.push(emailSnap);

                const phoneSnap = await db.collection('users')
                    .where('phoneNumberNormalized', '==', normalizedPhone)
                    .limit(1)
                    .get();
                if (!phoneSnap.empty) snapsToClean.push(phoneSnap);

                const cleanedUids = new Set<string>();
                let hasFullyVerifiedUser = false;

                for (const snap of snapsToClean) {
                    const doc = snap.docs[0];
                    if (!doc || cleanedUids.has(doc.id)) continue;
                    const userData = doc.data();

                    if (userData.phoneVerified) {
                        // Fully verified user — cannot overwrite
                        hasFullyVerifiedUser = true;
                        break;
                    }

                    // Incomplete registration — clean up
                    cleanedUids.add(doc.id);
                    await db.collection('users').doc(doc.id).delete();
                    try {
                        await auth.deleteUser(doc.id);
                    } catch (deleteErr: any) {
                        if (deleteErr.code !== 'auth/user-not-found') {
                            logger.warn({ err: deleteErr }, 'Failed to delete incomplete Firebase Auth user');
                        }
                    }
                    logger.info({ uid: doc.id, email: normalizedEmail }, 'Cleaned up incomplete registration');
                }

                if (hasFullyVerifiedUser) {
                    throw uniqueError;
                }
            } else {
                throw uniqueError;
            }
        }

        // Generate cryptographically secure OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Store pending signup with OTP
        await db
            .collection('pending_signups')
            .doc(normalizedEmail)
            .set({
                email: normalizedEmail,
                fullName,
                phoneNumber,
                phoneNumberNormalized: normalizedPhone,
                role: role || 'rider',
                region: explicitRegion || undefined,
                otp,
                attempts: 0,
                expiresAt: new Date(Date.now() + PHONE_VERIFICATION_TTL_MS),
                createdAt: new Date(),
                updatedAt: new Date(),
            });

        logger.info({ email: normalizedEmail }, 'Signup OTP generated');

        const emailResult = await emailService.send({
            to: normalizedEmail,
            subject: 'Your BlackLivery verification code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #000;">Verify your email</h2>
                    <p>Hi ${fullName},</p>
                    <p>Your BlackLivery verification code is:</p>
                    <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">${otp}</div>
                    <p>This code is valid for 5 minutes. Do not share it with anyone.</p>
                    <p style="color: #999; font-size: 11px;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
            text: `Your BlackLivery verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`
        });
        if (!emailResult.success) {
            logger.warn({ email: normalizedEmail, error: emailResult.error }, 'Signup OTP email send failed');
            res.status(503).json({
                error: 'Unable to send verification code. Please try again.',
                ...(process.env.NODE_ENV !== 'production' && emailResult.error ? { details: emailResult.error } : {})
            });
            return;
        }

        res.status(200).json({
            message: 'Verification code sent to email',
            ...(process.env.NODE_ENV !== 'production' && { otp })
        });
    } catch (error: any) {
        logger.error({ err: error }, 'signupStart failed');
        if (error.message?.includes('already registered')) {
            res.status(409).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Unable to start signup' });
        }
    }
};

export const signupResend = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const pendingDoc = await db.collection('pending_signups').doc(normalizedEmail).get();

        if (!pendingDoc.exists) {
            // No pending signup — tell the client to re-register
            res.status(410).json({ error: 'Signup expired. Please register again.', code: 'SIGNUP_EXPIRED' });
            return;
        }

        const pendingData = pendingDoc.data()!;
        const otp = crypto.randomInt(100000, 999999).toString();

        await pendingDoc.ref.set(
            {
                otp,
                attempts: 0,
                expiresAt: new Date(Date.now() + PHONE_VERIFICATION_TTL_MS),
                updatedAt: new Date(),
                lastSentAt: new Date(),
            },
            { merge: true }
        );

        const emailResult = await emailService.send({
            to: normalizedEmail,
            subject: 'Your BlackLivery verification code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #000;">Verify your email</h2>
                    <p>Hi ${pendingData.fullName || 'there'},</p>
                    <p>Your BlackLivery verification code is:</p>
                    <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">${otp}</div>
                    <p>This code is valid for 5 minutes. Do not share it with anyone.</p>
                    <p style="color: #999; font-size: 11px;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
            text: `Your BlackLivery verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`
        });

        if (!emailResult.success) {
            logger.warn({ email: normalizedEmail, error: emailResult.error }, 'Signup OTP resend email failed');
            res.status(503).json({
                error: 'Unable to send verification code. Please try again.',
                ...(process.env.NODE_ENV !== 'production' && emailResult.error ? { details: emailResult.error } : {})
            });
            return;
        }

        res.status(200).json({
            message: 'Verification code resent to email',
            ...(process.env.NODE_ENV !== 'production' && { otp })
        });
    } catch (error) {
        logger.error({ err: error }, 'signupResend failed');
        res.status(500).json({ error: 'Unable to resend signup verification code' });
    }
};

export const signupVerify = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp, password } = req.body;

        if (!email || !otp || !password) {
            res.status(400).json({ error: 'Email, OTP, and password are required' });
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const pendingDoc = await db.collection('pending_signups').doc(normalizedEmail).get();
        if (!pendingDoc.exists) {
            res.status(410).json({ error: 'Signup expired. Please register again.', code: 'SIGNUP_EXPIRED' });
            return;
        }

        const pendingData = pendingDoc.data()!;

        const expiresAt = pendingData.expiresAt?.toDate?.() ?? new Date(pendingData.expiresAt);

        if (expiresAt <= new Date()) {
            await pendingDoc.ref.delete();
            res.status(410).json({ error: 'Verification code expired. Please register again.', code: 'SIGNUP_EXPIRED' });
            return;
        }

        if ((pendingData.attempts || 0) >= 5) {
            await pendingDoc.ref.delete();
            res.status(429).json({ error: 'Too many attempts. Please start signup again.' });
            return;
        }

        if (pendingData.otp !== otp) {
            await pendingDoc.ref.update({ attempts: FieldValue.increment(1) });
            res.status(400).json({ error: 'Invalid verification code' });
            return;
        }

        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(pendingData.email);
            await auth.updateUser(userRecord.uid, { password });
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                const phoneFormatted = pendingData.phoneNumber.startsWith('+')
                    ? pendingData.phoneNumber
                    : `+${pendingData.phoneNumberNormalized}`;

                try {
                    userRecord = await auth.createUser({
                        email: pendingData.email,
                        password,
                        displayName: pendingData.fullName,
                        phoneNumber: phoneFormatted
                    });
                } catch (createError: any) {
                    if (createError.code === 'auth/phone-number-already-exists') {
                        userRecord = await auth.createUser({
                            email: pendingData.email,
                            password,
                            displayName: pendingData.fullName
                        });
                    } else {
                        throw createError;
                    }
                }
            } else {
                throw e;
            }
        }

        // Detect region — prefer explicit region from signup, fall back to phone prefix
        const region = detectRegion(pendingData.region, pendingData.phoneNumber);
        const now = new Date();

        // Check if Firestore user doc already exists
        const existingUserDoc = await db.collection('users').doc(userRecord.uid).get();

        if (existingUserDoc.exists) {
            // User already has Firestore doc - just return success
            await pendingDoc.ref.delete();
            const customToken = await auth.createCustomToken(userRecord.uid);

            res.status(200).json({
                message: 'Account already exists, logged in successfully',
                data: existingUserDoc.data(),
                token: customToken
            });
            return;
        }

        // Create Firestore user document
        const newUser = {
            uid: userRecord.uid,
            email: pendingData.email,
            displayName: pendingData.fullName,
            phoneNumber: pendingData.phoneNumber,
            photoURL: '',
            role: pendingData.role || 'rider',
            createdAt: now,
            updatedAt: now,
            isActive: true,
            region: region.code,
            currency: region.currency,
            countryCode: region.code === 'NG' ? 'NG' : 'US',
            emailLowercase: pendingData.email,
            phoneNumberNormalized: pendingData.phoneNumberNormalized,
            phoneVerified: false,
            emailVerified: true,
            ...(pendingData.role === 'driver' && {
                driverDetails: {
                    isOnline: false,
                    rating: 5.0,
                    totalTrips: 0,
                    earnings: 0
                },
                driverOnboarding: {
                    status: 'pending_documents',
                    submittedAt: null,
                    approvedAt: null
                }
            })
        };

        await db.collection('users').doc(userRecord.uid).set(newUser);

        // Delete pending signup
        await pendingDoc.ref.delete();

        logger.info({ uid: userRecord.uid, email: pendingData.email }, 'User signup completed');

        // Try to generate custom token for auto-login (optional - may fail if IAM API not enabled)
        let customToken: string | null = null;
        try {
            customToken = await auth.createCustomToken(userRecord.uid);
        } catch (tokenError) {
            logger.warn({ err: tokenError }, 'Could not generate custom token - IAM API may need to be enabled');
        }

        res.status(201).json({
            message: 'Account created successfully',
            data: {
                uid: userRecord.uid,
                email: newUser.email,
                displayName: newUser.displayName,
                role: newUser.role
            },
            ...(customToken && { token: customToken })
        });
    } catch (error: any) {
        logger.error({ err: error }, 'signupVerify failed');
        if (error.code === 'auth/email-already-exists') {
            res.status(409).json({ error: 'Email already registered' });
        } else if (error.code === 'auth/phone-number-already-exists') {
            res.status(409).json({ error: 'Phone number already registered' });
        } else {
            res.status(500).json({ error: 'Unable to complete signup' });
        }
    }
};

export const startEmailVerification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const otp = crypto.randomInt(100000, 999999).toString();

        await db.collection('email_verifications').doc(normalizedEmail).set(
            {
                code: otp,
                attempts: 0,
                verified: false,
                expiresAt: new Date(Date.now() + PHONE_VERIFICATION_TTL_MS),
                lastSentAt: new Date(),
                provider: 'email_otp'
            },
            { merge: true }
        );

        const emailResult = await emailService.send({
            to: normalizedEmail,
            subject: 'Your BlackLivery email verification code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #000;">Email Verification</h2>
                    <p>Your verification code is:</p>
                    <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">${otp}</div>
                    <p>This code is valid for 5 minutes.</p>
                </div>
            `,
            text: `Your BlackLivery email verification code is: ${otp}. Valid for 5 minutes.`
        });
        if (!emailResult.success) {
            logger.warn({ email: normalizedEmail, error: emailResult.error }, 'Email verification OTP send failed');
            res.status(503).json({
                error: 'Unable to send verification code. Please try again.',
                ...(process.env.NODE_ENV !== 'production' && emailResult.error ? { details: emailResult.error } : {})
            });
            return;
        }

        res.status(200).json({
            message: 'Verification code sent to email',
            ...(process.env.NODE_ENV !== 'production' && { otp })
        });
    } catch (error) {
        logger.error({ err: error }, 'startEmailVerification failed');
        res.status(500).json({ error: 'Unable to start email verification' });
    }
};

export const verifyEmailVerification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            res.status(400).json({ error: 'Email and code are required' });
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const doc = await db.collection('email_verifications').doc(normalizedEmail).get();

        if (!doc.exists) {
            res.status(400).json({ error: 'No verification request found' });
            return;
        }

        const data = doc.data()!;

        if ((data.attempts || 0) >= 5) {
            res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
            return;
        }

        const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
        if (expiresAt <= new Date()) {
            res.status(400).json({ error: 'Verification code expired' });
            return;
        }

        if (data.code !== code) {
            await doc.ref.update({ attempts: FieldValue.increment(1) });
            res.status(400).json({ error: 'Invalid verification code' });
            return;
        }

        await db.collection('email_verifications').doc(normalizedEmail).set(
            {
                verified: true,
                verifiedAt: new Date(),
                provider: 'email_otp'
            },
            { merge: true }
        );

        res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        logger.error({ err: error }, 'verifyEmailVerification failed');
        res.status(500).json({ error: 'Unable to verify email' });
    }
};

export const verifyPhoneVerification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) {
            res.status(400).json({ error: 'Phone number and code are required' });
            return;
        }

        const normalized = normalizePhone(phoneNumber);
        const verification = await smsService.checkVerification(phoneNumber, String(code));
        if (!verification.success) {
            await db.collection('phone_verifications').doc(normalized).set(
                {
                    attempts: FieldValue.increment(1),
                    lastAttemptAt: new Date(),
                    verified: false
                },
                { merge: true }
            );

            res.status(400).json({ error: verification.error || 'Invalid verification code' });
            return;
        }

        await db.collection('phone_verifications').doc(normalized).set(
            {
                verified: true,
                verifiedAt: new Date(),
                provider: verification.provider,
                sid: verification.messageId || null
            },
            { merge: true }
        );

        // If this phone belongs to an existing user, return a Firebase custom token
        // so mobile clients can complete sign-in after Twilio verification.
        const userSnapshot = await db
            .collection('users')
            .where('phoneNumberNormalized', '==', normalized)
            .limit(1)
            .get();

        let customToken: string | null = null;
        let userData: Record<string, any> | null = null;

        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            const existingUser = userDoc.data();
            userData = {
                uid: existingUser.uid,
                email: existingUser.email,
                displayName: existingUser.displayName,
                role: existingUser.role,
                phoneNumber: existingUser.phoneNumber,
                region: existingUser.region,
                currency: existingUser.currency,
                twoFactorEnabled: existingUser.twoFactorEnabled || false,
            };

            try {
                customToken = await auth.createCustomToken(existingUser.uid);
            } catch (tokenError) {
                logger.warn({ err: tokenError }, 'Could not generate custom token for phone verification');
            }
        }

        res.status(200).json({
            message: 'Phone number verified',
            verified: true,
            ...(customToken && { token: customToken }),
            ...(userData && { data: userData })
        });
    } catch (error) {
        logger.error({ err: error }, 'verifyPhoneVerification failed');
        res.status(500).json({ error: 'Unable to verify phone number' });
    }
};

/**
 * Register a new user using a phone number that was already verified via OTP.
 * Checks phone_verifications collection for verified status.
 * Creates Firebase Auth user + Firestore user doc, returns custom token.
 */
export const registerWithVerifiedPhone = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, fullName, phoneNumber, role, region: explicitRegion } = req.body;

        if (!email || !password || !fullName || !phoneNumber) {
            res.status(400).json({ error: 'Email, password, full name, and phone number are required' });
            return;
        }

        if (password.length < 8) {
            res.status(400).json({ error: 'Password must be at least 8 characters' });
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedPhone = normalizePhone(phoneNumber);

        // Verify that this phone was actually verified via OTP
        const phoneVerifDoc = await db.collection('phone_verifications').doc(normalizedPhone).get();
        if (!phoneVerifDoc.exists || !phoneVerifDoc.data()?.verified) {
            res.status(400).json({ error: 'Phone number has not been verified. Please verify your phone first.' });
            return;
        }

        // Check verification is not too old (30 min window)
        const verifiedAt = phoneVerifDoc.data()?.verifiedAt;
        if (verifiedAt) {
            const verifiedTime = verifiedAt?.toDate?.() ?? new Date(verifiedAt);
            const elapsed = Date.now() - verifiedTime.getTime();
            if (elapsed > 30 * 60 * 1000) {
                res.status(400).json({ error: 'Phone verification expired. Please verify your phone again.' });
                return;
            }
        }

        // Check if email or phone already exists
        await ensureUniqueUser(normalizedEmail, normalizedPhone);

        // Create Firebase Auth user
        let userRecord;
        const phoneFormatted = phoneNumber.startsWith('+')
            ? phoneNumber
            : `+${normalizedPhone}`;

        try {
            userRecord = await auth.createUser({
                email: normalizedEmail,
                password,
                displayName: fullName,
                phoneNumber: phoneFormatted,
            });
        } catch (createError: any) {
            if (createError.code === 'auth/phone-number-already-exists') {
                // Phone linked to a Firebase Auth account but no Firestore doc — create without phone
                userRecord = await auth.createUser({
                    email: normalizedEmail,
                    password,
                    displayName: fullName,
                });
            } else if (createError.code === 'auth/email-already-exists') {
                res.status(409).json({ error: 'Email already registered' });
                return;
            } else {
                throw createError;
            }
        }

        // Detect region
        const region = detectRegion(explicitRegion, phoneNumber);
        const now = new Date();

        // Create Firestore user document
        const newUser = {
            uid: userRecord.uid,
            email: normalizedEmail,
            displayName: fullName,
            phoneNumber: phoneNumber,
            photoURL: '',
            role: role || 'rider',
            createdAt: now,
            updatedAt: now,
            isActive: true,
            region: region.code,
            currency: region.currency,
            countryCode: region.code === 'NG' ? 'NG' : 'US',
            emailLowercase: normalizedEmail,
            phoneNumberNormalized: normalizedPhone,
            phoneVerified: true,
            emailVerified: false,
            ...(role === 'driver' && {
                driverDetails: {
                    isOnline: false,
                    rating: 5.0,
                    totalTrips: 0,
                    earnings: 0
                },
                driverOnboarding: {
                    status: 'pending_documents',
                    submittedAt: null,
                    approvedAt: null
                }
            })
        };

        await db.collection('users').doc(userRecord.uid).set(newUser);

        // Clean up phone verification doc
        await phoneVerifDoc.ref.delete().catch(() => {});

        logger.info({ uid: userRecord.uid, email: normalizedEmail, phone: phoneNumber }, 'Phone-based signup completed');

        // Generate custom token for auto-login
        let customToken: string | null = null;
        try {
            customToken = await auth.createCustomToken(userRecord.uid);
        } catch (tokenError) {
            logger.warn({ err: tokenError }, 'Could not generate custom token for phone signup');
        }

        res.status(201).json({
            message: 'Account created successfully',
            data: {
                uid: userRecord.uid,
                email: newUser.email,
                displayName: newUser.displayName,
                role: newUser.role,
                region: newUser.region,
                currency: newUser.currency,
            },
            ...(customToken && { token: customToken })
        });
    } catch (error: any) {
        logger.error({ err: error }, 'registerWithVerifiedPhone failed');
        if (error.message?.includes('already registered')) {
            res.status(409).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Unable to complete registration' });
        }
    }
};

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
    const { uid, email, picture } = req.user;
    const { role, displayName, phoneNumber, deviceId, country } = req.body;

    if (!role || !['rider', 'driver'].includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
    }

    try {
        if (deviceId) {
            const bannedCheck = await db.collection('banned_devices').doc(deviceId).get();
            if (bannedCheck.exists) {
                res.status(403).json({ error: 'This device has been banned from the platform.' });
                return;
            }
        }

        const normalizedPhone = normalizePhone(phoneNumber);
        await ensureUniqueUser(email, normalizedPhone);

        // Check if phone is verified via Firebase Auth Token or OTP
        const tokenPhone = req.user.phone_number || req.user.phoneNumber;
        const isFirebaseVerified = tokenPhone && normalizePhone(tokenPhone) === normalizedPhone;

        if (normalizedPhone && !isFirebaseVerified) {
            const phoneVerificationDoc = await db.collection('phone_verifications').doc(normalizedPhone).get();
            const phoneVerified = phoneVerificationDoc.exists && phoneVerificationDoc.data()?.verified;
            if (!phoneVerified) {
                res.status(400).json({ error: 'Phone number must be verified before registering' });
                return;
            }
        }

        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            res.status(409).json({ error: 'User already exists' });
            return;
        }

        const region = detectRegion(country, phoneNumber);
        const now = new Date();

        const newUser: IUser & {
            countryCode: string;
            emailLowercase: string | null;
            phoneNumberNormalized: string | null;
            phoneVerified: boolean;
        } = {
            uid,
            email: email || '',
            displayName: displayName || '',
            phoneNumber: phoneNumber || '',
            photoURL: picture || '',
            role,
            createdAt: now,
            updatedAt: now,
            isActive: true,
            deviceId: deviceId || null,
            region: region.code,
            currency: region.currency,
            countryCode: region.code === 'NG' ? 'NG' : 'US',
            emailLowercase: email ? email.toLowerCase() : null,
            phoneNumberNormalized: normalizedPhone || null,
            phoneVerified: !!normalizedPhone,
            ...(role === 'driver' && {
                driverDetails: {
                    isOnline: false,
                    rating: 5.0,
                    totalTrips: 0,
                    earnings: 0
                },
                driverOnboarding: {
                    status: 'pending_documents',
                    submittedAt: now,
                    vehicleType: req.body.vehicleType ?? null
                },
                driverStatus: {
                    state: 'pending_documents',
                    isOnline: false,
                    lastHeartbeat: null,
                    lastOnlineAt: null,
                    autoOfflineAt: null
                }
            })
        };

        await userRef.set(newUser);
        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        logger.error({ err: error }, 'Error registering user');
        res.status(500).json({ error: (error as Error).message ?? 'Internal Server Error' });
    }
};

export const submitDriverOnboarding = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Only drivers can submit onboarding' });
        return;
    }

    try {
        const { uid } = req.user;
        const {
            driverLicense,
            vehicleInsurance,
            vehicleRegistration,
            vehiclePhotos = [],
            vehicleType,
            bankDetails
        } = req.body;

        if (!driverLicense || !vehicleInsurance || !vehicleRegistration || vehiclePhotos.length < 4) {
            res.status(400).json({ error: 'All driver documents and 4 vehicle photos are required' });
            return;
        }

        const application = {
            userId: uid,
            status: 'pending',
            driverLicense,
            vehicleInsurance,
            vehicleRegistration,
            vehiclePhotos,
            vehicleType,
            bankDetails,
            submittedAt: new Date(),
            updatedAt: new Date()
        };

        await db.collection('driver_applications').doc(uid).set(application);

        await db
            .collection('users')
            .doc(uid)
            .set(
                {
                    driverOnboarding: {
                        status: 'pending_review',
                        vehicleType,
                        submittedAt: new Date(),
                        bankDetails
                    },
                    updatedAt: new Date()
                },
                { merge: true }
            );

        res.status(200).json({ message: 'Driver onboarding submitted', application });
    } catch (error) {
        logger.error({ err: error }, 'Driver onboarding submission failed');
        res.status(500).json({ error: 'Unable to submit driver onboarding' });
    }
};

export const googleSignIn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idToken, role: requestedRole } = req.body;
        if (!idToken) {
            res.status(400).json({ error: 'idToken is required' });
            return;
        }
        // Only allow rider/driver — never accept admin from client
        const role = (requestedRole === 'driver') ? 'driver' : 'rider';

        const decoded = await auth.verifyIdToken(idToken);
        const userRecord = await auth.getUser(decoded.uid);

        const userRef = db.collection('users').doc(decoded.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            // ── Account Linking Safeguard ──────────────────────────────
            // Check if a Firestore profile already exists under a DIFFERENT UID
            // (e.g., user signed up with phone+email, now logging in with Google)
            const existingByEmail = await db.collection('users')
                .where('emailLowercase', '==', (userRecord.email ?? '').toLowerCase())
                .limit(1)
                .get();

            if (!existingByEmail.empty) {
                // Found existing profile under a different UID — migrate it
                const oldDoc = existingByEmail.docs[0];
                const oldData = oldDoc.data();
                const oldUid = oldDoc.id;

                logger.info(
                    { oldUid, newUid: decoded.uid, email: userRecord.email },
                    'Account linking: migrating Firestore profile from phone signup to Google UID'
                );

                // Copy the old profile to the new Google UID, preserving all data
                await userRef.set({
                    ...oldData,
                    uid: decoded.uid,
                    email: userRecord.email ?? oldData.email,
                    displayName: userRecord.displayName ?? oldData.displayName,
                    photoURL: userRecord.photoURL ?? oldData.photoURL,
                    updatedAt: new Date(),
                    linkedProviders: [...(oldData.linkedProviders || []), 'google.com'],
                });

                // Delete the orphaned old doc (only if it's a different UID)
                if (oldUid !== decoded.uid) {
                    await db.collection('users').doc(oldUid).delete();
                    logger.info({ oldUid }, 'Deleted orphaned Firestore profile after account linking');
                }
            } else {
                // Genuinely new user — create fresh profile
                const region = detectRegion(req.body.country, userRecord.phoneNumber);
                const newUser: IUser = {
                    uid: decoded.uid,
                    email: userRecord.email ?? '',
                    displayName: userRecord.displayName ?? '',
                    phoneNumber: userRecord.phoneNumber ?? '',
                    photoURL: userRecord.photoURL ?? '',
                    role,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isActive: true,
                    region: region.code,
                    currency: region.currency
                };

                await userRef.set({
                    ...newUser,
                    countryCode: region.code === 'NG' ? 'NG' : 'US',
                    emailLowercase: userRecord.email?.toLowerCase() ?? null,
                    phoneNumberNormalized: normalizePhone(userRecord.phoneNumber),
                    phoneVerified: !!userRecord.phoneNumber,
                    linkedProviders: ['google.com'],
                });
            }
        } else {
            // User doc already exists — do NOT update role from client input
            // Role changes must go through proper admin channels
        }

        res.status(200).json({ message: 'Google sign-in successful' });
    } catch (error) {
        logger.error({ err: error }, 'Google sign in failed');
        res.status(401).json({ error: 'Invalid Google token' });
    }
};

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, redirectUrl } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        const link = await auth.generatePasswordResetLink(email, {
            url: redirectUrl ?? process.env.PASSWORD_RESET_REDIRECT_URL ?? 'https://blacklivery.com/reset'
        });

        logger.info({ email }, 'Password reset link generated');

        // Send password reset email
        const emailResult = await emailService.send({
            to: email,
            subject: 'Reset your BlackLivery password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #000;">Password Reset</h2>
                    <p>You requested a password reset for your BlackLivery account.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${link}" style="background: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p style="color: #666;">If you didn't request this, you can safely ignore this email.</p>
                    <p style="color: #999; font-size: 11px;">This link will expire shortly.</p>
                </div>
            `,
            text: `Reset your BlackLivery password: ${link}`
        });
        if (!emailResult.success) {
            logger.warn({ email, error: emailResult.error }, 'Password reset email send failed');
        }

        if (process.env.NODE_ENV !== 'production') {
            logger.debug({ email, link }, 'DEV ONLY - Password reset link');
        }
        res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
        logger.error({ err: error }, 'Password reset request failed');
        res.status(500).json({ error: 'Unable to send password reset email' });
    }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    const { uid } = req.user;

    try {
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.status(200).json(userDoc.data());
    } catch (error) {
        logger.error({ err: error }, 'Error fetching profile');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    const { uid } = req.user;

    try {
        const allowedFields = ['fullName', 'phoneNumber', 'profileImage', 'email', 'emergencyContacts', 'payoutPreference', 'rideMode', 'autoPayoutEnabled'];
        const updates: Record<string, unknown> = {};
        let requestedRegion: string | undefined;

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === 'autoPayoutEnabled') {
                    updates['driverProfile.autoPayoutEnabled'] = req.body[field];
                } else {
                    updates[field] = req.body[field];
                }
            }
        }

        if (req.body.region !== undefined) {
            requestedRegion = String(req.body.region);
        }

        if (Object.keys(updates).length === 0 && requestedRegion === undefined) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const existingUser = userDoc.data() || {};

        if (requestedRegion !== undefined) {
            const phoneForInference =
                (updates.phoneNumber as string | undefined) ||
                (existingUser.phoneNumber as string | undefined);
            const resolvedRegion = detectRegion(requestedRegion, phoneForInference);
            const currentRegion = existingUser.region as RegionCode | undefined;

            if (currentRegion && currentRegion !== resolvedRegion.code) {
                const lastRegionChangeAtRaw = existingUser.lastRegionChangeAt;
                const lastRegionChangeAt =
                    lastRegionChangeAtRaw?.toDate?.() ||
                    (lastRegionChangeAtRaw ? new Date(lastRegionChangeAtRaw) : null);

                if (lastRegionChangeAt && Number.isFinite(lastRegionChangeAt.getTime())) {
                    const elapsed = Date.now() - lastRegionChangeAt.getTime();
                    if (elapsed < REGION_CHANGE_COOLDOWN_MS) {
                        const waitMinutes = Math.ceil((REGION_CHANGE_COOLDOWN_MS - elapsed) / 60000);
                        res.status(429).json({
                            error: `Region can only be changed every 6 hours. Try again in ${waitMinutes} minute(s).`
                        });
                        return;
                    }
                }

                const changedAt = new Date().toISOString();
                updates.regionChangeHistory = FieldValue.arrayUnion({
                    from: currentRegion,
                    to: resolvedRegion.code,
                    changedAt,
                    source: 'driver_profile_update',
                });
                updates.lastRegionChangeAt = changedAt;
            }

            updates.region = resolvedRegion.code;
            updates.currency = resolvedRegion.currency;
            updates.countryCode = resolvedRegion.code === 'NG' ? 'NG' : 'US';
        }

        updates.updatedAt = new Date().toISOString();

        await userRef.update(updates);

        // If fullName changed, update Firebase Auth displayName too
        if (updates.fullName) {
            await auth.updateUser(uid, { displayName: updates.fullName as string });
        }

        // If email changed, update Firebase Auth email too
        if (updates.email) {
            await auth.updateUser(uid, { email: updates.email as string });
            updates.emailLowercase = (updates.email as string).toLowerCase();
            await userRef.update({ emailLowercase: updates.emailLowercase });
        }

        const updatedDoc = await userRef.get();
        res.status(200).json(updatedDoc.data());
    } catch (error) {
        logger.error({ err: error, uid }, 'Error updating profile');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
    const { uid } = req.user;
    try {
        await auth.revokeRefreshTokens(uid);
        res.status(200).json({ message: 'Logged out successfully. Tokens revoked.' });
    } catch (error) {
        logger.error({ err: error }, 'Error logging out');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const registerOrLink = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { email, name, phone, role, firebaseUid } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Security: Ensure firebaseUid matches the authenticated user's UID
        const callerUid = req.user?.uid;
        if (firebaseUid && callerUid && firebaseUid !== callerUid) {
            res.status(403).json({ error: 'Cannot link a different Firebase UID' });
            return;
        }
        // Use the caller's authenticated UID as the authoritative firebaseUid
        const safeFirebaseUid = callerUid || firebaseUid || null;

        // Check if user already exists by email
        const usersRef = db.collection('users');
        const existingUser = await usersRef.where('email', '==', email).limit(1).get();

        if (!existingUser.empty) {
            // User exists - UPDATE with firebaseUid instead of rejecting
            const userDoc = existingUser.docs[0];
            const userData = userDoc.data();

            // If firebaseUid is provided and different, link it
            if (safeFirebaseUid && userData.firebaseUid !== safeFirebaseUid) {
                await userDoc.ref.update({
                    firebaseUid: safeFirebaseUid,
                    updatedAt: new Date()
                });
            }

            // Return the existing user (now linked)
            res.status(200).json({
                data: { id: userDoc.id, ...userDoc.data(), firebaseUid: safeFirebaseUid }
            });
            return;
        }

        // New user - create normally
        const newUser = {
            email,
            name: name || '',
            phone: phone || '',
            role: role || 'rider',
            firebaseUid: safeFirebaseUid,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Use firebaseUid as the Firestore doc ID so it matches req.user.uid lookups
        if (firebaseUid) {
            await usersRef.doc(firebaseUid).set(newUser);
            res.status(201).json({ data: { id: firebaseUid, ...newUser } });
        } else {
            const docRef = await usersRef.add(newUser);
            res.status(201).json({ data: { id: docRef.id, ...newUser } });
        }
    } catch (error) {
        logger.error({ err: error }, 'registerOrLink failed');
        res.status(500).json({ error: 'Registration failed' });
    }
};

/**
 * Get active sessions for the authenticated user.
 * Tracks sessions via a subcollection on the user document.
 */
export const getActiveSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const sessionsRef = db.collection('users').doc(uid).collection('sessions');
        const snapshot = await sessionsRef.orderBy('lastActiveAt', 'desc').get();

        // Get current session token to mark isCurrent
        const currentToken = req.headers.authorization?.replace('Bearer ', '');

        const sessions = snapshot.docs.map((doc, index) => {
            const data = doc.data();
            const lastActiveAt = data.lastActiveAt?.toDate?.() ?? data.lastActiveAt;
            return {
                id: doc.id,
                deviceName: data.deviceName || data.device || parseDeviceName(data.userAgent || ''),
                deviceType: data.deviceType || parseDeviceType(data.userAgent || ''),
                location: data.location || (data.ipAddress || data.ip ? `IP: ${data.ipAddress || data.ip}` : 'Unknown location'),
                lastActive: lastActiveAt ? formatTimeAgo(lastActiveAt) : 'Unknown',
                isCurrent: index === 0, // Most recent session is likely the current one
                createdAt: data.createdAt,
                lastActiveAt: data.lastActiveAt,
            };
        });

        res.status(200).json({ data: sessions });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching sessions');
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { sessionId } = req.params;

        const sessionRef = db.collection('users').doc(uid)
            .collection('sessions').doc(sessionId);

        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        await sessionRef.delete();
        res.status(200).json({ message: 'Session revoked' });
    } catch (error) {
        logger.error({ err: error }, 'Error revoking session');
        res.status(500).json({ error: 'Failed to revoke session' });
    }
};

/**
 * Revoke all sessions except the current one
 */
export const revokeAllSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const sessionsRef = db.collection('users').doc(uid).collection('sessions');
        const snapshot = await sessionsRef.get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Also revoke Firebase refresh tokens
        await auth.revokeRefreshTokens(uid);

        res.status(200).json({ message: 'All sessions revoked' });
    } catch (error) {
        logger.error({ err: error }, 'Error revoking all sessions');
        res.status(500).json({ error: 'Failed to revoke sessions' });
    }
};

/**
 * Get login history for the authenticated user
 */
export const getLoginHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const historyRef = db.collection('users').doc(uid).collection('loginHistory');
        const snapshot = await historyRef
            .orderBy('loginAt', 'desc')
            .limit(50)
            .get();

        const history = snapshot.docs.map(doc => {
            const data = doc.data();
            const loginAt = data.loginAt?.toDate?.() ?? data.loginAt;
            return {
                id: doc.id,
                deviceName: data.deviceName || data.device || parseDeviceName(data.userAgent || ''),
                deviceType: data.deviceType || parseDeviceType(data.userAgent || ''),
                location: data.location || (data.ipAddress || data.ip ? `IP: ${data.ipAddress || data.ip}` : 'Unknown location'),
                ipAddress: data.ipAddress || data.ip || 'Unknown',
                timestamp: data.timestamp || (loginAt instanceof Date ? loginAt.toISOString() : loginAt) || null,
                status: data.status || 'success',
            };
        });

        res.status(200).json({ data: history });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching login history');
        res.status(500).json({ error: 'Failed to fetch login history' });
    }
};

/**
 * Delete user account
 */
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;

        // Delete user data from Firestore
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Delete subcollections
        const subcollections = ['sessions', 'loginHistory', 'savedPlaces', 'recentLocations'];
        for (const sub of subcollections) {
            const subSnapshot = await userRef.collection(sub).get();
            const batch = db.batch();
            subSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // Delete the user document
        await userRef.delete();

        // Delete from Firebase Auth
        await auth.deleteUser(uid);

        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        logger.error({ err: error, uid: req.user.uid }, 'Error deleting account');
        res.status(500).json({ error: 'Failed to delete account' });
    }
};

/**
 * Register FCM token for push notifications
 */
export const registerFcmToken = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { token } = req.body;

        if (!token || typeof token !== 'string') {
            res.status(400).json({ error: 'FCM token is required' });
            return;
        }

        await db.collection('users').doc(uid).update({
            fcmTokens: admin.firestore.FieldValue.arrayUnion(token)
        });

        logger.info({ uid }, 'FCM token registered');
        res.status(200).json({ message: 'FCM token registered' });
    } catch (error) {
        logger.error({ err: error, uid: req.user.uid }, 'Error registering FCM token');
        res.status(500).json({ error: 'Failed to register FCM token' });
    }
};

/**
 * Remove FCM token (e.g. on logout)
 */
export const removeFcmToken = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { token } = req.body;

        if (!token || typeof token !== 'string') {
            res.status(400).json({ error: 'FCM token is required' });
            return;
        }

        await db.collection('users').doc(uid).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
        });

        logger.info({ uid }, 'FCM token removed');
        res.status(200).json({ message: 'FCM token removed' });
    } catch (error) {
        logger.error({ err: error, uid: req.user.uid }, 'Error removing FCM token');
        res.status(500).json({ error: 'Failed to remove FCM token' });
    }
};

// ─── Two-Factor Authentication ──────────────────────────────────

const TWO_FA_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Send 2FA OTP to user's registered phone number
 */
export const send2faOtp = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const userData = userDoc.data()!;
        const phoneNumber = userData.phoneNumber;

        if (!phoneNumber) {
            res.status(400).json({ error: 'No phone number registered. Please add a phone number first.' });
            return;
        }

        // Rate limit: minimum 60 seconds between sends
        const existingDoc = await db.collection('2fa_codes').doc(uid).get();
        if (existingDoc.exists) {
            const lastSentAt = existingDoc.data()?.lastSentAt;
            if (lastSentAt) {
                const lastSentTime = lastSentAt?.toDate?.() ?? new Date(lastSentAt);
                const elapsed = Date.now() - lastSentTime.getTime();
                if (elapsed < 60000) {
                    res.status(429).json({ error: 'Please wait before requesting a new code' });
                    return;
                }
            }
        }

        const otp = crypto.randomInt(100000, 999999).toString();

        await db.collection('2fa_codes').doc(uid).set({
            code: otp,
            attempts: 0,
            expiresAt: new Date(Date.now() + TWO_FA_TTL_MS),
            lastSentAt: new Date()
        });

        // Send OTP via SMS
        const smsResult = await smsService.sendOtp(phoneNumber, otp);
        if (!smsResult.success) {
            logger.warn({ uid, phoneNumber, error: smsResult.error }, '2FA OTP SMS send failed');
        }

        if (process.env.NODE_ENV !== 'production') {
            logger.debug({ uid, otp }, 'DEV ONLY - 2FA OTP value');
        }

        // Mask phone number for response (e.g., ***1234)
        const maskedPhone = '***' + phoneNumber.slice(-4);

        res.status(200).json({
            message: '2FA code sent',
            phone: maskedPhone,
            ...(process.env.NODE_ENV !== 'production' && { otp })
        });
    } catch (error) {
        logger.error({ err: error }, 'send2faOtp failed');
        res.status(500).json({ error: 'Unable to send 2FA code' });
    }
};

/**
 * Verify 2FA OTP code
 */
export const verify2faOtp = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { code } = req.body;

        if (!code) {
            res.status(400).json({ error: 'Verification code is required' });
            return;
        }

        const doc = await db.collection('2fa_codes').doc(uid).get();

        if (!doc.exists) {
            res.status(400).json({ error: 'No 2FA code found. Please request a new one.' });
            return;
        }

        const data = doc.data()!;

        // Brute-force protection: max 5 attempts
        if ((data.attempts || 0) >= 5) {
            await doc.ref.delete();
            res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
            return;
        }

        const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
        if (expiresAt <= new Date()) {
            await doc.ref.delete();
            res.status(400).json({ error: '2FA code expired. Please request a new one.' });
            return;
        }

        if (data.code !== code) {
            await doc.ref.update({
                attempts: FieldValue.increment(1)
            });
            res.status(400).json({ error: 'Invalid verification code' });
            return;
        }

        // Code is valid — clean up
        await doc.ref.delete();

        logger.info({ uid }, '2FA verification successful');
        res.status(200).json({ message: '2FA verification successful', verified: true });
    } catch (error) {
        logger.error({ err: error }, 'verify2faOtp failed');
        res.status(500).json({ error: 'Unable to verify 2FA code' });
    }
};

/**
 * Toggle 2FA on/off for the authenticated user
 */
export const toggle2fa = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            res.status(400).json({ error: '"enabled" (boolean) is required' });
            return;
        }

        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // If enabling 2FA, verify user has a phone number
        if (enabled) {
            const userData = userDoc.data()!;
            if (!userData.phoneNumber) {
                res.status(400).json({ error: 'A verified phone number is required to enable 2FA' });
                return;
            }
        }

        await db.collection('users').doc(uid).update({
            twoFactorEnabled: enabled,
            updatedAt: new Date()
        });

        logger.info({ uid, twoFactorEnabled: enabled }, `2FA ${enabled ? 'enabled' : 'disabled'}`);
        res.status(200).json({
            message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
            twoFactorEnabled: enabled
        });
    } catch (error) {
        logger.error({ err: error }, 'toggle2fa failed');
        res.status(500).json({ error: 'Unable to update 2FA setting' });
    }
};

const mapNotification = (doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? doc.data().createdAt,
    readAt: doc.data().readAt?.toDate?.()?.toISOString() ?? doc.data().readAt ?? null,
});

export const getRiderNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const parsedLimit = parseInt((req.query.limit as string) || '30', 10);
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 30;

        let notifications: ReturnType<typeof mapNotification>[] = [];
        try {
            const snapshot = await db
                .collection('notifications')
                .where('userId', '==', uid)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            notifications = snapshot.docs.map(mapNotification);
        } catch {
            const fallback = await db
                .collection('notifications')
                .where('userId', '==', uid)
                .limit(limit)
                .get();
            notifications = fallback.docs
                .map(mapNotification)
                .sort((a, b) => {
                    const toMs = (v: unknown) => v instanceof Date ? v.getTime() : typeof v === 'string' ? new Date(v).getTime() : 0;
                    return toMs((b as { createdAt?: unknown }).createdAt) - toMs((a as { createdAt?: unknown }).createdAt);
                });
        }

        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        logger.error({ err: error }, 'getRiderNotifications failed');
        res.status(500).json({ error: 'Unable to load notifications' });
    }
};

export const markAllRiderNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const unread = await db
            .collection('notifications')
            .where('userId', '==', uid)
            .where('read', '==', false)
            .get();

        const batch = db.batch();
        unread.docs.forEach((doc) => batch.update(doc.ref, { read: true, readAt: new Date() }));
        await batch.commit();

        res.status(200).json({ success: true, updated: unread.size });
    } catch (error) {
        logger.error({ err: error }, 'markAllRiderNotificationsRead failed');
        res.status(500).json({ error: 'Unable to mark notifications as read' });
    }
};

export const markRiderNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { id } = req.params;

        const docRef = db.collection('notifications').doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data()?.userId !== uid) {
            res.status(404).json({ error: 'Notification not found' });
            return;
        }

        await docRef.update({ read: true, readAt: new Date() });
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error({ err: error }, 'markRiderNotificationRead failed');
        res.status(500).json({ error: 'Unable to mark notification as read' });
    }
};

// ── Notification Preferences ─────────────────────────────────────────────────

export const getNotificationPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const userDoc = await db.collection('users').doc(uid).get();
        const prefs = userDoc.data()?.notificationPreferences ?? { push: true, email: true, sms: true };
        res.status(200).json({ data: prefs });
    } catch (error) {
        logger.error({ err: error }, 'getNotificationPreferences failed');
        res.status(500).json({ error: 'Unable to fetch notification preferences' });
    }
};

export const updateNotificationPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { push, email, sms } = req.body;

        const prefs: Record<string, boolean> = {};
        if (typeof push === 'boolean') prefs['notificationPreferences.push'] = push;
        if (typeof email === 'boolean') prefs['notificationPreferences.email'] = email;
        if (typeof sms === 'boolean') prefs['notificationPreferences.sms'] = sms;

        if (Object.keys(prefs).length === 0) {
            res.status(400).json({ error: 'At least one preference (push, email, sms) is required' });
            return;
        }

        await db.collection('users').doc(uid).update(prefs);
        const updated = await db.collection('users').doc(uid).get();
        res.status(200).json({ data: updated.data()?.notificationPreferences });
    } catch (error) {
        logger.error({ err: error }, 'updateNotificationPreferences failed');
        res.status(500).json({ error: 'Unable to update notification preferences' });
    }
};
