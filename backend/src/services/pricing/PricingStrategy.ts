export interface PricingConfig {
    baseFare: number;
    costPerKm: number;
    costPerMinute: number;
    minimumFare: number;
    surgeMultiplier: number;
    currency: string;
}

export interface DeliveryOverrideConfig {
    baseFare?: number;
    costPerKm?: number;
    costPerMinute?: number;
    minimumFare?: number;
    waitTime?: { freeMinutes?: number; perMinute?: number };
    serviceMultipliers?: Record<string, number>;
}

export interface FeeOverrides {
    cancellation?: Record<string, number>;
    waitTime?: {
        ride?: { freeMinutes?: number; perMinute?: number };
        delivery?: Record<string, { freeMinutes?: number; perMinute?: number }>;
    };
    noShow?: Record<string, number>;
}

export interface PricingOverrides {
    airport?: Record<string, Record<string, { fare?: number; addOnFlatFee?: number }>>;
    hourly?: Record<string, { hourlyRate?: number; minimumHours?: number; flatFare?: number }>;
    standard?: Record<
        string,
        { baseFare?: number; costPerKm?: number; costPerMile?: number; costPerMinute?: number; minimumFare?: number; flatFare?: number }
    >;
    delivery?: Record<string, DeliveryOverrideConfig>;
    fees?: FeeOverrides;
}

export interface PricingContext {
    supplyDemandRatio?: number;
    isHighTrafficZone?: boolean;
    weather?: 'clear' | 'rain' | 'storm' | 'snow';
    hasSpecialEvent?: boolean;
    eventMultiplier?: number;
    localHour?: number;
}

export interface PricingRequest {
    distanceKm: number;
    durationMinutes: number;
    vehicleCategory: string;
    region: 'nigeria' | 'chicago';
    city?: 'lagos' | 'abuja' | 'chicago';
    bookingType?: 'on_demand' | 'hourly' | 'delivery';

    // Airport
    isAirport?: boolean;
    airportCode?: string;

    // Hourly
    hoursBooked?: number;

    // Delivery
    deliveryDetails?: {
        packageType?: string;
        isFragile?: boolean;
        requiresReturn?: boolean;
        extraStops?: number;
        serviceType?: 'instant' | 'same_day' | 'scheduled';
    };

    // Add-ons
    addOns?: {
        childSeat?: number;
        extraStops?: number;
        extraStop?: boolean;
        extraLuggage?: boolean;
        meetAndGreet?: boolean;
        afterHours?: boolean;
        premiumVehicle?: boolean;
    };

    surgeMultiplier?: number;
    pricingOverrides?: PricingOverrides;
    pricingContext?: PricingContext;
}

export interface CancellationFeeInput {
    region: 'nigeria' | 'chicago';
    vehicleCategory: string;
    bookingType?: 'on_demand' | 'hourly' | 'delivery';
    isAirport?: boolean;
    hoursBooked?: number;
    fareEstimate?: number;
    isDelivery?: boolean;
}

export interface WaitTimeFeeInput {
    region: 'nigeria' | 'chicago';
    vehicleCategory: string;
    waitMinutes: number;
    bookingType?: 'on_demand' | 'hourly' | 'delivery';
    isAirport?: boolean;
    isDelivery?: boolean;
}

export interface IPricingStrategy {
    calculatePrice(request: PricingRequest): Promise<number>;
    calculateCancellationFee?(input: CancellationFeeInput): number;
    calculateWaitTimeFee?(input: WaitTimeFeeInput): number;
}
