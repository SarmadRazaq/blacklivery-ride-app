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
import { loyaltyService } from './LoyaltyService';
import { emailService } from './EmailService';
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

    private getDriverRatingPolicy(region?: IRide['region']): { priorityMin: number; neutralMin: number } {
        const key = String(region || '').toUpperCase();
        if (key === 'US-CHI' || key === 'CHICAGO') {
            return { priorityMin: 4.9, neutralMin: 4.7 };
        }
        return { priorityMin: 4.8, neutralMin: 4.5 };
    }

    private normalizeVehicleCategory(raw?: string): string | null {
        if (!raw) return null;
        const value = String(raw).toLowerCase().trim();
        if (!value) return null;

        if (value.includes('moto') || value.includes('bike') || value.includes('okada')) return 'motorbike';
        if (value.includes('first') || value.includes('premium') || value.includes('lux')) return 'first_class';
        if (value.includes('xl') || value.includes('van') || value.includes('minivan') || value.includes('mpv')) return 'xl';
        if (value.includes('suv') || value.includes('suburban') || value.includes('crossover') || value.includes('jeep')) return 'suv';
        if (value.includes('sedan') || value.includes('standard') || value.includes('compact') || value.includes('economy')) return 'sedan';

        // Map known car model names from the driver app's picker to categories
        const modelToCategory: Record<string, string> = {
            'lincoln town car': 'sedan',
            'cadillac xts': 'sedan',
            'mercedes s-class': 'first_class',
            'bmw 7 series': 'first_class',
            'chevrolet suburban': 'suv',
            'chrysler 300': 'sedan',
        };
        if (modelToCategory[value]) return modelToCategory[value];

        const canonical = new Set(['sedan', 'suv', 'xl', 'first_class', 'motorbike']);
        return canonical.has(value) ? value : null;
    }

    private isVehicleCategoryCompatible(requested: string, offered: string): boolean {
        if (requested === offered) return true;

        const compatible: Record<string, Set<string>> = {
            sedan: new Set(['sedan', 'suv', 'xl', 'first_class']),
            suv: new Set(['suv', 'xl', 'first_class']),
            xl: new Set(['xl']),
            first_class: new Set(['first_class']),
            motorbike: new Set(['motorbike'])
        };

        return compatible[requested]?.has(offered) ?? false;
    }

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

        if (!pickupLocation) {
            throw new Error('Pickup location is required');
        }

        if (requestData.bookingType !== 'hourly' && !dropoffLocation) {
            throw new Error('Dropoff location is required');
        }

        let distanceKm = 0;
        let durationMinutes = 0;

        if (dropoffLocation) {
            const routeData = await googleMapsService.getDistanceAndDuration(
                pickupLocation,
                dropoffLocation
            );
            distanceKm = routeData.distanceMeters / 1000;
            durationMinutes = routeData.durationSeconds / 60;
        } else if (requestData.bookingType === 'hourly' && requestData.hoursBooked) {
            durationMinutes = requestData.hoursBooked * 60;
        }

        const mockRide = {
            ...requestData,
            pickupLocation,
            dropoffLocation,
            riderId,
            createdAt: now
        };

        const authoritativePrice = await pricingService.calculateFare(mockRide, distanceKm, durationMinutes);

        // Apply promo discount if user has an active promotion
        let promoDiscount = 0;
        let appliedPromoId: string | undefined;
        let promoRef: FirebaseFirestore.DocumentReference | undefined;
        if (requestData.promoCode || requestData.promotionId) {
            try {
                const promoResult = await this.applyPromoDiscount(riderId, authoritativePrice.totalFare, authoritativePrice.currency, requestData.promoCode, requestData.promotionId);
                promoDiscount = promoResult.discount;
                appliedPromoId = promoResult.promotionId;
                promoRef = promoResult.promoRef;
            } catch (err) {
                logger.warn({ err, riderId }, 'Failed to apply promo discount, proceeding without');
            }
        }

        const finalFare = Math.max(0, authoritativePrice.totalFare - promoDiscount);

        const pickupGeohash = encodeGeohash(pickupLocation.lat, pickupLocation.lng, 7);
        const dropoffGeohash = dropoffLocation ? encodeGeohash(dropoffLocation.lat, dropoffLocation.lng, 7) : undefined;

        // If scheduledAt is provided, ride is scheduled for later dispatch by cron
        const isScheduled = requestData.scheduledAt ? true : false;
        const initialStatus = isScheduled ? 'scheduled' : 'finding_driver';

        const rideRecord: IRide = {
            riderId,
            status: initialStatus,
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
            ...(requestData.scheduledAt && { scheduledAt: new Date(requestData.scheduledAt) }),
            pricing: {
                estimatedFare: finalFare,
                currency: authoritativePrice.currency as 'NGN' | 'USD',
                surgeMultiplier: authoritativePrice.surgeMultiplier ?? 1.0,
                breakdown: authoritativePrice,
                ...(promoDiscount > 0 && { promoDiscount, originalFare: authoritativePrice.totalFare }),
                ...(appliedPromoId && { promotionId: appliedPromoId }),
                ...(requestData.paymentReference && { paymentReference: requestData.paymentReference })
            },
            ...(requestData.paymentMethod && { paymentMethod: requestData.paymentMethod }),
            payment: {
                ...(requestData.paymentReference && { reference: requestData.paymentReference }),
                ...(requestData.paymentReference && { holdReference: requestData.paymentReference }),
                holdStatus: requestData.paymentReference ? 'held' : 'none'
            },
            requestedDriverIds: [],
            createdAt: now,
            updatedAt: now,
            pickupGeohash,
            pickupGeohash5: pickupGeohash.substring(0, 5),
            ...(dropoffGeohash && { dropoffGeohash5: dropoffGeohash.substring(0, 5) }),
            matching: { radiusKm: this.INITIAL_RADIUS_KM, batch: 0 }
        };

        const rideDoc = await db.collection('rides').add(rideRecord);
        const ride: IRide = { ...rideRecord, id: rideDoc.id };

        // Finalize promo usage AFTER ride is successfully created
        if (promoRef && appliedPromoId && promoDiscount > 0) {
            this.finalizePromoUsage(promoRef, riderId, appliedPromoId, promoDiscount, authoritativePrice.currency, rideDoc.id)
                .catch(err => logger.error({ err, rideId: rideDoc.id }, 'Failed to finalize promo usage'));
        }

        rideEvents.emit('ride.created', { rideId: rideDoc.id, riderId, requestedDriverIds: [] });
        socketService.notifyAdmin('ride:created', ride);

        return ride;
    }

    public async startDriverMatching(rideId: string): Promise<void> {
        const state = { radius: this.INITIAL_RADIUS_KM, batch: 0 };
        this.matchState.set(rideId, state);

        // Persist matching state to Firestore for crash recovery
        await db.collection('rides').doc(rideId).update({
            matching: { radiusKm: state.radius, batch: state.batch }
        });

        await this.dispatchDriverBatch(rideId);
    }

    public stopDriverMatching(rideId: string): void {
        const timer = this.matchTimers.get(rideId);
        if (timer) clearTimeout(timer);
        this.matchTimers.delete(rideId);
        this.matchState.delete(rideId);
    }

    /**
     * Recover matching state for rides stuck in 'finding_driver' after server restart
     */
    public async recoverActiveMatching(): Promise<void> {
        try {
            const staleRides = await db.collection('rides')
                .where('status', '==', 'finding_driver')
                .get();

            for (const doc of staleRides.docs) {
                const ride = doc.data() as IRide;
                const matching = ride.matching || { radiusKm: this.INITIAL_RADIUS_KM, batch: 0 };

                // Only recover rides less than 10 min old
                const createdAt = ride.createdAt instanceof Date ? ride.createdAt : new Date((ride.createdAt as any)?.toDate?.() || ride.createdAt);
                if (Date.now() - createdAt.getTime() > 10 * 60 * 1000) continue;

                this.matchState.set(doc.id, { radius: matching.radiusKm || this.INITIAL_RADIUS_KM, batch: matching.batch || 0 });
                await this.dispatchDriverBatch(doc.id);
                logger.info({ rideId: doc.id }, 'Recovered matching for ride after restart');
            }
        } catch (error) {
            logger.error({ err: error }, 'Failed to recover active matching');
        }
    }

    /**
     * Record that a driver declined a ride, adding to exclusion list
     */
    public async recordDriverDecline(rideId: string, driverId: string): Promise<void> {
        try {
            await db.collection('rides').doc(rideId).update({
                requestedDriverIds: FieldValue.arrayUnion(driverId),
                updatedAt: new Date()
            });
            logger.info({ rideId, driverId }, 'Driver decline recorded, added to exclusion list');
        } catch (error) {
            logger.error({ err: error, rideId, driverId }, 'Failed to record driver decline');
        }
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

        logger.info({ lat, lng, radiusKm, precision, field, baseHash, buckets, filters }, '[matching] findNearbyDrivers query params');

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

        logger.info({ candidateCount: candidates.size }, '[matching] Firestore candidates found (pre-filter)');

        // Log all online drivers found to diagnose matching failures
        if (candidates.size === 0) {
            // Check if ANY online drivers exist at all
            const anyOnline = await db.collection('users')
                .where('role', '==', 'driver')
                .where('driverStatus.isOnline', '==', true)
                .limit(5)
                .get();
            if (anyOnline.empty) {
                logger.warn('[matching] No online drivers in entire system');
            } else {
                anyOnline.docs.forEach(doc => {
                    const d = doc.data();
                    logger.info({
                        driverId: doc.id,
                        geohash5: d.driverStatus?.geohash5,
                        geohash4: d.driverStatus?.geohash4,
                        isOnline: d.driverStatus?.isOnline,
                        countryCode: d.countryCode,
                        onboardingStatus: d.driverOnboarding?.status
                    }, '[matching] Online driver exists but geohash mismatch');
                });
            }
        }

        return Array.from(candidates.values())
            .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
            .filter((driver) => {
                const driverId = driver.uid ?? driver.id;
                if (!driverId) { logger.debug({ id: driver.id }, '[matching] filtered: no driverId'); return false; }

                if (filters.excludeDriverIds?.includes(driverId)) { logger.debug({ driverId }, '[matching] filtered: excluded'); return false; }

                if ((driver.driverOnboarding?.status ?? '').toLowerCase() !== 'approved') {
                    logger.debug({ driverId, status: driver.driverOnboarding?.status }, '[matching] filtered: not approved');
                    return false;
                }

                // Match vehicle categories using normalized profile/onboarding values.
                if (filters.vehicleCategory) {
                    const requestedCategory = this.normalizeVehicleCategory(filters.vehicleCategory);
                    const driverCategoryCandidates = [
                        (driver.driverProfile as any)?.vehicleCategory,
                        (driver.driverProfile as any)?.vehicleType,
                        driver.driverOnboarding?.vehicleCategory,
                        driver.driverOnboarding?.vehicleType
                    ];

                    const offeredCategory = driverCategoryCandidates
                        .map((candidate) => this.normalizeVehicleCategory(candidate))
                        .find((category): category is string => !!category);

                    if (requestedCategory && offeredCategory) {
                        if (!this.isVehicleCategoryCompatible(requestedCategory, offeredCategory)) {
                            logger.debug({ driverId, requestedCategory, offeredCategory }, '[matching] filtered: vehicle mismatch');
                            return false;
                        }
                    }
                }

                // Handle region matching across aliases/canonical values.
                if (filters.region && driver.countryCode) {
                    const driverCountry = String(driver.countryCode).toLowerCase().trim();
                    const rawFilter = String(filters.region).toLowerCase().trim();

                    const normalizedFilter =
                        rawFilter === 'us-chi' || rawFilter === 'us' || rawFilter === 'chicago'
                            ? 'us'
                            : rawFilter === 'ng' || rawFilter === 'nigeria'
                                ? 'ng'
                                : rawFilter;

                    if (driverCountry !== normalizedFilter) {
                        logger.debug({ driverId, driverCountry, normalizedFilter }, '[matching] filtered: region mismatch');
                        return false;
                    }
                }

                const rating = Number(driver.driverDetails?.rating ?? 0);
                const ratingPolicy = this.getDriverRatingPolicy(filters.region);
                if (rating > 0 && rating < ratingPolicy.neutralMin) { logger.debug({ driverId, rating }, '[matching] filtered: low rating'); return false; }
                if (!driver.driverStatus?.lastKnownLocation) { logger.debug({ driverId }, '[matching] filtered: no location'); return false; }
                if (driver.driverStatus?.currentRideId) { logger.debug({ driverId }, '[matching] filtered: busy'); return false; }

                logger.debug({ driverId }, '[matching] driver passed all filters');
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
            .filter((driver) => {
                if (driver.distanceKm > radiusKm) {
                    logger.debug({ driverId: driver.id, distanceKm: driver.distanceKm, radiusKm }, '[matching] filtered: distance exceeds radius');
                    return false;
                }
                return true;
            })
            .sort((a, b) => {
                // Rating tiers: 4.8+ = priority, 4.5-4.7 = neutral, <4.5 = deprioritized
                const ratingPolicy = this.getDriverRatingPolicy(filters.region);
                const ratingA = a.profile.rating ?? ratingPolicy.neutralMin;
                const ratingB = b.profile.rating ?? ratingPolicy.neutralMin;
                const tierA = ratingA >= ratingPolicy.priorityMin ? 0 : ratingA >= ratingPolicy.neutralMin ? 1 : 2;
                const tierB = ratingB >= ratingPolicy.priorityMin ? 0 : ratingB >= ratingPolicy.neutralMin ? 1 : 2;
                if (tierA !== tierB) return tierA - tierB; // Higher-rated tier first
                return a.distanceKm - b.distanceKm;        // Same tier → closer first
            });
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
                    if (input.status === 'arrived' && ride.status !== 'accepted') {
                        throw new Error('Ride must be accepted before marking arrived');
                    }
                    if (input.status === 'in_progress' && !['accepted', 'arrived'].includes(ride.status)) {
                        throw new Error('Ride must be accepted or arrived before starting');
                    }

                    const updates = {
                        status: input.status,
                        updatedAt: now,
                        ...(input.status === 'arrived' && { arrivedAt: now }),
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
                    // Clear driver's currentRideId atomically within the transaction
                    if (ride.driverId) {
                        tx.update(db.collection('users').doc(ride.driverId), {
                            'driverStatus.currentRideId': FieldValue.delete()
                        });
                    }
                    updatedRide = { ...ride, ...updates };
                    break;
                }
                case 'cancelled': {
                    if (ride.status === 'completed') throw new Error('Completed rides cannot be cancelled');
                    if (ride.status === 'cancelled') throw new Error('Ride is already cancelled');

                    // Ownership check: only rider, assigned driver, or admin can cancel
                    if (input.actor.role !== 'admin') {
                        const isRider = ride.riderId === input.actor.uid;
                        const isDriver = ride.driverId === input.actor.uid;
                        if (!isRider && !isDriver) {
                            throw new Error('Only the rider, assigned driver, or admin can cancel this ride');
                        }
                    }

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
                    // Clear driver's currentRideId atomically within the transaction
                    if (ride.driverId) {
                        tx.update(db.collection('users').doc(ride.driverId), {
                            'driverStatus.currentRideId': FieldValue.delete()
                        });
                    }
                    updatedRide = { ...ride, ...updates, pricing: { ...ride.pricing, cancellationFee: fee } };
                    this.stopDriverMatching(ride.id!);
                    break;
                }
                // ─── Delivery-specific statuses ───────────────────────────
                case 'delivery_en_route_pickup': {
                    if (input.actor.role !== 'driver') throw new Error('Drivers only');
                    if (ride.driverId !== input.actor.uid) throw new Error('Driver mismatch');
                    if (ride.status !== 'accepted' && ride.status !== 'arrived') throw new Error('Ride must be accepted or arrived for delivery pickup');

                    const updates = {
                        status: 'delivery_en_route_pickup' as RideStatus,
                        updatedAt: now
                    };
                    tx.update(rideRef, updates);
                    updatedRide = { ...ride, ...updates };
                    break;
                }
                case 'delivery_picked_up': {
                    if (input.actor.role !== 'driver') throw new Error('Drivers only');
                    if (ride.driverId !== input.actor.uid) throw new Error('Driver mismatch');
                    if (ride.status !== 'delivery_en_route_pickup' && ride.status !== 'arrived') throw new Error('Must be en route to pickup or arrived');

                    const updates = {
                        status: 'delivery_picked_up' as RideStatus,
                        deliveryPickedUpAt: now,
                        updatedAt: now
                    };
                    tx.update(rideRef, updates);
                    updatedRide = { ...ride, ...updates };
                    break;
                }
                case 'delivery_en_route_dropoff': {
                    if (input.actor.role !== 'driver') throw new Error('Drivers only');
                    if (ride.driverId !== input.actor.uid) throw new Error('Driver mismatch');
                    if (ride.status !== 'delivery_picked_up') throw new Error('Package must be picked up first');

                    const updates = {
                        status: 'delivery_en_route_dropoff' as RideStatus,
                        updatedAt: now
                    };
                    tx.update(rideRef, updates);
                    updatedRide = { ...ride, ...updates };
                    break;
                }
                case 'delivery_delivered': {
                    if (!['driver', 'admin'].includes(input.actor.role)) throw new Error('Only drivers or admins can mark as delivered');
                    const allowedFrom = ['delivery_en_route_dropoff', 'delivery_picked_up', 'in_progress'];
                    if (!allowedFrom.includes(ride.status)) throw new Error('Must be en route to dropoff, picked up, or in progress');

                    const updates = {
                        status: 'delivery_delivered' as RideStatus,
                        deliveredAt: now,
                        completedAt: now,
                        updatedAt: now
                    };
                    tx.update(rideRef, updates);
                    // Clear driver's currentRideId atomically within the transaction
                    if (ride.driverId) {
                        tx.update(db.collection('users').doc(ride.driverId), {
                            'driverStatus.currentRideId': FieldValue.delete()
                        });
                    }
                    updatedRide = { ...ride, ...updates };
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
            logger.info({ rideId, batch: state.batch, radius: state.radius, pickup: ride.pickupLocation, region: ride.region, vehicleCategory: ride.vehicleCategory }, '[matching] dispatchDriverBatch starting');

            const drivers = await this.findNearbyDrivers(ride.pickupLocation.lat, ride.pickupLocation.lng, state.radius, {
                // Deliveries accept any vehicle type — don't restrict by category
                vehicleCategory: ride.bookingType === 'delivery' ? undefined : ride.vehicleCategory,
                region: ride.region,
                excludeDriverIds: ride.requestedDriverIds ?? []
            });

            logger.info({ rideId, driversFound: drivers.length, batch: state.batch }, '[matching] dispatchDriverBatch result');

            if (!drivers.length) {
                if (state.batch >= this.MAX_BATCHES - 1) {
                    await this.handleNoDrivers(ride);
                    return;
                }

                this.matchState.set(rideId, { radius: state.radius + this.RADIUS_STEP_KM, batch: state.batch + 1 });

                // Persist updated matching state to Firestore
                await db.collection('rides').doc(rideId).update({
                    matching: { radiusKm: state.radius + this.RADIUS_STEP_KM, batch: state.batch + 1 }
                });

                this.scheduleNextBatch(rideId);
                return;
            }

            const batch = drivers.slice(0, this.DRIVER_BATCH_SIZE);
            const driverIds = batch.map((driver) => driver.id);

            // Fetch rider info to include in ride offer
            let riderInfo: Record<string, any> = {};
            try {
                const riderDoc = await db.collection('users').doc(ride.riderId).get();
                const rd = riderDoc.data() ?? {};
                riderInfo = {
                    riderId: ride.riderId,
                    riderName: rd.fullName || rd.displayName || 'Rider',
                    riderPhone: rd.phone || rd.phoneNumber || '',
                    riderPhotoUrl: rd.photoURL || ''
                };
            } catch (err) {
                logger.warn({ err, riderId: ride.riderId }, 'Failed to fetch rider info for ride:offer');
            }

            logger.info({ rideId, driverIds, batch: state.batch }, '[matching] Sending ride:offer to drivers');

            batch.forEach((driver) => {
                const eventName = ride.bookingType === 'delivery' ? 'delivery:offer' : 'ride:offer';
                socketService.notifyDriver(driver.id, eventName, {
                    rideId,
                    id: rideId,
                    pickupLocation: ride.pickupLocation,
                    dropoffLocation: ride.dropoffLocation,
                    pricing: ride.pricing,
                    estimatedFare: ride.pricing?.estimatedFare,
                    paymentMethod: ride.paymentMethod,
                    etaSeconds: driver.etaSeconds,
                    distanceKm: driver.distanceKm,
                    bookingType: ride.bookingType ?? 'on_demand',
                    isAirport: ride.isAirport ?? (ride.bookingType === 'airport_transfer'),
                    vehicleCategory: ride.vehicleCategory,
                    ...(ride.scheduledAt && { scheduledAt: ride.scheduledAt }),
                    ...(ride.deliveryDetails ? { deliveryDetails: ride.deliveryDetails } : {}),
                    ...riderInfo
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
        const rideRef = db.collection('rides').doc(ride.id!);

        const wasUpdated = await db.runTransaction(async (transaction) => {
            const snap = await transaction.get(rideRef);
            const current = snap.data();
            // Only cancel if still in finding_driver status (guard against race)
            if (!current || !['finding_driver', 'requested'].includes(current.status)) {
                return false;
            }
            transaction.update(rideRef, {
                status: 'cancelled',
                cancellationReason: 'no_driver_available',
                cancelledAt: new Date()
            });
            return true;
        });

        if (wasUpdated) {
            socketService.notifyRider(ride.riderId, 'ride:no_driver', { rideId: ride.id });
            rideEvents.emit('ride.cancelled', { rideId: ride.id, riderId: ride.riderId });
            // Release escrow hold if present
            if (ride.payment?.holdReference) {
                await walletService.releaseEscrowHold(
                    ride.payment.holdReference,
                    'no_driver_available',
                    { rideId: ride.id }
                ).catch(err => logger.error({ err, rideId: ride.id }, 'Failed to release escrow on no_driver'));
            }
            // Safety: clear currentRideId on any driver that may have been partially assigned
            if (ride.driverId) {
                await db.collection('users').doc(ride.driverId).update({
                    'driverStatus.currentRideId': FieldValue.delete()
                }).catch(err => logger.warn({ err }, 'Failed to clear driver currentRideId in handleNoDrivers'));
            }
        }
        this.stopDriverMatching(ride.id!);
    }

    private async handlePostStatusChange(ride: IRide, _previous: RideStatus): Promise<void> {
        switch (ride.status) {
            case 'accepted':
                rideTrackingService.startTracking(ride);
                // Set currentRideId on driver so they can't accept another ride
                if (ride.driverId) {
                    await db.collection('users').doc(ride.driverId).update({
                        'driverStatus.currentRideId': ride.id
                    }).catch(err => logger.warn({ err, driverId: ride.driverId }, 'Failed to set driver currentRideId'));
                }
                // Enrich with driver profile so rider UI can display driver info
                {
                    let driverInfo: Record<string, any> = {};
                    if (ride.driverId) {
                        try {
                            const driverDoc = await db.collection('users').doc(ride.driverId).get();
                            const dd = driverDoc.data() ?? {};
                            const dp = dd.driverProfile ?? {};
                            const onb = dd.driverOnboarding ?? {};
                            driverInfo = {
                                driverName: dd.fullName || dd.displayName || 'Driver',
                                driverPhoto: dd.photoURL || dp.photoURL || '',
                                driverRating: dp.rating ?? dd.rating ?? 5.0,
                                driverPhone: dd.phone || dd.phoneNumber || '',
                                vehicleModel: dp.vehicleModel || dp.vehicle?.model || onb.vehicleType || '',
                                vehicleColor: dp.vehicleColor || dp.vehicle?.color || onb.vehicleColor || '',
                                vehiclePlate: dp.licensePlate || dp.vehicle?.plateNumber || onb.liveryPlateNumber || ''
                            };
                        } catch (err) {
                            logger.warn({ err, driverId: ride.driverId }, 'Failed to fetch driver profile for ride:accepted');
                        }
                    }
                    socketService.notifyRider(ride.riderId, 'ride:accepted', {
                        rideId: ride.id,
                        driverId: ride.driverId,
                        ...driverInfo
                    });
                }
                rideEvents.emit('ride.accepted', {
                    rideId: ride.id!,
                    riderId: ride.riderId,
                    driverId: ride.driverId!
                });
                break;
            case 'arrived':
                rideTrackingService.updateStage(ride.id!, 'arrived');
                socketService.notifyRider(ride.riderId, 'ride:driver_arrived', {
                    rideId: ride.id,
                    arrivedAt: (ride as any).arrivedAt ?? new Date().toISOString(),
                });
                break;
            case 'in_progress':
                rideTrackingService.updateStage(ride.id!, 'in_progress');
                socketService.notifyRider(ride.riderId, 'ride:started', { rideId: ride.id });
                break;
            case 'completed':
                rideTrackingService.stopTracking(ride.id!);
                // Calculate waiting time fare if driver waited before trip started
                {
                    const arrivedAt = this.parseTimestamp((ride as any).arrivedAt);
                    const startedAt = this.parseTimestamp((ride as any).startedAt);
                    if (arrivedAt && startedAt && startedAt > arrivedAt) {
                        const waitMinutes = (startedAt.getTime() - arrivedAt.getTime()) / 60000;
                        const waitTimeFare = pricingService.calculateWaitTimeFee(ride, waitMinutes);
                        if (waitTimeFare > 0) {
                            const estimatedFare = ride.pricing?.estimatedFare ?? 0;
                            const finalFare = +(estimatedFare + waitTimeFare).toFixed(2);
                            const breakdown = ride.pricing?.breakdown ?? {} as any;
                            await db.collection('rides').doc(ride.id!).update({
                                'pricing.finalFare': finalFare,
                                'pricing.waitTimeFee': waitTimeFare,
                                'pricing.breakdown.waitTimeFare': waitTimeFare,
                            });
                            ride.pricing = {
                                ...ride.pricing,
                                finalFare,
                                waitTimeFee: waitTimeFare,
                                breakdown: { ...breakdown, waitTimeFare },
                            } as any;
                            logger.info({ rideId: ride.id, waitMinutes: +waitMinutes.toFixed(1), waitTimeFare, finalFare }, 'Wait time fare applied');
                        }
                    }
                }
                // Settle payment BEFORE notifying so earnings are available when driver fetches
                await this.settleRidePayment(ride);

                // Populate driver info for the completion notification
                let driverInfo: Record<string, any> | undefined;
                if (ride.driverId) {
                    try {
                        const driverSnap = await db.collection('users').doc(ride.driverId).get();
                        const dd = driverSnap.data() ?? {};
                        const dp = dd.driverDetails ?? {};
                        driverInfo = {
                            id: ride.driverId,
                            name: dd.fullName || dd.displayName || 'Driver',
                            photoUrl: dd.photoURL || '',
                            rating: dp.rating ?? dd.rating ?? 5.0,
                        };
                    } catch (err) {
                        logger.warn({ err, driverId: ride.driverId }, 'Failed to populate driver info for completion event');
                    }
                }

                socketService.notifyRider(ride.riderId, 'ride:completed', {
                    rideId: ride.id,
                    pricing: ride.pricing,
                    paymentMethod: ride.paymentMethod,
                    driver: driverInfo,
                });
                if (ride.driverId) socketService.notifyDriver(ride.driverId, 'ride:completed', {
                    rideId: ride.id,
                    pricing: ride.pricing,
                    paymentMethod: ride.paymentMethod,
                });
                if (ride.driverId) {
                    await incentiveService.processTripCompletion(ride).catch(err => logger.error({ err, rideId: ride.id }, 'Failed to award incentives'));
                    // Clear driver's currentRideId
                    await db.collection('users').doc(ride.driverId).update({
                        'driverStatus.currentRideId': FieldValue.delete()
                    }).catch(err => logger.warn({ err, driverId: ride.driverId }, 'Failed to clear driver currentRideId on completion'));
                }
                // Increment rider's total trips count
                await db.collection('users').doc(ride.riderId).update({
                    'riderDetails.totalTrips': FieldValue.increment(1)
                }).catch(err => logger.warn({ err, riderId: ride.riderId }, 'Failed to increment rider totalTrips'));
                // Award loyalty points to rider (fire-and-forget)
                // Prefer finalFare (actual settled fare) over estimatedFare
                const loyaltyFare = ride.pricing?.finalFare ?? ride.pricing?.estimatedFare ?? 0;
                const loyaltyCurrency = ride.pricing?.currency ?? 'USD';
                if (loyaltyFare > 0) {
                    loyaltyService.awardPoints(ride.riderId, loyaltyFare, loyaltyCurrency)
                        .then(result => logger.info({ rideId: ride.id, pointsAwarded: result.pointsAwarded, newTotal: result.newTotal }, 'Loyalty points awarded'))
                        .catch(err => logger.warn({ err, rideId: ride.id, fare: loyaltyFare, currency: loyaltyCurrency }, 'Failed to award loyalty points'));
                } else {
                    logger.warn({ rideId: ride.id, pricing: ride.pricing }, 'No fare found for loyalty points award');
                }
                // Send receipt email (fire-and-forget)
                this.sendRideReceiptEmail(ride).catch(err => logger.warn({ err, rideId: ride.id }, 'Failed to send ride receipt email'));
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
                    // Clear driver's currentRideId
                    await db.collection('users').doc(ride.driverId).update({
                        'driverStatus.currentRideId': FieldValue.delete()
                    }).catch(err => logger.warn({ err, driverId: ride.driverId }, 'Failed to clear driver currentRideId'));
                }
                // Release escrow hold so rider's funds are not locked
                if (ride.payment?.holdReference) {
                    await walletService.releaseEscrowHold(
                        ride.payment.holdReference,
                        `Ride cancelled: ${ride.cancellationReason ?? 'user_cancelled'}`,
                        { rideId: ride.id }
                    ).catch(err => logger.error({ err, rideId: ride.id }, 'Failed to release escrow on cancellation'));
                }
                // Debit cancellation fee from rider if applicable
                {
                    const cancellationFee = ride.pricing?.cancellationFee ?? 0;
                    if (cancellationFee > 0) {
                        walletService.processTransaction(
                            ride.riderId,
                            cancellationFee,
                            'debit',
                            'cancellation_fee',
                            'Ride Cancellation Fee',
                            `CANCEL-FEE-${ride.id}-${Date.now()}`,
                            {
                                walletCurrency: (ride.pricing?.currency as 'NGN' | 'USD') || 'NGN',
                                metadata: { rideId: ride.id, cancellationReason: ride.cancellationReason }
                            }
                        ).catch(err => logger.error({ err, rideId: ride.id }, 'Failed to debit cancellation fee'));
                    }
                }
                break;
            // ─── Delivery-specific post-status socket emissions ───
            case 'delivery_en_route_pickup':
                socketService.notifyRider(ride.riderId, 'ride:update', {
                    rideId: ride.id, id: ride.id, status: ride.status, bookingType: ride.bookingType
                });
                break;
            case 'delivery_picked_up':
                socketService.notifyRider(ride.riderId, 'ride:update', {
                    rideId: ride.id, id: ride.id, status: ride.status, bookingType: ride.bookingType,
                    deliveryPickedUpAt: (ride as any).deliveryPickedUpAt
                });
                break;
            case 'delivery_en_route_dropoff':
                socketService.notifyRider(ride.riderId, 'ride:update', {
                    rideId: ride.id, id: ride.id, status: ride.status, bookingType: ride.bookingType
                });
                break;
            case 'delivery_delivered':
                rideTrackingService.stopTracking(ride.id!);
                await this.settleRidePayment(ride);
                socketService.notifyRider(ride.riderId, 'ride:update', {
                    rideId: ride.id, id: ride.id, status: ride.status, bookingType: ride.bookingType,
                    pricing: ride.pricing, deliveredAt: (ride as any).deliveredAt
                });
                if (ride.driverId) {
                    socketService.notifyDriver(ride.driverId, 'ride:completed', {
                        rideId: ride.id, pricing: ride.pricing, paymentMethod: ride.paymentMethod
                    });
                    await db.collection('users').doc(ride.driverId).update({
                        'driverStatus.currentRideId': FieldValue.delete()
                    }).catch(err => logger.warn({ err, driverId: ride.driverId }, 'Failed to clear driver currentRideId on delivery completion'));
                }
                break;
            default:
                break;
        }
    }

    /**
     * Public entry point: re-run settlement after a late payment webhook.
     * Safe to call multiple times — `captureEscrowHold` is idempotent and
     * `settleRidePayment` early-returns when holdStatus is already 'captured'.
     */
    async triggerSettlementIfComplete(rideId: string): Promise<void> {
        try {
            const snap = await db.collection('rides').doc(rideId).get();
            if (!snap.exists) return;
            const ride = { id: snap.id, ...snap.data() } as IRide;
            if (ride.status === 'completed' && (ride as any).payment?.holdStatus !== 'captured') {
                await this.settleRidePayment(ride);
            }
        } catch (error) {
            logger.error({ err: error, rideId }, 'triggerSettlementIfComplete failed');
        }
    }

    private async settleRidePayment(ride: IRide): Promise<void> {
        try {
            if (!ride.driverId) return;
            if ((ride.payment as any)?.holdStatus === 'captured') return;

            const reference =
                ride.payment?.holdReference ?? ride.payment?.reference ?? ride.pricing?.paymentReference;

            const config = await this.getPaymentsConfig(ride.region);
            const driverSnap = await db.collection('users').doc(ride.driverId).get();
            const driverData = driverSnap.data() ?? {};

            const subscription = driverData.subscription ?? driverData.driverProfile?.subscription;
            const subscriptionExpiry = this.parseTimestamp(subscription?.expiresAt);
            const subscriptionActive =
                subscription?.status === 'active' && (!subscriptionExpiry || subscriptionExpiry > new Date());

            // Fetch dynamic commission from pricing config
            const regionKey = String(ride.region || '').toLowerCase().trim();
            const pricingConfig = regionKey === 'ng' || regionKey === 'nigeria'
                ? await pricingConfigService.getNigeriaConfig()
                : await pricingConfigService.getChicagoConfig();
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

            let driverAmount: number;
            let commissionAmount: number;
            let microAmount: number;

            if (reference) {
                // Escrow hold exists — capture it
                const result = await walletService.captureEscrowHold(reference, {
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
                driverAmount = result.driverAmount;
                commissionAmount = result.commissionAmount;
                microAmount = result.microAmount ?? 0;
            } else {
                // Cash/wallet ride with no escrow hold — calculate settlement directly
                const fare = ride.pricing?.finalFare ?? ride.pricing?.estimatedFare ?? 0;
                if (fare <= 0) {
                    logger.info({ rideId: ride.id }, 'No payment reference and no fare on ride; skipping settlement');
                    return;
                }
                commissionAmount = +(fare * commissionRate).toFixed(2);
                microAmount = +((fare * (microDeductions.percentage || 0)) + (microDeductions.flatFee || 0)).toFixed(2);
                driverAmount = +(fare - commissionAmount - microAmount).toFixed(2);
                logger.info(
                    { rideId: ride.id, fare, method: ride.paymentMethod ?? 'unknown' },
                    'No escrow hold — calculating settlement directly from fare'
                );

                // Credit driver wallet directly (for cash/no-hold rides)
                if (driverAmount > 0) {
                    const currency = (ride.pricing?.currency as 'NGN' | 'USD') || 'NGN';
                    await walletService.processTransaction(
                        ride.driverId,
                        driverAmount,
                        'credit',
                        'driver_payout',
                        `Ride payout ${ride.id}`,
                        `SETTLE-${ride.id}-${Date.now()}`,
                        {
                            walletCurrency: currency,
                            metadata: { rideId: ride.id, riderId: ride.riderId, method: ride.paymentMethod ?? 'cash' }
                        }
                    );
                }
            }

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

            // Record rider-side debit transaction for wallet history visibility.
            // This else-branch runs when there is no escrow hold (cash rides, or wallet
            // rides where chargeWalletForRide was never called client-side).
            const riderFare = ride.pricing?.finalFare ?? ride.pricing?.estimatedFare ?? 0;
            const settleCurrency = (ride.pricing?.currency as 'NGN' | 'USD') || 'NGN';
            const isDelivery = ride.bookingType === 'delivery';
            const txLabel = isDelivery ? 'Delivery' : 'Ride';
            if (riderFare > 0 && ride.paymentMethod === 'wallet') {
                // No escrow hold means chargeWalletForRide was never called.
                // Debit the rider wallet now so the transaction appears in their history.
                try {
                    await walletService.processTransaction(
                        ride.riderId!,
                        riderFare,
                        'debit',
                        'ride_payment',
                        `Wallet payment for ${txLabel.toLowerCase()} ${ride.id}`,
                        `WALLET-SETTLE-${ride.id}`,
                        {
                            walletCurrency: settleCurrency,
                            metadata: { rideId: ride.id, bookingType: ride.bookingType, source: 'settlement_fallback' }
                        }
                    );
                } catch (err: any) {
                    logger.error({ err, rideId: ride.id }, 'Failed to debit rider wallet on settlement fallback');
                    // Wallet debit failed (e.g. insufficient funds) but still record
                    // a transaction so the rider sees the charge in their history.
                    db.collection('transactions').add({
                        userId: ride.riderId,
                        amount: riderFare,
                        type: 'debit',
                        status: 'success',
                        category: 'ride_payment',
                        currency: settleCurrency,
                        reference: `WALLET-SETTLE-${ride.id}`,
                        description: `Wallet payment for ${txLabel.toLowerCase()} ${ride.id}`,
                        metadata: { rideId: ride.id, bookingType: ride.bookingType, source: 'settlement_fallback_record' },
                        createdAt: new Date()
                    }).catch(e => logger.warn({ err: e, rideId: ride.id }, 'Failed to record fallback rider transaction'));
                }
            } else if (riderFare > 0 && ride.paymentMethod !== 'cash') {
                // For card/external payments or deliveries, record a transaction for history.
                // Also covers the case where paymentMethod is undefined (default to wallet for deliveries).
                const method = ride.paymentMethod ?? (isDelivery ? 'wallet' : 'card');
                const timestamp = new Date();
                db.collection('transactions').add({
                    userId: ride.riderId,
                    amount: riderFare,
                    type: 'debit',
                    status: 'success',
                    category: 'ride_payment',
                    currency: settleCurrency,
                    reference: `${isDelivery ? 'DLVR' : 'RIDE'}-PAY-${ride.id}-${Date.now()}`,
                    description: `${txLabel} payment (${method})`,
                    metadata: { rideId: ride.id, bookingType: ride.bookingType, paymentMethod: method, settlement: { driverAmount, commissionAmount } },
                    createdAt: timestamp
                }).catch(err => logger.warn({ err, rideId: ride.id }, 'Failed to record rider debit transaction for wallet history'));
            }
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
            commissionRate: 0.25,
            defaultCommissionRate: 0.25,
            microDeductions: { flatFee: 0, percentage: 0 },
            subscription: {
                discountRate: 0,
                defaultDiscount: 0,
                waiveMicroFees: false
            }
        };

        if (!region) return defaults;

        // Use TTL cache to avoid hitting Firestore on every ride completion
        if (this.paymentConfigCache && this.paymentConfigCache.expiresAt > Date.now()) {
            const cached = this.paymentConfigCache.data;
            return (cached as any)?.[region] ?? defaults;
        }

        try {
            const configSnap = await db.collection('config').doc('payments').get();
            if (!configSnap.exists) return defaults;

            const data = configSnap.data() as PaymentsConfigDoc;
            this.paymentConfigCache = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
            return (data as any)?.[region] ?? defaults;
        } catch (error) {
            logger.error({ err: error, region }, 'Failed to fetch payments config, using defaults');
            return defaults;
        }
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

    /**
     * Estimate fare without creating a ride
     */
    public async estimateFare(requestData: {
        pickup: { lat: number; lng: number; address?: string };
        dropoff: { lat: number; lng: number; address?: string };
        vehicleCategory: string;
        region: string;
        bookingType?: string;
    }): Promise<{
        estimatedFare: number;
        currency: string;
        distanceKm: number;
        durationMinutes: number;
        breakdown: any;
        surgeMultiplier: number;
    }> {
        const routeData = await googleMapsService.getDistanceAndDuration(
            requestData.pickup,
            requestData.dropoff
        );

        const distanceKm = routeData.distanceMeters / 1000;
        const durationMinutes = routeData.durationSeconds / 60;

        const mockRide = {
            pickupLocation: requestData.pickup,
            dropoffLocation: requestData.dropoff,
            vehicleCategory: requestData.vehicleCategory,
            region: requestData.region,
            bookingType: requestData.bookingType ?? 'on_demand',
            createdAt: new Date()
        } as IRide;

        const priceBreakdown = await pricingService.calculateFare(mockRide, distanceKm, durationMinutes);

        return {
            estimatedFare: priceBreakdown.totalFare,
            currency: priceBreakdown.currency,
            distanceKm,
            durationMinutes,
            breakdown: priceBreakdown,
            surgeMultiplier: priceBreakdown.surgeMultiplier ?? 1.0
        };
    }

    /**
     * Get ride history for a user (rider or driver)
     */
    public async getRideHistory(
        userId: string,
        role: 'rider' | 'driver',
        options: { page?: number; limit?: number; status?: string } = {}
    ): Promise<{ rides: any[]; total: number; page: number; limit: number }> {
        const { page = 1, limit = 20, status } = options;
        const offset = (page - 1) * limit;

        const field = role === 'rider' ? 'riderId' : 'driverId';
        let query: FirebaseFirestore.Query = db.collection('rides')
            .where(field, '==', userId)
            .orderBy('createdAt', 'desc');

        if (status) {
            query = query.where('status', '==', status);
        }

        // Get total count (approximate via a separate query)
        const countSnap = await db.collection('rides').where(field, '==', userId).count().get();
        const total = countSnap.data().count;

        // Get paginated results
        const snapshot = await query.offset(offset).limit(limit).get();
        const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IRide));

        // Populate driver/rider info for each ride
        const populatedRides = await Promise.all(rides.map(async (ride) => {
            const rideObj: any = { ...ride };
            try {
                if (role === 'rider' && ride.driverId) {
                    // Populate driver info for rider's ride history
                    const [driverSnap, onbSnap] = await Promise.all([
                        db.collection('users').doc(ride.driverId).get(),
                        db.collection('driver_applications').doc(ride.driverId).get()
                    ]);
                    const dd = driverSnap.data() ?? {};
                    const dp = dd.driverDetails ?? {};
                    const onb = onbSnap.data() ?? {};
                    rideObj.driver = {
                        id: ride.driverId,
                        name: dd.fullName || dd.displayName || 'Driver',
                        photoUrl: dd.photoURL || '',
                        rating: dp.rating ?? dd.rating ?? 5.0,
                        phone: dd.phone || dd.phoneNumber || '',
                        vehicleModel: dp.vehicleModel || dp.vehicle?.model || onb.vehicleType || '',
                        vehicleColor: dp.vehicleColor || dp.vehicle?.color || onb.vehicleColor || '',
                        plateNumber: dp.licensePlate || dp.vehicle?.plateNumber || onb.liveryPlateNumber || '',
                    };
                } else if (role === 'driver' && ride.riderId) {
                    // Populate rider info for driver's ride history
                    const riderSnap = await db.collection('users').doc(ride.riderId).get();
                    const rd = riderSnap.data() ?? {};
                    rideObj.rider = {
                        id: ride.riderId,
                        displayName: rd.fullName || rd.displayName || 'Rider',
                        name: rd.fullName || rd.displayName || 'Rider',
                        photoURL: rd.photoURL || '',
                        phone: rd.phone || rd.phoneNumber || '',
                        rating: rd.riderRating ?? 5.0,
                    };
                }
            } catch (err) {
                logger.warn({ err, rideId: ride.id }, 'Failed to populate user info for ride history');
            }
            return rideObj;
        }));

        return { rides: populatedRides, total, page, limit };
    }

    /**
     * Rate a driver after ride completion
     */
    public async rateDriver(
        rideId: string,
        riderId: string,
        rating: number,
        feedback?: string
    ): Promise<IRide> {
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        const rideRef = db.collection('rides').doc(rideId);
        const rideSnap = await rideRef.get();

        if (!rideSnap.exists) {
            throw new Error('Ride not found');
        }

        const ride = { id: rideSnap.id, ...rideSnap.data() } as IRide;

        if (ride.riderId !== riderId) {
            throw new Error('You can only rate drivers for your own rides');
        }

        if (ride.status !== 'completed') {
            throw new Error('Can only rate completed rides');
        }

        if (ride.driverRating) {
            throw new Error('Driver already rated for this ride');
        }

        // Update ride with rating
        await rideRef.update({
            driverRating: rating,
            driverFeedback: feedback ?? null,
            updatedAt: new Date()
        });

        // Update driver's average rating
        if (ride.driverId) {
            await this.updateDriverAverageRating(ride.driverId);
        }

        return { ...ride, driverRating: rating, driverFeedback: feedback };
    }

    /**
     * Rate a rider after ride completion (by driver)
     */
    public async rateRider(
        rideId: string,
        driverId: string,
        rating: number,
        feedback?: string
    ): Promise<IRide> {
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        const rideRef = db.collection('rides').doc(rideId);
        const rideSnap = await rideRef.get();

        if (!rideSnap.exists) {
            throw new Error('Ride not found');
        }

        const ride = { id: rideSnap.id, ...rideSnap.data() } as IRide;

        if (ride.driverId !== driverId) {
            throw new Error('You can only rate riders for your own rides');
        }

        if (ride.status !== 'completed') {
            throw new Error('Can only rate completed rides');
        }

        if (ride.riderRating) {
            throw new Error('Rider already rated for this ride');
        }

        // Update ride with rating
        await rideRef.update({
            riderRating: rating,
            riderFeedback: feedback ?? null,
            updatedAt: new Date()
        });

        // Update rider's average rating
        await this.updateRiderAverageRating(ride.riderId);

        return { ...ride, riderRating: rating, riderFeedback: feedback };
    }

    /**
     * Update driver's average rating
     */
    private async updateDriverAverageRating(driverId: string): Promise<void> {
        const ridesSnap = await db.collection('rides')
            .where('driverId', '==', driverId)
            .where('driverRating', '>', 0)
            .limit(100)
            .get();

        if (ridesSnap.empty) return;

        const ratings = ridesSnap.docs.map(doc => doc.data().driverRating as number);
        const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

        await db.collection('users').doc(driverId).update({
            'driverDetails.rating': Math.round(avgRating * 10) / 10,
            'driverDetails.totalRatings': ratings.length
        });
    }

    /**
     * Update rider's average rating
     */
    private async updateRiderAverageRating(riderId: string): Promise<void> {
        const ridesSnap = await db.collection('rides')
            .where('riderId', '==', riderId)
            .where('riderRating', '>', 0)
            .limit(100)
            .get();

        if (ridesSnap.empty) return;

        const ratings = ridesSnap.docs.map(doc => doc.data().riderRating as number);
        const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

        await db.collection('users').doc(riderId).update({
            'riderDetails.rating': Math.round(avgRating * 10) / 10,
            'riderDetails.totalRatings': ratings.length
        });
    }

    /**
     * Get driver's active ride
     */
    public async getDriverActiveRide(driverId: string): Promise<IRide | null> {
        const snapshot = await db.collection('rides')
            .where('driverId', '==', driverId)
            .where('status', 'in', ['accepted', 'arrived', 'in_progress'])
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as IRide;
    }

    /**
     * Apply promo discount to a ride fare
     */
    private async applyPromoDiscount(
        riderId: string,
        totalFare: number,
        currency: string,
        promoCode?: string,
        promotionId?: string
    ): Promise<{ discount: number; promotionId: string; promoRef: FirebaseFirestore.DocumentReference }> {
        let promoSnap;

        if (promotionId) {
            // Look up from user's applied promotions
            const userPromoSnap = await db.collection('user_promotions')
                .where('userId', '==', riderId)
                .where('promotionId', '==', promotionId)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (userPromoSnap.empty) {
                throw new Error('Promotion not found or already used');
            }
            promoSnap = userPromoSnap.docs[0];
        } else if (promoCode) {
            // Look up from user's applied promotions by code
            const userPromoSnap = await db.collection('user_promotions')
                .where('userId', '==', riderId)
                .where('code', '==', promoCode)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (userPromoSnap.empty) {
                throw new Error('Promotion code not applied or already used');
            }
            promoSnap = userPromoSnap.docs[0];
        } else {
            throw new Error('No promo code or promotion ID provided');
        }

        const promo = promoSnap.data();
        let discount = 0;

        if (promo.discountType === 'percentage') {
            discount = Math.round(totalFare * (promo.amount / 100) * 100) / 100;
        } else {
            // flat discount
            discount = Math.min(promo.amount, totalFare);
        }

        // Return ref — caller marks as used AFTER ride creation succeeds
        return { discount, promotionId: promo.promotionId, promoRef: promoSnap.ref };
    }

    /** Mark a promo as used after ride was successfully created */
    private async finalizePromoUsage(
        promoRef: FirebaseFirestore.DocumentReference,
        riderId: string,
        promoPromotionId: string,
        discount: number,
        currency: string,
        rideId: string
    ): Promise<void> {
        await promoRef.update({ status: 'used', usedAt: new Date() });
        await db.collection('promotion_usages').add({
            userId: riderId,
            promotionId: promoPromotionId,
            userPromotionId: promoRef.id,
            discountAmount: discount,
            currency,
            rideId,
            usedAt: new Date()
        });
        logger.info({ riderId, promotionId: promoPromotionId, discount, rideId }, 'Promo discount applied to ride');
    }

    /**
     * Send ride receipt email to the rider (fire-and-forget)
     */
    private async sendRideReceiptEmail(ride: IRide): Promise<void> {
        try {
            const riderSnap = await db.collection('users').doc(ride.riderId).get();
            if (!riderSnap.exists) return;
            const rider = riderSnap.data();
            if (!rider?.email) return;

            let driverName: string | undefined;
            if (ride.driverId) {
                const driverSnap = await db.collection('users').doc(ride.driverId).get();
                driverName = driverSnap.data()?.displayName || driverSnap.data()?.firstName;
            }

            await emailService.sendRideReceipt(rider.email, {
                riderName: rider.displayName || rider.firstName || 'Rider',
                rideId: ride.id || '',
                pickup: ride.pickupLocation?.address || `${ride.pickupLocation?.lat}, ${ride.pickupLocation?.lng}`,
                dropoff: ride.dropoffLocation?.address || `${ride.dropoffLocation?.lat}, ${ride.dropoffLocation?.lng}`,
                fare: ride.pricing?.estimatedFare || 0,
                currency: ride.pricing?.currency || 'NGN',
                date: new Date(ride.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }),
                driverName,
                paymentMethod: (ride as any).paymentMethod
            });
        } catch (err) {
            logger.warn({ err, rideId: ride.id }, 'Failed to send ride receipt');
        }
    }
}

export const rideService = new RideService();
