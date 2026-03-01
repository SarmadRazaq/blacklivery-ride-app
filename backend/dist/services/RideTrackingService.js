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
exports.rideTrackingService = void 0;
const firebase_1 = require("../config/firebase");
const GoogleMapsService_1 = require("./GoogleMapsService");
const SocketService_1 = require("./SocketService");
const logger_1 = require("../utils/logger");
class RideTrackingService {
    constructor() {
        this.MIN_BROADCAST_INTERVAL_MS = 5000;
        this.SNAPSHOT_INTERVAL_MS = 30000;
        this.streams = new Map();
        this.driverLookup = new Map();
    }
    startTracking(ride) {
        if (!ride.id || !ride.driverId)
            return;
        this.stopTracking(ride.id);
        const context = {
            rideId: ride.id,
            driverId: ride.driverId,
            riderId: ride.riderId,
            pickupLocation: ride.pickupLocation,
            dropoffLocation: ride.dropoffLocation,
            stage: ride.status,
            lastBroadcast: 0
        };
        context.interval = setInterval(() => {
            this.pushSnapshot(context.rideId).catch((err) => logger_1.logger.error({ err, rideId: context.rideId }, 'ride snapshot push failed'));
        }, this.SNAPSHOT_INTERVAL_MS);
        this.streams.set(ride.id, context);
        this.driverLookup.set(ride.driverId, ride.id);
        SocketService_1.socketService.joinRideRoom(ride.id, ride.riderId, ride.driverId);
    }
    updateStage(rideId, stage) {
        const context = this.streams.get(rideId);
        if (!context)
            return;
        context.stage = stage;
        this.streams.set(rideId, context);
    }
    stopTracking(rideId) {
        const context = this.streams.get(rideId);
        if (context === null || context === void 0 ? void 0 : context.interval)
            clearInterval(context.interval);
        if (context) {
            this.driverLookup.delete(context.driverId);
            SocketService_1.socketService.leaveRideRoom(rideId);
        }
        this.streams.delete(rideId);
    }
    handleDriverHeartbeat(driverId, location) {
        return __awaiter(this, void 0, void 0, function* () {
            const rideId = this.driverLookup.get(driverId);
            if (!rideId)
                return;
            const context = this.streams.get(rideId);
            if (!context)
                return;
            if (!location) {
                const snapshot = yield firebase_1.rtdb.ref(`drivers/${driverId}/location`).get();
                location = snapshot.val();
            }
            if (!location)
                return;
            if (Date.now() - context.lastBroadcast < this.MIN_BROADCAST_INTERVAL_MS)
                return;
            yield this.emitRideUpdate(context, location);
        });
    }
    pushSnapshot(rideId) {
        return __awaiter(this, void 0, void 0, function* () {
            const context = this.streams.get(rideId);
            if (!context)
                return;
            const snapshot = yield firebase_1.rtdb.ref(`drivers/${context.driverId}/location`).get();
            const location = snapshot.val();
            if (!location)
                return;
            yield this.emitRideUpdate(context, location);
        });
    }
    emitRideUpdate(context, location) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const headingStage = context.stage === 'accepted' || context.stage === 'arrived' ? 'pickup' : 'dropoff';
                const target = headingStage === 'pickup' ? context.pickupLocation : context.dropoffLocation;
                let etaData = undefined;
                if (target) {
                    const eta = yield GoogleMapsService_1.googleMapsService.getDistanceAndDuration({ lat: location.lat, lng: location.lng }, { lat: target.lat, lng: target.lng });
                    etaData = {
                        seconds: eta.durationSeconds,
                        text: eta.durationText,
                        distanceMeters: eta.distanceMeters,
                        distanceText: eta.distanceText
                    };
                }
                SocketService_1.socketService.emitRideUpdate(context.rideId, {
                    rideId: context.rideId,
                    driverId: context.driverId,
                    riderId: context.riderId,
                    stage: context.stage,
                    nextStop: headingStage,
                    location,
                    eta: etaData,
                    updatedAt: new Date().toISOString()
                });
                context.lastBroadcast = Date.now();
                this.streams.set(context.rideId, context);
            }
            catch (error) {
                logger_1.logger.error({ err: error, rideId: context.rideId }, 'Failed to emit ride update');
            }
        });
    }
}
exports.rideTrackingService = new RideTrackingService();
//# sourceMappingURL=RideTrackingService.js.map