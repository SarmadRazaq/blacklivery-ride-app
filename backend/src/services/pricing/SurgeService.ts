import { db } from '../../config/firebase';
import { pricingConfigService } from './PricingConfigService';
import { encodeGeohash } from '../../utils/geohash';
import { RegionCode } from '../../config/region.config';

export class SurgeService {
    private readonly CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
    private cache: Map<string, { multiplier: number; expiresAt: number }> = new Map();

    async getMultiplier(lat: number, lng: number, region: RegionCode): Promise<number> {
        const geohash = encodeGeohash(lat, lng, 5); // Precision 5 ~2.4km
        
        // 1. Check Admin Overrides
        let surgeConfig: any;
        if (region === 'NG') {
            const config = await pricingConfigService.getNigeriaConfig();
            surgeConfig = config?.surge;
        } else {
            const config = await pricingConfigService.getChicagoConfig();
            // Chicago config interface didn't define surge explicitly, checking safely
            surgeConfig = (config as any)?.surge;
        }
        
        if (surgeConfig?.forceActive) {
            return surgeConfig.peak || 1.5;
        }

        // 2. Check Cache
        const cached = this.cache.get(geohash);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.multiplier;
        }

        // 3. Calculate Dynamic Surge
        const multiplier = await this.calculateDynamicSurge(geohash, surgeConfig);
        
        this.cache.set(geohash, { multiplier, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return multiplier;
    }

    private async calculateDynamicSurge(geohash: string, config?: any): Promise<number> {
        try {
            // Count Active Requests (finding_driver)
            const ridesSnap = await db.collection('rides')
                .where('status', '==', 'finding_driver')
                .where('pickupGeohash5', '==', geohash)
                .get();
            
            const demand = ridesSnap.size;

            // Count Online Drivers
            const driversSnap = await db.collection('users')
                .where('role', '==', 'driver')
                .where('driverStatus.isOnline', '==', true)
                .where('driverStatus.geohash5', '==', geohash)
                .get();

            const supply = driversSnap.size;

            if (demand === 0) return 1.0;
            if (supply === 0) return config?.high || 1.5; // High demand, no supply

            const ratio = demand / supply;

            if (ratio > 2.0) return config?.extreme || 2.0;
            if (ratio > 1.5) return config?.high || 1.5;
            if (ratio > 1.2) return config?.peak || 1.2;

            return 1.0;
        } catch (error) {
            console.error('Surge calculation failed', error);
            return 1.0;
        }
    }
}

export const surgeService = new SurgeService();
