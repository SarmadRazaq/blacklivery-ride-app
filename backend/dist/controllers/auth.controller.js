"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOrLink = exports.logout = exports.getProfile = exports.requestPasswordReset = exports.googleSignIn = exports.submitDriverOnboarding = exports.register = exports.verifyPhoneVerification = exports.startPhoneVerification = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
const PHONE_VERIFICATION_TTL_MS = 5 * 60 * 1000;
const REGION_MAP = {
    NG: { country: 'Nigeria', currency: 'NGN', code: 'NG' },
    US: { country: 'United States', currency: 'USD', code: 'US-CHI' }
};
const normalizePhone = (phone) => { var _a; return (_a = phone === null || phone === void 0 ? void 0 : phone.replace(/\D/g, '')) !== null && _a !== void 0 ? _a : ''; };
const detectRegion = (explicit, phone) => {
    const normalized = explicit === null || explicit === void 0 ? void 0 : explicit.toUpperCase();
    if (normalized === 'NG' || normalized === 'NIGERIA')
        return REGION_MAP.NG;
    if (normalized === 'US' || normalized === 'USA' || normalized === 'UNITED STATES' || normalized === 'CHICAGO')
        return REGION_MAP.US;
    if ((phone === null || phone === void 0 ? void 0 : phone.startsWith('+234')) || normalizePhone(phone).startsWith('234'))
        return REGION_MAP.NG;
    if ((phone === null || phone === void 0 ? void 0 : phone.startsWith('+1')) || normalizePhone(phone).startsWith('1'))
        return REGION_MAP.US;
    return REGION_MAP.NG; // default market
};
const ensureUniqueUser = (email, phoneNumber) => __awaiter(void 0, void 0, void 0, function* () {
    if (email) {
        const emailSnapshot = yield firebase_1.db
            .collection('users')
            .where('emailLowercase', '==', email.toLowerCase())
            .limit(1)
            .get();
        if (!emailSnapshot.empty) {
            throw new Error('Email already registered');
        }
    }
    if (phoneNumber) {
        const phoneSnapshot = yield firebase_1.db.collection('users').where('phoneNumberNormalized', '==', phoneNumber).limit(1).get();
        if (!phoneSnapshot.empty) {
            throw new Error('Phone number already registered');
        }
    }
});
const startPhoneVerification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }
        const normalized = normalizePhone(phoneNumber);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        yield firebase_1.db
            .collection('phone_verifications')
            .doc(normalized)
            .set({
            code: otp,
            attempts: 0,
            verified: false,
            expiresAt: new Date(Date.now() + PHONE_VERIFICATION_TTL_MS),
            lastSentAt: new Date()
        }, { merge: true });
        logger_1.logger.info({ phoneNumber: normalized, otp }, 'OTP generated for phone verification');
        console.log(`\n🔐 OTP for ${normalized}: ${otp}\n`); // TODO: Remove before production
        res.status(200).json({ message: 'Verification code sent', otp }); // TODO: Remove otp from response before production
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'startPhoneVerification failed');
        res.status(500).json({ error: 'Unable to start phone verification' });
    }
});
exports.startPhoneVerification = startPhoneVerification;
const verifyPhoneVerification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) {
            res.status(400).json({ error: 'Phone number and code are required' });
            return;
        }
        const normalized = normalizePhone(phoneNumber);
        const doc = yield firebase_1.db.collection('phone_verifications').doc(normalized).get();
        if (!doc.exists) {
            res.status(400).json({ error: 'No verification request found' });
            return;
        }
        const data = doc.data();
        const expiresAt = (_c = (_b = (_a = data.expiresAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : new Date(data.expiresAt);
        if (expiresAt <= new Date()) {
            res.status(400).json({ error: 'Verification code expired' });
            return;
        }
        if (data.code !== code) {
            yield doc.ref.update({
                attempts: firestore_1.FieldValue.increment(1)
            });
            res.status(400).json({ error: 'Invalid verification code' });
            return;
        }
        yield doc.ref.update({
            verified: true,
            verifiedAt: new Date()
        });
        res.status(200).json({ message: 'Phone number verified' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'verifyPhoneVerification failed');
        res.status(500).json({ error: 'Unable to verify phone number' });
    }
});
exports.verifyPhoneVerification = verifyPhoneVerification;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { uid, email, picture } = req.user;
    const { role, displayName, phoneNumber, deviceId, country } = req.body;
    if (!role || !['rider', 'driver'].includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
    }
    try {
        if (deviceId) {
            const bannedCheck = yield firebase_1.db.collection('banned_devices').doc(deviceId).get();
            if (bannedCheck.exists) {
                res.status(403).json({ error: 'This device has been banned from the platform.' });
                return;
            }
        }
        const normalizedPhone = normalizePhone(phoneNumber);
        yield ensureUniqueUser(email, normalizedPhone);
        // Check if phone is verified via Firebase Auth Token
        // const tokenPhone = req.user.phone_number || req.user.phoneNumber;
        // const isFirebaseVerified = tokenPhone && normalizePhone(tokenPhone) === normalizedPhone;
        // if (normalizedPhone && !isFirebaseVerified) {
        //     const phoneVerificationDoc = await db.collection('phone_verifications').doc(normalizedPhone).get();
        //     const phoneVerified = phoneVerificationDoc.exists && phoneVerificationDoc.data()?.verified;
        //     if (!phoneVerified) {
        //         res.status(400).json({ error: 'Phone number must be verified before registering' });
        //         return;
        //     }
        // }
        const userRef = firebase_1.db.collection('users').doc(uid);
        const userDoc = yield userRef.get();
        if (userDoc.exists) {
            res.status(409).json({ error: 'User already exists' });
            return;
        }
        const region = detectRegion(country, phoneNumber);
        const now = new Date();
        const newUser = Object.assign({ uid, email: email || '', displayName: displayName || '', phoneNumber: phoneNumber || '', photoURL: picture || '', role, createdAt: now, updatedAt: now, isActive: true, deviceId: deviceId || null, region: region.code, currency: region.currency, countryCode: region.code === 'NG' ? 'NG' : 'US', emailLowercase: email ? email.toLowerCase() : null, phoneNumberNormalized: normalizedPhone || null, phoneVerified: !!normalizedPhone }, (role === 'driver' && {
            driverDetails: {
                isOnline: false,
                rating: 5.0,
                totalTrips: 0,
                earnings: 0
            },
            driverOnboarding: {
                status: 'pending_documents',
                submittedAt: now,
                vehicleType: (_a = req.body.vehicleType) !== null && _a !== void 0 ? _a : null
            },
            driverStatus: {
                state: 'pending_documents',
                isOnline: false,
                lastHeartbeat: null,
                lastOnlineAt: null,
                autoOfflineAt: null
            }
        }));
        yield userRef.set(newUser);
        res.status(201).json({ message: 'User registered successfully', user: newUser });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Error registering user');
        res.status(500).json({ error: (_b = error.message) !== null && _b !== void 0 ? _b : 'Internal Server Error' });
    }
});
exports.register = register;
const submitDriverOnboarding = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Only drivers can submit onboarding' });
        return;
    }
    try {
        const { uid } = req.user;
        const { driverLicense, vehicleInsurance, vehicleRegistration, vehiclePhotos = [], vehicleType, bankDetails } = req.body;
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
        yield firebase_1.db.collection('driver_applications').doc(uid).set(application);
        yield firebase_1.db
            .collection('users')
            .doc(uid)
            .set({
            driverOnboarding: {
                status: 'pending_review',
                vehicleType,
                submittedAt: new Date(),
                bankDetails
            },
            updatedAt: new Date()
        }, { merge: true });
        res.status(200).json({ message: 'Driver onboarding submitted', application });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Driver onboarding submission failed');
        res.status(500).json({ error: 'Unable to submit driver onboarding' });
    }
});
exports.submitDriverOnboarding = submitDriverOnboarding;
const googleSignIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { idToken, role = 'rider' } = req.body;
        if (!idToken) {
            res.status(400).json({ error: 'idToken is required' });
            return;
        }
        const decoded = yield firebase_1.auth.verifyIdToken(idToken);
        const userRecord = yield firebase_1.auth.getUser(decoded.uid);
        const userRef = firebase_1.db.collection('users').doc(decoded.uid);
        const userDoc = yield userRef.get();
        if (!userDoc.exists) {
            const region = detectRegion(req.body.country, userRecord.phoneNumber);
            const newUser = {
                uid: decoded.uid,
                email: (_a = userRecord.email) !== null && _a !== void 0 ? _a : '',
                displayName: (_b = userRecord.displayName) !== null && _b !== void 0 ? _b : '',
                phoneNumber: (_c = userRecord.phoneNumber) !== null && _c !== void 0 ? _c : '',
                photoURL: (_d = userRecord.photoURL) !== null && _d !== void 0 ? _d : '',
                role,
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                region: region.code,
                currency: region.currency
            };
            yield userRef.set(Object.assign(Object.assign({}, newUser), { countryCode: region.code === 'NG' ? 'NG' : 'US', emailLowercase: (_f = (_e = userRecord.email) === null || _e === void 0 ? void 0 : _e.toLowerCase()) !== null && _f !== void 0 ? _f : null, phoneNumberNormalized: normalizePhone(userRecord.phoneNumber), phoneVerified: !!userRecord.phoneNumber }));
        }
        res.status(200).json({ message: 'Google sign-in successful' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Google sign in failed');
        res.status(401).json({ error: 'Invalid Google token' });
    }
});
exports.googleSignIn = googleSignIn;
const requestPasswordReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { email, redirectUrl } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        const link = yield firebase_1.auth.generatePasswordResetLink(email, {
            url: (_a = redirectUrl !== null && redirectUrl !== void 0 ? redirectUrl : process.env.PASSWORD_RESET_REDIRECT_URL) !== null && _a !== void 0 ? _a : 'https://blacklivery.com/reset'
        });
        logger_1.logger.info({ email }, 'Password reset link generated');
        res.status(200).json({ message: 'Password reset email sent', link });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Password reset request failed');
        res.status(500).json({ error: 'Unable to send password reset email' });
    }
});
exports.requestPasswordReset = requestPasswordReset;
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid } = req.user;
    try {
        const userDoc = yield firebase_1.db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.status(200).json(userDoc.data());
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Error fetching profile');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.getProfile = getProfile;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid } = req.user;
    try {
        yield firebase_1.auth.revokeRefreshTokens(uid);
        res.status(200).json({ message: 'Logged out successfully. Tokens revoked.' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Error logging out');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.logout = logout;
const registerOrLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, name, phone, role, firebaseUid } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        // Check if user already exists by email
        const usersRef = firebase_1.db.collection('users');
        const existingUser = yield usersRef.where('email', '==', email).limit(1).get();
        if (!existingUser.empty) {
            // User exists - UPDATE with firebaseUid instead of rejecting
            const userDoc = existingUser.docs[0];
            const userData = userDoc.data();
            // If firebaseUid is provided and different, link it
            if (firebaseUid && userData.firebaseUid !== firebaseUid) {
                yield userDoc.ref.update({
                    firebaseUid: firebaseUid,
                    updatedAt: new Date()
                });
            }
            // Return the existing user (now linked)
            res.status(200).json({
                data: Object.assign(Object.assign({ id: userDoc.id }, userDoc.data()), { firebaseUid })
            });
            return;
        }
        // New user - create normally
        const newUser = {
            email,
            name: name || '',
            phone: phone || '',
            role: role || 'rider',
            firebaseUid: firebaseUid || null,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const docRef = yield usersRef.add(newUser);
        res.status(201).json({ data: Object.assign({ id: docRef.id }, newUser) });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'registerOrLink failed');
        res.status(500).json({ error: 'Registration failed' });
    }
});
exports.registerOrLink = registerOrLink;
//# sourceMappingURL=auth.controller.js.map