import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';
import { PricingOverrides } from './PricingStrategy';

interface PricingRuleDocument {
    defaults?: PricingOverrides;
    cities?: Record<string, PricingOverrides>;
}

interface CachedOverride {
    expiresAt: number;
    overrides?: PricingOverrides;
}

class PricingRuleService {
    private cache = new Map<string, CachedOverride>();
    private readonly TTL_MS = 5 * 60 * 1000;

    async getOverrides(region: string, city?: string): Promise<PricingOverrides | undefined> {
        const key = `${region.toLowerCase()}:${(city ?? 'default').toLowerCase()}`;
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.overrides;
        }

        try {
            const doc = await db.collection('pricing_rules').doc(region.toLowerCase()).get();
            if (!doc.exists) {
                return undefined;
            }

            const data = doc.data() as PricingRuleDocument;
            const merged = this.mergeOverrides(
                data?.defaults,
                city ? data?.cities?.[city.toLowerCase()] : undefined
            );

            this.cache.set(key, { overrides: merged, expiresAt: Date.now() + this.TTL_MS });
            return merged;
        } catch (error) {
            logger.error({ err: error, region, city }, 'Failed to load pricing overrides');
            return undefined;
        }
    }

    invalidate(region?: string): void {
        if (!region) {
            this.cache.clear();
            return;
        }
        const prefix = `${region.toLowerCase()}:`;
        Array.from(this.cache.keys())
            .filter((key) => key.startsWith(prefix))
            .forEach((key) => this.cache.delete(key));
    }

    private mergeOverrides(base?: PricingOverrides, override?: PricingOverrides): PricingOverrides | undefined {
        if (!base && !override) {
            return undefined;
        }

        const merged: PricingOverrides = {
            ...(base ?? {}),
            ...(override ?? {}),
            airport: {
                ...(base?.airport ?? {}),
                ...(override?.airport ?? {})
            },
            hourly: {
                ...(base?.hourly ?? {}),
                ...(override?.hourly ?? {})
            },
            standard: {
                ...(base?.standard ?? {}),
                ...(override?.standard ?? {})
            },
            delivery: {
                ...(base?.delivery ?? {}),
                ...(override?.delivery ?? {})
            },
            fees: {
                ...(base?.fees ?? {}),
                ...(override?.fees ?? {}),
                cancellation: {
                    ...(base?.fees?.cancellation ?? {}),
                    ...(override?.fees?.cancellation ?? {})
                },
                waitTime: {
                    ride: {
                        ...(base?.fees?.waitTime?.ride ?? {}),
                        ...(override?.fees?.waitTime?.ride ?? {})
                    },
                    delivery: {
                        ...(base?.fees?.waitTime?.delivery ?? {}),
                        ...(override?.fees?.waitTime?.delivery ?? {})
                    }
                },
                noShow: {
                    ...(base?.fees?.noShow ?? {}),
                    ...(override?.fees?.noShow ?? {})
                }
            }
        };

        return merged;
    }
}

export const pricingRuleService = new PricingRuleService();