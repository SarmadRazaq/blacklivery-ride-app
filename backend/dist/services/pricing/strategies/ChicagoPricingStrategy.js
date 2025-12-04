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
exports.ChicagoPricingStrategy = void 0;
const PricingConfigService_1 = require("../PricingConfigService");
class ChicagoPricingStrategy {
    constructor() {
        this.DEFAULTS = {
            RATES: {
                'business_sedan': { base: 35, perMile: 3.00, perMin: 0.50, minFare: 55 },
                'business_suv': { base: 45, perMile: 3.75, perMin: 0.70, minFare: 75 },
                'first_class': { base: 60, perMile: 4.50, perMin: 0.90, minFare: 95 }
            },
            AIRPORT_RATES: {
                'ORD': {
                    'business_sedan': 125,
                    'business_suv': 150,
                    'first_class': 150
                },
                'MDW': {
                    'business_sedan': 95,
                    'business_suv': 110,
                    'first_class': 135
                }
            },
            HOURLY_RATES: {
                'business_sedan': 80,
                'business_suv': 110,
                'first_class': 140
            }
        };
    }
    calculateFare(ride, distanceMiles, durationMinutes) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ride.bookingType === 'hourly') {
                return this.calculateHourlyFare(ride);
            }
            if (ride.isAirport && ride.airportCode) {
                return this.calculateAirportFare(ride);
            }
            return this.calculateStandardFare(ride, distanceMiles, durationMinutes);
        });
    }
    calculateStandardFare(ride, distanceMiles, durationMinutes) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const config = yield PricingConfigService_1.pricingConfigService.getChicagoConfig();
            const category = ((_a = ride.vehicleCategory) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'business_sedan';
            // Use config or defaults
            const rateConfig = (config === null || config === void 0 ? void 0 : config.rates[category]) || this.DEFAULTS.RATES[category] || this.DEFAULTS.RATES.business_sedan;
            const baseFare = rateConfig.base;
            const distanceFare = distanceMiles * rateConfig.perMile;
            const timeFare = durationMinutes * rateConfig.perMin;
            let surgeMultiplier = ride.pricing.surgeMultiplier || 1.0;
            const subtotal = (baseFare + distanceFare + timeFare) * surgeMultiplier;
            const surgeFare = (baseFare + distanceFare + timeFare) * (surgeMultiplier - 1);
            let addOnsFare = 0;
            if ((_b = ride.addOns) === null || _b === void 0 ? void 0 : _b.childSeat)
                addOnsFare += (ride.addOns.childSeat * 10);
            if ((_c = ride.addOns) === null || _c === void 0 ? void 0 : _c.meetAndGreet)
                addOnsFare += 10;
            let totalFare = baseFare + distanceFare + timeFare + surgeFare + addOnsFare;
            if (totalFare < rateConfig.minFare) {
                totalFare = rateConfig.minFare;
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
                currency: 'USD',
                surgeMultiplier
            };
        });
    }
    calculateAirportFare(ride) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const config = yield PricingConfigService_1.pricingConfigService.getChicagoConfig();
            const airport = ride.airportCode || 'ORD';
            const category = ((_a = ride.vehicleCategory) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'business_sedan';
            const airportConfig = (config === null || config === void 0 ? void 0 : config.airport) || this.DEFAULTS.AIRPORT_RATES;
            // Cast to any to handle mixed types (Record<string, number> vs Strict Object)
            const rates = (airportConfig[airport] || this.DEFAULTS.AIRPORT_RATES[airport]);
            const fixedPrice = (rates === null || rates === void 0 ? void 0 : rates[category]) || 100;
            return {
                baseFare: fixedPrice,
                distanceFare: 0,
                timeFare: 0,
                surgeFare: 0,
                waitTimeFare: 0,
                addOnsFare: 0,
                otherFees: 0,
                totalFare: fixedPrice,
                currency: 'USD'
            };
        });
    }
    calculateHourlyFare(ride) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const config = yield PricingConfigService_1.pricingConfigService.getChicagoConfig();
            const hours = Math.max(ride.hoursBooked || 2, 2);
            const category = ((_a = ride.vehicleCategory) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'business_sedan';
            const hourlyConfig = (config === null || config === void 0 ? void 0 : config.hourly) || this.DEFAULTS.HOURLY_RATES;
            // Cast to any to handle mixed types
            const hourlyRate = hourlyConfig[category] || this.DEFAULTS.HOURLY_RATES[category] || 80;
            const totalFare = hours * hourlyRate;
            return {
                baseFare: totalFare,
                distanceFare: 0,
                timeFare: 0,
                surgeFare: 0,
                waitTimeFare: 0,
                addOnsFare: 0,
                otherFees: 0,
                totalFare,
                currency: 'USD'
            };
        });
    }
    calculateCancellationFee(ride, minutesSinceBooking) {
        // Sync implementation for now, using defaults
        if (ride.bookingType === 'hourly') {
            return this.DEFAULTS.HOURLY_RATES[ride.vehicleCategory] || 80;
        }
        if (ride.isAirport) {
            return 50;
        }
        return 25;
    }
    calculateNoShowFee(ride) {
        return this.calculateCancellationFee(ride, 60);
    }
    calculateWaitTimeFee(ride, waitMinutes) {
        const freeMinutes = ride.isAirport ? 60 : 0;
        if (waitMinutes <= freeMinutes)
            return 0;
        const billable = waitMinutes - freeMinutes;
        return billable * 1.00;
    }
}
exports.ChicagoPricingStrategy = ChicagoPricingStrategy;
//# sourceMappingURL=ChicagoPricingStrategy.js.map