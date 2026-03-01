import { rtdb } from '../config/firebase';
import { googleMapsService } from './GoogleMapsService';
import { socketService } from './SocketService';
import { logger } from '../utils/logger';
import { IRide, RideStatus } from '../models/Ride';

interface RideStreamContext {
    rideId: string;
    driverId: string;
    riderId: string;
    pickupLocation: IRide['pickupLocation'];
    dropoffLocation: IRide['dropoffLocation'];
    stage: RideStatus;
    lastBroadcast: number;
    interval?: NodeJS.Timeout;
}

class RideTrackingService {
    private readonly MIN_BROADCAST_INTERVAL_MS = 5000;
    private readonly SNAPSHOT_INTERVAL_MS = 30000;

    private streams = new Map<string, RideStreamContext>();
    private driverLookup = new Map<string, string>();

    public startTracking(ride: IRide): void {
        if (!ride.id || !ride.driverId) return;

        this.stopTracking(ride.id);

        const context: RideStreamContext = {
            rideId: ride.id,
            driverId: ride.driverId,
            riderId: ride.riderId,
            pickupLocation: ride.pickupLocation,
            dropoffLocation: ride.dropoffLocation,
            stage: ride.status,
            lastBroadcast: 0
        };

        context.interval = setInterval(() => {
            this.pushSnapshot(context.rideId).catch((err) =>
                logger.error({ err, rideId: context.rideId }, 'ride snapshot push failed')
            );
        }, this.SNAPSHOT_INTERVAL_MS);

        this.streams.set(ride.id, context);
        this.driverLookup.set(ride.driverId, ride.id);
        socketService.joinRideRoom(ride.id, ride.riderId, ride.driverId);
    }

    public updateStage(rideId: string, stage: RideStatus): void {
        const context = this.streams.get(rideId);
        if (!context) return;
        context.stage = stage;
        this.streams.set(rideId, context);
    }

    public stopTracking(rideId: string): void {
        const context = this.streams.get(rideId);
        if (context?.interval) clearInterval(context.interval);
        if (context) {
            this.driverLookup.delete(context.driverId);
            socketService.leaveRideRoom(rideId);
        }
        this.streams.delete(rideId);
    }

    public async handleDriverHeartbeat(
        driverId: string,
        location?: { lat: number; lng: number; heading?: number } | null
    ): Promise<void> {
        const rideId = this.driverLookup.get(driverId);
        if (!rideId) return;

        const context = this.streams.get(rideId);
        if (!context) return;

        if (!location) {
            const snapshot = await rtdb.ref(`drivers/${driverId}/location`).get();
            location = snapshot.val();
        }

        if (!location) return;
        if (Date.now() - context.lastBroadcast < this.MIN_BROADCAST_INTERVAL_MS) return;

        await this.emitRideUpdate(context, location);
    }

    private async pushSnapshot(rideId: string): Promise<void> {
        const context = this.streams.get(rideId);
        if (!context) return;

        const snapshot = await rtdb.ref(`drivers/${context.driverId}/location`).get();
        const location = snapshot.val();
        if (!location) return;

        await this.emitRideUpdate(context, location);
    }

    private async emitRideUpdate(
        context: RideStreamContext,
        location: { lat: number; lng: number; heading?: number }
    ): Promise<void> {
        try {
            const headingStage = context.stage === 'accepted' || context.stage === 'arrived' ? 'pickup' : 'dropoff';
            const target = headingStage === 'pickup' ? context.pickupLocation : context.dropoffLocation;

            let etaData = undefined;

            if (target) {
                const eta = await googleMapsService.getDistanceAndDuration(
                    { lat: location.lat, lng: location.lng },
                    { lat: target.lat, lng: target.lng }
                );
                etaData = {
                    seconds: eta.durationSeconds,
                    text: eta.durationText,
                    distanceMeters: eta.distanceMeters,
                    distanceText: eta.distanceText
                };
            }

            socketService.emitRideUpdate(context.rideId, {
                rideId: context.rideId,
                driverId: context.driverId,
                riderId: context.riderId,
                stage: context.stage,
                nextStop: headingStage,
                location,
                eta: etaData,
                updatedAt: new Date().toISOString()
            });

            context.lastBroadcast = Date.now();
            this.streams.set(context.rideId, context);
        } catch (error) {
            logger.error({ err: error, rideId: context.rideId }, 'Failed to emit ride update');
        }
    }
}

export const rideTrackingService = new RideTrackingService();