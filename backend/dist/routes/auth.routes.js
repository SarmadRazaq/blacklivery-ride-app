"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
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
router.post('/phone/start', auth_controller_1.startPhoneVerification);
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
router.post('/phone/verify', auth_controller_1.verifyPhoneVerification);
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
router.post('/google', auth_controller_1.googleSignIn);
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
router.post('/password/reset', auth_controller_1.requestPasswordReset);
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
router.post('/register-or-link', auth_controller_1.registerOrLink);
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
router.post('/register', auth_middleware_1.verifyToken, auth_controller_1.register);
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
router.post('/driver/onboarding', auth_middleware_1.verifyToken, auth_controller_1.submitDriverOnboarding);
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
router.get('/profile', auth_middleware_1.verifyToken, auth_controller_1.getProfile);
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
router.post('/logout', auth_middleware_1.verifyToken, auth_controller_1.logout);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map