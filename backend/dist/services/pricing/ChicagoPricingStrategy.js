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
exports.chicagoPricingStrategy = exports.ChicagoPricingStrategy = void 0;
const AIRPORT_DEFAULTS = {
    ORD: {
        business_sedan: 95,
        business_suv: 125,
        first_class: 150
    },
    MDW: {
        business_sedan: 85,
        business_suv: 110,
        first_class: 135
    }
};
const HOURLY_DEFAULTS = {
    business_sedan: { hourlyRate: 80, minimumHours: 2 },
    business_suv: { hourlyRate: 110, minimumHours: 2 },
    first_class: { hourlyRate: 140, minimumHours: 2 }
};
const STANDARD_DEFAULTS = {
    business_sedan: { baseFare: 35, costPerMile: 3.0, costPerMinute: 0.5, minimumFare: 55 },
    business_suv: { baseFare: 45, costPerMile: 3.75, costPerMinute: 0.7, minimumFare: 75 },
    first_class: { baseFare: 60, costPerMile: 4.5, costPerMinute: 0.9, minimumFare: 95 }
};
const DELIVERY_DEFAULTS = {
    business_sedan: { baseFare: 40, costPerMile: 2.2, costPerMinute: 0.45, minimumFare: 60 },
    business_suv: { baseFare: 55, costPerMile: 2.7, costPerMinute: 0.55, minimumFare: 80 },
    first_class: { baseFare: 70, costPerMile: 3.2, costPerMinute: 0.65, minimumFare: 105 }
};
class ChicagoPricingStrategy {
    calculatePrice(request) {
        return __awaiter(this, void 0, void 0, function* () {
            if (request.bookingType === 'delivery') {
                return this.calculateDeliveryPrice(request);
            }
            if (request.isAirport && request.airportCode) {
                return this.calculateAirportPrice(request);
            }
            if (request.bookingType === 'hourly' && request.hoursBooked) {
                return this.calculateHourlyPrice(request);
            }
            return this.calculateStandardPrice(request);
        });
    }
    calculateCancellationFee(input) {
        var _a;
        if (input.bookingType === 'hourly' && input.hoursBooked) {
            const config = (_a = HOURLY_DEFAULTS[input.vehicleCategory]) !== null && _a !== void 0 ? _a : HOURLY_DEFAULTS.business_sedan;
            return config.hourlyRate;
        }
        if (input.isAirport && input.fareEstimate) {
            return Math.max(25, input.fareEstimate * 0.5);
        }
        return 25;
    }
    calculateWaitTimeFee(input) {
        const waitMinutes = Math.max(0, input.waitMinutes);
        if (waitMinutes <= 0)
            return 0;
        const freeMinutes = input.isAirport ? 60 : 5;
        const chargeable = Math.max(0, waitMinutes - freeMinutes);
        return Math.ceil(chargeable) * 1.0;
    }
    calculateAirportPrice(request) {
        var _a, _b, _c;
        const { airportCode, vehicleCategory, addOns, pricingOverrides } = request;
        const overrides = this.getAirportOverride(pricingOverrides, airportCode, vehicleCategory);
        let fare = (_c = (_a = overrides === null || overrides === void 0 ? void 0 : overrides.fare) !== null && _a !== void 0 ? _a : (_b = AIRPORT_DEFAULTS[airportCode]) === null || _b === void 0 ? void 0 : _b[vehicleCategory]) !== null && _c !== void 0 ? _c : 95;
        if (overrides === null || overrides === void 0 ? void 0 : overrides.addOnFlatFee) {
            fare += overrides.addOnFlatFee;
        }
        else {
            fare += this.calculateAddOns(addOns);
        }
        return fare;
    }
    calculateHourlyPrice(request) {
        var _a, _b, _c, _d;
        const { vehicleCategory, addOns, hoursBooked = 2, pricingOverrides } = request;
        const defaults = (_a = HOURLY_DEFAULTS[vehicleCategory]) !== null && _a !== void 0 ? _a : HOURLY_DEFAULTS.business_sedan;
        const overrides = (_b = pricingOverrides === null || pricingOverrides === void 0 ? void 0 : pricingOverrides.hourly) === null || _b === void 0 ? void 0 : _b[vehicleCategory];
        const minimumHours = (_c = overrides === null || overrides === void 0 ? void 0 : overrides.minimumHours) !== null && _c !== void 0 ? _c : defaults.minimumHours;
        const hourlyRate = (_d = overrides === null || overrides === void 0 ? void 0 : overrides.hourlyRate) !== null && _d !== void 0 ? _d : defaults.hourlyRate;
        const billedHours = Math.max(hoursBooked, minimumHours);
        let fare = billedHours * hourlyRate;
        fare += this.calculateAddOns(addOns);
        if (overrides === null || overrides === void 0 ? void 0 : overrides.flatFare) {
            fare = overrides.flatFare;
        }
        return fare;
    }
    calculateStandardPrice(request) {
        var _a, _b, _c, _d, _e, _f;
        const { distanceKm, durationMinutes, vehicleCategory, addOns, surgeMultiplier, pricingOverrides } = request;
        const defaults = (_a = STANDARD_DEFAULTS[vehicleCategory]) !== null && _a !== void 0 ? _a : STANDARD_DEFAULTS.business_sedan;
        const overrides = (_b = pricingOverrides === null || pricingOverrides === void 0 ? void 0 : pricingOverrides.standard) === null || _b === void 0 ? void 0 : _b[vehicleCategory];
        const baseFare = (_c = overrides === null || overrides === void 0 ? void 0 : overrides.baseFare) !== null && _c !== void 0 ? _c : defaults.baseFare;
        const costPerMile = (_d = overrides === null || overrides === void 0 ? void 0 : overrides.costPerMile) !== null && _d !== void 0 ? _d : defaults.costPerMile;
        const costPerMinute = (_e = overrides === null || overrides === void 0 ? void 0 : overrides.costPerMinute) !== null && _e !== void 0 ? _e : defaults.costPerMinute;
        const minimumFare = (_f = overrides === null || overrides === void 0 ? void 0 : overrides.minimumFare) !== null && _f !== void 0 ? _f : defaults.minimumFare;
        const distanceMiles = distanceKm * 0.621371;
        let fare = baseFare + distanceMiles * costPerMile + durationMinutes * costPerMinute;
        fare *= surgeMultiplier || 1.0;
        fare += this.calculateAddOns(addOns);
        if (overrides === null || overrides === void 0 ? void 0 : overrides.flatFare) {
            fare = overrides.flatFare;
        }
        return Math.max(fare, minimumFare);
    }
    calculateDeliveryPrice(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const vehicleCategory = (_a = request.vehicleCategory) !== null && _a !== void 0 ? _a : 'business_sedan';
        const defaults = (_b = DELIVERY_DEFAULTS[vehicleCategory]) !== null && _b !== void 0 ? _b : DELIVERY_DEFAULTS.business_sedan;
        const override = (_d = (_c = request.pricingOverrides) === null || _c === void 0 ? void 0 : _c.delivery) === null || _d === void 0 ? void 0 : _d[vehicleCategory];
        const baseFare = (_e = override === null || override === void 0 ? void 0 : override.baseFare) !== null && _e !== void 0 ? _e : defaults.baseFare;
        const costPerMile = (_f = override === null || override === void 0 ? void 0 : override.costPerKm) !== null && _f !== void 0 ? _f : defaults.costPerMile;
        const costPerMinute = (_g = override === null || override === void 0 ? void 0 : override.costPerMinute) !== null && _g !== void 0 ? _g : defaults.costPerMinute;
        const minFare = (_h = override === null || override === void 0 ? void 0 : override.minimumFare) !== null && _h !== void 0 ? _h : defaults.minimumFare;
        const distanceMiles = request.distanceKm * 0.621371;
        let fare = baseFare + distanceMiles * costPerMile + request.durationMinutes * costPerMinute;
        fare += this.calculateAddOns(request.addOns);
        const serviceType = (_j = request.deliveryDetails) === null || _j === void 0 ? void 0 : _j.serviceType;
        if (serviceType === 'instant') {
            fare *= 1.15;
        }
        else if (serviceType === 'scheduled') {
            fare *= 0.9;
        }
        fare *= (_k = request.surgeMultiplier) !== null && _k !== void 0 ? _k : 1;
        return Math.max(fare, minFare);
    }
    calculateAddOns(addOns) {
        let addOnFee = 0;
        if (!addOns)
            return addOnFee;
        if (addOns.childSeat)
            addOnFee += addOns.childSeat * 10;
        if (addOns.extraStops && addOns.extraStops > 0)
            addOnFee += addOns.extraStops * 15;
        else if (addOns.extraStop)
            addOnFee += 15;
        if (addOns.meetAndGreet)
            addOnFee += 10;
        if (addOns.afterHours)
            addOnFee += 10;
        return addOnFee;
    }
    getAirportOverride(overrides, airportCode, vehicleCategory) {
        var _a, _b;
        return (_b = (_a = overrides === null || overrides === void 0 ? void 0 : overrides.airport) === null || _a === void 0 ? void 0 : _a[airportCode]) === null || _b === void 0 ? void 0 : _b[vehicleCategory];
    }
}
exports.ChicagoPricingStrategy = ChicagoPricingStrategy;
exports.chicagoPricingStrategy = new ChicagoPricingStrategy();
//# sourceMappingURL=ChicagoPricingStrategy.js.map