import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { rideService } from '../services/RideService';
import { RideStatus } from '../models/Ride';
import { RegionCode } from '../config/region.config';
import { db } from '../config/firebase';
import { logger } from '../utils/logger';
import { socketService } from '../services/SocketService';

export const createRide = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const ride = await rideService.createRideRequest(req.user.uid, req.body);
        await rideService.startDriverMatching(ride.id!);
        res.status(201).json(ride);
    } catch (error) {
        logger.error({ err: error }, 'Failed to create ride');
        res.status(500).json({
            error: 'Unable to create ride request'
        });
    }
};

export const getRide = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const ride = await rideService.getRide(req.params.id);
        if (!ride) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        // Authorization: only participants or admins can view a ride
        const rideData = ride as any;
        if (rideData.riderId !== req.user.uid && rideData.driverId !== req.user.uid && req.user.role !== 'admin') {
            res.status(403).json({ error: 'Not authorized to view this ride' });
            return;
        }

        res.status(200).json(ride);
    } catch (error) {
        logger.error({ err: error, rideId: req.params.id }, 'Failed to fetch ride');
        res.status(500).json({ error: 'Unable to fetch ride' });
    }
};

export const getNearbyDrivers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            res.status(400).json({ error: 'lat and lng are required' });
            return;
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            res.status(400).json({ error: 'lat must be between -90 and 90, lng between -180 and 180' });
            return;
        }

        const rawRadius = req.query.radiusKm ? Number(req.query.radiusKm) : 5;
        const radiusKm = Number.isNaN(rawRadius) || rawRadius <= 0 ? 5 : Math.min(rawRadius, 50);
        const vehicleCategory = req.query.vehicleCategory?.toString();
        const region = req.query.region?.toString() as RegionCode | undefined;

        const drivers = await rideService.findNearbyDrivers(lat, lng, radiusKm, {
            vehicleCategory,
            region
        });

        res.status(200).json(drivers);
    } catch (error) {
        logger.error({ err: error }, 'Failed to fetch nearby drivers');
        res.status(500).json({ error: 'Unable to fetch drivers' });
    }
};

export const updateRideStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const ride = await rideService.transitionRideStatus({
            rideId: req.params.id,
            status: req.body.status as RideStatus,
            actor: { uid: req.user.uid, role: req.user.role as 'rider' | 'driver' | 'admin' },
            payload: req.body
        });

        res.status(200).json(ride);
    } catch (error) {
        logger.error({ err: error, rideId: req.params.id }, 'Failed to update ride status');
        res.status(400).json({ error: (error as Error).message ?? 'Unable to update ride status' });
    }
};

/**
 * Estimate fare without creating a ride
 */
export const estimateFare = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { pickup, dropoff, vehicleCategory, region, bookingType } = req.body;

        if (!pickup || !dropoff || !vehicleCategory || !region) {
            res.status(400).json({ error: 'pickup, dropoff, vehicleCategory, and region are required' });
            return;
        }

        const estimate = await rideService.estimateFare({
            pickup,
            dropoff,
            vehicleCategory,
            region,
            bookingType
        });

        res.status(200).json({ success: true, data: estimate });
    } catch (error) {
        logger.error({ err: error }, 'Failed to estimate fare');
        res.status(500).json({ error: 'Unable to estimate fare' });
    }
};

/**
 * Get ride history for the authenticated user
 */
export const getRideHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string | undefined;
        const role = req.user.role as 'rider' | 'driver';

        const result = await rideService.getRideHistory(req.user.uid, role, { page, limit, status });

        res.status(200).json({ success: true, data: result.rides, pagination: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
        logger.error({ err: error }, 'Failed to get ride history');
        res.status(500).json({ error: 'Unable to fetch ride history' });
    }
};

/**
 * Rate a driver after ride completion (by rider)
 */
export const rateDriver = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rating, feedback } = req.body;
        const rideId = req.params.id;

        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            res.status(400).json({ error: 'Rating must be between 1 and 5' });
            return;
        }

        const ride = await rideService.rateDriver(rideId, req.user.uid, rating, feedback);

        res.status(200).json({ success: true, data: ride });
    } catch (error) {
        logger.error({ err: error, rideId: req.params.id }, 'Failed to rate driver');
        res.status(400).json({ error: (error as Error).message ?? 'Unable to rate driver' });
    }
};

/**
 * Rate a rider after ride completion (by driver)
 */
export const rateRider = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rating, feedback } = req.body;
        const rideId = req.params.id;

        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            res.status(400).json({ error: 'Rating must be between 1 and 5' });
            return;
        }

        const ride = await rideService.rateRider(rideId, req.user.uid, rating, feedback);

        res.status(200).json({ success: true, data: ride });
    } catch (error) {
        logger.error({ err: error, rideId: req.params.id }, 'Failed to rate rider');
        res.status(400).json({ error: (error as Error).message ?? 'Unable to rate rider' });
    }
};

/**
 * Get scheduled rides for the authenticated user
 */
export const getScheduledRides = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const snapshot = await db.collection('rides')
            .where('riderId', '==', req.user.uid)
            .where('scheduledAt', '>=', now)
            .where('status', 'in', ['requested', 'finding_driver', 'accepted'])
            .orderBy('scheduledAt', 'asc')
            .limit(50)
            .get();

        const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ data: rides });
    } catch (error) {
        logger.error({ err: error }, 'Failed to get scheduled rides');
        res.status(500).json({ error: 'Unable to fetch scheduled rides' });
    }
};

/**
 * Add a tip to a completed ride
 */
export const addTip = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Tip amount must be positive' });
            return;
        }

        // Cap tips at 5x the fare or $500/₦50,000 max
        const MAX_TIP = 50000;
        if (amount > MAX_TIP) {
            res.status(400).json({ error: `Tip cannot exceed ${MAX_TIP}` });
            return;
        }

        const rideRef = db.collection('rides').doc(id);
        const rideDoc = await rideRef.get();

        if (!rideDoc.exists) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const rideData = rideDoc.data()!;

        if (rideData.riderId !== req.user.uid) {
            res.status(403).json({ error: 'You can only tip your own rides' });
            return;
        }

        if (rideData.status !== 'completed') {
            res.status(400).json({ error: 'You can only tip completed rides' });
            return;
        }

        // Prevent double-tipping
        if (rideData.tip && rideData.tip > 0) {
            res.status(400).json({ error: 'Tip has already been added to this ride' });
            return;
        }

        await rideRef.update({
            tip: amount,
            updatedAt: new Date()
        });

        // If the ride has a driver, credit the tip to their wallet
        if (rideData.driverId) {
            try {
                const { walletService } = await import('../services/WalletService');
                const currency = rideData.pricing?.currency || 'NGN';
                await walletService.processTransaction(
                    rideData.driverId,
                    amount,
                    'credit',
                    'ride_payment',
                    `Tip for ride ${id}`,
                    `tip-${id}-${Date.now()}`,
                    { walletCurrency: currency as 'NGN' | 'USD' }
                );
            } catch (tipError) {
                logger.error({ err: tipError, rideId: id }, 'Failed to credit tip to driver wallet');
            }
        }

        res.status(200).json({ success: true, message: 'Tip added', tip: amount });
    } catch (error) {
        logger.error({ err: error, rideId: req.params.id }, 'Failed to add tip');
        res.status(500).json({ error: 'Unable to add tip' });
    }
};

/**
 * SOS emergency alert — driver triggers emergency during a ride
 */
export const sosAlert = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id: rideId } = req.params;
        const driverId = req.user.uid;

        const rideDoc = await db.collection('rides').doc(rideId).get();
        if (!rideDoc.exists) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        if (rideDoc.data()?.driverId !== driverId) {
            res.status(403).json({ error: 'Not authorized for this ride' });
            return;
        }

        const payload = {
            rideId,
            driverId,
            location: req.body.location ?? null,
            timestamp: new Date(),
            status: 'active'
        };

        await db.collection('sos_incidents').add(payload);

        socketService.notifyAdmin('sos:alert', payload);

        logger.warn({ rideId, driverId }, 'SOS alert triggered');

        res.status(200).json({ received: true });
    } catch (error) {
        logger.error({ err: error, rideId: req.params.id }, 'SOS alert failed');
        res.status(500).json({ error: 'Unable to process SOS alert' });
    }
};
