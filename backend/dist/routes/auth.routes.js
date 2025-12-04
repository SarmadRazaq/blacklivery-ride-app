"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
router.post('/phone/start', auth_controller_1.startPhoneVerification);
router.post('/phone/verify', auth_controller_1.verifyPhoneVerification);
router.post('/google', auth_controller_1.googleSignIn);
router.post('/password/reset', auth_controller_1.requestPasswordReset);
router.post('/register', auth_middleware_1.verifyToken, auth_controller_1.register);
router.post('/driver/onboarding', auth_middleware_1.verifyToken, auth_controller_1.submitDriverOnboarding);
router.get('/profile', auth_middleware_1.verifyToken, auth_controller_1.getProfile);
router.post('/logout', auth_middleware_1.verifyToken, auth_controller_1.logout);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map