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
exports.rateRider = exports.rateDriver = exports.getRideHistory = exports.estimateFare = exports.updateRideStatus = exports.getNearbyDrivers = exports.getRide = exports.createRide = void 0;
const RideService_1 = require("../services/RideService");
const logger_1 = require("../utils/logger");
const createRide = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ride = yield RideService_1.rideService.createRideRequest(req.user.uid, req.body);
        yield RideService_1.rideService.startDriverMatching(ride.id);
        res.status(201).json(ride);
    }
    catch (error) {
        console.error('Create Ride Error:', error); // Visible in terminal
        logger_1.logger.error({ err: error }, 'Failed to create ride');
        res.status(500).json({
            error: 'Unable to create ride request',
            details: error.message // Show actual error to user
        });
    }
});
exports.createRide = createRide;
const getRide = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ride = yield RideService_1.rideService.getRide(req.params.id);
        if (!ride) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }
        res.status(200).json(ride);
    }
    catch (error) {
        logger_1.logger.error({ err: error, rideId: req.params.id }, 'Failed to fetch ride');
        res.status(500).json({ error: 'Unable to fetch ride' });
    }
});
exports.getRide = getRide;
const getNearbyDrivers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            res.status(400).json({ error: 'lat and lng are required' });
            return;
        }
        const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : 5;
        const vehicleCategory = (_a = req.query.vehicleCategory) === null || _a === void 0 ? void 0 : _a.toString();
        const region = (_b = req.query.region) === null || _b === void 0 ? void 0 : _b.toString();
        const drivers = yield RideService_1.rideService.findNearbyDrivers(lat, lng, radiusKm, {
            vehicleCategory,
            region
        });
        res.status(200).json(drivers);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to fetch nearby drivers');
        res.status(500).json({ error: 'Unable to fetch drivers' });
    }
});
exports.getNearbyDrivers = getNearbyDrivers;
const updateRideStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const ride = yield RideService_1.rideService.transitionRideStatus({
            rideId: req.params.id,
            status: req.body.status,
            actor: { uid: req.user.uid, role: req.user.role },
            payload: req.body
        });
        res.status(200).json(ride);
    }
    catch (error) {
        logger_1.logger.error({ err: error, rideId: req.params.id }, 'Failed to update ride status');
        res.status(400).json({ error: (_a = error.message) !== null && _a !== void 0 ? _a : 'Unable to update ride status' });
    }
});
exports.updateRideStatus = updateRideStatus;
/**
 * Estimate fare without creating a ride
 */
const estimateFare = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pickup, dropoff, vehicleCategory, region, bookingType } = req.body;
        if (!pickup || !dropoff || !vehicleCategory || !region) {
            res.status(400).json({ error: 'pickup, dropoff, vehicleCategory, and region are required' });
            return;
        }
        const estimate = yield RideService_1.rideService.estimateFare({
            pickup,
            dropoff,
            vehicleCategory,
            region,
            bookingType
        });
        res.status(200).json({ success: true, data: estimate });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to estimate fare');
        res.status(500).json({ error: 'Unable to estimate fare', details: error.message });
    }
});
exports.estimateFare = estimateFare;
/**
 * Get ride history for the authenticated user
 */
const getRideHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const role = req.user.role;
        const result = yield RideService_1.rideService.getRideHistory(req.user.uid, role, { page, limit, status });
        res.status(200).json({ success: true, data: result.rides, pagination: { total: result.total, page: result.page, limit: result.limit } });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to get ride history');
        res.status(500).json({ error: 'Unable to fetch ride history' });
    }
});
exports.getRideHistory = getRideHistory;
/**
 * Rate a driver after ride completion (by rider)
 */
const rateDriver = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { rating, feedback } = req.body;
        const rideId = req.params.id;
        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ error: 'Rating must be between 1 and 5' });
            return;
        }
        const ride = yield RideService_1.rideService.rateDriver(rideId, req.user.uid, rating, feedback);
        res.status(200).json({ success: true, data: ride });
    }
    catch (error) {
        logger_1.logger.error({ err: error, rideId: req.params.id }, 'Failed to rate driver');
        res.status(400).json({ error: (_a = error.message) !== null && _a !== void 0 ? _a : 'Unable to rate driver' });
    }
});
exports.rateDriver = rateDriver;
/**
 * Rate a rider after ride completion (by driver)
 */
const rateRider = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { rating, feedback } = req.body;
        const rideId = req.params.id;
        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ error: 'Rating must be between 1 and 5' });
            return;
        }
        const ride = yield RideService_1.rideService.rateRider(rideId, req.user.uid, rating, feedback);
        res.status(200).json({ success: true, data: ride });
    }
    catch (error) {
        logger_1.logger.error({ err: error, rideId: req.params.id }, 'Failed to rate rider');
        res.status(400).json({ error: (_a = error.message) !== null && _a !== void 0 ? _a : 'Unable to rate rider' });
    }
});
exports.rateRider = rateRider;
//# sourceMappingURL=ride.controller.js.map