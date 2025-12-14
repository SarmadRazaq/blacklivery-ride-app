"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const rateLimit_middleware_1 = require("./middlewares/rateLimit.middleware");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const ride_routes_1 = __importDefault(require("./routes/ride.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const vehicle_routes_1 = __importDefault(require("./routes/vehicle.routes"));
const payout_routes_1 = __importDefault(require("./routes/payout.routes"));
const delivery_routes_1 = __importDefault(require("./routes/delivery.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const driver_routes_1 = __importDefault(require("./routes/driver.routes"));
const promotion_routes_1 = __importDefault(require("./routes/promotion.routes"));
const support_routes_1 = __importDefault(require("./routes/support.routes"));
const cron_routes_1 = __importDefault(require("./routes/cron.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const app = (0, express_1.default)();
// Swagger Documentation
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// FIX: Configure CORS to allow your frontend
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://localhost:3000'], // Allow Vite (5173) and React (3000)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use(rateLimit_middleware_1.globalLimiter); // Apply global rate limit to all requests
app.use('/api/v1/auth', rateLimit_middleware_1.authLimiter, auth_routes_1.default); // Apply stricter limit to auth
app.use('/api/v1/rides', ride_routes_1.default);
app.use('/api/v1/deliveries', delivery_routes_1.default);
app.use('/api/v1/payments', payment_routes_1.default);
app.use('/api/v1/vehicles', vehicle_routes_1.default);
app.use('/api/v1/payouts', payout_routes_1.default);
app.use('/api/v1/admin', admin_routes_1.default);
app.use('/api/v1/driver', driver_routes_1.default);
app.use('/api/v1/promotions', promotion_routes_1.default);
app.use('/api/v1/support', support_routes_1.default);
app.use('/api/v1/cron', cron_routes_1.default);
app.use('/api/v1/chat', chat_routes_1.default);
// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Blacklivery Backend API' });
});
exports.default = app;
//# sourceMappingURL=app.js.map