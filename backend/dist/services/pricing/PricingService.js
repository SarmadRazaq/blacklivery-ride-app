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
exports.pricingService = exports.PricingService = void 0;
const NigeriaPricingStrategy_1 = require("./strategies/NigeriaPricingStrategy");
const ChicagoPricingStrategy_1 = require("./strategies/ChicagoPricingStrategy");
const SurgeService_1 = require("./SurgeService");
const PricingConfigService_1 = require("./PricingConfigService");
class PricingService {
    constructor() {
        this.strategies = {
            'NG': new NigeriaPricingStrategy_1.NigeriaPricingStrategy(),
            'US-CHI': new ChicagoPricingStrategy_1.ChicagoPricingStrategy()
        };
    }
    getStrategy(region) {
        let key = region;
        if (region.toLowerCase() === 'nigeria')
            key = 'NG';
        if (region.toLowerCase() === 'chicago')
            key = 'US-CHI';
        const strategy = this.strategies[key];
        if (!strategy) {
            console.warn(`Pricing strategy not found for region ${region}, defaulting to NG`);
            return this.strategies['NG'];
        }
        return strategy;
    }
    calculateFare(ride, distance, duration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            // 1. Calculate Surge
            const multiplier = yield SurgeService_1.surgeService.getMultiplier(ride.pickupLocation.lat, ride.pickupLocation.lng, ride.region);
            // 2. Fetch Admin Config & Prepare Overrides
            let overrides;
            const regionStr = (_a = ride.region) === null || _a === void 0 ? void 0 : _a.toLowerCase().trim();
            try {
                if (regionStr === 'ng' || regionStr === 'nigeria') {
                    const config = yield PricingConfigService_1.pricingConfigService.getNigeriaConfig();
                    if (config) {
                        const city = ((_b = ride.city) === null || _b === void 0 ? void 0 : _b.toLowerCase().trim()) || 'lagos';
                        const cityPricing = (_c = config.pricing) === null || _c === void 0 ? void 0 : _c[city];
                        const categories = config.categories;
                        if (cityPricing && categories) {
                            overrides = { standard: {} };
                            for (const [vehicle, catConfig] of Object.entries(categories)) {
                                overrides.standard[vehicle] = {
                                    baseFare: cityPricing.baseFare,
                                    costPerMinute: cityPricing.perMinute,
                                    costPerKm: catConfig.perKm,
                                    minimumFare: catConfig.minFare
                                };
                            }
                        }
                    }
                }
                else if (regionStr === 'us-chi' || regionStr === 'chicago') {
                    const config = yield PricingConfigService_1.pricingConfigService.getChicagoConfig();
                    if (config && config.rates) {
                        overrides = { standard: {} };
                        for (const [vehicle, rate] of Object.entries(config.rates)) {
                            overrides.standard[vehicle] = {
                                baseFare: rate.base,
                                costPerMile: rate.perMile,
                                costPerMinute: rate.perMin,
                                minimumFare: rate.minFare
                            };
                        }
                    }
                }
            }
            catch (error) {
                console.error('Error fetching pricing config:', error);
                // Continue with defaults
            }
            // 3. Clone Ride and Apply Surge & Overrides
            const rideWithSurge = Object.assign(Object.assign({}, ride), { region: (regionStr === 'NG' ? 'nigeria' : (regionStr === 'US-CHI' ? 'chicago' : regionStr)), pricing: Object.assign(Object.assign({}, ride.pricing), { estimatedFare: ((_d = ride.pricing) === null || _d === void 0 ? void 0 : _d.estimatedFare) || 0, currency: ((_e = ride.pricing) === null || _e === void 0 ? void 0 : _e.currency) || 'NGN', surgeMultiplier: multiplier }), pricingOverrides: overrides });
            const strategy = this.getStrategy(ride.region);
            return strategy.calculateFare(rideWithSurge, distance, duration);
        });
    }
    calculateCancellationFee(ride, minutesSinceBooking) {
        const strategy = this.getStrategy(ride.region);
        return strategy.calculateCancellationFee(ride, minutesSinceBooking);
    }
    calculateWaitTimeFee(ride, waitMinutes) {
        const strategy = this.getStrategy(ride.region);
        return strategy.calculateWaitTimeFee(ride, waitMinutes);
    }
}
exports.PricingService = PricingService;
exports.pricingService = new PricingService();
//# sourceMappingURL=PricingService.js.map