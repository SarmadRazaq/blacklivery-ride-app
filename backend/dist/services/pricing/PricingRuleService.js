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
exports.pricingRuleService = void 0;
const firebase_1 = require("../../config/firebase");
const logger_1 = require("../../utils/logger");
class PricingRuleService {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 5 * 60 * 1000;
    }
    getOverrides(region, city) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const key = `${region.toLowerCase()}:${(city !== null && city !== void 0 ? city : 'default').toLowerCase()}`;
            const cached = this.cache.get(key);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.overrides;
            }
            try {
                const doc = yield firebase_1.db.collection('pricing_rules').doc(region.toLowerCase()).get();
                if (!doc.exists) {
                    return undefined;
                }
                const data = doc.data();
                const merged = this.mergeOverrides(data === null || data === void 0 ? void 0 : data.defaults, city ? (_a = data === null || data === void 0 ? void 0 : data.cities) === null || _a === void 0 ? void 0 : _a[city.toLowerCase()] : undefined);
                this.cache.set(key, { overrides: merged, expiresAt: Date.now() + this.TTL_MS });
                return merged;
            }
            catch (error) {
                logger_1.logger.error({ err: error, region, city }, 'Failed to load pricing overrides');
                return undefined;
            }
        });
    }
    invalidate(region) {
        if (!region) {
            this.cache.clear();
            return;
        }
        const prefix = `${region.toLowerCase()}:`;
        Array.from(this.cache.keys())
            .filter((key) => key.startsWith(prefix))
            .forEach((key) => this.cache.delete(key));
    }
    mergeOverrides(base, override) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5;
        if (!base && !override) {
            return undefined;
        }
        const merged = Object.assign(Object.assign(Object.assign({}, (base !== null && base !== void 0 ? base : {})), (override !== null && override !== void 0 ? override : {})), { airport: Object.assign(Object.assign({}, ((_a = base === null || base === void 0 ? void 0 : base.airport) !== null && _a !== void 0 ? _a : {})), ((_b = override === null || override === void 0 ? void 0 : override.airport) !== null && _b !== void 0 ? _b : {})), hourly: Object.assign(Object.assign({}, ((_c = base === null || base === void 0 ? void 0 : base.hourly) !== null && _c !== void 0 ? _c : {})), ((_d = override === null || override === void 0 ? void 0 : override.hourly) !== null && _d !== void 0 ? _d : {})), standard: Object.assign(Object.assign({}, ((_e = base === null || base === void 0 ? void 0 : base.standard) !== null && _e !== void 0 ? _e : {})), ((_f = override === null || override === void 0 ? void 0 : override.standard) !== null && _f !== void 0 ? _f : {})), delivery: Object.assign(Object.assign({}, ((_g = base === null || base === void 0 ? void 0 : base.delivery) !== null && _g !== void 0 ? _g : {})), ((_h = override === null || override === void 0 ? void 0 : override.delivery) !== null && _h !== void 0 ? _h : {})), fees: Object.assign(Object.assign(Object.assign({}, ((_j = base === null || base === void 0 ? void 0 : base.fees) !== null && _j !== void 0 ? _j : {})), ((_k = override === null || override === void 0 ? void 0 : override.fees) !== null && _k !== void 0 ? _k : {})), { cancellation: Object.assign(Object.assign({}, ((_m = (_l = base === null || base === void 0 ? void 0 : base.fees) === null || _l === void 0 ? void 0 : _l.cancellation) !== null && _m !== void 0 ? _m : {})), ((_p = (_o = override === null || override === void 0 ? void 0 : override.fees) === null || _o === void 0 ? void 0 : _o.cancellation) !== null && _p !== void 0 ? _p : {})), waitTime: {
                    ride: Object.assign(Object.assign({}, ((_s = (_r = (_q = base === null || base === void 0 ? void 0 : base.fees) === null || _q === void 0 ? void 0 : _q.waitTime) === null || _r === void 0 ? void 0 : _r.ride) !== null && _s !== void 0 ? _s : {})), ((_v = (_u = (_t = override === null || override === void 0 ? void 0 : override.fees) === null || _t === void 0 ? void 0 : _t.waitTime) === null || _u === void 0 ? void 0 : _u.ride) !== null && _v !== void 0 ? _v : {})),
                    delivery: Object.assign(Object.assign({}, ((_y = (_x = (_w = base === null || base === void 0 ? void 0 : base.fees) === null || _w === void 0 ? void 0 : _w.waitTime) === null || _x === void 0 ? void 0 : _x.delivery) !== null && _y !== void 0 ? _y : {})), ((_1 = (_0 = (_z = override === null || override === void 0 ? void 0 : override.fees) === null || _z === void 0 ? void 0 : _z.waitTime) === null || _0 === void 0 ? void 0 : _0.delivery) !== null && _1 !== void 0 ? _1 : {}))
                }, noShow: Object.assign(Object.assign({}, ((_3 = (_2 = base === null || base === void 0 ? void 0 : base.fees) === null || _2 === void 0 ? void 0 : _2.noShow) !== null && _3 !== void 0 ? _3 : {})), ((_5 = (_4 = override === null || override === void 0 ? void 0 : override.fees) === null || _4 === void 0 ? void 0 : _4.noShow) !== null && _5 !== void 0 ? _5 : {})) }) });
        return merged;
    }
}
exports.pricingRuleService = new PricingRuleService();
//# sourceMappingURL=PricingRuleService.js.map