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
exports.updateRideStatus = exports.getNearbyDrivers = exports.createRide = void 0;
const RideService_1 = require("../services/RideService");
const logger_1 = require("../utils/logger");
const createRide = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ride = yield RideService_1.rideService.createRideRequest(req.user.uid, req.body);
        yield RideService_1.rideService.startDriverMatching(ride.id);
        res.status(201).json(ride);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to create ride');
        res.status(500).json({ error: 'Unable to create ride request' });
    }
});
exports.createRide = createRide;
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
            rideId: req.params.rideId,
            status: req.body.status,
            actor: { uid: req.user.uid, role: req.user.role },
            payload: req.body
        });
        res.status(200).json(ride);
    }
    catch (error) {
        logger_1.logger.error({ err: error, rideId: req.params.rideId }, 'Failed to update ride status');
        res.status(400).json({ error: (_a = error.message) !== null && _a !== void 0 ? _a : 'Unable to update ride status' });
    }
});
exports.updateRideStatus = updateRideStatus;
//# sourceMappingURL=ride.controller.js.map