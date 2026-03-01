import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';
import { pricingConfigService } from './PricingConfigService';
import { encodeGeohash } from '../../utils/geohash';
import { RegionCode } from '../../config/region.config';
import { weatherService } from '../WeatherService';

export class SurgeService {
    private readonly CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
    private cache: Map<string, { multiplier: number; expiresAt: number }> = new Map();

    async getMultiplier(lat: number, lng: number, region: RegionCode): Promise<number> {
        const geohash = encodeGeohash(lat, lng, 5); // Precision 5 ~2.4km
        const regionCode = this.normalizeRegion(region);
        
        // 1. Check Admin Overrides
        let surgeConfig: any;
        if (regionCode === 'NG') {
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

        // 3. Calculate Dynamic Surge (demand/supply + weather)
        const multiplier = await this.calculateDynamicSurge(lat, lng, geohash, regionCode, surgeConfig);
        
        this.cache.set(geohash, { multiplier, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return multiplier;
    }

    /** Clear all cached surge values to force recalculation */
    clearCache(): void {
        this.cache.clear();
    }

    private async calculateDynamicSurge(lat: number, lng: number, geohash: string, region: RegionCode, config?: any): Promise<number> {
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

            const supplyThreshold = config?.trigger?.supplyThreshold ?? (region === 'NG' ? 0.6 : 0.5);

            // Demand/supply multiplier
            let demandMultiplier = 1.0;
            if (demand === 0) {
                demandMultiplier = 1.0;
            } else if (supply === 0) {
                demandMultiplier = config?.high || 1.5;
            } else {
                const ratio = demand / supply;
                const supplyCoverage = supply / demand;
                if (supplyCoverage < supplyThreshold) {
                    demandMultiplier = config?.high || 1.5;
                }
                if (ratio > 2.0) demandMultiplier = config?.extreme || 2.0;
                else if (ratio > 1.5) demandMultiplier = config?.high || 1.5;
                else if (ratio > 1.2) demandMultiplier = config?.peak || 1.2;
            }

            // Timed surge windows from config (e.g., 7-9am)
            let timedMultiplier = 1.0;
            const localHour = new Date().getHours();
            const windows = config?.trigger?.timedSurgeWindows;
            if (Array.isArray(windows)) {
                for (const window of windows) {
                    const start = Number(window?.startHour);
                    const end = Number(window?.endHour);
                    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
                    if (localHour >= start && localHour < end) {
                        timedMultiplier = Math.max(timedMultiplier, Number(window?.multiplier) || (config?.peak || 1.2));
                    }
                }
            }

            // Weather multiplier
            let weatherMultiplier = 1.0;
            try {
                const weather = await weatherService.getWeather(lat, lng);
                weatherMultiplier = weather.surgeMultiplier;
            } catch (err) {
                logger.warn({ err }, 'Weather surge check failed, using 1.0');
            }

            // Combined: take the higher of demand and weather surge, don't double stack
            const finalMultiplier = Math.max(demandMultiplier, weatherMultiplier, timedMultiplier);
            
            // Cap at maximum surge
            const maxSurge = config?.maxMultiplier || 3.0;
            return Math.min(finalMultiplier, maxSurge);
        } catch (error) {
            logger.error({ err: error }, 'Surge calculation failed');
            return 1.0;
        }
    }

    private normalizeRegion(region: RegionCode | string): RegionCode {
        const value = String(region || '').toLowerCase().trim();
        if (value === 'ng' || value === 'nigeria') return 'NG';
        return 'US-CHI';
    }
}

export const surgeService = new SurgeService();
