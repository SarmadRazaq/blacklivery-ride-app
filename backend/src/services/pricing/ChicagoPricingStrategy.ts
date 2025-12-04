import { IPricingStrategy, PricingRequest, CancellationFeeInput, WaitTimeFeeInput } from './PricingStrategy';

type PricingOverridesType = PricingRequest['pricingOverrides'];

const AIRPORT_DEFAULTS: Record<string, Record<string, number>> = {
    ORD: {
        business_sedan: 95,
        business_suv: 125,
        first_class: 150
    },
    MDW: {
        business_sedan: 85,
        business_suv: 110,
        first_class: 135
    }
};

const HOURLY_DEFAULTS: Record<string, { hourlyRate: number; minimumHours: number }> = {
    business_sedan: { hourlyRate: 80, minimumHours: 2 },
    business_suv: { hourlyRate: 110, minimumHours: 2 },
    first_class: { hourlyRate: 140, minimumHours: 2 }
};

const STANDARD_DEFAULTS: Record<
    string,
    { baseFare: number; costPerMile: number; costPerMinute: number; minimumFare: number }
> = {
    business_sedan: { baseFare: 35, costPerMile: 3.0, costPerMinute: 0.5, minimumFare: 55 },
    business_suv: { baseFare: 45, costPerMile: 3.75, costPerMinute: 0.7, minimumFare: 75 },
    first_class: { baseFare: 60, costPerMile: 4.5, costPerMinute: 0.9, minimumFare: 95 }
};

const DELIVERY_DEFAULTS: Record<
    string,
    { baseFare: number; costPerMile: number; costPerMinute: number; minimumFare: number }
> = {
    business_sedan: { baseFare: 40, costPerMile: 2.2, costPerMinute: 0.45, minimumFare: 60 },
    business_suv: { baseFare: 55, costPerMile: 2.7, costPerMinute: 0.55, minimumFare: 80 },
    first_class: { baseFare: 70, costPerMile: 3.2, costPerMinute: 0.65, minimumFare: 105 }
};

export class ChicagoPricingStrategy implements IPricingStrategy {
    async calculatePrice(request: PricingRequest): Promise<number> {
        if (request.bookingType === 'delivery') {
            return this.calculateDeliveryPrice(request);
        }

        if (request.isAirport && request.airportCode) {
            return this.calculateAirportPrice(request);
        }

        if (request.bookingType === 'hourly' && request.hoursBooked) {
            return this.calculateHourlyPrice(request);
        }

        return this.calculateStandardPrice(request);
    }

    calculateCancellationFee(input: CancellationFeeInput): number {
        if (input.bookingType === 'hourly' && input.hoursBooked) {
            const config = HOURLY_DEFAULTS[input.vehicleCategory] ?? HOURLY_DEFAULTS.business_sedan;
            return config.hourlyRate;
        }

        if (input.isAirport && input.fareEstimate) {
            return Math.max(25, input.fareEstimate * 0.5);
        }

        return 25;
    }

    calculateWaitTimeFee(input: WaitTimeFeeInput): number {
        const waitMinutes = Math.max(0, input.waitMinutes);
        if (waitMinutes <= 0) return 0;

        const freeMinutes = input.isAirport ? 60 : 5;
        const chargeable = Math.max(0, waitMinutes - freeMinutes);
        return Math.ceil(chargeable) * 1.0;
    }

    private calculateAirportPrice(request: PricingRequest): number {
        const { airportCode, vehicleCategory, addOns, pricingOverrides } = request;

        const overrides = this.getAirportOverride(pricingOverrides, airportCode!, vehicleCategory);
        let fare = overrides?.fare ?? AIRPORT_DEFAULTS[airportCode!]?.[vehicleCategory] ?? 95;

        if (overrides?.addOnFlatFee) {
            fare += overrides.addOnFlatFee;
        } else {
            fare += this.calculateAddOns(addOns);
        }

        return fare;
    }

    private calculateHourlyPrice(request: PricingRequest): number {
        const { vehicleCategory, addOns, hoursBooked = 2, pricingOverrides } = request;

        const defaults = HOURLY_DEFAULTS[vehicleCategory] ?? HOURLY_DEFAULTS.business_sedan;
        const overrides = pricingOverrides?.hourly?.[vehicleCategory];

        const minimumHours = overrides?.minimumHours ?? defaults.minimumHours;
        const hourlyRate = overrides?.hourlyRate ?? defaults.hourlyRate;

        const billedHours = Math.max(hoursBooked, minimumHours);
        let fare = billedHours * hourlyRate;

        fare += this.calculateAddOns(addOns);

        if (overrides?.flatFare) {
            fare = overrides.flatFare;
        }

        return fare;
    }

    private calculateStandardPrice(request: PricingRequest): number {
        const { distanceKm, durationMinutes, vehicleCategory, addOns, surgeMultiplier, pricingOverrides } = request;

        const defaults = STANDARD_DEFAULTS[vehicleCategory] ?? STANDARD_DEFAULTS.business_sedan;
        const overrides = pricingOverrides?.standard?.[vehicleCategory];

        const baseFare = overrides?.baseFare ?? defaults.baseFare;
        const costPerMile = overrides?.costPerMile ?? defaults.costPerMile;
        const costPerMinute = overrides?.costPerMinute ?? defaults.costPerMinute;
        const minimumFare = overrides?.minimumFare ?? defaults.minimumFare;

        const distanceMiles = distanceKm * 0.621371;

        let fare = baseFare + distanceMiles * costPerMile + durationMinutes * costPerMinute;
        fare *= surgeMultiplier || 1.0;
        fare += this.calculateAddOns(addOns);

        if (overrides?.flatFare) {
            fare = overrides.flatFare;
        }

        return Math.max(fare, minimumFare);
    }

    private calculateDeliveryPrice(request: PricingRequest): number {
        const vehicleCategory = request.vehicleCategory ?? 'business_sedan';
        const defaults = DELIVERY_DEFAULTS[vehicleCategory] ?? DELIVERY_DEFAULTS.business_sedan;
        const override = request.pricingOverrides?.delivery?.[vehicleCategory];

        const baseFare = override?.baseFare ?? defaults.baseFare;
        const costPerMile = override?.costPerKm ?? defaults.costPerMile;
        const costPerMinute = override?.costPerMinute ?? defaults.costPerMinute;
        const minFare = override?.minimumFare ?? defaults.minimumFare;

        const distanceMiles = request.distanceKm * 0.621371;

        let fare = baseFare + distanceMiles * costPerMile + request.durationMinutes * costPerMinute;
        fare += this.calculateAddOns(request.addOns);

        const serviceType = request.deliveryDetails?.serviceType;
        if (serviceType === 'instant') {
            fare *= 1.15;
        } else if (serviceType === 'scheduled') {
            fare *= 0.9;
        }

        fare *= request.surgeMultiplier ?? 1;
        return Math.max(fare, minFare);
    }

    private calculateAddOns(addOns?: PricingRequest['addOns']): number {
        let addOnFee = 0;
        if (!addOns) return addOnFee;

        if (addOns.childSeat) addOnFee += addOns.childSeat * 10;
        if (addOns.extraStops && addOns.extraStops > 0) addOnFee += addOns.extraStops * 15;
        else if (addOns.extraStop) addOnFee += 15;
        if (addOns.meetAndGreet) addOnFee += 10;
        if (addOns.afterHours) addOnFee += 10;

        return addOnFee;
    }

    private getAirportOverride(
        overrides: PricingOverridesType | undefined,
        airportCode: string,
        vehicleCategory: string
    ) {
        return overrides?.airport?.[airportCode]?.[vehicleCategory];
    }
}

export const chicagoPricingStrategy = new ChicagoPricingStrategy();
