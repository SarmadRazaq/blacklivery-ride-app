import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { globalLimiter, authLimiter } from './middlewares/rateLimit.middleware';
import { db } from './config/firebase';
import { logger } from './utils/logger';

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
import chatRoutes from './routes/chat.routes';
import placesRoutes from './routes/places.routes';
import loyaltyRoutes from './routes/loyalty.routes';
import contactsRoutes from './routes/contacts.routes';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app = express();

// Trust first proxy (needed for correct client IP in rate limiting behind load balancer)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Request logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Swagger Documentation (disable in production)
if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
}));

// Body parsing with size limits
app.use(express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/places', placesRoutes);
app.use('/api/v1/loyalty', loyaltyRoutes);
app.use('/api/v1/contacts', contactsRoutes);

// Health Check (verifies Firebase connectivity)
app.get('/health', async (_req, res) => {
    try {
        // Quick Firestore read to verify connectivity
        await db.collection('_health').doc('ping').get();
        res.status(200).json({ status: 'OK', message: 'Blacklivery Backend API' });
    } catch (error) {
        res.status(503).json({ status: 'DEGRADED', message: 'Database connectivity issue' });
    }
});

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    const statusCode = (err as any).statusCode || 500;
    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

export default app;
