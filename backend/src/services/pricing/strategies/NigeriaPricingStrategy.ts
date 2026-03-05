import { IRide } from '../../../models/Ride';
import { IPricingStrategy, PriceBreakdown } from '../IPricingStrategy';
import { pricingConfigService } from '../PricingConfigService';

export class NigeriaPricingStrategy implements IPricingStrategy {

    private readonly DEFAULTS = {
        CITIES: {
            'lagos': { baseFare: 1500, perMinute: 45, waitTimeFee: 100 },
            'abuja': { baseFare: 1200, perMinute: 30, waitTimeFee: 100 },
            'default': { baseFare: 1500, perMinute: 45, waitTimeFee: 100 }
        },
        RIDE_RATES: {
            'sedan': { perKm: 250, minFare: 5000, cancel: 1500, noShow: 2000 },
            'suv': { perKm: 300, minFare: 7000, cancel: 2000, noShow: 3000 },
            'xl': { perKm: 350, minFare: 10000, cancel: 2500, noShow: 4000 }
        },
        DELIVERY_RATES: {
            'motorbike': { base: 700, perKm: 120, perMin: 15, minFare: 1500, cancel: 300, noShow: 500 },
            'sedan': { base: 1000, perKm: 150, perMin: 20, minFare: 2500, cancel: 500, noShow: 750 },
            'suv': { base: 1500, perKm: 200, perMin: 30, minFare: 4000, cancel: 500, noShow: 750 },
            'van': { base: 3000, perKm: 250, perMin: 35, minFare: 7000, cancel: 1000, noShow: 1500 }
        },
        HOURLY_RATES: {
            'sedan': 5000,
            'suv': 7500,
            'xl': 12000
        } as Record<string, number>,
        MINIMUM_HOURS: 2
    };

    async calculateFare(ride: IRide, distanceKm: number, durationMinutes: number): Promise<PriceBreakdown> {
        if (ride.bookingType === 'hourly') {
            return this.calculateHourlyFare(ride);
        }
        if (ride.bookingType === 'delivery') {
            return this.calculateDeliveryFare(ride, distanceKm, durationMinutes);
        }
        return this.calculateRideFare(ride, distanceKm, durationMinutes);
    }

    private async calculateHourlyFare(ride: IRide): Promise<PriceBreakdown> {
        const config = await pricingConfigService.getNigeriaConfig();
        const hours = ride.hoursBooked ?? 2;

        if (hours < this.DEFAULTS.MINIMUM_HOURS) {
            throw new Error('Minimum 2 Hours');
        }

        const category = ride.vehicleCategory?.toLowerCase() || 'sedan';
        const hourlyConfig = config?.hourly || this.DEFAULTS.HOURLY_RATES;
        const hourlyRate = (hourlyConfig as any)[category] || this.DEFAULTS.HOURLY_RATES[category] || 5000;
        const totalFare = hours * hourlyRate;

        return {
            baseFare: totalFare,
            distanceFare: 0,
            timeFare: 0,
            surgeFare: 0,
            waitTimeFare: 0,
            addOnsFare: 0,
            otherFees: 0,
            totalFare,
            currency: 'NGN',
            surgeMultiplier: 1.0
        };
    }

    private async calculateRideFare(ride: IRide, distanceKm: number, durationMinutes: number): Promise<PriceBreakdown> {
        const config = await pricingConfigService.getNigeriaConfig();
        const cityName = ride.city?.toLowerCase();
        const cityKey = (cityName && (config?.pricing?.[cityName] || this.DEFAULTS.CITIES[cityName as keyof typeof this.DEFAULTS.CITIES])) ? cityName : 'default';

        const cityConfig = config?.pricing?.[cityKey] || this.DEFAULTS.CITIES[cityKey as keyof typeof this.DEFAULTS.CITIES] || this.DEFAULTS.CITIES.default;

        const category = ride.vehicleCategory?.toLowerCase() || 'sedan';
        const vehicleConfig = config?.categories?.[category] || this.DEFAULTS.RIDE_RATES[category as keyof typeof this.DEFAULTS.RIDE_RATES] || this.DEFAULTS.RIDE_RATES.sedan;

        // Use config values or defaults
        const baseFare = cityConfig.baseFare;
        const minuteRate = (cityConfig as any).perMinute ?? (cityConfig as any).minuteRate; // Safe access

        const distanceFare = distanceKm * vehicleConfig.perKm;
        const timeFare = durationMinutes * minuteRate;

        const surgeMultiplier = ride.pricing?.surgeMultiplier || 1.0;

        let addOnsFare = 0;
        if (ride.addOns?.premiumVehicle) {
            addOnsFare += config?.addOns?.premiumVehicle ?? 1500;
        }

        const chauffeurSedan = (ride.addOns as any)?.chauffeurSedan;
        if (chauffeurSedan) {
            addOnsFare += config?.addOns?.chauffeurSedan ?? 1000;
        }

        if (ride.addOns?.extraLuggage) {
            const luggageCfg = config?.addOns?.extraLuggage;
            addOnsFare +=
                luggageCfg?.[category as 'sedan' | 'suv' | 'xl'] ??
                luggageCfg?.min ??
                1000;
        }

        const airportPriorityPickup = (ride.addOns as any)?.airportPriorityPickup;
        if (airportPriorityPickup) {
            addOnsFare += config?.addOns?.airportPriorityPickup ?? 1500;
        }

        const surgeFare = (distanceFare + timeFare) * (surgeMultiplier - 1);

        let totalFare = baseFare + distanceFare + timeFare + surgeFare + addOnsFare;
        if (totalFare < vehicleConfig.minFare) {
            totalFare = vehicleConfig.minFare;
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
            currency: 'NGN',
            surgeMultiplier
        };
    }

    private async calculateDeliveryFare(ride: IRide, distanceKm: number, durationMinutes: number): Promise<PriceBreakdown> {
        const config = await pricingConfigService.getDeliveryConfig();
        const category = ride.vehicleCategory?.toLowerCase() || 'motorbike';
        const vehicleConfig = config?.rates?.[category] || this.DEFAULTS.DELIVERY_RATES[category as keyof typeof this.DEFAULTS.DELIVERY_RATES] || this.DEFAULTS.DELIVERY_RATES.motorbike;

        const baseFare = vehicleConfig.base;
        const distanceFare = distanceKm * vehicleConfig.perKm;
        const timeFare = durationMinutes * (vehicleConfig.perMin ?? 15); // Default if missing

        let multiplier = 1.0;
        if (ride.deliveryDetails?.serviceType === 'instant') multiplier = config?.serviceMultipliers?.instant ?? 1.2;
        if (ride.deliveryDetails?.serviceType === 'scheduled') multiplier = config?.serviceMultipliers?.scheduled ?? 0.9;
        if (ride.deliveryDetails?.serviceType === 'same_day') multiplier = config?.serviceMultipliers?.same_day ?? 1.0;

        let addOnsFare = 0;
        if (ride.deliveryDetails?.extraStops) {
            const extraStopFee = config?.fees?.extraStop?.[category] ?? (category === 'motorbike' ? 500 : category === 'suv' ? 1000 : 750);
            addOnsFare += (ride.deliveryDetails.extraStops * extraStopFee);
        }
        if (ride.deliveryDetails?.isFragile) {
            addOnsFare += config?.fees?.fragileItem?.[category] ?? (category === 'motorbike' ? 500 : 1000);
        }
        if (ride.deliveryDetails?.requiresReturn) {
            addOnsFare += (baseFare + distanceFare + timeFare) * (config?.fees?.returnTripMultiplier ?? 0.7);
        }

        const preTotal = (baseFare + distanceFare + timeFare) * multiplier;
        let totalFare = preTotal + addOnsFare;

        if (totalFare < vehicleConfig.minFare) {
            totalFare = vehicleConfig.minFare;
        }

        return {
            baseFare,
            distanceFare,
            timeFare,
            surgeFare: 0,
            waitTimeFare: 0,
            addOnsFare,
            otherFees: 0,
            totalFare,
            currency: 'NGN',
            surgeMultiplier: 1.0 // Delivery usually fixed or multiplier handled via serviceType
        };
    }

    calculateCancellationFee(ride: IRide, minutesSinceBooking: number): number {
        // Simplified synchronous fallback for now, or make async if interface allows
        // Since interface is synchronous, we use defaults or need to refactor interface to async
        // For now, using defaults to satisfy interface
        const category = ride.vehicleCategory?.toLowerCase() || 'sedan';
        if (ride.bookingType === 'delivery') {
            const deliveryDefaults = this.DEFAULTS.DELIVERY_RATES[category as keyof typeof this.DEFAULTS.DELIVERY_RATES] || this.DEFAULTS.DELIVERY_RATES.motorbike;
            return deliveryDefaults.cancel || 300;
        }
        return this.DEFAULTS.RIDE_RATES[category as keyof typeof this.DEFAULTS.RIDE_RATES]?.cancel || 1500;
    }

    calculateNoShowFee(ride: IRide): number {
        if (ride.bookingType === 'delivery') return 500;
        const category = ride.vehicleCategory?.toLowerCase() || 'sedan';
        return this.DEFAULTS.RIDE_RATES[category as keyof typeof this.DEFAULTS.RIDE_RATES]?.noShow || 2000;
    }

    calculateWaitTimeFee(ride: IRide, waitMinutes: number): number {
        const freeMinutes = ride.bookingType === 'delivery' ? 7 : 3;
        if (waitMinutes <= freeMinutes) return 0;

        const billableMinutes = waitMinutes - freeMinutes;
        if (ride.bookingType === 'delivery') {
            const category = ride.vehicleCategory?.toLowerCase() || 'motorbike';
            const perMinute = category === 'motorbike' ? 20 : category === 'suv' ? 30 : 25;
            return billableMinutes * perMinute;
        }

        return billableMinutes * 100;
    }
}

