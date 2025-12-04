import { db } from '../../config/firebase';

export interface NigeriaPricingConfig {
    pricing: Record<string, { baseFare: number; perMinute: number; waitTimeFee: number }>;
    categories: Record<string, { perKm: number; minFare: number }>;
    fees: {
        cancellation: Record<string, number>;
        noShow: Record<string, number>;
    };
    surge: { peak: number; high: number; extreme: number; forceActive?: boolean };
    platformCommission?: number;
}

export interface ChicagoPricingConfig {
    rates: Record<string, { base: number; perMile: number; perMin: number; minFare: number }>;
    airport: Record<string, Record<string, number>>;
    hourly: Record<string, number>;
    platformCommission?: number;
}

export class PricingConfigService {
    private cache: Map<string, { data: any; expiresAt: number }> = new Map();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    async getNigeriaConfig(): Promise<NigeriaPricingConfig | null> {
        return this.getConfig<NigeriaPricingConfig>('nigeria');
    }

    async getChicagoConfig(): Promise<ChicagoPricingConfig | null> {
        return this.getConfig<ChicagoPricingConfig>('chicago');
    }

    async getDeliveryConfig(): Promise<any | null> {
        return this.getConfig('nigeria_delivery');
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
}

export const pricingConfigService = new PricingConfigService();

