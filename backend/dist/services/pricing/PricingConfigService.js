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
exports.pricingConfigService = exports.PricingConfigService = void 0;
const firebase_1 = require("../../config/firebase");
class PricingConfigService {
    constructor() {
        this.cache = new Map();
        this.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    }
    getNigeriaConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getConfig('nigeria');
        });
    }
    getChicagoConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getConfig('chicago');
        });
    }
    getDeliveryConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getConfig('nigeria_delivery');
        });
    }
    getConfig(region) {
        return __awaiter(this, void 0, void 0, function* () {
            const cached = this.cache.get(region);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.data;
            }
            const doc = yield firebase_1.db.collection('pricing_rules').doc(region).get();
            if (!doc.exists)
                return null;
            const data = doc.data();
            this.cache.set(region, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
            return data;
        });
    }
}
exports.PricingConfigService = PricingConfigService;
exports.pricingConfigService = new PricingConfigService();
//# sourceMappingURL=PricingConfigService.js.map