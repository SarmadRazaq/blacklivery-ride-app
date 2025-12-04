"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.surgeService = exports.SurgeService = void 0;
const firebase_1 = require("../../config/firebase");
const PricingConfigService_1 = require("./PricingConfigService");
const geohash_1 = require("../../utils/geohash");
class SurgeService {
    constructor() {
        this.CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
        this.cache = new Map();
    }
    getMultiplier(lat, lng, region) {
        return __awaiter(this, void 0, void 0, function* () {
            const geohash = (0, geohash_1.encodeGeohash)(lat, lng, 5); // Precision 5 ~2.4km
            // 1. Check Admin Overrides
            let surgeConfig;
            if (region === 'NG') {
                const config = yield PricingConfigService_1.pricingConfigService.getNigeriaConfig();
                surgeConfig = config === null || config === void 0 ? void 0 : config.surge;
            }
            else {
                const config = yield PricingConfigService_1.pricingConfigService.getChicagoConfig();
                // Chicago config interface didn't define surge explicitly, checking safely
                surgeConfig = config === null || config === void 0 ? void 0 : config.surge;
            }
            if (surgeConfig === null || surgeConfig === void 0 ? void 0 : surgeConfig.forceActive) {
                return surgeConfig.peak || 1.5;
            }
            // 2. Check Cache
            const cached = this.cache.get(geohash);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.multiplier;
            }
            // 3. Calculate Dynamic Surge
            const multiplier = yield this.calculateDynamicSurge(geohash, surgeConfig);
            this.cache.set(geohash, { multiplier, expiresAt: Date.now() + this.CACHE_TTL_MS });
            return multiplier;
        });
    }
    calculateDynamicSurge(geohash, config) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Count Active Requests (finding_driver)
                const ridesSnap = yield firebase_1.db.collection('rides')
                    .where('status', '==', 'finding_driver')
                    .where('pickupGeohash5', '==', geohash)
                    .get();
                const demand = ridesSnap.size;
                // Count Online Drivers
                const driversSnap = yield firebase_1.db.collection('users')
                    .where('role', '==', 'driver')
                    .where('driverStatus.isOnline', '==', true)
                    .where('driverStatus.geohash5', '==', geohash)
                    .get();
                const supply = driversSnap.size;
                if (demand === 0)
                    return 1.0;
                if (supply === 0)
                    return (config === null || config === void 0 ? void 0 : config.high) || 1.5; // High demand, no supply
                const ratio = demand / supply;
                if (ratio > 2.0)
                    return (config === null || config === void 0 ? void 0 : config.extreme) || 2.0;
                if (ratio > 1.5)
                    return (config === null || config === void 0 ? void 0 : config.high) || 1.5;
                if (ratio > 1.2)
                    return (config === null || config === void 0 ? void 0 : config.peak) || 1.2;
                return 1.0;
            }
            catch (error) {
                console.error('Surge calculation failed', error);
                return 1.0;
            }
        });
    }
}
exports.SurgeService = SurgeService;
exports.surgeService = new SurgeService();
//# sourceMappingURL=SurgeService.js.map