import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import {
    register,
    getProfile,
    logout,
    startPhoneVerification,
    verifyPhoneVerification,
    googleSignIn,
    requestPasswordReset,
    submitDriverOnboarding,
    registerTestUser
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
router.post('/phone/start', startPhoneVerification);

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
router.post('/phone/verify', verifyPhoneVerification);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Google Sign-In
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
 *         description: User authenticated via Google
 */
router.post('/google', googleSignIn);

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
router.post('/password/reset', requestPasswordReset);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
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
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               role:
 *                 type: string
 *                 enum: [rider, driver]
 *                 example: "rider"
 *               displayName:
 *                 type: string
 *                 example: "John Doe"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348012345678"
 *               country:
 *                 type: string
 *                 example: "Nigeria"
 *               vehicleType:
 *                 type: string
 *                 description: "Required if role is driver"
 *                 enum: [sedan, suv, van, motorbike]
 *                 example: "sedan"
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', verifyToken, register);

/**
 * @swagger
 * /auth/test/register:
 *   post:
 *     summary: Register a new user (TEST ONLY - No Token Required)
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
 *                 example: "test_rider@example.com"
 *               role:
 *                 type: string
 *                 enum: [rider, driver]
 *                 example: "rider"
 *               displayName:
 *                 type: string
 *                 example: "Test User"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348000000000"
 *     responses:
 *       201:
 *         description: Test user created successfully
 */
router.post('/test/register', registerTestUser);

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
router.post('/driver/onboarding', verifyToken, submitDriverOnboarding);

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
router.get('/profile', verifyToken, getProfile);

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
router.post('/logout', verifyToken, logout);

export default router;
