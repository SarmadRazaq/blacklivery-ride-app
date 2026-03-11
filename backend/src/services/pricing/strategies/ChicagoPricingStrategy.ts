import { IRide } from '../../../models/Ride';
import { IPricingStrategy, PriceBreakdown } from '../IPricingStrategy';
import { pricingConfigService } from '../PricingConfigService';

export class ChicagoPricingStrategy implements IPricingStrategy {

    private readonly DEFAULTS = {
        RATES: {
            'business_sedan': { base: 35, perMile: 3.00, perMin: 0.50, minFare: 55 },
            'business_suv': { base: 45, perMile: 3.75, perMin: 0.70, minFare: 75 },
            'first_class': { base: 60, perMile: 4.50, perMin: 0.90, minFare: 95 }
        },
        AIRPORT_RATES: {
            'ORD': {
                'business_sedan': 95,
                'business_suv': 125,
                'first_class': 150
            },
            'MDW': {
                'business_sedan': 85,
                'business_suv': 110,
                'first_class': 135
            }
        },
        HOURLY_RATES: {
            'business_sedan': 80,
            'business_suv': 110,
            'first_class': 140
        }
    };

    async calculateFare(ride: IRide, distanceMiles: number, durationMinutes: number): Promise<PriceBreakdown> {
        if (ride.bookingType === 'hourly') {
            return this.calculateHourlyFare(ride);
        }
        if (ride.isAirport && ride.airportCode) {
            return this.calculateAirportFare(ride);
        }
        return this.calculateStandardFare(ride, distanceMiles, durationMinutes);
    }

    private async calculateStandardFare(ride: IRide, distanceMiles: number, durationMinutes: number): Promise<PriceBreakdown> {
        const config = await pricingConfigService.getChicagoConfig();
        const category = ride.vehicleCategory?.toLowerCase() || 'business_sedan';
        // Use config or defaults
        const rateConfig = config?.rates[category] || this.DEFAULTS.RATES[category as keyof typeof this.DEFAULTS.RATES] || this.DEFAULTS.RATES.business_sedan;

        const baseFare = rateConfig.base;
        const distanceFare = distanceMiles * rateConfig.perMile;
        const timeFare = durationMinutes * rateConfig.perMin;

        const surgeMultiplier = ride.pricing?.surgeMultiplier || 1.0;
        const surgeFare = (baseFare + distanceFare + timeFare) * (surgeMultiplier - 1);

        let addOnsFare = 0;
        if (ride.addOns?.childSeat) addOnsFare += (ride.addOns.childSeat * (config?.addOns?.childSeat ?? 10));
        if (ride.addOns?.meetAndGreet) addOnsFare += (config?.addOns?.meetAndGreet ?? 10);
        if ((ride.addOns as any)?.extraStop || (ride.addOns as any)?.extraStops) {
            const stops = (ride.addOns as any)?.extraStops ?? 1;
            addOnsFare += stops * (config?.addOns?.extraStop ?? 15);
        }
        if ((ride.addOns as any)?.afterHours) {
            addOnsFare += config?.addOns?.afterHoursFee ?? 10;
        }
        
        let totalFare = baseFare + distanceFare + timeFare + surgeFare + addOnsFare;
        if (totalFare < rateConfig.minFare) {
            totalFare = rateConfig.minFare;
        }

        return {
            baseFare,
            distanceFare,
            timeFare,
            surgeFare,
            waitTimeFare: 0,
            addOnsFare,
            otherFees: 0,
            totalFare,
            currency: 'USD',
            surgeMultiplier
        };
    }

    private async calculateAirportFare(ride: IRide): Promise<PriceBreakdown> {
        const config = await pricingConfigService.getChicagoConfig();
        const airport = ride.airportCode || 'ORD';
        const category = ride.vehicleCategory?.toLowerCase() || 'business_sedan';
        
        const airportConfig = config?.airport || this.DEFAULTS.AIRPORT_RATES;
        // Cast to any to handle mixed types (Record<string, number> vs Strict Object)
        const rates = (airportConfig[airport] || this.DEFAULTS.AIRPORT_RATES[airport as keyof typeof this.DEFAULTS.AIRPORT_RATES]) as any;
        const fixedPrice = rates?.[category] || 100;

        return {
            baseFare: fixedPrice,
            distanceFare: 0,
            timeFare: 0,
            surgeFare: 0,
            waitTimeFare: 0,
            addOnsFare: 0,
            otherFees: 0,
            totalFare: fixedPrice,
            currency: 'USD'
        };
    }

    private async calculateHourlyFare(ride: IRide): Promise<PriceBreakdown> {
        const config = await pricingConfigService.getChicagoConfig();
        const hours = Math.max(ride.hoursBooked || 2, 2);
        const category = ride.vehicleCategory?.toLowerCase() || 'business_sedan';
        
        const hourlyConfig = config?.hourly || this.DEFAULTS.HOURLY_RATES;
        // Cast to any to handle mixed types
        const hourlyRate = (hourlyConfig as any)[category] || this.DEFAULTS.HOURLY_RATES[category as keyof typeof this.DEFAULTS.HOURLY_RATES] || 80;
        
        const totalFare = Math.max(hours * hourlyRate, hourlyRate * 2);

        return {
            baseFare: totalFare,
            distanceFare: 0,
            timeFare: 0,
            surgeFare: 0,
            waitTimeFare: 0,
            addOnsFare: 0,
            otherFees: 0,
            totalFare,
            currency: 'USD'
        };
    }

    calculateCancellationFee(ride: IRide, minutesSinceBooking: number): number {
        if (ride.bookingType === 'hourly') {
            const category = (ride.vehicleCategory?.toLowerCase() || 'business_sedan') as keyof typeof this.DEFAULTS.HOURLY_RATES;
            return this.DEFAULTS.HOURLY_RATES[category] || 80;
        }
        if (ride.isAirport && ride.airportCode) {
            // 50% of airport fare
            const airport = ride.airportCode as keyof typeof this.DEFAULTS.AIRPORT_RATES;
            const category = (ride.vehicleCategory?.toLowerCase() || 'business_sedan') as keyof typeof this.DEFAULTS.AIRPORT_RATES.ORD;
            const airportFare = this.DEFAULTS.AIRPORT_RATES[airport]?.[category] || 100;
            return Math.round(airportFare * 0.5);
        }

        if (minutesSinceBooking < 60) {
            return 0;
        }

        return 25;
    }

    calculateNoShowFee(ride: IRide): number {
        if (ride.isAirport && ride.airportCode) {
            // Airport no-show = full airport fare
            const airport = ride.airportCode as keyof typeof this.DEFAULTS.AIRPORT_RATES;
            const category = (ride.vehicleCategory?.toLowerCase() || 'business_sedan') as keyof typeof this.DEFAULTS.AIRPORT_RATES.ORD;
            return this.DEFAULTS.AIRPORT_RATES[airport]?.[category] || 100;
        }
        // Standard no-show = 1.5x cancellation fee
        const category = ride.vehicleCategory?.toLowerCase() || 'business_sedan';
        const rates: Record<string, number> = { 'business_sedan': 35, 'business_suv': 50, 'first_class': 65 };
        return rates[category] || 35;
    }

    calculateWaitTimeFee(ride: IRide, waitMinutes: number): number {
        const freeMinutes = ride.isAirport ? 60 : 5;
        if (waitMinutes <= freeMinutes) return 0;
        
        const billable = waitMinutes - freeMinutes;
        return +(billable * 1.00).toFixed(2);
    }
}

