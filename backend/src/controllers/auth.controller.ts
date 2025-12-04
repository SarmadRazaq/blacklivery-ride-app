import { Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db, auth } from '../config/firebase';
import { IUser } from '../models/User';
import { RegionCode, CurrencyCode } from '../config/region.config';
import { logger } from '../utils/logger';

const PHONE_VERIFICATION_TTL_MS = 5 * 60 * 1000;

const REGION_MAP: Record<string, { country: string; currency: CurrencyCode; code: RegionCode }> = {
    NG: { country: 'Nigeria', currency: 'NGN', code: 'NG' },
    US: { country: 'United States', currency: 'USD', code: 'US-CHI' }
};

const normalizePhone = (phone?: string) => phone?.replace(/\D/g, '') ?? '';

const detectRegion = (explicit?: string, phone?: string) => {
    const normalized = explicit?.toUpperCase();
    if (normalized === 'NG' || normalized === 'NIGERIA') return REGION_MAP.NG;
    if (normalized === 'US' || normalized === 'USA' || normalized === 'UNITED STATES' || normalized === 'CHICAGO') return REGION_MAP.US;

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
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await db
            .collection('phone_verifications')
            .doc(normalized)
            .set(
                {
                    code: otp,
                    attempts: 0,
                    verified: false,
                    expiresAt: new Date(Date.now() + PHONE_VERIFICATION_TTL_MS),
                    lastSentAt: new Date()
                },
                { merge: true }
            );

        logger.info({ phoneNumber: normalized }, 'OTP generated for phone verification');
        res.status(200).json({ message: 'Verification code sent' });
    } catch (error) {
        logger.error({ err: error }, 'startPhoneVerification failed');
        res.status(500).json({ error: 'Unable to start phone verification' });
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
        const doc = await db.collection('phone_verifications').doc(normalized).get();

        if (!doc.exists) {
            res.status(400).json({ error: 'No verification request found' });
            return;
        }

        const data = doc.data()!;
        const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
        if (expiresAt <= new Date()) {
            res.status(400).json({ error: 'Verification code expired' });
            return;
        }

        if (data.code !== code) {
            await doc.ref.update({
                attempts: FieldValue.increment(1)
            });
            res.status(400).json({ error: 'Invalid verification code' });
            return;
        }

        await doc.ref.update({
            verified: true,
            verifiedAt: new Date()
        });

        res.status(200).json({ message: 'Phone number verified' });
    } catch (error) {
        logger.error({ err: error }, 'verifyPhoneVerification failed');
        res.status(500).json({ error: 'Unable to verify phone number' });
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

        // Check if phone is verified via Firebase Auth Token
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
            emailLowercase?: string;
            phoneNumberNormalized?: string;
            phoneVerified?: boolean;
        } = {
            uid,
            email,
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
            countryCode: region.code === 'NG' ? 'NG' : 'US', // Simplified country code logic
            emailLowercase: email ? email.toLowerCase() : undefined,
            phoneNumberNormalized: normalizedPhone || undefined,
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
        const { idToken, role = 'rider' } = req.body;
        if (!idToken) {
            res.status(400).json({ error: 'idToken is required' });
            return;
        }

        const decoded = await auth.verifyIdToken(idToken);
        const userRecord = await auth.getUser(decoded.uid);

        const userRef = db.collection('users').doc(decoded.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
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
                phoneVerified: !!userRecord.phoneNumber
            });
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
        res.status(200).json({ message: 'Password reset email sent', link });
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

export const registerTestUser = async (req: Request, res: Response): Promise<void> => {
    // BACKDOOR FOR TESTING ONLY
    const { email, role, displayName, phoneNumber } = req.body;
    const uid = 'test_' + Date.now() + Math.random().toString(36).substring(7);

    try {
        const now = new Date();
        const newUser: any = {
            uid,
            email,
            displayName: displayName || 'Test User',
            phoneNumber: phoneNumber || '',
            role,
            createdAt: now,
            updatedAt: now,
            isActive: true,
            region: 'NG',
            currency: 'NGN',
            countryCode: 'NG',
            phoneVerified: true,
            ...(role === 'driver' && {
                driverDetails: { isOnline: false, rating: 5.0, totalTrips: 0, earnings: 0 },
                driverOnboarding: { status: 'approved', submittedAt: now, vehicleType: 'sedan' },
                driverStatus: { state: 'online', isOnline: true, lastHeartbeat: now }
            })
        };

        await db.collection('users').doc(uid).set(newUser);

        res.status(201).json({
            message: 'Test user created',
            user: newUser,
            token: `TEST_TOKEN_${uid}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create test user' });
    }
};
