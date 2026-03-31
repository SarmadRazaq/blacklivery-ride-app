import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { wrap } from '../utils/errorHandler';
import {
    signupStartSchema,
    signupVerifySchema,
    phoneVerificationSchema,
    phoneVerifyOtpSchema,
    phoneSignupSchema,
    emailVerificationSchema
} from '../schemas/auth.schema';
import {
    register,
    registerOrLink,
    getProfile,
    updateProfile,
    logout,
    login,
    startPhoneVerification,
    verifyPhoneVerification,
    registerWithVerifiedPhone,
    startEmailVerification,
    verifyEmailVerification,
    signupStart,
    signupResend,
    signupVerify,
    googleSignIn,
    requestPasswordReset,
    requestPhonePasswordReset,
    verifyPhonePasswordReset,
    submitDriverOnboarding,
    getActiveSessions,
    revokeSession,
    revokeAllSessions,
    getLoginHistory,
    deleteAccount,
    registerFcmToken,
    removeFcmToken,
    send2faOtp,
    verify2faOtp,
    toggle2fa,
    getRiderNotifications,
    markAllRiderNotificationsRead,
    markRiderNotificationRead,
    getNotificationPreferences,
    updateNotificationPreferences
} from '../controllers/auth.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and User Management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user (sends OTP to email)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - phoneNumber
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "SecurePass123!"
 *               fullName:
 *                 type: string
 *                 example: "John Doe"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348012345678"
 *               role:
 *                 type: string
 *                 enum: [rider, driver]
 *                 default: rider
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       409:
 *         description: Email or phone already registered
 */
router.post('/register', validate(signupStartSchema), wrap(signupStart));

/**
 * @swagger
 * /auth/register/resend:
 *   post:
 *     summary: Resend OTP for pending registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: OTP resent to email
 *       400:
 *         description: No pending signup found
 */
router.post('/register/resend', validate(emailVerificationSchema), wrap(signupResend));

/**
 * @swagger
 * /auth/register-firebase:
 *   post:
 *     summary: Register a new user with Firebase Token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               role:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: User already exists
 */
router.post('/register-firebase', verifyToken, wrap(register));

/**
 * @swagger
 * /auth/register/verify:
 *   post:
 *     summary: Complete registration by verifying OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Invalid or expired OTP
 *       409:
 *         description: Email already registered
 */
router.post('/register/verify', validate(signupVerifySchema), wrap(signupVerify));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user (get user data by email)
 *     tags: [Auth]
 *     description: |
 *       This endpoint returns user data. For authentication, use Firebase Client SDK 
 *       to sign in with email/password and get an ID token for protected endpoints.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Login successful
 *       404:
 *         description: User not found
 */
router.post('/login', verifyToken, wrap(login));

/**
 * @swagger
 * /auth/phone/start:
 *   post:
 *     summary: Start phone verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification code sent
 */
router.post('/phone/start', validate(phoneVerificationSchema), wrap(startPhoneVerification));

/**
 * @swagger
 * /auth/phone/verify:
 *   post:
 *     summary: Verify phone number
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified successfully
 */
router.post('/phone/verify', validate(phoneVerifyOtpSchema), wrap(verifyPhoneVerification));

/**
 * @swagger
 * /auth/register-with-phone:
 *   post:
 *     summary: Register a new user using a verified phone number
 *     tags: [Auth]
 *     description: |
 *       Creates a new account after the phone number has been verified via OTP.
 *       The phone must have been verified within the last 30 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - phoneNumber
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "mySecure123"
 *               fullName:
 *                 type: string
 *                 example: "John Doe"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348012345678"
 *               role:
 *                 type: string
 *                 enum: [rider, driver]
 *               region:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Phone not verified or missing fields
 *       409:
 *         description: Email or phone already registered
 */
router.post('/register-with-phone', validate(phoneSignupSchema), wrap(registerWithVerifiedPhone));

/**
 * @swagger
 * /auth/email/start:
 *   post:
 *     summary: Start email verification (send OTP)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Verification code sent to email
 */
router.post('/email/start', validate(emailVerificationSchema), wrap(startEmailVerification));

/**
 * @swagger
 * /auth/email/verify:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post('/email/verify', validate(emailVerificationSchema), wrap(verifyEmailVerification));

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: OAuth Sign-In (Google/Apple)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: User authenticated via OAuth provider
 */
router.post('/google', wrap(googleSignIn));

/**
 * @swagger
 * /auth/password/reset:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post('/password/reset', wrap(requestPasswordReset));
router.post('/password/reset/phone', wrap(requestPhonePasswordReset));
router.post('/password/reset/phone/verify', wrap(verifyPhonePasswordReset));

/**
 * @swagger
 * /auth/register-or-link:
 *   post:
 *     summary: Register a new user or link existing user with firebaseUid
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               role:
 *                 type: string
 *                 enum: [rider, driver]
 *                 example: "rider"
 *               firebaseUid:
 *                 type: string
 *                 example: "abc123xyz"
 *     responses:
 *       200:
 *         description: Existing user linked with firebaseUid
 *       201:
 *         description: New user registered successfully
 *       500:
 *         description: Registration failed
 */
router.post('/register-or-link', verifyToken, wrap(registerOrLink));

/**
 * @swagger
 * /auth/driver/onboarding:
 *   post:
 *     summary: Submit driver onboarding details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleDetails:
 *                 type: object
 *               licenseDetails:
 *                 type: object
 *     responses:
 *       200:
 *         description: Onboarding submitted
 */
router.post('/driver/onboarding', verifyToken, wrap(submitDriverOnboarding));

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 */
router.get('/profile', verifyToken, wrap(getProfile));

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               profileImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: No valid fields to update
 *       404:
 *         description: User not found
 */
router.patch('/profile', verifyToken, wrap(updateProfile));

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: Get active sessions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 */
router.get('/sessions', verifyToken, wrap(getActiveSessions));

/**
 * @swagger
 * /auth/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked
 */
router.delete('/sessions/:sessionId', verifyToken, wrap(revokeSession));

/**
 * @swagger
 * /auth/sessions:
 *   delete:
 *     summary: Revoke all sessions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions revoked
 */
router.delete('/sessions', verifyToken, wrap(revokeAllSessions));

/**
 * @swagger
 * /auth/login-history:
 *   get:
 *     summary: Get login history
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Login history entries
 */
router.get('/login-history', verifyToken, wrap(getLoginHistory));

/**
 * @swagger
 * /auth/account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 */
router.delete('/account', verifyToken, wrap(deleteAccount));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out
 */
router.post('/logout', verifyToken, wrap(logout));

/**
 * @swagger
 * /auth/fcm-token:
 *   post:
 *     summary: Register FCM token for push notifications
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase Cloud Messaging device token
 *     responses:
 *       200:
 *         description: FCM token registered
 */
router.post('/fcm-token', verifyToken, wrap(registerFcmToken));

/**
 * @swagger
 * /auth/fcm-token:
 *   delete:
 *     summary: Remove FCM token (on logout/uninstall)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: FCM token removed
 */
router.delete('/fcm-token', verifyToken, wrap(removeFcmToken));

// ─── Two-Factor Authentication ──────────────────────────────────

/**
 * @swagger
 * /auth/2fa/send:
 *   post:
 *     summary: Send 2FA OTP to user's phone
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA code sent
 */
router.post('/2fa/send', verifyToken, wrap(send2faOtp));

/**
 * @swagger
 * /auth/2fa/verify:
 *   post:
 *     summary: Verify 2FA OTP code
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA verified successfully
 */
router.post('/2fa/verify', verifyToken, wrap(verify2faOtp));

/**
 * @swagger
 * /auth/2fa/toggle:
 *   patch:
 *     summary: Enable or disable 2FA
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 2FA setting updated
 */
router.patch('/2fa/toggle', verifyToken, wrap(toggle2fa));

/**
 * @swagger
 * /auth/notifications:
 *   get:
 *     summary: Get rider notifications
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/notifications', verifyToken, wrap(getRiderNotifications));

/**
 * @swagger
 * /auth/notifications/read-all:
 *   patch:
 *     summary: Mark all rider notifications as read
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.patch('/notifications/read-all', verifyToken, wrap(markAllRiderNotificationsRead));

/**
 * @swagger
 * /auth/notifications/{id}/read:
 *   patch:
 *     summary: Mark a single rider notification as read
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/notifications/:id/read', verifyToken, wrap(markRiderNotificationRead));

/**
 * @swagger
 * /auth/notification-preferences:
 *   get:
 *     summary: Get notification preferences (push, email, sms)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences
 */
router.get('/notification-preferences', verifyToken, wrap(getNotificationPreferences));

/**
 * @swagger
 * /auth/notification-preferences:
 *   patch:
 *     summary: Update notification preferences
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               push:
 *                 type: boolean
 *               email:
 *                 type: boolean
 *               sms:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated notification preferences
 */
router.patch('/notification-preferences', verifyToken, wrap(updateNotificationPreferences));

export default router;
