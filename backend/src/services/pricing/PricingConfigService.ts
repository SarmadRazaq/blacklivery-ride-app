import { db } from '../../config/firebase';

export interface NigeriaPricingConfig {
    pricing: Record<string, { baseFare: number; perMinute: number; waitTimeFee: number }>;
    categories: Record<string, { perKm: number; minFare: number }>;
    hourly?: Record<string, number>;
    addOns?: {
        premiumVehicle?: number;
        chauffeurSedan?: number;
        extraLuggage?: { sedan?: number; suv?: number; xl?: number; min?: number; max?: number };
        airportPriorityPickup?: number;
    };
    fees: {
        cancellation: Record<string, number>;
        noShow: Record<string, number>;
        waitTime?: {
            freeMinutes: number;
            perMinute: number;
        };
    };
    surge: {
        normal?: number;
        peak: number;
        high: number;
        extreme: number;
        maxMultiplier?: number;
        forceActive?: boolean;
        trigger?: {
            supplyThreshold?: number;
            highTrafficZones?: string[];
            timedSurgeWindows?: Array<{ startHour: number; endHour: number; multiplier?: number }>;
        };
    };
    platformCommission?: number;
    incentives?: {
        dailyTrips?: Array<{ trips: number; bonus: number }>;
        weeklyTrips?: { trips: number; bonus: number };
        peakHourBoost?: { min: number; max: number };
        ratingTiers?: {
            priorityMin?: number;
            neutralMin?: number;
            reviewBelow?: number;
        };
    };
    loyalty?: {
        pointsPerCurrency?: number;
        tiers?: Record<string, number>;
    };
}

export interface ChicagoPricingConfig {
    rates: Record<string, { base: number; perMile: number; perMin: number; minFare: number }>;
    airport: Record<string, Record<string, number>>;
    hourly: Record<string, number>;
    addOns?: {
        childSeat?: number;
        extraStop?: number;
        meetAndGreet?: number;
        afterHoursFee?: number;
    };
    fees?: {
        cancellation?: {
            standard?: number;
            airportPercent?: number;
            hourlyHoursCharge?: number;
        };
        waitTime?: {
            airportFreeMinutes?: number;
            airportPerMinute?: number;
        };
    };
    surge?: {
        normal?: number;
        moderate?: number;
        high?: number;
        extreme?: number;
        maxMultiplier?: number;
        forceActive?: boolean;
        trigger?: {
            supplyThreshold?: number;
            zones?: string[];
            timedSurgeWindows?: Array<{ startHour: number; endHour: number; multiplier?: number }>;
        };
    };
    platformCommission?: number;
    incentives?: {
        weeklyGuarantee?: { trips: number; minimum: number };
        peakHourBonus?: number;
        airportBonus?: { ORD?: number; MDW?: number };
        ratingTiers?: {
            priorityMin?: number;
            neutralMin?: number;
            reviewBelow?: number;
        };
    };
    loyalty?: {
        pointsPerCurrency?: number;
        tiers?: Record<string, number>;
    };
}

export interface NigeriaDeliveryConfig {
    rates: Record<string, { base: number; perKm: number; perMin: number; minFare: number; cancel?: number; noShow?: number }>;
    serviceMultipliers?: {
        instant?: number;
        same_day?: number;
        scheduled?: number;
    };
    fees?: {
        waitTime?: {
            freeMinutes?: number;
            perCategory?: Record<string, number>;
        };
        extraStop?: Record<string, number>;
        fragileItem?: Record<string, number>;
        returnTripMultiplier?: number;
        cancellation?: Record<string, number>;
        noShow?: Record<string, number>;
    };
    platformCommission?: number;
}

export class PricingConfigService {
    private cache: Map<string, { data: any; expiresAt: number }> = new Map();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    async getNigeriaConfig(): Promise<NigeriaPricingConfig | null> {
        return this.getConfigWithAliases<NigeriaPricingConfig>(['nigeria', 'ng']);
    }

    async getChicagoConfig(): Promise<ChicagoPricingConfig | null> {
        return this.getConfigWithAliases<ChicagoPricingConfig>(['chicago', 'us-chi']);
    }

    async getDeliveryConfig(): Promise<NigeriaDeliveryConfig | null> {
        return this.getConfigWithAliases<NigeriaDeliveryConfig>(['nigeria_delivery', 'ng_delivery', 'delivery_ng']);
    }

    public async getConfig<T>(region: string): Promise<T | null> {
        const cached = this.cache.get(region);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }

        const doc = await db.collection('pricing_rules').doc(region).get();
        if (!doc.exists) return null;

        const data = doc.data() as T;
        this.cache.set(region, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return data;
    }

    private async getConfigWithAliases<T>(aliases: string[]): Promise<T | null> {
        for (const key of aliases) {
            const config = await this.getConfig<T>(key);
            if (config) return config;
        }
        return null;
    }
}

export const pricingConfigService = new PricingConfigService();

