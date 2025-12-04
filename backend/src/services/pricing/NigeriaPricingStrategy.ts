import {
    IPricingStrategy,
    PricingRequest,
    CancellationFeeInput,
    WaitTimeFeeInput,
    DeliveryOverrideConfig
} from './PricingStrategy';

const CITY_RATE_TABLE = {
    lagos: {
        sedan: { baseFare: 1500, costPerKm: 250, costPerMinute: 45, minimumFare: 5000 },
        suv: { baseFare: 1500, costPerKm: 300, costPerMinute: 45, minimumFare: 7000 },
        xl: { baseFare: 1500, costPerKm: 350, costPerMinute: 45, minimumFare: 10000 }
    },
    abuja: {
        sedan: { baseFare: 1200, costPerKm: 250, costPerMinute: 30, minimumFare: 5000 },
        suv: { baseFare: 1200, costPerKm: 300, costPerMinute: 30, minimumFare: 7000 },
        xl: { baseFare: 1200, costPerKm: 350, costPerMinute: 30, minimumFare: 10000 }
    }
};

const DELIVERY_RATES: Record<string, DeliveryOverrideConfig> = {
    motorbike: { baseFare: 700, costPerKm: 120, costPerMinute: 15, minimumFare: 1500, waitTime: { freeMinutes: 7, perMinute: 20 } },
    sedan: { baseFare: 1000, costPerKm: 150, costPerMinute: 20, minimumFare: 2500, waitTime: { freeMinutes: 7, perMinute: 25 } },
    suv: { baseFare: 1500, costPerKm: 200, costPerMinute: 30, minimumFare: 4000, waitTime: { freeMinutes: 7, perMinute: 30 } }
};

const CANCELLATION_FEES = { sedan: 1500, motorbike: 1500, suv: 2000, xl: 2500 };
const NOSHOW_FEES = { sedan: 2000, motorbike: 2000, suv: 3000, xl: 4000 };
const WAIT_FEE_RIDE = { freeMinutes: 3, perMinute: 100 };

export class NigeriaPricingStrategy implements IPricingStrategy {
    async calculatePrice(request: PricingRequest): Promise<number> {
        const bookingType = request.bookingType ?? 'on_demand';

        if (bookingType === 'delivery') {
            return this.calculateDeliveryPrice(request);
        }

        if (bookingType === 'hourly' && request.hoursBooked) {
            return this.calculateHourlyPrice(request);
        }

        if (request.isAirport) {
            return this.calculateAirportFare(request);
        }

        return this.calculateStandardRidePrice(request);
    }

    calculateCancellationFee(input: CancellationFeeInput): number {
        const vehicle = (input.vehicleCategory ?? 'sedan').toLowerCase();
        if (input.isDelivery || input.bookingType === 'delivery') {
            return (CANCELLATION_FEES as Record<string, number>)[vehicle] ?? 1500;
        }
        if (input.bookingType === 'hourly') {
            const hourlyRate = vehicle === 'suv' ? 30000 : vehicle === 'xl' ? 40000 : 20000;
            return hourlyRate;
        }
        if (input.isAirport) {
            return ((CANCELLATION_FEES as Record<string, number>)[vehicle] ?? 1500) + 500;
        }
        return (CANCELLATION_FEES as Record<string, number>)[vehicle] ?? 1500;
    }

    calculateWaitTimeFee(input: WaitTimeFeeInput): number {
        if (input.waitMinutes <= 0) return 0;
        const vehicle = (input.vehicleCategory ?? 'sedan').toLowerCase();

        if (input.isDelivery || input.bookingType === 'delivery') {
            const config = DELIVERY_RATES[vehicle];
            const free = config?.waitTime?.freeMinutes ?? 7;
            const perMinute = config?.waitTime?.perMinute ?? 25;
            const chargeable = Math.max(0, input.waitMinutes - free);
            return Math.ceil(chargeable) * perMinute;
        }

        const chargeable = Math.max(0, input.waitMinutes - WAIT_FEE_RIDE.freeMinutes);
        return Math.ceil(chargeable) * WAIT_FEE_RIDE.perMinute;
    }

    private calculateStandardRidePrice(request: PricingRequest): number {
        const { distanceKm, durationMinutes } = request;
        const city = (request.city ?? 'lagos').toLowerCase() as 'lagos' | 'abuja';
        const vehicle = (request.vehicleCategory ?? 'sedan').toLowerCase();

        const baseConfig = (CITY_RATE_TABLE as any)[city]?.[vehicle] ?? CITY_RATE_TABLE.lagos.sedan;
        const overrides = request.pricingOverrides?.standard?.[vehicle];

        const baseFare = overrides?.baseFare ?? baseConfig.baseFare;
        const costPerKm = overrides?.costPerKm ?? baseConfig.costPerKm;
        const costPerMinute = overrides?.costPerMinute ?? baseConfig.costPerMinute;
        const minimumFare = overrides?.minimumFare ?? baseConfig.minimumFare;

        let fare = baseFare + distanceKm * costPerKm + durationMinutes * costPerMinute;

        fare += this.calculateRideAddOns(request);
        fare *= request.surgeMultiplier ?? 1;

        if (overrides?.flatFare) {
            fare = overrides.flatFare;
        }

        return Math.max(fare, minimumFare);
    }

    private calculateHourlyPrice(request: PricingRequest): number {
        const vehicle = (request.vehicleCategory ?? 'sedan').toLowerCase();
        const defaults = {
            sedan: { hourlyRate: 20000, minimumHours: 2 },
            suv: { hourlyRate: 30000, minimumHours: 2 },
            xl: { hourlyRate: 40000, minimumHours: 2 }
        };

        const override = request.pricingOverrides?.hourly?.[vehicle];
        const config = defaults[vehicle as keyof typeof defaults] ?? defaults.sedan;

        const minimumHours = override?.minimumHours ?? config.minimumHours;
        const hourlyRate = override?.hourlyRate ?? config.hourlyRate;
        const billedHours = Math.max(request.hoursBooked ?? minimumHours, minimumHours);

        let fare = billedHours * hourlyRate;
        fare += this.calculateRideAddOns(request);

        if (override?.flatFare) {
            fare = override.flatFare;
        }

        return fare * (request.surgeMultiplier ?? 1);
    }

    private calculateAirportFare(request: PricingRequest): number {
        const city = (request.city ?? 'lagos').toLowerCase();
        const vehicle = (request.vehicleCategory ?? 'sedan').toLowerCase();
        const cityBase = city === 'abuja' ? 1200 : 1500;
        const airportSurcharge = city === 'abuja' ? 3000 : 4000;

        const perKm = vehicle === 'suv' ? 300 : vehicle === 'xl' ? 350 : 250;
        const minFare = vehicle === 'suv' ? 9000 : vehicle === 'xl' ? 12000 : 6000;

        let fare =
            cityBase +
            airportSurcharge +
            (request.distanceKm ?? 0) * perKm +
            (request.durationMinutes ?? 0) * 45 +
            this.calculateRideAddOns(request);

        fare *= request.surgeMultiplier ?? 1;
        return Math.max(fare, minFare);
    }

    private calculateDeliveryPrice(request: PricingRequest): number {
        const vehicle = (request.vehicleCategory ?? 'motorbike').toLowerCase();
        const defaults = DELIVERY_RATES[vehicle] ?? DELIVERY_RATES.motorbike;
        const override = request.pricingOverrides?.delivery?.[vehicle];

        const baseFare = override?.baseFare ?? defaults.baseFare ?? 700;
        const costPerKm = override?.costPerKm ?? defaults.costPerKm ?? 120;
        const costPerMinute = override?.costPerMinute ?? defaults.costPerMinute ?? 15;
        const minimumFare = override?.minimumFare ?? defaults.minimumFare ?? 1500;

        let fare = baseFare + request.distanceKm * costPerKm + request.durationMinutes * costPerMinute;

        const serviceType = request.deliveryDetails?.serviceType ?? 'same_day';
        const serviceMultipliers = override?.serviceMultipliers ?? {
            instant: 1.2,
            same_day: 1.0,
            scheduled: 0.9
        };
        fare *= serviceMultipliers[serviceType];

        if (request.deliveryDetails?.isFragile) {
            fare += vehicle === 'motorbike' ? 500 : 1000;
        }
        if (request.deliveryDetails?.requiresReturn) {
            fare += fare * 0.7;
        }
        if (request.deliveryDetails?.extraStops) {
            const extraStopFee = vehicle === 'motorbike' ? 500 : vehicle === 'sedan' ? 750 : 1000;
            fare += extraStopFee * request.deliveryDetails.extraStops;
        }

        fare *= request.surgeMultiplier ?? 1;
        return Math.max(fare, minimumFare);
    }

    private calculateRideAddOns(request: PricingRequest): number {
        let fee = 0;
        const addOns = request.addOns;
        if (!addOns) return fee;

        if (addOns.premiumVehicle) fee += 1500;
        if (addOns.extraLuggage) fee += 1500;
        if (addOns.meetAndGreet) fee += 1500;

        return fee;
    }
}

export const nigeriaPricingStrategy = new NigeriaPricingStrategy();
