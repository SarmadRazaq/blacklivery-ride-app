import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { rideService } from '../services/RideService';
import { RideStatus } from '../models/Ride';
import { RegionCode } from '../config/region.config';
import { logger } from '../utils/logger';

export const createRide = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const ride = await rideService.createRideRequest(req.user.uid, req.body);
        await rideService.startDriverMatching(ride.id!);
        res.status(201).json(ride);
    } catch (error) {
        console.error('Create Ride Error:', error); // Visible in terminal
        logger.error({ err: error }, 'Failed to create ride');
        res.status(500).json({
            error: 'Unable to create ride request',
            details: (error as Error).message // Show actual error to user
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

        const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : 5;
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
