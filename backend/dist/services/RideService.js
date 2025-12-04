"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.rideService = exports.RideService = void 0;
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const firebase_1 = require("../config/firebase");
const SocketService_1 = require("./SocketService");
const RideEvents_1 = require("../events/RideEvents");
const RideTrackingService_1 = require("./RideTrackingService");
const logger_1 = require("../utils/logger");
const geohash_1 = require("../utils/geohash");
const PricingService_1 = require("./pricing/PricingService");
const PricingConfigService_1 = require("./pricing/PricingConfigService");
const WalletService_1 = require("./WalletService");
const IncentiveService_1 = require("./driver/IncentiveService");
const GoogleMapsService_1 = require("./GoogleMapsService");
class RideService {
    constructor() {
        this.DRIVER_BATCH_SIZE = 10;
        this.MAX_BATCHES = 3;
        this.INITIAL_RADIUS_KM = 5;
        this.RADIUS_STEP_KM = 5;
        this.BATCH_TIMEOUT_MS = 30000;
        this.MIN_DRIVER_RATING = 4.5;
        this.matchState = new Map();
        this.matchTimers = new Map();
    }
    createRideRequest(riderId, requestData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const now = new Date();
            // Validate Distance/Pricing
            const routeData = yield GoogleMapsService_1.googleMapsService.getDistanceAndDuration(requestData.pickupLocation, requestData.dropoffLocation);
            const distanceKm = routeData.distanceMeters / 1000;
            const durationMinutes = routeData.durationSeconds / 60;
            const mockRide = Object.assign(Object.assign({}, requestData), { riderId, createdAt: now });
            const authoritativePrice = yield PricingService_1.pricingService.calculateFare(mockRide, distanceKm, durationMinutes);
            const pickupGeohash = (0, geohash_1.encodeGeohash)(requestData.pickupLocation.lat, requestData.pickupLocation.lng, 7);
            const dropoffGeohash = (0, geohash_1.encodeGeohash)(requestData.dropoffLocation.lat, requestData.dropoffLocation.lng, 7);
            const rideRecord = {
                riderId,
                status: 'finding_driver',
                bookingType: (_a = requestData.bookingType) !== null && _a !== void 0 ? _a : 'on_demand',
                pickupLocation: requestData.pickupLocation,
                dropoffLocation: requestData.dropoffLocation,
                vehicleCategory: requestData.vehicleCategory,
                region: requestData.region,
                city: requestData.city,
                isAirport: requestData.isAirport,
                airportCode: requestData.airportCode,
                hoursBooked: requestData.hoursBooked,
                hourlyStartTime: requestData.hourlyStartTime,
                deliveryDetails: requestData.deliveryDetails,
                addOns: requestData.addOns,
                pricing: {
                    estimatedFare: authoritativePrice.totalFare,
                    currency: authoritativePrice.currency,
                    surgeMultiplier: (_c = (_b = requestData.pricing) === null || _b === void 0 ? void 0 : _b.surgeMultiplier) !== null && _c !== void 0 ? _c : 1.0, // Should be server-calculated ideally
                    breakdown: authoritativePrice
                },
                requestedDriverIds: [],
                createdAt: now,
                updatedAt: now,
                pickupGeohash,
                pickupGeohash5: pickupGeohash.substring(0, 5),
                dropoffGeohash5: dropoffGeohash.substring(0, 5),
                matching: { radiusKm: this.INITIAL_RADIUS_KM, batch: 0 }
            };
            const rideDoc = yield firebase_1.db.collection('rides').add(rideRecord);
            const ride = Object.assign(Object.assign({}, rideRecord), { id: rideDoc.id });
            RideEvents_1.rideEvents.emit('ride.created', { rideId: rideDoc.id, riderId, requestedDriverIds: [] });
            SocketService_1.socketService.notifyAdmin('ride:created', ride);
            return ride;
        });
    }
    startDriverMatching(rideId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.matchState.set(rideId, { radius: this.INITIAL_RADIUS_KM, batch: 0 });
            yield this.dispatchDriverBatch(rideId);
        });
    }
    stopDriverMatching(rideId) {
        const timer = this.matchTimers.get(rideId);
        if (timer)
            clearTimeout(timer);
        this.matchTimers.delete(rideId);
        this.matchState.delete(rideId);
    }
    findNearbyDrivers(lat_1, lng_1, radiusKm_1) {
        return __awaiter(this, arguments, void 0, function* (lat, lng, radiusKm, filters = {}) {
            const precision = radiusKm > 8 ? 4 : 5;
            const field = precision === 5 ? 'driverStatus.geohash5' : 'driverStatus.geohash4';
            const baseHash = (0, geohash_1.encodeGeohash)(lat, lng, precision);
            const buckets = Array.from(new Set([baseHash, ...(0, geohash_1.geohashNeighbors)(baseHash)].map((hash) => hash.substring(0, precision))));
            const snapshots = yield Promise.all(buckets.map((bucket) => firebase_1.db
                .collection('users')
                .where('role', '==', 'driver')
                .where('driverStatus.isOnline', '==', true)
                .where(field, '==', bucket)
                .limit(50)
                .get()));
            const candidates = new Map();
            snapshots.forEach((snap) => snap.docs.forEach((doc) => candidates.set(doc.id, doc)));
            return Array.from(candidates.values())
                .map((doc) => (Object.assign({ id: doc.id }, doc.data())))
                .filter((driver) => {
                var _a, _b, _c, _d, _e, _f;
                const driverId = (_a = driver.uid) !== null && _a !== void 0 ? _a : driver.id;
                if (!driverId)
                    return false;
                if ((_b = filters.excludeDriverIds) === null || _b === void 0 ? void 0 : _b.includes(driverId))
                    return false;
                if (filters.vehicleCategory && ((_c = driver.driverProfile) === null || _c === void 0 ? void 0 : _c.vehicleType) !== filters.vehicleCategory)
                    return false;
                if (filters.region && driver.countryCode && driver.countryCode.toLowerCase() !== filters.region)
                    return false;
                if (((_d = driver.driverDetails) === null || _d === void 0 ? void 0 : _d.rating) && driver.driverDetails.rating < this.MIN_DRIVER_RATING)
                    return false;
                if (!((_e = driver.driverStatus) === null || _e === void 0 ? void 0 : _e.lastKnownLocation))
                    return false;
                if ((_f = driver.driverStatus) === null || _f === void 0 ? void 0 : _f.currentRideId)
                    return false;
                return true;
            })
                .map((driver) => {
                var _a, _b, _c, _d, _e;
                const driverId = (_a = driver.uid) !== null && _a !== void 0 ? _a : driver.id;
                const location = driver.driverStatus.lastKnownLocation;
                const distanceKm = this.haversineDistance({ lat, lng }, { lat: location.lat, lng: location.lng });
                return {
                    id: driverId,
                    distanceKm,
                    etaSeconds: Math.round((distanceKm / 30) * 3600),
                    profile: {
                        displayName: driver.displayName,
                        rating: (_b = driver.driverDetails) === null || _b === void 0 ? void 0 : _b.rating,
                        vehicleType: (_d = (_c = driver.driverProfile) === null || _c === void 0 ? void 0 : _c.vehicleType) !== null && _d !== void 0 ? _d : (_e = driver.driverOnboarding) === null || _e === void 0 ? void 0 : _e.vehicleType,
                        photoURL: driver.photoURL
                    },
                    location
                };
            })
                .filter((driver) => driver.distanceKm <= radiusKm)
                .sort((a, b) => a.distanceKm - b.distanceKm);
        });
    }
    transitionRideStatus(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const rideRef = firebase_1.db.collection('rides').doc(input.rideId);
            let updatedRide = null;
            let previousStatus = 'requested';
            yield firebase_1.db.runTransaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const rideSnap = yield tx.get(rideRef);
                if (!rideSnap.exists)
                    throw new Error('Ride not found');
                const ride = Object.assign({ id: rideSnap.id }, rideSnap.data());
                previousStatus = ride.status;
                const now = new Date();
                switch (input.status) {
                    case 'accepted': {
                        if (input.actor.role !== 'driver')
                            throw new Error('Only drivers can accept rides');
                        if (ride.status !== 'finding_driver')
                            throw new Error('Ride is no longer available');
                        if (ride.driverId && ride.driverId !== input.actor.uid)
                            throw new Error('Ride already assigned');
                        const updates = {
                            driverId: input.actor.uid,
                            status: 'accepted',
                            acceptedAt: now,
                            updatedAt: now,
                            requestedDriverIds: firestore_1.FieldValue.arrayUnion(input.actor.uid)
                        };
                        tx.update(rideRef, updates);
                        updatedRide = Object.assign(Object.assign({}, ride), updates);
                        this.stopDriverMatching(ride.id);
                        break;
                    }
                    case 'arrived':
                    case 'in_progress': {
                        if (input.actor.role !== 'driver')
                            throw new Error('Drivers only');
                        if (ride.driverId !== input.actor.uid)
                            throw new Error('Driver mismatch');
                        const updates = Object.assign({ status: input.status, updatedAt: now }, (input.status === 'in_progress' && { startedAt: now }));
                        tx.update(rideRef, updates);
                        updatedRide = Object.assign(Object.assign({}, ride), updates);
                        break;
                    }
                    case 'completed': {
                        if (!['driver', 'admin'].includes(input.actor.role)) {
                            throw new Error('Only drivers or admins can complete rides');
                        }
                        if (ride.status !== 'in_progress')
                            throw new Error('Ride must be in progress');
                        const updates = {
                            status: 'completed',
                            completedAt: now,
                            updatedAt: now
                        };
                        tx.update(rideRef, updates);
                        updatedRide = Object.assign(Object.assign({}, ride), updates);
                        break;
                    }
                    case 'cancelled': {
                        const cancelledBy = input.actor.role === 'driver'
                            ? 'driver'
                            : input.actor.role === 'admin'
                                ? 'admin'
                                : 'rider';
                        const fee = this.getCancellationFee(ride, cancelledBy);
                        const updates = {
                            status: 'cancelled',
                            cancelledAt: now,
                            cancellationReason: (_a = input.payload) === null || _a === void 0 ? void 0 : _a.reason,
                            updatedAt: now,
                            'pricing.cancellationFee': fee
                        };
                        tx.update(rideRef, updates);
                        updatedRide = Object.assign(Object.assign(Object.assign({}, ride), updates), { pricing: Object.assign(Object.assign({}, ride.pricing), { cancellationFee: fee }) });
                        this.stopDriverMatching(ride.id);
                        break;
                    }
                    default:
                        throw new Error(`Unsupported status transition: ${input.status}`);
                }
            }));
            if (!updatedRide)
                throw new Error('Ride transition failed');
            yield this.handlePostStatusChange(updatedRide, previousStatus);
            SocketService_1.socketService.notifyAdmin('ride:updated', updatedRide);
            return updatedRide;
        });
    }
    dispatchDriverBatch(rideId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const state = this.matchState.get(rideId);
            if (!state)
                return;
            const rideSnap = yield firebase_1.db.collection('rides').doc(rideId).get();
            if (!rideSnap.exists) {
                this.stopDriverMatching(rideId);
                return;
            }
            const ride = Object.assign({ id: rideSnap.id }, rideSnap.data());
            if (ride.driverId || ride.status !== 'finding_driver') {
                this.stopDriverMatching(rideId);
                return;
            }
            try {
                const drivers = yield this.findNearbyDrivers(ride.pickupLocation.lat, ride.pickupLocation.lng, state.radius, {
                    vehicleCategory: ride.vehicleCategory,
                    region: ride.region,
                    excludeDriverIds: (_a = ride.requestedDriverIds) !== null && _a !== void 0 ? _a : []
                });
                if (!drivers.length) {
                    if (state.batch >= this.MAX_BATCHES - 1) {
                        yield this.handleNoDrivers(ride);
                        return;
                    }
                    this.matchState.set(rideId, { radius: state.radius + this.RADIUS_STEP_KM, batch: state.batch + 1 });
                    this.scheduleNextBatch(rideId);
                    return;
                }
                const batch = drivers.slice(0, this.DRIVER_BATCH_SIZE);
                const driverIds = batch.map((driver) => driver.id);
                batch.forEach((driver) => {
                    SocketService_1.socketService.notifyDriver(driver.id, 'ride:offer', {
                        rideId,
                        pickupLocation: ride.pickupLocation,
                        dropoffLocation: ride.dropoffLocation,
                        pricing: ride.pricing,
                        etaSeconds: driver.etaSeconds,
                        distanceKm: driver.distanceKm
                    });
                });
                if (state.batch < this.MAX_BATCHES - 1) {
                    this.matchState.set(rideId, { radius: state.radius + this.RADIUS_STEP_KM, batch: state.batch + 1 });
                    this.scheduleNextBatch(rideId);
                }
            }
            catch (error) {
                logger_1.logger.error({ err: error, rideId }, 'Driver batch dispatch failed');
                this.scheduleNextBatch(rideId);
            }
        });
    }
    scheduleNextBatch(rideId) {
        const currentTimer = this.matchTimers.get(rideId);
        if (currentTimer)
            clearTimeout(currentTimer);
        const timer = setTimeout(() => {
            this.dispatchDriverBatch(rideId).catch((err) => logger_1.logger.error({ err, rideId }, 'Batch dispatch retry failed'));
        }, this.BATCH_TIMEOUT_MS);
        this.matchTimers.set(rideId, timer);
    }
    handleNoDrivers(ride) {
        return __awaiter(this, void 0, void 0, function* () {
            yield firebase_1.db
                .collection('rides')
                .doc(ride.id)
                .update({
                status: 'cancelled',
                cancellationReason: 'no_driver_available',
                cancelledAt: new Date()
            });
            SocketService_1.socketService.notifyRider(ride.riderId, 'ride:no_driver', { rideId: ride.id });
            RideEvents_1.rideEvents.emit('ride.cancelled', { rideId: ride.id, riderId: ride.riderId });
            this.stopDriverMatching(ride.id);
        });
    }
    handlePostStatusChange(ride, _previous) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (ride.status) {
                case 'accepted':
                    RideTrackingService_1.rideTrackingService.startTracking(ride);
                    SocketService_1.socketService.notifyRider(ride.riderId, 'ride:accepted', {
                        rideId: ride.id,
                        driverId: ride.driverId
                    });
                    RideEvents_1.rideEvents.emit('ride.accepted', {
                        rideId: ride.id,
                        riderId: ride.riderId,
                        driverId: ride.driverId
                    });
                    break;
                case 'arrived':
                    RideTrackingService_1.rideTrackingService.updateStage(ride.id, 'arrived');
                    SocketService_1.socketService.notifyRider(ride.riderId, 'ride:driver_arrived', { rideId: ride.id });
                    break;
                case 'in_progress':
                    RideTrackingService_1.rideTrackingService.updateStage(ride.id, 'in_progress');
                    SocketService_1.socketService.notifyRider(ride.riderId, 'ride:started', { rideId: ride.id });
                    break;
                case 'completed':
                    RideTrackingService_1.rideTrackingService.stopTracking(ride.id);
                    SocketService_1.socketService.notifyRider(ride.riderId, 'ride:completed', { rideId: ride.id });
                    if (ride.driverId)
                        SocketService_1.socketService.notifyDriver(ride.driverId, 'ride:completed', { rideId: ride.id });
                    yield this.settleRidePayment(ride);
                    if (ride.driverId) {
                        yield IncentiveService_1.incentiveService.processTripCompletion(ride).catch(err => logger_1.logger.error({ err, rideId: ride.id }, 'Failed to award incentives'));
                    }
                    break;
                case 'cancelled':
                    RideTrackingService_1.rideTrackingService.stopTracking(ride.id);
                    SocketService_1.socketService.notifyRider(ride.riderId, 'ride:cancelled', {
                        rideId: ride.id,
                        reason: ride.cancellationReason
                    });
                    if (ride.driverId) {
                        SocketService_1.socketService.notifyDriver(ride.driverId, 'ride:cancelled', {
                            rideId: ride.id,
                            reason: ride.cancellationReason
                        });
                    }
                    break;
                default:
                    break;
            }
        });
    }
    settleRidePayment(ride) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5;
            try {
                if (!ride.driverId)
                    return;
                if (((_a = ride.payment) === null || _a === void 0 ? void 0 : _a.holdStatus) === 'captured')
                    return;
                const reference = (_e = (_c = (_b = ride.payment) === null || _b === void 0 ? void 0 : _b.holdReference) !== null && _c !== void 0 ? _c : (_d = ride.payment) === null || _d === void 0 ? void 0 : _d.reference) !== null && _e !== void 0 ? _e : (_f = ride.pricing) === null || _f === void 0 ? void 0 : _f.paymentReference;
                if (!reference) {
                    logger_1.logger.info({ rideId: ride.id }, 'No payment reference on ride; skipping settlement');
                    return;
                }
                const config = yield this.getPaymentsConfig(ride.region);
                const driverSnap = yield firebase_1.db.collection('users').doc(ride.driverId).get();
                const driverData = (_g = driverSnap.data()) !== null && _g !== void 0 ? _g : {};
                const subscription = (_h = driverData.subscription) !== null && _h !== void 0 ? _h : (_j = driverData.driverProfile) === null || _j === void 0 ? void 0 : _j.subscription;
                const subscriptionExpiry = this.parseTimestamp(subscription === null || subscription === void 0 ? void 0 : subscription.expiresAt);
                const subscriptionActive = (subscription === null || subscription === void 0 ? void 0 : subscription.status) === 'active' && (!subscriptionExpiry || subscriptionExpiry > new Date());
                // Fetch dynamic commission from pricing config
                const pricingConfig = yield PricingConfigService_1.pricingConfigService.getConfig(ride.region);
                const dynamicCommission = pricingConfig === null || pricingConfig === void 0 ? void 0 : pricingConfig.platformCommission;
                let commissionRate = (_r = (_q = (_p = (_o = (_l = (_k = ride.payment) === null || _k === void 0 ? void 0 : _k.commissionRate) !== null && _l !== void 0 ? _l : (_m = driverData.driverProfile) === null || _m === void 0 ? void 0 : _m.commissionRate) !== null && _o !== void 0 ? _o : dynamicCommission) !== null && _p !== void 0 ? _p : config.commissionRate) !== null && _q !== void 0 ? _q : config.defaultCommissionRate) !== null && _r !== void 0 ? _r : 0.25;
                if (subscriptionActive) {
                    const discount = (_w = (_u = (_s = subscription === null || subscription === void 0 ? void 0 : subscription.discountRate) !== null && _s !== void 0 ? _s : (_t = config.subscription) === null || _t === void 0 ? void 0 : _t.discountRate) !== null && _u !== void 0 ? _u : (_v = config.subscription) === null || _v === void 0 ? void 0 : _v.defaultDiscount) !== null && _w !== void 0 ? _w : 0;
                    commissionRate = Math.max(0, commissionRate - discount);
                }
                const microDeductions = subscriptionActive && ((_x = config.subscription) === null || _x === void 0 ? void 0 : _x.waiveMicroFees)
                    ? { flatFee: 0, percentage: 0 }
                    : {
                        flatFee: (_z = (_y = config.microDeductions) === null || _y === void 0 ? void 0 : _y.flatFee) !== null && _z !== void 0 ? _z : 0,
                        percentage: (_1 = (_0 = config.microDeductions) === null || _0 === void 0 ? void 0 : _0.percentage) !== null && _1 !== void 0 ? _1 : 0
                    };
                const { driverAmount, commissionAmount, microAmount } = yield WalletService_1.walletService.captureEscrowHold(reference, {
                    driverId: ride.driverId,
                    commissionRate,
                    rideId: ride.id,
                    microDeductions,
                    subscriptionSnapshot: subscriptionActive
                        ? {
                            planId: subscription === null || subscription === void 0 ? void 0 : subscription.planId,
                            discountRate: (_4 = (_2 = subscription === null || subscription === void 0 ? void 0 : subscription.discountRate) !== null && _2 !== void 0 ? _2 : (_3 = config.subscription) === null || _3 === void 0 ? void 0 : _3.discountRate) !== null && _4 !== void 0 ? _4 : (_5 = config.subscription) === null || _5 === void 0 ? void 0 : _5.defaultDiscount,
                            activeUntil: subscriptionExpiry !== null && subscriptionExpiry !== void 0 ? subscriptionExpiry : undefined,
                            status: subscription === null || subscription === void 0 ? void 0 : subscription.status
                        }
                        : undefined,
                    metadata: {
                        rideId: ride.id,
                        riderId: ride.riderId,
                        region: ride.region,
                        subscriptionActive,
                        microDeductions
                    }
                });
                yield firebase_1.db
                    .collection('rides')
                    .doc(ride.id)
                    .update({
                    'payment.holdStatus': 'captured',
                    'payment.capturedAt': new Date(),
                    'payment.settlement': {
                        driverAmount,
                        commissionAmount,
                        microAmount: microAmount !== null && microAmount !== void 0 ? microAmount : 0
                    }
                });
                logger_1.logger.info({ rideId: ride.id, driverAmount, commissionAmount, microAmount }, 'Ride settlement captured successfully');
            }
            catch (error) {
                logger_1.logger.error({ err: error, rideId: ride.id }, 'Failed to settle ride payment');
                RideEvents_1.rideEvents.emit('ride.settlement_failed', {
                    rideId: ride.id,
                    error: error.message
                });
            }
        });
    }
    getPaymentsConfig(region) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Default config if none found
            const defaults = {
                commissionRate: 0.2,
                defaultCommissionRate: 0.2,
                microDeductions: { flatFee: 0, percentage: 0 },
                subscription: {
                    discountRate: 0,
                    defaultDiscount: 0,
                    waiveMicroFees: false
                }
            };
            if (!region)
                return defaults;
            const configSnap = yield firebase_1.db.collection('config').doc('payments').get();
            if (!configSnap.exists)
                return defaults;
            const data = configSnap.data();
            return (_a = data === null || data === void 0 ? void 0 : data[region]) !== null && _a !== void 0 ? _a : defaults;
        });
    }
    parseTimestamp(value) {
        if (!value)
            return null;
        if (value instanceof admin.firestore.Timestamp)
            return value.toDate();
        if (value instanceof Date)
            return value;
        if (typeof value === 'string' || typeof value === 'number')
            return new Date(value);
        return null;
    }
    getCancellationFee(ride, cancelledBy) {
        if (cancelledBy === 'rider') {
            const minutesSinceBooking = (Date.now() - new Date(ride.createdAt).getTime()) / 60000;
            return PricingService_1.pricingService.calculateCancellationFee(ride, minutesSinceBooking);
        }
        return 0;
    }
    haversineDistance(origin, destination) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(destination.lat - origin.lat);
        const dLon = this.deg2rad(destination.lng - origin.lng);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(origin.lat)) * Math.cos(this.deg2rad(destination.lat)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
}
exports.RideService = RideService;
exports.rideService = new RideService();
//# sourceMappingURL=RideService.js.map