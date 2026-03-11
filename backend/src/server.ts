import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from project root (backend/).
// In dev (ts-node): __dirname = backend/src/  → up 1 level
// In prod (compiled): __dirname = backend/dist/src/ → up 2 levels
const projectRoot = path.resolve(__dirname, __dirname.includes(path.sep + 'dist' + path.sep) ? '../..' : '..');
const envPath = path.join(projectRoot, '.env');

if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.error('Failed to load .env file:', result.error);
    } else {
        console.log(`Loaded environment configuration from ${envPath}`);
    }
} else if (process.env.NODE_ENV === 'production') {
    console.log('No .env file found — using environment variables from host/container.');
} else {
    console.warn(`Warning: .env file not found at ${envPath}`);
}

import { validateEnvironment } from './config/env.validation';
validateEnvironment();

import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import app from './app';
import { socketService } from './services/SocketService';
import { startDriverStatusMonitor } from './services/DriverStatusService';
import { locationService } from './services/LocationService';
import { rideService } from './services/RideService';
import { db, rtdb, auth } from './config/firebase';
import { logger } from './utils/logger';
import { cronService } from './services/CronSchedulerService';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Initialize Socket Service
socketService.attachServer(io);

// In-memory cache: driverId → { riderId, expiresAt }
// Avoids querying Firestore on every location_update socket event
const activeRideCache = new Map<string, { riderId: string; expiresAt: number }>();
const RIDE_CACHE_TTL_MS = 30_000; // 30 seconds

// Socket.IO authentication middleware — verify Firebase ID token before connection
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        const decodedToken = await auth.verifyIdToken(token, true);
        (socket as any).user = decodedToken;

        // Load user role from Firestore
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists) {
            (socket as any).user.role = userDoc.data()?.role;
        }

        next();
    } catch (error) {
        logger.warn({ err: error }, 'Socket auth failed');
        next(new Error('Invalid or expired token'));
    }
});

io.on('connection', (socket) => {
    const user = (socket as any).user;
    logger.info({ socketId: socket.id, uid: user?.uid }, 'Authenticated client connected');

    socket.on('join:admin', () => {
        if (user?.role !== 'admin') {
            logger.warn({ socketId: socket.id, uid: user?.uid }, 'Non-admin tried to join admin room');
            socket.emit('error', { message: 'Admin access required' });
            return;
        }
        socket.join('admin');
        logger.info({ socketId: socket.id }, 'Socket joined admin room');
    });

    socket.on('join:driver', (driverId: string) => {
        if (!driverId || typeof driverId !== 'string') return;
        // Ensure drivers can only join their own room
        if (user?.uid !== driverId) {
            logger.warn({ socketId: socket.id, uid: user?.uid, requestedId: driverId }, 'Driver room join denied — UID mismatch');
            return;
        }
        socket.join(`driver:${driverId}`);
        logger.info({ socketId: socket.id, driverId }, 'Socket joined driver room');

        // Push current active ride state on room join (reconnect recovery)
        db.collection('rides')
            .where('driverId', '==', driverId)
            .where('status', 'in', ['accepted', 'arrived', 'in_progress'])
            .limit(1)
            .get()
            .then(snap => {
                if (!snap.empty) {
                    const ride = { id: snap.docs[0].id, ...snap.docs[0].data() };
                    socket.emit('ride:state_sync', ride);
                }
            })
            .catch(err => logger.debug({ err, driverId }, 'Failed to push ride state on driver join'));
    });

    socket.on('join:rider', (riderId: string) => {
        if (!riderId || typeof riderId !== 'string') return;
        // Ensure riders can only join their own room
        if (user?.uid !== riderId) {
            logger.warn({ socketId: socket.id, uid: user?.uid, requestedId: riderId }, 'Rider room join denied — UID mismatch');
            return;
        }
        socket.join(`rider:${riderId}`);
        logger.info({ socketId: socket.id, riderId }, 'Socket joined rider room');

        // Push current active ride state on room join (reconnect recovery)
        db.collection('rides')
            .where('riderId', '==', riderId)
            .where('status', 'in', ['finding_driver', 'pending', 'accepted', 'arrived', 'in_progress'])
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get()
            .then(async snap => {
                if (!snap.empty) {
                    const doc = snap.docs[0];
                    const rideData: Record<string, any> = { id: doc.id, ...doc.data() };
                    // Enrich with driver info if assigned
                    if (rideData.driverId) {
                        try {
                            const driverDoc = await db.collection('users').doc(rideData.driverId).get();
                            if (driverDoc.exists) {
                                const dd = driverDoc.data()!;
                                const dp = dd.driverProfile ?? {};
                                const onb = dd.driverOnboarding ?? {};
                                rideData.driverName = dd.fullName || dd.displayName || 'Driver';
                                rideData.driverPhoto = dd.photoURL || dp.photoURL || '';
                                rideData.driverRating = dp.rating ?? dd.rating ?? 5.0;
                                rideData.driverPhone = dd.phone || dd.phoneNumber || '';
                                rideData.vehicleModel = dp.vehicleModel || dp.vehicle?.model || onb.vehicleType || '';
                                rideData.vehicleColor = dp.vehicleColor || dp.vehicle?.color || onb.vehicleColor || '';
                                rideData.vehiclePlate = dp.licensePlate || dp.vehicle?.plateNumber || onb.liveryPlateNumber || '';
                            }
                        } catch (_) { /* best-effort */ }
                    }
                    socket.emit('ride:state_sync', rideData);
                }
            })
            .catch(err => logger.debug({ err, riderId }, 'Failed to push ride state on rider join'));
    });

    // Driver accepts a ride via socket
    socket.on('accept_ride', async (data: { rideId: string }) => {
        try {
            const rideId = data?.rideId;
            if (!rideId) return;

            // Identify driver from rooms (driver:{uid})
            const rooms = Array.from(socket.rooms);
            const driverRoom = rooms.find(r => r.startsWith('driver:'));
            const driverId = driverRoom?.split(':')[1];
            if (!driverId) {
                logger.warn({ socketId: socket.id }, 'accept_ride: driver not in a driver room');
                return;
            }

            await rideService.transitionRideStatus({
                rideId,
                status: 'accepted',
                actor: { uid: driverId, role: 'driver' },
                payload: {}
            });
            logger.info({ rideId, driverId }, 'Ride accepted via socket');
        } catch (error) {
            logger.error({ err: error, data }, 'Failed to accept ride via socket');
            socket.emit('ride:error', { error: (error as Error).message });
        }
    });

    // Driver declines a ride via socket
    socket.on('decline_ride', async (data: { rideId: string; reason?: string }) => {
        try {
            const rideId = data?.rideId;
            const driverId = (socket as any).user?.uid;
            if (!rideId || !driverId) return;

            // Record decline so matching excludes this driver on retry
            await rideService.recordDriverDecline(rideId, driverId);
            logger.info({ rideId, driverId, reason: data?.reason }, 'Driver declined ride — exclusion recorded');
        } catch (error) {
            logger.error({ err: error, data }, 'Failed to handle decline_ride');
        }
    });

    // Driver sends real-time location updates
    socket.on('location_update', async (data: { latitude: number; longitude: number; heading?: number; speed?: number; timestamp?: string }) => {
        try {
            const rooms = Array.from(socket.rooms);
            const driverRoom = rooms.find(r => r.startsWith('driver:'));
            const driverId = driverRoom?.split(':')[1];
            if (!driverId) return;

            await locationService.publishDriverLocation(
                driverId,
                data.latitude,
                data.longitude,
                data.heading,
                data.speed
            );

            // Broadcast to admin room for LiveMap + to rider rooms tracking this driver
            const locationPayload = {
                id: driverId,
                lat: data.latitude,
                lng: data.longitude,
                heading: data.heading,
                status: 'busy' as const,
            };
            io.to('admin').emit('driver:location', locationPayload);

            // Also emit to rider who has an active ride with this driver
            // Use in-memory cache to avoid Firestore query on every location update
            const now = Date.now();
            let cached = activeRideCache.get(driverId);
            if (!cached || cached.expiresAt < now) {
                const activeRideSnap = await db.collection('rides')
                    .where('driverId', '==', driverId)
                    .where('status', 'in', ['accepted', 'arrived', 'in_progress'])
                    .limit(1)
                    .get();
                if (!activeRideSnap.empty) {
                    const ride = activeRideSnap.docs[0].data();
                    if (ride.riderId) {
                        cached = { riderId: ride.riderId, expiresAt: now + RIDE_CACHE_TTL_MS };
                        activeRideCache.set(driverId, cached);
                    } else {
                        activeRideCache.delete(driverId);
                        cached = undefined;
                    }
                } else {
                    activeRideCache.delete(driverId);
                    cached = undefined;
                }
            }
            if (cached) {
                io.to(`rider:${cached.riderId}`).emit('driver:location', {
                    lat: data.latitude,
                    lng: data.longitude,
                    heading: data.heading,
                });
            }
        } catch (error) {
            // Silently log — location updates are high frequency
            logger.debug({ err: error }, 'Location update failed');
        }
    });

    // Driver toggles online/offline status
    socket.on('driver_status', async (data: { isOnline: boolean }) => {
        try {
            const rooms = Array.from(socket.rooms);
            const driverRoom = rooms.find(r => r.startsWith('driver:'));
            const driverId = driverRoom?.split(':')[1];
            if (!driverId) return;

            const now = new Date();
            await db.collection('users').doc(driverId).update({
                'driverStatus.isOnline': data.isOnline,
                'driverStatus.state': data.isOnline ? 'available' : 'offline',
                'driverStatus.lastHeartbeat': now,
                'driverStatus.updatedAt': now
            });

            await rtdb.ref(`drivers/${driverId}/status`).update({
                isOnline: data.isOnline,
                state: data.isOnline ? 'available' : 'offline',
                updatedAt: now.toISOString()
            });

            logger.info({ driverId, isOnline: data.isOnline }, 'Driver status updated via socket');
        } catch (error) {
            logger.error({ err: error }, 'Failed to update driver status');
        }
    });

    // ─── Rider location update ───────────────────────────────────────────
    // Rider emits their location during active rides so the driver can see
    // the pickup approach and the admin LiveMap can track both parties.
    socket.on('rider_location', async (data: { latitude: number; longitude: number; rideId?: string }) => {
        try {
            const rooms = Array.from(socket.rooms);
            const riderRoom = rooms.find(r => r.startsWith('rider:'));
            const riderId = riderRoom?.split(':')[1];
            if (!riderId) return;

            const payload = {
                riderId,
                lat: data.latitude,
                lng: data.longitude,
                timestamp: new Date().toISOString(),
            };

            // Broadcast to admin for LiveMap
            io.to('admin').emit('rider:location', payload);

            // If we know the rideId, emit to the assigned driver
            if (data.rideId) {
                const rideDoc = await db.collection('rides').doc(data.rideId).get();
                if (rideDoc.exists) {
                    const ride = rideDoc.data()!;
                    if (ride.driverId && ['accepted', 'arrived', 'in_progress'].includes(ride.status)) {
                        io.to(`driver:${ride.driverId}`).emit('rider:location', payload);
                    }
                }
            }
        } catch (error) {
            logger.debug({ err: error }, 'Rider location update failed');
        }
    });

    socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'Client disconnected');
    });

    socket.on('error', (err) => {
        logger.error({ err, socketId: socket.id }, 'Socket error');
    });
});

server.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server running');
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    cronService.stop();
    server.close(() => {
        logger.info('HTTP server closed');
        io.close(() => {
            logger.info('Socket.io server closed');
            process.exit(0);
        });
    });

    // Force exit after 10s
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception');
    process.exit(1);
});

startDriverStatusMonitor();

// Recover any rides that were mid-matching when server restarted
rideService.recoverActiveMatching().catch(err =>
    logger.error({ err }, 'Failed to recover active matching on startup')
);

// Start cron scheduler for background tasks
cronService.start();

export { io };
