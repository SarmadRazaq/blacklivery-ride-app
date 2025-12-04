import { FieldValue } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';
import { IRide, RideStatus } from '../models/Ride';
import { socketService } from './SocketService';
import { rideEvents } from '../events/RideEvents';
import { rideTrackingService } from './RideTrackingService';
import { logger } from '../utils/logger';
import { encodeGeohash, geohashNeighbors } from '../utils/geohash';
import { pricingService } from './pricing/PricingService';
import { pricingConfigService } from './pricing/PricingConfigService';
import { walletService } from './WalletService';
import { incentiveService } from './driver/IncentiveService';
import { googleMapsService } from './GoogleMapsService';

interface DriverSearchFilters {
    vehicleCategory?: string;
    region?: IRide['region'];
    excludeDriverIds?: string[];
}

interface NearbyDriver {
    id: string;
    distanceKm: number;
    etaSeconds: number;
    profile: {
        displayName?: string;
        rating?: number;
        vehicleType?: string;
        photoURL?: string;
    };
    location: { lat: number; lng: number };
}

interface RideStatusTransitionInput {
    rideId: string;
    status: RideStatus;
    actor: { uid: string; role: 'rider' | 'driver' | 'admin' };
    payload?: Record<string, any>;
}

interface PaymentsConfigDoc {
    defaultCommissionRate?: number;
    commissionRate?: number;
    microDeductions?: { flatFee?: number; percentage?: number };
    subscription?: { discountRate?: number; defaultDiscount?: number; waiveMicroFees?: boolean };
    regions?: Record<
        IRide['region'],
        {
            commissionRate?: number;
            microDeductions?: { flatFee?: number; percentage?: number };
        }
    >;
}

export class RideService {
    private readonly DRIVER_BATCH_SIZE = 10;
    private readonly MAX_BATCHES = 3;
    private readonly INITIAL_RADIUS_KM = 5;
    private readonly RADIUS_STEP_KM = 5;
    private readonly BATCH_TIMEOUT_MS = 30000;
    private readonly MIN_DRIVER_RATING = 4.5;

    private matchState = new Map<string, { radius: number; batch: number }>();
    private matchTimers = new Map<string, NodeJS.Timeout>();
    private paymentConfigCache?: { data: PaymentsConfigDoc; expiresAt: number };

    public async getRide(rideId: string): Promise<IRide | null> {
        const doc = await db.collection('rides').doc(rideId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...(doc.data() as IRide) };
    }

    public async createRideRequest(riderId: string, requestData: any): Promise<IRide> {
        const now = new Date();

        // Map API fields (pickup/dropoff) to Model fields (pickupLocation/dropoffLocation)
        const pickupLocation = requestData.pickup || requestData.pickupLocation;
        const dropoffLocation = requestData.dropoff || requestData.dropoffLocation;

        if (!pickupLocation || !dropoffLocation) {
            throw new Error('Pickup and Dropoff locations are required');
        }

        // Validate Distance/Pricing
        const routeData = await googleMapsService.getDistanceAndDuration(
            pickupLocation,
            dropoffLocation
        );

        const distanceKm = routeData.distanceMeters / 1000;
        const durationMinutes = routeData.durationSeconds / 60;

        const mockRide = {
            ...requestData,
            pickupLocation,   // Ensure these are set for pricing calculation
            dropoffLocation,
            riderId,
            createdAt: now
        };

        const authoritativePrice = await pricingService.calculateFare(mockRide, distanceKm, durationMinutes);

        const pickupGeohash = encodeGeohash(pickupLocation.lat, pickupLocation.lng, 7);
        const dropoffGeohash = encodeGeohash(dropoffLocation.lat, dropoffLocation.lng, 7);

        const rideRecord: IRide = {
            riderId,
            status: 'finding_driver',
            bookingType: requestData.bookingType ?? 'on_demand',
            pickupLocation,
            dropoffLocation,
            vehicleCategory: requestData.vehicleCategory,
            region: requestData.region,
            ...(requestData.city && { city: requestData.city }),
            ...(requestData.isAirport !== undefined && { isAirport: requestData.isAirport }),
            ...(requestData.airportCode && { airportCode: requestData.airportCode }),
            ...(requestData.hoursBooked && { hoursBooked: requestData.hoursBooked }),
            ...(requestData.hourlyStartTime && { hourlyStartTime: requestData.hourlyStartTime }),
            ...(requestData.deliveryDetails && { deliveryDetails: requestData.deliveryDetails }),
            ...(requestData.addOns && { addOns: requestData.addOns }),
            pricing: {
                estimatedFare: authoritativePrice.totalFare,
                currency: authoritativePrice.currency as 'NGN' | 'USD',
                surgeMultiplier: requestData.pricing?.surgeMultiplier ?? 1.0, // Should be server-calculated ideally
                breakdown: authoritativePrice
            },
            requestedDriverIds: [],
            createdAt: now,
            updatedAt: now,
            pickupGeohash,
            pickupGeohash5: pickupGeohash.substring(0, 5),
            dropoffGeohash5: dropoffGeohash.substring(0, 5),
            matching: { radiusKm: this.INITIAL_RADIUS_KM, batch: 0 }
        };

        const rideDoc = await db.collection('rides').add(rideRecord);
        const ride: IRide = { ...rideRecord, id: rideDoc.id };

        rideEvents.emit('ride.created', { rideId: rideDoc.id, riderId, requestedDriverIds: [] });
        socketService.notifyAdmin('ride:created', ride);

        return ride;
    }

    public async startDriverMatching(rideId: string): Promise<void> {
        this.matchState.set(rideId, { radius: this.INITIAL_RADIUS_KM, batch: 0 });
        await this.dispatchDriverBatch(rideId);
    }

    public stopDriverMatching(rideId: string): void {
        const timer = this.matchTimers.get(rideId);
        if (timer) clearTimeout(timer);
        this.matchTimers.delete(rideId);
        this.matchState.delete(rideId);
    }

    public async findNearbyDrivers(
        lat: number,
        lng: number,
        radiusKm: number,
        filters: DriverSearchFilters = {}
    ): Promise<NearbyDriver[]> {
        const precision = radiusKm > 8 ? 4 : 5;
        const field = precision === 5 ? 'driverStatus.geohash5' : 'driverStatus.geohash4';
        const baseHash = encodeGeohash(lat, lng, precision);
        const buckets = Array.from(new Set([baseHash, ...geohashNeighbors(baseHash)].map((hash) => hash.substring(0, precision))));

        const snapshots = await Promise.all(
            buckets.map((bucket) =>
                db
                    .collection('users')
                    .where('role', '==', 'driver')
                    .where('driverStatus.isOnline', '==', true)
                    .where(field, '==', bucket)
                    .limit(50)
                    .get()
            )
        );

        const candidates = new Map<string, FirebaseFirestore.DocumentSnapshot>();
        snapshots.forEach((snap) => snap.docs.forEach((doc) => candidates.set(doc.id, doc)));

        return Array.from(candidates.values())
            .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
            .filter((driver) => {
                const driverId = driver.uid ?? driver.id;
                if (!driverId) return false;

                if (filters.excludeDriverIds?.includes(driverId)) return false;

                // Check vehicle type in both profile and onboarding
                const vehicleType = (driver.driverProfile as any)?.vehicleType ?? driver.driverOnboarding?.vehicleType;
                if (filters.vehicleCategory && vehicleType !== filters.vehicleCategory) return false;

                // Handle region matching (map 'nigeria' -> 'ng', 'chicago' -> 'us')
                if (filters.region && driver.countryCode) {
                    const driverRegion = driver.countryCode.toLowerCase();
                    const filterRegion = filters.region.toLowerCase();

                    const isMatch =
                        driverRegion === filterRegion ||
                        (filterRegion === 'nigeria' && driverRegion === 'ng') ||
                        (filterRegion === 'chicago' && driverRegion === 'us');

                    if (!isMatch) return false;
                }

                if (driver.driverDetails?.rating && driver.driverDetails.rating < this.MIN_DRIVER_RATING) return false;
                if (!driver.driverStatus?.lastKnownLocation) return false;
                if (driver.driverStatus?.currentRideId) return false;

                return true;
            })
            .map((driver) => {
                const driverId = driver.uid ?? driver.id;
                const location = driver.driverStatus.lastKnownLocation;
                const distanceKm = this.haversineDistance({ lat, lng }, { lat: location.lat, lng: location.lng });

                return {
                    id: driverId,
                    distanceKm,
                    etaSeconds: Math.round((distanceKm / 30) * 3600),
                    profile: {
                        displayName: driver.displayName,
                        rating: driver.driverDetails?.rating,
                        vehicleType: driver.driverProfile?.vehicleType ?? driver.driverOnboarding?.vehicleType,
                        photoURL: driver.photoURL
                    },
                    location
                };
            })
            .filter((driver) => driver.distanceKm <= radiusKm)
            .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    public async transitionRideStatus(input: RideStatusTransitionInput): Promise<IRide> {
        const rideRef = db.collection('rides').doc(input.rideId);
        let updatedRide: IRide | null = null;
        let previousStatus: RideStatus = 'requested';

        await db.runTransaction(async (tx) => {
            const rideSnap = await tx.get(rideRef);
            if (!rideSnap.exists) throw new Error('Ride not found');

            const ride = { id: rideSnap.id, ...(rideSnap.data() as IRide) };
            previousStatus = ride.status;
            const now = new Date();

            switch (input.status) {
                case 'accepted': {
                    if (input.actor.role !== 'driver') throw new Error('Only drivers can accept rides');
                    if (ride.status !== 'finding_driver') throw new Error('Ride is no longer available');
                    if (ride.driverId && ride.driverId !== input.actor.uid) throw new Error('Ride already assigned');

                    const updates = {
                        driverId: input.actor.uid,
                        status: 'accepted' as RideStatus,
                        acceptedAt: now,
                        updatedAt: now,
                        requestedDriverIds: FieldValue.arrayUnion(input.actor.uid) as any
                    };

                    tx.update(rideRef, updates);
                    updatedRide = { ...ride, ...updates };
                    this.stopDriverMatching(ride.id!);
                    break;
                }
                case 'arrived':
                case 'in_progress': {
                    if (input.actor.role !== 'driver') throw new Error('Drivers only');
                    if (ride.driverId !== input.actor.uid) throw new Error('Driver mismatch');

                    const updates = {
                        status: input.status,
                        updatedAt: now,
                        ...(input.status === 'in_progress' && { startedAt: now })
                    };

                    tx.update(rideRef, updates);
                    updatedRide = { ...ride, ...updates };
                    break;
                }
                case 'completed': {
                    if (!['driver', 'admin'].includes(input.actor.role)) {
                        throw new Error('Only drivers or admins can complete rides');
                    }
                    if (ride.status !== 'in_progress') throw new Error('Ride must be in progress');

                    const updates = {
                        status: 'completed' as RideStatus,
                        completedAt: now,
                        updatedAt: now
                    };

                    tx.update(rideRef, updates);
                    updatedRide = { ...ride, ...updates };
                    break;
                }
                case 'cancelled': {
                    const cancelledBy: 'driver' | 'rider' | 'admin' =
                        input.actor.role === 'driver'
                            ? 'driver'
                            : input.actor.role === 'admin'
                                ? 'admin'
                                : 'rider';

                    const fee = this.getCancellationFee(ride, cancelledBy);

                    const updates = {
                        status: 'cancelled' as RideStatus,
                        cancelledAt: now,
                        cancellationReason: input.payload?.reason,
                        updatedAt: now,
                        'pricing.cancellationFee': fee
                    };

                    tx.update(rideRef, updates);
                    updatedRide = { ...ride, ...updates, pricing: { ...ride.pricing, cancellationFee: fee } };
                    this.stopDriverMatching(ride.id!);
                    break;
                }
                default:
                    throw new Error(`Unsupported status transition: ${input.status}`);
            }
        });

        if (!updatedRide) throw new Error('Ride transition failed');

        await this.handlePostStatusChange(updatedRide, previousStatus);
        socketService.notifyAdmin('ride:updated', updatedRide);
        return updatedRide;
    }

    private async dispatchDriverBatch(rideId: string): Promise<void> {
        const state = this.matchState.get(rideId);
        if (!state) return;

        const rideSnap = await db.collection('rides').doc(rideId).get();
        if (!rideSnap.exists) {
            this.stopDriverMatching(rideId);
            return;
        }

        const ride = { id: rideSnap.id, ...(rideSnap.data() as IRide) };
        if (ride.driverId || ride.status !== 'finding_driver') {
            this.stopDriverMatching(rideId);
            return;
        }

        try {
            const drivers = await this.findNearbyDrivers(ride.pickupLocation.lat, ride.pickupLocation.lng, state.radius, {
                vehicleCategory: ride.vehicleCategory,
                region: ride.region,
                excludeDriverIds: ride.requestedDriverIds ?? []
            });

            if (!drivers.length) {
                if (state.batch >= this.MAX_BATCHES - 1) {
                    await this.handleNoDrivers(ride);
                    return;
                }

                this.matchState.set(rideId, { radius: state.radius + this.RADIUS_STEP_KM, batch: state.batch + 1 });
                this.scheduleNextBatch(rideId);
                return;
            }

            const batch = drivers.slice(0, this.DRIVER_BATCH_SIZE);
            const driverIds = batch.map((driver) => driver.id);
            batch.forEach((driver) => {
                socketService.notifyDriver(driver.id, 'ride:offer', {
                    rideId,
                    pickupLocation: ride.pickupLocation,
                    dropoffLocation: ride.dropoffLocation,
                    pricing: ride.pricing,
                    etaSeconds: driver.etaSeconds,
                    distanceKm: driver.distanceKm
                });
            });

            if (state.batch < this.MAX_BATCHES - 1) {
                this.matchState.set(rideId, { radius: state.radius + this.RADIUS_STEP_KM, batch: state.batch + 1 });
                this.scheduleNextBatch(rideId);
            }
        } catch (error) {
            logger.error({ err: error, rideId }, 'Driver batch dispatch failed');
            this.scheduleNextBatch(rideId);
        }
    }

    private scheduleNextBatch(rideId: string): void {
        const currentTimer = this.matchTimers.get(rideId);
        if (currentTimer) clearTimeout(currentTimer);

        const timer = setTimeout(() => {
            this.dispatchDriverBatch(rideId).catch((err) =>
                logger.error({ err, rideId }, 'Batch dispatch retry failed')
            );
        }, this.BATCH_TIMEOUT_MS);

        this.matchTimers.set(rideId, timer);
    }

    private async handleNoDrivers(ride: IRide): Promise<void> {
        await db
            .collection('rides')
            .doc(ride.id!)
            .update({
                status: 'cancelled',
                cancellationReason: 'no_driver_available',
                cancelledAt: new Date()
            });

        socketService.notifyRider(ride.riderId, 'ride:no_driver', { rideId: ride.id });
        rideEvents.emit('ride.cancelled', { rideId: ride.id, riderId: ride.riderId });
        this.stopDriverMatching(ride.id!);
    }

    private async handlePostStatusChange(ride: IRide, _previous: RideStatus): Promise<void> {
        switch (ride.status) {
            case 'accepted':
                rideTrackingService.startTracking(ride);
                socketService.notifyRider(ride.riderId, 'ride:accepted', {
                    rideId: ride.id,
                    driverId: ride.driverId
                });
                rideEvents.emit('ride.accepted', {
                    rideId: ride.id!,
                    riderId: ride.riderId,
                    driverId: ride.driverId!
                });
                break;
            case 'arrived':
                rideTrackingService.updateStage(ride.id!, 'arrived');
                socketService.notifyRider(ride.riderId, 'ride:driver_arrived', { rideId: ride.id });
                break;
            case 'in_progress':
                rideTrackingService.updateStage(ride.id!, 'in_progress');
                socketService.notifyRider(ride.riderId, 'ride:started', { rideId: ride.id });
                break;
            case 'completed':
                rideTrackingService.stopTracking(ride.id!);
                socketService.notifyRider(ride.riderId, 'ride:completed', { rideId: ride.id });
                if (ride.driverId) socketService.notifyDriver(ride.driverId, 'ride:completed', { rideId: ride.id });
                await this.settleRidePayment(ride);
                if (ride.driverId) {
                    await incentiveService.processTripCompletion(ride).catch(err => logger.error({ err, rideId: ride.id }, 'Failed to award incentives'));
                }
                break;
            case 'cancelled':
                rideTrackingService.stopTracking(ride.id!);
                socketService.notifyRider(ride.riderId, 'ride:cancelled', {
                    rideId: ride.id,
                    reason: ride.cancellationReason
                });
                if (ride.driverId) {
                    socketService.notifyDriver(ride.driverId, 'ride:cancelled', {
                        rideId: ride.id,
                        reason: ride.cancellationReason
                    });
                }
                break;
            default:
                break;
        }
    }

    private async settleRidePayment(ride: IRide): Promise<void> {
        try {
            if (!ride.driverId) return;
            if ((ride.payment as any)?.holdStatus === 'captured') return;

            const reference =
                ride.payment?.holdReference ?? ride.payment?.reference ?? ride.pricing?.paymentReference;
            if (!reference) {
                logger.info({ rideId: ride.id }, 'No payment reference on ride; skipping settlement');
                return;
            }

            const config = await this.getPaymentsConfig(ride.region);
            const driverSnap = await db.collection('users').doc(ride.driverId).get();
            const driverData = driverSnap.data() ?? {};

            const subscription = driverData.subscription ?? driverData.driverProfile?.subscription;
            const subscriptionExpiry = this.parseTimestamp(subscription?.expiresAt);
            const subscriptionActive =
                subscription?.status === 'active' && (!subscriptionExpiry || subscriptionExpiry > new Date());

            // Fetch dynamic commission from pricing config
            const pricingConfig = await pricingConfigService.getConfig<any>(ride.region);
            const dynamicCommission = pricingConfig?.platformCommission;

            let commissionRate =
                ride.payment?.commissionRate ??
                driverData.driverProfile?.commissionRate ??
                dynamicCommission ??
                config.commissionRate ??
                config.defaultCommissionRate ??
                0.25;

            if (subscriptionActive) {
                const discount =
                    subscription?.discountRate ??
                    config.subscription?.discountRate ??
                    config.subscription?.defaultDiscount ??
                    0;
                commissionRate = Math.max(0, commissionRate - discount);
            }

            const microDeductions =
                subscriptionActive && config.subscription?.waiveMicroFees
                    ? { flatFee: 0, percentage: 0 }
                    : {
                        flatFee: config.microDeductions?.flatFee ?? 0,
                        percentage: config.microDeductions?.percentage ?? 0
                    };

            const { driverAmount, commissionAmount, microAmount } = await walletService.captureEscrowHold(reference, {
                driverId: ride.driverId,
                commissionRate,
                rideId: ride.id,
                microDeductions,
                subscriptionSnapshot: subscriptionActive
                    ? {
                        planId: subscription?.planId,
                        discountRate:
                            subscription?.discountRate ??
                            config.subscription?.discountRate ??
                            config.subscription?.defaultDiscount,
                        activeUntil: subscriptionExpiry ?? undefined,
                        status: subscription?.status
                    }
                    : undefined,
                metadata: {
                    rideId: ride.id,
                    riderId: ride.riderId,
                    region: ride.region,
                    subscriptionActive,
                    microDeductions
                }
            });

            await db
                .collection('rides')
                .doc(ride.id!)
                .update({
                    'payment.holdStatus': 'captured',
                    'payment.capturedAt': new Date(),
                    'payment.settlement': {
                        driverAmount,
                        commissionAmount,
                        microAmount: microAmount ?? 0
                    }
                });

            logger.info(
                { rideId: ride.id, driverAmount, commissionAmount, microAmount },
                'Ride settlement captured successfully'
            );
        } catch (error) {
            logger.error({ err: error, rideId: ride.id }, 'Failed to settle ride payment');
            rideEvents.emit('ride.settlement_failed', {
                rideId: ride.id,
                error: (error as Error).message
            });
        }
    }

    private async getPaymentsConfig(region?: string): Promise<PaymentsConfigDoc> {
        // Default config if none found
        const defaults: PaymentsConfigDoc = {
            commissionRate: 0.2,
            defaultCommissionRate: 0.2,
            microDeductions: { flatFee: 0, percentage: 0 },
            subscription: {
                discountRate: 0,
                defaultDiscount: 0,
                waiveMicroFees: false
            }
        };

        if (!region) return defaults;

        const configSnap = await db.collection('config').doc('payments').get();
        if (!configSnap.exists) return defaults;

        const data = configSnap.data();
        return (data?.[region] as PaymentsConfigDoc) ?? defaults;
    }

    private parseTimestamp(value: any): Date | null {
        if (!value) return null;
        if (value instanceof admin.firestore.Timestamp) return value.toDate();
        if (value instanceof Date) return value;
        if (typeof value === 'string' || typeof value === 'number') return new Date(value);
        return null;
    }

    private getCancellationFee(ride: IRide, cancelledBy: 'driver' | 'rider' | 'admin'): number {
        if (cancelledBy === 'rider') {
            const minutesSinceBooking = (Date.now() - new Date(ride.createdAt).getTime()) / 60000;
            return pricingService.calculateCancellationFee(ride, minutesSinceBooking);
        }
        return 0;
    }

    private haversineDistance(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): number {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(destination.lat - origin.lat);
        const dLon = this.deg2rad(destination.lng - origin.lng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(origin.lat)) * Math.cos(this.deg2rad(destination.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}

export const rideService = new RideService();
