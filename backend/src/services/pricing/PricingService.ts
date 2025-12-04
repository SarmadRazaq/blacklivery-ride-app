import { IRide } from '../../models/Ride';
import { IPricingStrategy, PriceBreakdown } from './IPricingStrategy';
import { NigeriaPricingStrategy } from './strategies/NigeriaPricingStrategy';
import { ChicagoPricingStrategy } from './strategies/ChicagoPricingStrategy';
import { surgeService } from './SurgeService';

export class PricingService {
    private strategies: Record<string, IPricingStrategy>;

    constructor() {
        this.strategies = {
            'NG': new NigeriaPricingStrategy(),
            'US-CHI': new ChicagoPricingStrategy()
        };
    }

    private getStrategy(region: string): IPricingStrategy {
        const strategy = this.strategies[region];
        if (!strategy) {
            console.warn(`Pricing strategy not found for region ${region}, defaulting to NG`);
            return this.strategies['NG'];
        }
        return strategy;
    }

    async calculateFare(ride: IRide, distance: number, duration: number): Promise<PriceBreakdown> {
        // 1. Calculate Surge
        const multiplier = await surgeService.getMultiplier(
            ride.pickupLocation.lat,
            ride.pickupLocation.lng,
            ride.region
        );

        // 2. Clone Ride and Apply Surge
        // Ensure we respect the interface (IRide has pricing which might be undefined in some mocks, but we force it here)
        const rideWithSurge = {
            ...ride,
            pricing: {
                ...ride.pricing,
                estimatedFare: ride.pricing?.estimatedFare || 0, // required by type
                currency: ride.pricing?.currency || 'NGN',
                surgeMultiplier: multiplier
            }
        };

        const strategy = this.getStrategy(ride.region);
        return strategy.calculateFare(rideWithSurge as IRide, distance, duration);
    }

    calculateCancellationFee(ride: IRide, minutesSinceBooking: number): number {
        const strategy = this.getStrategy(ride.region);
        return strategy.calculateCancellationFee(ride, minutesSinceBooking);
    }

    calculateWaitTimeFee(ride: IRide, waitMinutes: number): number {
        const strategy = this.getStrategy(ride.region);
        return strategy.calculateWaitTimeFee(ride, waitMinutes);
    }
}

export const pricingService = new PricingService();
