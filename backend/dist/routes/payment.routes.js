"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const payment_controller_1 = require("../controllers/payment.controller");
const router = express_1.default.Router();
router.post('/initiate', auth_middleware_1.verifyToken, payment_controller_1.initiatePayment);
router.post('/verify', auth_middleware_1.verifyToken, payment_controller_1.verifyPayment);
// public webhooks
router.post('/webhooks/stripe', payment_controller_1.handleStripeWebhook);
router.post('/webhooks/paystack', payment_controller_1.handlePaystackWebhook);
router.post('/webhooks/flutterwave', payment_controller_1.handleFlutterwaveWebhook);
router.post('/webhooks/monnify', payment_controller_1.handleMonnifyWebhook);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map