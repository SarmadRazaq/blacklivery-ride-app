jest.mock('../src/config/firebase', () => ({
    db: {
        collection: jest.fn(),
        runTransaction: jest.fn(),
    }
}));

jest.mock('../src/services/SocketService', () => ({
    socketService: {
        notifyAdmin: jest.fn(),
        notifyRider: jest.fn(),
        notifyDriver: jest.fn(),
    }
}));

jest.mock('../src/events/RideEvents', () => ({
    rideEvents: {
        emit: jest.fn(),
    }
}));

jest.mock('../src/services/RideTrackingService', () => ({
    rideTrackingService: {
        startTracking: jest.fn(),
        updateStage: jest.fn(),
        stopTracking: jest.fn(),
    }
}));

jest.mock('../src/services/pricing/PricingService', () => ({
    pricingService: {
        calculateCancellationFee: jest.fn().mockReturnValue(25),
    }
}));

jest.mock('../src/services/WalletService', () => ({
    walletService: {
        captureEscrowHold: jest.fn(),
        releaseEscrowHold: jest.fn(),
        processTransaction: jest.fn(),
    }
}));

jest.mock('../src/services/driver/IncentiveService', () => ({
    incentiveService: {
        processTripCompletion: jest.fn(),
    }
}));

jest.mock('../src/services/LoyaltyService', () => ({
    loyaltyService: {
        awardPoints: jest.fn().mockResolvedValue(undefined),
    }
}));

jest.mock('../src/services/EmailService', () => ({
    emailService: {
        sendEmail: jest.fn().mockResolvedValue(undefined),
    }
}));

jest.mock('../src/services/GoogleMapsService', () => ({
    googleMapsService: {
        getDistanceAndDuration: jest.fn(),
    }
}));

jest.mock('../src/services/pricing/PricingConfigService', () => ({
    pricingConfigService: {
        getConfig: jest.fn(),
    }
}));

import { rideService } from '../src/services/RideService';
import { db } from '../src/config/firebase';

describe('Ride status transition edge cases', () => {
    const rides: Record<string, any> = {};

    beforeEach(() => {
        jest.clearAllMocks();

        (db.collection as jest.Mock).mockImplementation((name: string) => ({
            doc: (id: string) => ({
                id,
                get: async () => ({
                    exists: name === 'rides' ? Boolean(rides[id]) : false,
                    id,
                    data: () => (name === 'rides' ? rides[id] : undefined),
                }),
                update: async (data: Record<string, any>) => {
                    if (name !== 'rides' || !rides[id]) return;
                    rides[id] = { ...rides[id], ...data };
                },
            })
        }));

        (db.runTransaction as jest.Mock).mockImplementation(async (callback: any) => {
            const tx = {
                get: async (ref: any) => ref.get(),
                update: async (ref: any, data: Record<string, any>) => ref.update(data),
            };
            return callback(tx);
        });
    });

    it('rejects moving to arrived before accepted', async () => {
        rides.ride1 = {
            riderId: 'rider1',
            driverId: 'driver1',
            status: 'finding_driver',
            pricing: { estimatedFare: 100, currency: 'USD' },
            createdAt: new Date(),
        };

        await expect(
            rideService.transitionRideStatus({
                rideId: 'ride1',
                status: 'arrived',
                actor: { uid: 'driver1', role: 'driver' },
            })
        ).rejects.toThrow('Ride must be accepted before marking arrived');
    });

    it('rejects cancelling a completed ride', async () => {
        rides.ride2 = {
            riderId: 'rider1',
            status: 'completed',
            pricing: { estimatedFare: 100, currency: 'USD' },
            createdAt: new Date(),
        };

        await expect(
            rideService.transitionRideStatus({
                rideId: 'ride2',
                status: 'cancelled',
                actor: { uid: 'admin1', role: 'admin' },
            })
        ).rejects.toThrow('Completed rides cannot be cancelled');
    });

    it('rejects cancelling an already cancelled ride', async () => {
        rides.ride3 = {
            riderId: 'rider1',
            status: 'cancelled',
            pricing: { estimatedFare: 100, currency: 'USD' },
            createdAt: new Date(),
        };

        await expect(
            rideService.transitionRideStatus({
                rideId: 'ride3',
                status: 'cancelled',
                actor: { uid: 'admin1', role: 'admin' },
            })
        ).rejects.toThrow('Ride is already cancelled');
    });

    it('allows moving to in_progress from accepted', async () => {
        rides.ride4 = {
            riderId: 'rider1',
            driverId: 'driver1',
            status: 'accepted',
            pricing: { estimatedFare: 100, currency: 'USD' },
            createdAt: new Date(),
        };

        const result = await rideService.transitionRideStatus({
            rideId: 'ride4',
            status: 'in_progress',
            actor: { uid: 'driver1', role: 'driver' },
        });

        expect(result.status).toBe('in_progress');
        expect(rides.ride4.status).toBe('in_progress');
    });
});
