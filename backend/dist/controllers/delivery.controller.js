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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDelivery = exports.uploadProofOfDelivery = exports.getDeliveryQuote = exports.createDelivery = void 0;
const zod_1 = require("zod");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const RideService_1 = require("../services/RideService");
const PricingService_1 = require("../services/pricing/PricingService");
const GoogleMapsService_1 = require("../services/GoogleMapsService");
const SocketService_1 = require("../services/SocketService");
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
const deliveryRequestSchema = zod_1.z.object({
    pickup: zod_1.z.object({ lat: zod_1.z.number(), lng: zod_1.z.number(), address: zod_1.z.string().min(3) }),
    dropoff: zod_1.z.object({ lat: zod_1.z.number(), lng: zod_1.z.number(), address: zod_1.z.string().min(3) }),
    city: zod_1.z.string().optional(),
    region: zod_1.z.enum(['nigeria', 'chicago']).optional(),
    vehicleCategory: zod_1.z.string().min(3).optional(),
    addOns: zod_1.z
        .object({
        fragileCare: zod_1.z.boolean().optional(),
        extraStops: zod_1.z.number().int().min(0).optional(),
        afterHours: zod_1.z.boolean().optional()
    })
        .optional(),
    deliveryDetails: zod_1.z.object({
        packageType: zod_1.z.enum(['documents', 'parcel', 'bulk', 'food', 'medical']),
        packageValue: zod_1.z.number().min(0).optional(),
        weightKg: zod_1.z.number().min(0.1).max(50),
        serviceType: zod_1.z.enum(['instant', 'same_day', 'scheduled']),
        requiresReturn: zod_1.z.boolean().optional(),
        extraStops: zod_1.z.number().int().min(0).max(5).optional(),
        dropoffContact: zod_1.z.object({
            name: zod_1.z.string().min(2),
            phone: zod_1.z.string().min(6),
            instructions: zod_1.z.string().optional()
        }),
        pickupContact: zod_1.z
            .object({
            name: zod_1.z.string().min(2),
            phone: zod_1.z.string().min(6)
        })
            .optional(),
        expectedReadyAt: zod_1.z.string().datetime().optional(),
        proofRequired: zod_1.z.enum(['photo', 'signature', 'both', 'none']).optional()
    })
});
const ensureDeliveryNotification = (riderId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    yield firebase_1.db.collection('notifications').add({
        userId: riderId,
        type: 'delivery',
        title: 'Delivery Request Created',
        body: 'Your delivery request is live. We will notify you once a driver accepts.',
        metadata: payload,
        read: false,
        createdAt: new Date()
    });
});
const createDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const payload = deliveryRequestSchema.parse(req.body);
        const routeData = yield GoogleMapsService_1.googleMapsService.getDistanceAndDuration({ lat: payload.pickup.lat, lng: payload.pickup.lng }, { lat: payload.dropoff.lat, lng: payload.dropoff.lng });
        let distanceKm = routeData.distanceMeters / 1000;
        let durationMinutes = routeData.durationSeconds / 60;
        if (payload.deliveryDetails.requiresReturn) {
            distanceKm *= 1.8;
            durationMinutes *= 2;
        }
        const mockRide = {
            vehicleCategory: (_a = payload.vehicleCategory) !== null && _a !== void 0 ? _a : 'motorbike',
            region: payload.region === 'chicago' ? 'US-CHI' : 'NG',
            bookingType: 'delivery',
            city: payload.city,
            deliveryDetails: {
                packageType: payload.deliveryDetails.packageType,
                requiresReturn: payload.deliveryDetails.requiresReturn,
                extraStops: payload.deliveryDetails.extraStops,
                serviceType: payload.deliveryDetails.serviceType
            },
            addOns: {
                extraStops: payload.deliveryDetails.extraStops,
                extraLuggage: payload.deliveryDetails.packageType === 'bulk',
                premiumVehicle: payload.vehicleCategory ? payload.vehicleCategory !== 'motorbike' : false,
                meetAndGreet: true,
                afterHours: (_b = payload.addOns) === null || _b === void 0 ? void 0 : _b.afterHours
            },
            pricing: { surgeMultiplier: 1.0 } // Default surge
        };
        const estimatedFare = yield PricingService_1.pricingService.calculateFare(mockRide, distanceKm, durationMinutes);
        const requestData = {
            pickupLocation: payload.pickup,
            dropoffLocation: payload.dropoff,
            vehicleCategory: (_c = payload.vehicleCategory) !== null && _c !== void 0 ? _c : 'motorbike',
            region: mockRide.region,
            city: payload.city,
            bookingType: 'delivery',
            deliveryDetails: Object.assign(Object.assign({}, payload.deliveryDetails), { proofRequired: (_d = payload.deliveryDetails.proofRequired) !== null && _d !== void 0 ? _d : 'photo' }),
            addOns: payload.addOns,
            pricing: {
                estimatedFare: estimatedFare.totalFare,
                currency: mockRide.region === 'NG' ? 'NGN' : 'USD',
                breakdown: estimatedFare
            }
        };
        const delivery = yield RideService_1.rideService.createRideRequest(req.user.uid, requestData);
        yield RideService_1.rideService.startDriverMatching(delivery.id);
        yield ensureDeliveryNotification(req.user.uid, { rideId: delivery.id });
        SocketService_1.socketService.notifyRider(req.user.uid, 'delivery:created', { rideId: delivery.id });
        res.status(201).json({
            message: 'Delivery request created successfully',
            delivery,
            estimatedFare
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'createDelivery failed');
        res.status(400).json({ message: (_e = error.message) !== null && _e !== void 0 ? _e : 'Failed to create delivery' });
    }
});
exports.createDelivery = createDelivery;
const getDeliveryQuote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const payload = deliveryRequestSchema.parse(req.body);
        const routeData = yield GoogleMapsService_1.googleMapsService.getDistanceAndDuration({ lat: payload.pickup.lat, lng: payload.pickup.lng }, { lat: payload.dropoff.lat, lng: payload.dropoff.lng });
        let distanceKm = routeData.distanceMeters / 1000;
        let durationMinutes = routeData.durationSeconds / 60;
        if (payload.deliveryDetails.requiresReturn) {
            distanceKm *= 1.8;
            durationMinutes *= 2;
        }
        const mockRide = {
            vehicleCategory: (_a = payload.vehicleCategory) !== null && _a !== void 0 ? _a : 'motorbike',
            region: payload.region === 'chicago' ? 'US-CHI' : 'NG',
            bookingType: 'delivery',
            city: payload.city,
            deliveryDetails: {
                serviceType: payload.deliveryDetails.serviceType,
                requiresReturn: payload.deliveryDetails.requiresReturn,
                extraStops: payload.deliveryDetails.extraStops,
                packageType: payload.deliveryDetails.packageType
            },
            addOns: payload.addOns,
            pricing: { surgeMultiplier: 1.0 }
        };
        const estimatedFare = yield PricingService_1.pricingService.calculateFare(mockRide, distanceKm, durationMinutes);
        res.status(200).json({
            estimatedFare: estimatedFare.totalFare,
            currency: mockRide.region === 'NG' ? 'NGN' : 'USD',
            distanceKm: Number(distanceKm.toFixed(2)),
            durationMinutes: Number(durationMinutes.toFixed(1)),
            breakdown: estimatedFare
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'getDeliveryQuote failed');
        res.status(400).json({ message: (_b = error.message) !== null && _b !== void 0 ? _b : 'Failed to get delivery quote' });
    }
});
exports.getDeliveryQuote = getDeliveryQuote;
const uploadProofOfDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { rideId } = req.params;
        const { photoBase64, signatureBase64, notes } = req.body;
        if (!photoBase64 && !signatureBase64) {
            res.status(400).json({ message: 'Proof of delivery requires a photo or signature.' });
            return;
        }
        const rideSnapshot = yield firebase_1.db.collection('rides').doc(rideId).get();
        if (!rideSnapshot.exists) {
            res.status(404).json({ message: 'Ride not found' });
            return;
        }
        const ride = rideSnapshot.data();
        if ((ride === null || ride === void 0 ? void 0 : ride.bookingType) !== 'delivery') {
            res.status(400).json({ message: 'Proof uploads only apply to delivery rides.' });
            return;
        }
        const proofRequired = (_b = (_a = ride.deliveryDetails) === null || _a === void 0 ? void 0 : _a.proofRequired) !== null && _b !== void 0 ? _b : 'photo';
        if (proofRequired === 'photo' && !photoBase64) {
            res.status(400).json({ message: 'Photo proof is required for this delivery.' });
            return;
        }
        if (proofRequired === 'signature' && !signatureBase64) {
            res.status(400).json({ message: 'Signature proof is required for this delivery.' });
            return;
        }
        if (proofRequired === 'both' && (!photoBase64 || !signatureBase64)) {
            res.status(400).json({ message: 'Both photo and signature are required.' });
            return;
        }
        const proof = {
            notes: notes !== null && notes !== void 0 ? notes : null,
            capturedBy: req.user.uid,
            uploadedAt: new Date()
        };
        if (photoBase64) {
            const buffer = Buffer.from(photoBase64, 'base64');
            const file = firebase_admin_1.default.storage().bucket().file(`proofs/${rideId}/photo_${Date.now()}.jpg`);
            yield file.save(buffer, { contentType: 'image/jpeg' });
            const [url] = yield file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 365 * 24 * 60 * 60 * 1000
            });
            proof.photoUrl = url;
        }
        if (signatureBase64) {
            const buffer = Buffer.from(signatureBase64, 'base64');
            const file = firebase_admin_1.default.storage().bucket().file(`proofs/${rideId}/signature_${Date.now()}.png`);
            yield file.save(buffer, { contentType: 'image/png' });
            const [url] = yield file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 365 * 24 * 60 * 60 * 1000
            });
            proof.signatureUrl = url;
        }
        yield rideSnapshot.ref.update({
            proofOfDelivery: proof,
            status: (ride === null || ride === void 0 ? void 0 : ride.status) === 'in_progress' ? 'completed' : ride === null || ride === void 0 ? void 0 : ride.status,
            deliveryTimeline: firebase_admin_1.default.firestore.FieldValue.arrayUnion({
                at: new Date(),
                event: 'proof_uploaded',
                actor: req.user.uid,
                notes
            }),
            updatedAt: new Date()
        });
        SocketService_1.socketService.notifyRider(ride === null || ride === void 0 ? void 0 : ride.riderId, 'delivery:proof_uploaded', { rideId });
        res.status(200).json({ message: 'Proof uploaded', proof });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'uploadProofOfDelivery failed');
        res.status(500).json({ message: (_c = error.message) !== null && _c !== void 0 ? _c : 'Proof upload failed' });
    }
});
exports.uploadProofOfDelivery = uploadProofOfDelivery;
const getDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const rideSnap = yield firebase_1.db.collection('rides').doc(id).get();
        if (!rideSnap.exists) {
            res.status(404).json({ message: 'Delivery not found' });
            return;
        }
        const ride = rideSnap.data();
        if ((ride === null || ride === void 0 ? void 0 : ride.bookingType) !== 'delivery') {
            res.status(404).json({ message: 'Delivery not found' });
            return;
        }
        res.status(200).json(Object.assign({ id: rideSnap.id }, ride));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'getDelivery failed');
        res.status(500).json({ message: 'Failed to fetch delivery' });
    }
});
exports.getDelivery = getDelivery;
//# sourceMappingURL=delivery.controller.js.map