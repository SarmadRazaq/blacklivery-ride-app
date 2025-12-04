import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { globalLimiter, authLimiter } from './middlewares/rateLimit.middleware';

import authRoutes from './routes/auth.routes';
import rideRoutes from './routes/ride.routes';
import paymentRoutes from './routes/payment.routes';
import vehicleRoutes from './routes/vehicle.routes';
import payoutRoutes from './routes/payout.routes';
import deliveryRoutes from './routes/delivery.routes';
import adminRoutes from './routes/admin.routes';
import driverRoutes from './routes/driver.routes';
import promotionRoutes from './routes/promotion.routes';
import supportRoutes from './routes/support.routes';
import cronRoutes from './routes/cron.routes';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app = express();

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// FIX: Configure CORS to allow your frontend
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'], // Allow Vite (5173) and React (3000)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({
    verify: (req: any, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(globalLimiter); // Apply global rate limit to all requests

app.use('/api/v1/auth', authLimiter, authRoutes); // Apply stricter limit to auth
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/deliveries', deliveryRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/payouts', payoutRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/driver', driverRoutes);
app.use('/api/v1/promotions', promotionRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/cron', cronRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Blacklivery Backend API' });
});

export default app;
