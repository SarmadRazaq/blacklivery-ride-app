// ── Mocks (must be before imports) ────────────────────────────────────────────
jest.mock('../../src/config/firebase', () => ({
    db: { collection: jest.fn(), runTransaction: jest.fn() }
}));
jest.mock('../../src/services/SocketService', () => ({
    socketService: { notifyAdmin: jest.fn(), notifyRider: jest.fn(), notifyDriver: jest.fn(), joinRideRoom: jest.fn() }
}));
jest.mock('../../src/events/RideEvents', () => ({ rideEvents: { emit: jest.fn() } }));
jest.mock('../../src/services/RideTrackingService', () => ({
    rideTrackingService: { startTracking: jest.fn(), updateStage: jest.fn(), stopTracking: jest.fn() }
}));
jest.mock('../../src/services/pricing/PricingService', () => ({
    pricingService: {
        calculateFare: jest.fn().mockResolvedValue({
            totalFare: 50,
            currency: 'USD',
            surgeMultiplier: 1.0,
            baseFare: 35,
            distanceFare: 10,
            timeFare: 5,
            surgeFare: 0,
            waitTimeFare: 0,
            addOnsFare: 0,
            otherFees: 0
        }),
        calculateCancellationFee: jest.fn().mockReturnValue(25)
    }
}));
jest.mock('../../src/services/pricing/PricingConfigService', () => ({
    pricingConfigService: { getConfig: jest.fn().mockResolvedValue({}) }
}));
jest.mock('../../src/services/WalletService', () => ({
    walletService: {
        captureEscrowHold: jest.fn().mockResolvedValue(undefined),
        releaseEscrowHold: jest.fn().mockResolvedValue(undefined),
        processTransaction: jest.fn().mockResolvedValue(undefined)
    }
}));
jest.mock('../../src/services/driver/IncentiveService', () => ({
    incentiveService: { processTripCompletion: jest.fn().mockResolvedValue(undefined) }
}));
jest.mock('../../src/services/LoyaltyService', () => ({
    loyaltyService: { awardPoints: jest.fn().mockResolvedValue(undefined) }
}));
jest.mock('../../src/services/EmailService', () => ({
    emailService: { sendEmail: jest.fn().mockResolvedValue(undefined) }
}));
jest.mock('../../src/services/GoogleMapsService', () => ({
    googleMapsService: {
        getDistanceAndDuration: jest.fn().mockResolvedValue({
            distanceMeters: 10000, // 10 km
            durationSeconds: 1200  // 20 min
        })
    }
}));
jest.mock('../../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));
jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: () => new Date(),
        increment: (n: number) => n,
        delete: () => '__DELETE__',
        arrayUnion: (...args: any[]) => args,
        arrayRemove: (...args: any[]) => args
    }
}));

import { rideService } from '../../src/services/RideService';
import { db } from '../../src/config/firebase';
import { googleMapsService } from '../../src/services/GoogleMapsService';
import { pricingService } from '../../src/services/pricing/PricingService';

describe('RideService', () => {
    const rides: Record<string, any> = {};
    let addedRides: any[] = [];

    beforeEach(() => {
        jest.clearAllMocks();
        Object.keys(rides).forEach(k => delete rides[k]);
        addedRides = [];

        const mockAdd = jest.fn().mockImplementation(async (data: any) => {
            const id = `ride_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            rides[id] = { ...data };
            addedRides.push({ id, ...data });
            return { id };
        });

        const mockWhere = jest.fn().mockReturnThis();
        const mockOrderBy = jest.fn().mockReturnThis();
        const mockLimit = jest.fn().mockImplementation(() => ({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] })
        }));

        (db.collection as jest.Mock).mockImplementation((name: string) => ({
            doc: (id: string) => ({
                id,
                get: async () => ({
                    exists: name === 'rides' ? Boolean(rides[id]) : false,
                    id,
                    data: () => (name === 'rides' ? rides[id] : undefined),
                }),
                update: async (data: Record<string, any>) => {
                    if (name === 'rides' && rides[id]) {
                        rides[id] = { ...rides[id], ...data };
                    }
                },
                set: jest.fn().mockResolvedValue(undefined),
                delete: jest.fn().mockResolvedValue(undefined)
            }),
            add: mockAdd,
            where: mockWhere,
            orderBy: mockOrderBy,
            limit: mockLimit,
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] })
        }));

        (db.runTransaction as jest.Mock).mockImplementation(async (callback: any) => {
            const tx = {
                get: async (ref: any) => ref.get(),
                update: async (ref: any, data: Record<string, any>) => ref.update(data),
                set: jest.fn(),
                create: jest.fn()
            };
            return callback(tx);
        });
    });

    // ── getRide ───────────────────────────────────────────────────────────

    describe('getRide', () => {
        it('returns ride data when ride exists', async () => {
            rides['ride-abc'] = {
                riderId: 'rider1',
                status: 'accepted',
                pricing: { estimatedFare: 50, currency: 'USD' }
            };

            const result = await rideService.getRide('ride-abc');
            expect(result).toMatchObject({
                id: 'ride-abc',
                riderId: 'rider1',
                status: 'accepted'
            });
        });

        it('returns null when ride does not exist', async () => {
            const result = await rideService.getRide('nonexistent');
            expect(result).toBeNull();
        });
    });

    // ── createRideRequest ─────────────────────────────────────────────────

    describe('createRideRequest', () => {
        it('creates a ride with correct pickup/dropoff and pricing', async () => {
            const requestData = {
                pickup: { lat: 41.8781, lng: -87.6298, address: '233 S Wacker Dr' },
                dropoff: { lat: 41.9742, lng: -87.9073, address: "O'Hare Airport" },
                vehicleCategory: 'sedan',
                region: 'US-CHI',
                bookingType: 'on_demand'
            };

            const result = await rideService.createRideRequest('rider1', requestData);

            expect(result).toBeDefined();
            expect(result.riderId).toBe('rider1');
            expect(result.status).toBe('finding_driver');
            expect(result.pickupLocation).toEqual(requestData.pickup);
            expect(result.dropoffLocation).toEqual(requestData.dropoff);
            expect(result.pricing.estimatedFare).toBeGreaterThan(0);
            expect(result.pricing.currency).toBe('USD');

            // Should have called Google Maps for distance
            expect(googleMapsService.getDistanceAndDuration).toHaveBeenCalledWith(
                requestData.pickup,
                requestData.dropoff
            );
            // Should have called pricing
            expect(pricingService.calculateFare).toHaveBeenCalled();
        });

        it('throws error when pickup location is missing', async () => {
            await expect(
                rideService.createRideRequest('rider1', {
                    dropoff: { lat: 41.9, lng: -87.9, address: 'Dest' },
                    vehicleCategory: 'sedan',
                    region: 'US-CHI'
                })
            ).rejects.toThrow('Pickup location is required');
        });

        it('throws error when dropoff is missing for non-hourly booking', async () => {
            await expect(
                rideService.createRideRequest('rider1', {
                    pickup: { lat: 41.8, lng: -87.6, address: 'Origin' },
                    vehicleCategory: 'sedan',
                    region: 'US-CHI',
                    bookingType: 'on_demand'
                })
            ).rejects.toThrow('Dropoff location is required');
        });

        it('creates ride with delivery details', async () => {
            const requestData = {
                pickup: { lat: 6.5244, lng: 3.3792, address: 'Lagos Island' },
                dropoff: { lat: 6.4541, lng: 3.3947, address: 'Victoria Island' },
                vehicleCategory: 'motorbike',
                region: 'NG',
                bookingType: 'delivery',
                deliveryDetails: {
                    packageType: 'parcel',
                    serviceType: 'instant',
                    requiresReturn: false
                }
            };

            (pricingService.calculateFare as jest.Mock).mockResolvedValueOnce({
                totalFare: 2500,
                currency: 'NGN',
                surgeMultiplier: 1.0,
                baseFare: 1500,
                distanceFare: 700,
                timeFare: 300,
                surgeFare: 0,
                waitTimeFare: 0,
                addOnsFare: 0,
                otherFees: 0
            });

            const result = await rideService.createRideRequest('rider2', requestData);

            expect(result.bookingType).toBe('delivery');
            expect(result.deliveryDetails).toBeDefined();
            expect(result.pricing.currency).toBe('NGN');
        });

        it('sets geohash fields on the ride', async () => {
            const requestData = {
                pickup: { lat: 41.8781, lng: -87.6298, address: 'Chicago Loop' },
                dropoff: { lat: 41.9742, lng: -87.9073, address: 'ORD' },
                vehicleCategory: 'sedan',
                region: 'US-CHI',
                bookingType: 'on_demand'
            };

            const result = await rideService.createRideRequest('rider3', requestData);
            // The ride should have geohash fields
            expect(result.pickupGeohash).toBeDefined();
            expect(result.pickupGeohash!.length).toBeGreaterThanOrEqual(5);
        });
    });

    // ── transitionRideStatus (supplemental to ride_status_transitions.test.ts) ──

    describe('transitionRideStatus – additional cases', () => {
        it('handles accept transition for finding_driver ride', async () => {
            rides['ride-accept'] = {
                riderId: 'rider1',
                status: 'finding_driver',
                vehicleCategory: 'sedan',
                region: 'US-CHI',
                pricing: { estimatedFare: 50, currency: 'USD' },
                createdAt: new Date()
            };

            const result = await rideService.transitionRideStatus({
                rideId: 'ride-accept',
                status: 'accepted',
                actor: { uid: 'driver1', role: 'driver' }
            });

            expect(result.status).toBe('accepted');
            expect(result.driverId).toBe('driver1');
        });

        it('rejects non-existent ride', async () => {
            await expect(
                rideService.transitionRideStatus({
                    rideId: 'ghost-ride',
                    status: 'accepted',
                    actor: { uid: 'driver1', role: 'driver' }
                })
            ).rejects.toThrow();
        });

        it('allows completion of in_progress ride', async () => {
            rides['ride-complete'] = {
                riderId: 'rider1',
                driverId: 'driver1',
                status: 'in_progress',
                region: 'US-CHI',
                pricing: { estimatedFare: 75, currency: 'USD' },
                createdAt: new Date()
            };

            const result = await rideService.transitionRideStatus({
                rideId: 'ride-complete',
                status: 'completed',
                actor: { uid: 'driver1', role: 'driver' }
            });

            expect(result.status).toBe('completed');
        });

        it('allows rider to cancel a pending ride', async () => {
            rides['ride-cancel'] = {
                riderId: 'rider1',
                status: 'finding_driver',
                region: 'NG',
                pricing: { estimatedFare: 3000, currency: 'NGN' },
                createdAt: new Date()
            };

            const result = await rideService.transitionRideStatus({
                rideId: 'ride-cancel',
                status: 'cancelled',
                actor: { uid: 'rider1', role: 'rider' },
                payload: { cancellationReason: 'Changed my mind' }
            });

            expect(result.status).toBe('cancelled');
        });
    });
});
