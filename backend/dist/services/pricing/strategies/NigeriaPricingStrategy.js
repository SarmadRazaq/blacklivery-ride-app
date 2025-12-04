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
exports.NigeriaPricingStrategy = void 0;
const PricingConfigService_1 = require("../PricingConfigService");
class NigeriaPricingStrategy {
    constructor() {
        this.DEFAULTS = {
            CITIES: {
                'lagos': { baseFare: 1500, perMinute: 45, waitTimeFee: 100 },
                'abuja': { baseFare: 1200, perMinute: 30, waitTimeFee: 100 },
                'default': { baseFare: 1500, perMinute: 45, waitTimeFee: 100 }
            },
            RIDE_RATES: {
                'sedan': { perKm: 250, minFare: 5000, cancel: 1500, noShow: 2000 },
                'suv': { perKm: 300, minFare: 7000, cancel: 2000, noShow: 3000 },
                'xl': { perKm: 350, minFare: 10000, cancel: 2500, noShow: 4000 }
            },
            DELIVERY_RATES: {
                'motorbike': { base: 700, perKm: 120, perMin: 15, minFare: 1500, cancel: 300, noShow: 500 },
                'sedan': { base: 1000, perKm: 150, perMin: 20, minFare: 2500, cancel: 500, noShow: 750 },
                'suv': { base: 1500, perKm: 200, perMin: 30, minFare: 4000, cancel: 500, noShow: 750 },
                'van': { base: 3000, perKm: 250, perMin: 35, minFare: 7000, cancel: 1000, noShow: 1500 }
            }
        };
    }
    calculateFare(ride, distanceKm, durationMinutes) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ride.bookingType === 'delivery') {
                return this.calculateDeliveryFare(ride, distanceKm, durationMinutes);
            }
            return this.calculateRideFare(ride, distanceKm, durationMinutes);
        });
    }
    calculateRideFare(ride, distanceKm, durationMinutes) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const config = yield PricingConfigService_1.pricingConfigService.getNigeriaConfig();
            const cityKey = (ride.city && ((config === null || config === void 0 ? void 0 : config.pricing[ride.city]) || this.DEFAULTS.CITIES[ride.city])) ? ride.city : 'default';
            const cityConfig = (config === null || config === void 0 ? void 0 : config.pricing[cityKey]) || this.DEFAULTS.CITIES[cityKey] || this.DEFAULTS.CITIES.default;
            const category = ((_a = ride.vehicleCategory) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'sedan';
            const vehicleConfig = (config === null || config === void 0 ? void 0 : config.categories[category]) || this.DEFAULTS.RIDE_RATES[category] || this.DEFAULTS.RIDE_RATES.sedan;
            // Use config values or defaults
            const baseFare = cityConfig.baseFare;
            const minuteRate = (_b = cityConfig.perMinute) !== null && _b !== void 0 ? _b : cityConfig.minuteRate; // Safe access
            const distanceFare = distanceKm * vehicleConfig.perKm;
            const timeFare = durationMinutes * minuteRate;
            let surgeMultiplier = ride.pricing.surgeMultiplier || 1.0;
            const subtotal = baseFare + (distanceFare + timeFare) * surgeMultiplier;
            let addOnsFare = 0;
            if ((_c = ride.addOns) === null || _c === void 0 ? void 0 : _c.premiumVehicle)
                addOnsFare += 1500;
            if ((_d = ride.addOns) === null || _d === void 0 ? void 0 : _d.extraLuggage)
                addOnsFare += 1000;
            const surgeFare = (distanceFare + timeFare) * (surgeMultiplier - 1);
            let totalFare = baseFare + distanceFare + timeFare + surgeFare + addOnsFare;
            if (totalFare < vehicleConfig.minFare) {
                totalFare = vehicleConfig.minFare;
            }
            return {
                baseFare,
                distanceFare,
                timeFare,
                surgeFare,
                waitTimeFare: 0,
                addOnsFare,
                otherFees: 0,
                totalFare,
                currency: 'NGN',
                surgeMultiplier
            };
        });
    }
    calculateDeliveryFare(ride, distanceKm, durationMinutes) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const config = yield PricingConfigService_1.pricingConfigService.getDeliveryConfig();
            const category = ((_a = ride.vehicleCategory) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'motorbike';
            const vehicleConfig = ((_b = config === null || config === void 0 ? void 0 : config.rates) === null || _b === void 0 ? void 0 : _b[category]) || this.DEFAULTS.DELIVERY_RATES[category] || this.DEFAULTS.DELIVERY_RATES.motorbike;
            const baseFare = vehicleConfig.base;
            const distanceFare = distanceKm * vehicleConfig.perKm;
            const timeFare = durationMinutes * ((_c = vehicleConfig.perMin) !== null && _c !== void 0 ? _c : 15); // Default if missing
            let multiplier = 1.0;
            if (((_d = ride.deliveryDetails) === null || _d === void 0 ? void 0 : _d.serviceType) === 'instant')
                multiplier = 1.2;
            if (((_e = ride.deliveryDetails) === null || _e === void 0 ? void 0 : _e.serviceType) === 'scheduled')
                multiplier = 0.9;
            let addOnsFare = 0;
            if ((_f = ride.deliveryDetails) === null || _f === void 0 ? void 0 : _f.extraStops)
                addOnsFare += (ride.deliveryDetails.extraStops * (category === 'motorbike' ? 500 : 750));
            if ((_g = ride.deliveryDetails) === null || _g === void 0 ? void 0 : _g.isFragile)
                addOnsFare += 500;
            if ((_h = ride.deliveryDetails) === null || _h === void 0 ? void 0 : _h.requiresReturn) {
                addOnsFare += (baseFare + distanceFare + timeFare) * 0.7;
            }
            const preTotal = (baseFare + distanceFare + timeFare) * multiplier;
            let totalFare = preTotal + addOnsFare;
            if (totalFare < vehicleConfig.minFare) {
                totalFare = vehicleConfig.minFare;
            }
            return {
                baseFare,
                distanceFare,
                timeFare,
                surgeFare: 0,
                waitTimeFare: 0,
                addOnsFare,
                otherFees: 0,
                totalFare,
                currency: 'NGN',
                surgeMultiplier: 1.0 // Delivery usually fixed or multiplier handled via serviceType
            };
        });
    }
    calculateCancellationFee(ride, minutesSinceBooking) {
        var _a, _b;
        // Simplified synchronous fallback for now, or make async if interface allows
        // Since interface is synchronous, we use defaults or need to refactor interface to async
        // For now, using defaults to satisfy interface
        const category = ((_a = ride.vehicleCategory) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'sedan';
        if (ride.bookingType === 'delivery') {
            return 300;
        }
        return ((_b = this.DEFAULTS.RIDE_RATES[category]) === null || _b === void 0 ? void 0 : _b.cancel) || 1500;
    }
    calculateNoShowFee(ride) {
        var _a, _b;
        if (ride.bookingType === 'delivery')
            return 500;
        const category = ((_a = ride.vehicleCategory) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'sedan';
        return ((_b = this.DEFAULTS.RIDE_RATES[category]) === null || _b === void 0 ? void 0 : _b.noShow) || 2000;
    }
    calculateWaitTimeFee(ride, waitMinutes) {
        const freeMinutes = ride.bookingType === 'delivery' ? 7 : 3;
        if (waitMinutes <= freeMinutes)
            return 0;
        const billableMinutes = waitMinutes - freeMinutes;
        // Using default rate as sync
        return billableMinutes * 100;
    }
}
exports.NigeriaPricingStrategy = NigeriaPricingStrategy;
//# sourceMappingURL=NigeriaPricingStrategy.js.map