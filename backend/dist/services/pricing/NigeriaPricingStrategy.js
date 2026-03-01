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
exports.nigeriaPricingStrategy = exports.NigeriaPricingStrategy = void 0;
const CITY_RATE_TABLE = {
    lagos: {
        sedan: { baseFare: 1500, costPerKm: 250, costPerMinute: 45, minimumFare: 5000 },
        suv: { baseFare: 1500, costPerKm: 300, costPerMinute: 45, minimumFare: 7000 },
        xl: { baseFare: 1500, costPerKm: 350, costPerMinute: 45, minimumFare: 10000 }
    },
    abuja: {
        sedan: { baseFare: 1200, costPerKm: 250, costPerMinute: 30, minimumFare: 5000 },
        suv: { baseFare: 1200, costPerKm: 300, costPerMinute: 30, minimumFare: 7000 },
        xl: { baseFare: 1200, costPerKm: 350, costPerMinute: 30, minimumFare: 10000 }
    }
};
const DELIVERY_RATES = {
    motorbike: { baseFare: 700, costPerKm: 120, costPerMinute: 15, minimumFare: 1500, waitTime: { freeMinutes: 7, perMinute: 20 } },
    sedan: { baseFare: 1000, costPerKm: 150, costPerMinute: 20, minimumFare: 2500, waitTime: { freeMinutes: 7, perMinute: 25 } },
    suv: { baseFare: 1500, costPerKm: 200, costPerMinute: 30, minimumFare: 4000, waitTime: { freeMinutes: 7, perMinute: 30 } },
    van: { baseFare: 3000, costPerKm: 250, costPerMinute: 35, minimumFare: 7000, waitTime: { freeMinutes: 7, perMinute: 35 } }
};
const CANCELLATION_FEES = { sedan: 1500, motorbike: 1500, suv: 2000, xl: 2500 };
const NOSHOW_FEES = { sedan: 2000, motorbike: 2000, suv: 3000, xl: 4000 };
const WAIT_FEE_RIDE = { freeMinutes: 3, perMinute: 100 };
class NigeriaPricingStrategy {
    calculatePrice(request) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const bookingType = (_a = request.bookingType) !== null && _a !== void 0 ? _a : 'on_demand';
            if (bookingType === 'delivery') {
                return this.calculateDeliveryPrice(request);
            }
            if (bookingType === 'hourly' && request.hoursBooked) {
                return this.calculateHourlyPrice(request);
            }
            if (request.isAirport) {
                return this.calculateAirportFare(request);
            }
            return this.calculateStandardRidePrice(request);
        });
    }
    calculateCancellationFee(input) {
        var _a, _b, _c, _d;
        const vehicle = ((_a = input.vehicleCategory) !== null && _a !== void 0 ? _a : 'sedan').toLowerCase();
        if (input.isDelivery || input.bookingType === 'delivery') {
            return (_b = CANCELLATION_FEES[vehicle]) !== null && _b !== void 0 ? _b : 1500;
        }
        if (input.bookingType === 'hourly') {
            const hourlyRate = vehicle === 'suv' ? 30000 : vehicle === 'xl' ? 40000 : 20000;
            return hourlyRate;
        }
        if (input.isAirport) {
            return ((_c = CANCELLATION_FEES[vehicle]) !== null && _c !== void 0 ? _c : 1500) + 500;
        }
        return (_d = CANCELLATION_FEES[vehicle]) !== null && _d !== void 0 ? _d : 1500;
    }
    calculateWaitTimeFee(input) {
        var _a, _b, _c, _d, _e;
        if (input.waitMinutes <= 0)
            return 0;
        const vehicle = ((_a = input.vehicleCategory) !== null && _a !== void 0 ? _a : 'sedan').toLowerCase();
        if (input.isDelivery || input.bookingType === 'delivery') {
            const config = DELIVERY_RATES[vehicle];
            const free = (_c = (_b = config === null || config === void 0 ? void 0 : config.waitTime) === null || _b === void 0 ? void 0 : _b.freeMinutes) !== null && _c !== void 0 ? _c : 7;
            const perMinute = (_e = (_d = config === null || config === void 0 ? void 0 : config.waitTime) === null || _d === void 0 ? void 0 : _d.perMinute) !== null && _e !== void 0 ? _e : 25;
            const chargeable = Math.max(0, input.waitMinutes - free);
            return Math.ceil(chargeable) * perMinute;
        }
        const chargeable = Math.max(0, input.waitMinutes - WAIT_FEE_RIDE.freeMinutes);
        return Math.ceil(chargeable) * WAIT_FEE_RIDE.perMinute;
    }
    calculateStandardRidePrice(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const { distanceKm, durationMinutes } = request;
        const city = ((_a = request.city) !== null && _a !== void 0 ? _a : 'lagos').toLowerCase();
        const vehicle = ((_b = request.vehicleCategory) !== null && _b !== void 0 ? _b : 'sedan').toLowerCase();
        const baseConfig = (_d = (_c = CITY_RATE_TABLE[city]) === null || _c === void 0 ? void 0 : _c[vehicle]) !== null && _d !== void 0 ? _d : CITY_RATE_TABLE.lagos.sedan;
        const overrides = (_f = (_e = request.pricingOverrides) === null || _e === void 0 ? void 0 : _e.standard) === null || _f === void 0 ? void 0 : _f[vehicle];
        const baseFare = (_g = overrides === null || overrides === void 0 ? void 0 : overrides.baseFare) !== null && _g !== void 0 ? _g : baseConfig.baseFare;
        const costPerKm = (_h = overrides === null || overrides === void 0 ? void 0 : overrides.costPerKm) !== null && _h !== void 0 ? _h : baseConfig.costPerKm;
        const costPerMinute = (_j = overrides === null || overrides === void 0 ? void 0 : overrides.costPerMinute) !== null && _j !== void 0 ? _j : baseConfig.costPerMinute;
        const minimumFare = (_k = overrides === null || overrides === void 0 ? void 0 : overrides.minimumFare) !== null && _k !== void 0 ? _k : baseConfig.minimumFare;
        let fare = baseFare + distanceKm * costPerKm + durationMinutes * costPerMinute;
        fare += this.calculateRideAddOns(request);
        fare *= (_l = request.surgeMultiplier) !== null && _l !== void 0 ? _l : 1;
        if (overrides === null || overrides === void 0 ? void 0 : overrides.flatFare) {
            fare = overrides.flatFare;
        }
        return Math.max(fare, minimumFare);
    }
    calculateHourlyPrice(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const vehicle = ((_a = request.vehicleCategory) !== null && _a !== void 0 ? _a : 'sedan').toLowerCase();
        const defaults = {
            sedan: { hourlyRate: 20000, minimumHours: 2 },
            suv: { hourlyRate: 30000, minimumHours: 2 },
            xl: { hourlyRate: 40000, minimumHours: 2 }
        };
        const override = (_c = (_b = request.pricingOverrides) === null || _b === void 0 ? void 0 : _b.hourly) === null || _c === void 0 ? void 0 : _c[vehicle];
        const config = (_d = defaults[vehicle]) !== null && _d !== void 0 ? _d : defaults.sedan;
        const minimumHours = (_e = override === null || override === void 0 ? void 0 : override.minimumHours) !== null && _e !== void 0 ? _e : config.minimumHours;
        const hourlyRate = (_f = override === null || override === void 0 ? void 0 : override.hourlyRate) !== null && _f !== void 0 ? _f : config.hourlyRate;
        const billedHours = Math.max((_g = request.hoursBooked) !== null && _g !== void 0 ? _g : minimumHours, minimumHours);
        let fare = billedHours * hourlyRate;
        fare += this.calculateRideAddOns(request);
        if (override === null || override === void 0 ? void 0 : override.flatFare) {
            fare = override.flatFare;
        }
        return fare * ((_h = request.surgeMultiplier) !== null && _h !== void 0 ? _h : 1);
    }
    calculateAirportFare(request) {
        var _a, _b, _c, _d, _e;
        const city = ((_a = request.city) !== null && _a !== void 0 ? _a : 'lagos').toLowerCase();
        const vehicle = ((_b = request.vehicleCategory) !== null && _b !== void 0 ? _b : 'sedan').toLowerCase();
        const cityBase = city === 'abuja' ? 1200 : 1500;
        const airportSurcharge = city === 'abuja' ? 3000 : 4000;
        const perKm = vehicle === 'suv' ? 300 : vehicle === 'xl' ? 350 : 250;
        const minFare = vehicle === 'suv' ? 9000 : vehicle === 'xl' ? 12000 : 6000;
        let fare = cityBase +
            airportSurcharge +
            ((_c = request.distanceKm) !== null && _c !== void 0 ? _c : 0) * perKm +
            ((_d = request.durationMinutes) !== null && _d !== void 0 ? _d : 0) * 45 +
            this.calculateRideAddOns(request);
        fare *= (_e = request.surgeMultiplier) !== null && _e !== void 0 ? _e : 1;
        return Math.max(fare, minFare);
    }
    calculateDeliveryPrice(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        const vehicle = ((_a = request.vehicleCategory) !== null && _a !== void 0 ? _a : 'motorbike').toLowerCase();
        const defaults = (_b = DELIVERY_RATES[vehicle]) !== null && _b !== void 0 ? _b : DELIVERY_RATES.motorbike;
        const override = (_d = (_c = request.pricingOverrides) === null || _c === void 0 ? void 0 : _c.delivery) === null || _d === void 0 ? void 0 : _d[vehicle];
        const baseFare = (_f = (_e = override === null || override === void 0 ? void 0 : override.baseFare) !== null && _e !== void 0 ? _e : defaults.baseFare) !== null && _f !== void 0 ? _f : 700;
        const costPerKm = (_h = (_g = override === null || override === void 0 ? void 0 : override.costPerKm) !== null && _g !== void 0 ? _g : defaults.costPerKm) !== null && _h !== void 0 ? _h : 120;
        const costPerMinute = (_k = (_j = override === null || override === void 0 ? void 0 : override.costPerMinute) !== null && _j !== void 0 ? _j : defaults.costPerMinute) !== null && _k !== void 0 ? _k : 15;
        const minimumFare = (_m = (_l = override === null || override === void 0 ? void 0 : override.minimumFare) !== null && _l !== void 0 ? _l : defaults.minimumFare) !== null && _m !== void 0 ? _m : 1500;
        let fare = baseFare + request.distanceKm * costPerKm + request.durationMinutes * costPerMinute;
        const serviceType = (_p = (_o = request.deliveryDetails) === null || _o === void 0 ? void 0 : _o.serviceType) !== null && _p !== void 0 ? _p : 'same_day';
        const serviceMultipliers = (_q = override === null || override === void 0 ? void 0 : override.serviceMultipliers) !== null && _q !== void 0 ? _q : {
            instant: 1.2,
            same_day: 1.0,
            scheduled: 0.9
        };
        fare *= serviceMultipliers[serviceType];
        if ((_r = request.deliveryDetails) === null || _r === void 0 ? void 0 : _r.isFragile) {
            fare += vehicle === 'motorbike' ? 500 : 1000;
        }
        if ((_s = request.deliveryDetails) === null || _s === void 0 ? void 0 : _s.requiresReturn) {
            fare += fare * 0.7;
        }
        if ((_t = request.deliveryDetails) === null || _t === void 0 ? void 0 : _t.extraStops) {
            const extraStopFee = vehicle === 'motorbike' ? 500 : vehicle === 'sedan' ? 750 : 1000;
            fare += extraStopFee * request.deliveryDetails.extraStops;
        }
        fare *= (_u = request.surgeMultiplier) !== null && _u !== void 0 ? _u : 1;
        return Math.max(fare, minimumFare);
    }
    calculateRideAddOns(request) {
        let fee = 0;
        const addOns = request.addOns;
        if (!addOns)
            return fee;
        if (addOns.premiumVehicle)
            fee += 1500;
        if (addOns.extraLuggage)
            fee += 1500;
        if (addOns.meetAndGreet)
            fee += 1500;
        return fee;
    }
}
exports.NigeriaPricingStrategy = NigeriaPricingStrategy;
exports.nigeriaPricingStrategy = new NigeriaPricingStrategy();
//# sourceMappingURL=NigeriaPricingStrategy.js.map