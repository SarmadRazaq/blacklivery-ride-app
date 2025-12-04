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
exports.locationService = exports.LocationService = void 0;
const firebase_1 = require("../config/firebase");
class LocationService {
    constructor() {
        this.subscriberMap = new Map();
        this.listenerMap = new Map();
    }
    publishDriverLocation(driverId, lat, lng, heading, speed, accuracy) {
        return __awaiter(this, void 0, void 0, function* () {
            const payload = {
                lat,
                lng,
                heading,
                speed,
                accuracy,
                timestamp: Date.now()
            };
            yield firebase_1.rtdb.ref(`drivers/${driverId}/location`).set(payload);
            return payload;
        });
    }
    subscribeToDriverLocation(driverId, callback) {
        if (!this.subscriberMap.has(driverId)) {
            this.subscriberMap.set(driverId, new Set());
        }
        this.subscriberMap.get(driverId).add(callback);
        if (!this.listenerMap.has(driverId)) {
            const ref = firebase_1.rtdb.ref(`drivers/${driverId}/location`);
            const handler = ref.on('value', (snapshot) => {
                const data = snapshot.val();
                if (!data)
                    return;
                this.dispatch(driverId, data);
            });
            this.listenerMap.set(driverId, () => ref.off('value', handler));
        }
        return () => {
            const subscribers = this.subscriberMap.get(driverId);
            if (!subscribers)
                return;
            subscribers.delete(callback);
            if (subscribers.size === 0) {
                this.subscriberMap.delete(driverId);
                const detach = this.listenerMap.get(driverId);
                detach === null || detach === void 0 ? void 0 : detach();
                this.listenerMap.delete(driverId);
            }
        };
    }
    dispatch(driverId, payload) {
        const subscribers = this.subscriberMap.get(driverId);
        if (!subscribers)
            return;
        subscribers.forEach((cb) => cb(payload));
    }
}
exports.LocationService = LocationService;
exports.locationService = new LocationService();
//# sourceMappingURL=LocationService.js.map