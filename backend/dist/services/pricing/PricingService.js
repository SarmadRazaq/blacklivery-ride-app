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
class PricingService {
    constructor() {
        this.strategies = {
            'NG': new NigeriaPricingStrategy_1.NigeriaPricingStrategy(),
            'US-CHI': new ChicagoPricingStrategy_1.ChicagoPricingStrategy()
        };
    }
    getStrategy(region) {
        const strategy = this.strategies[region];
        if (!strategy) {
            console.warn(`Pricing strategy not found for region ${region}, defaulting to NG`);
            return this.strategies['NG'];
        }
        return strategy;
    }
    calculateFare(ride, distance, duration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // 1. Calculate Surge
            const multiplier = yield SurgeService_1.surgeService.getMultiplier(ride.pickupLocation.lat, ride.pickupLocation.lng, ride.region);
            // 2. Clone Ride and Apply Surge
            // Ensure we respect the interface (IRide has pricing which might be undefined in some mocks, but we force it here)
            const rideWithSurge = Object.assign(Object.assign({}, ride), { pricing: Object.assign(Object.assign({}, ride.pricing), { estimatedFare: ((_a = ride.pricing) === null || _a === void 0 ? void 0 : _a.estimatedFare) || 0, currency: ((_b = ride.pricing) === null || _b === void 0 ? void 0 : _b.currency) || 'NGN', surgeMultiplier: multiplier }) });
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