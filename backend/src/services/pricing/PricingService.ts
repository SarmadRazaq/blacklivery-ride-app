import { IRide } from '../../models/Ride';
import { logger } from '../../utils/logger';
import { IPricingStrategy, PriceBreakdown } from './IPricingStrategy';
import { NigeriaPricingStrategy } from './strategies/NigeriaPricingStrategy';
import { ChicagoPricingStrategy } from './strategies/ChicagoPricingStrategy';
import { surgeService } from './SurgeService';
import { pricingConfigService } from './PricingConfigService';
import { PricingOverrides } from './PricingStrategy';

export class PricingService {
    private strategies: Record<string, IPricingStrategy>;

    constructor() {
        this.strategies = {
            'NG': new NigeriaPricingStrategy(),
            'US-CHI': new ChicagoPricingStrategy()
        };
    }

    private getStrategy(region: string): IPricingStrategy {
        const normalized = (region || '').toLowerCase().trim();
        let key = region;
        if (normalized === 'nigeria' || normalized === 'ng') key = 'NG';
        if (normalized === 'chicago' || normalized === 'us-chi' || normalized === 'us') key = 'US-CHI';

        const strategy = this.strategies[key];
        if (!strategy) {
            logger.warn({ region }, 'Pricing strategy not found, defaulting to NG');
            return this.strategies['NG'];
        }
        return strategy;
    }

    async calculateFare(ride: IRide, distance: number, duration: number): Promise<PriceBreakdown> {
        const regionStr = (ride.region as string)?.toLowerCase().trim();
        const normalizedRegion =
            regionStr === 'ng' || regionStr === 'nigeria'
                ? 'NG'
                : 'US-CHI';

        // 1. Calculate Surge
        const multiplier = await surgeService.getMultiplier(
            ride.pickupLocation.lat,
            ride.pickupLocation.lng,
            normalizedRegion as IRide['region']
        );

        // 2. Fetch Admin Config & Prepare Overrides
        let overrides: PricingOverrides | undefined;

        try {
            if (normalizedRegion === 'NG') {
                const config = await pricingConfigService.getNigeriaConfig();
                if (config) {
                    const city = ride.city?.toLowerCase().trim() || 'lagos';
                    const cityPricing = config.pricing?.[city];
                    const categories = config.categories;

                    if (cityPricing && categories) {
                        overrides = { standard: {} };
                        for (const [vehicle, catConfig] of Object.entries(categories)) {
                            overrides.standard![vehicle] = {
                                baseFare: cityPricing.baseFare,
                                costPerMinute: cityPricing.perMinute,
                                costPerKm: catConfig.perKm,
                                minimumFare: catConfig.minFare
                            };
                        }
                    }
                }
            } else if (normalizedRegion === 'US-CHI') {
                const config = await pricingConfigService.getChicagoConfig();
                if (config && config.rates) {
                    overrides = { standard: {} };
                    for (const [vehicle, rate] of Object.entries(config.rates)) {
                        overrides.standard![vehicle] = {
                            baseFare: rate.base,
                            costPerMile: rate.perMile,
                            costPerMinute: rate.perMin,
                            minimumFare: rate.minFare
                        };
                    }
                }
            }
        } catch (error) {
            logger.error({ err: error }, 'Error fetching pricing config');
            // Continue with defaults
        }

        // 3. Clone Ride and Apply Surge & Overrides
        const rideWithSurge = {
            ...ride,
            region: normalizedRegion as IRide['region'],
            pricing: {
                ...ride.pricing,
                estimatedFare: ride.pricing?.estimatedFare || 0,
                currency: ride.pricing?.currency || (normalizedRegion === 'NG' ? 'NGN' : 'USD'),
                surgeMultiplier: multiplier
            },
            pricingOverrides: overrides
        };

        const strategy = this.getStrategy(normalizedRegion);

        // Convert km to miles for Chicago pricing (strategy expects miles)
        const isChicago = normalizedRegion === 'US-CHI';
        const distanceForStrategy = isChicago ? distance * 0.621371 : distance;

        return strategy.calculateFare(rideWithSurge as any, distanceForStrategy, duration);
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
