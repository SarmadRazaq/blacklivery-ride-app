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
exports.listDisputes = exports.updateVehicleStatus = exports.updateSupportTicket = exports.listSupportTickets = exports.createSupportTicket = exports.getEarningsAnalytics = exports.listBonusPrograms = exports.updateBonusProgram = exports.createBonusProgram = exports.listPromotions = exports.updatePromotion = exports.createPromotion = exports.resolveDispute = exports.createDispute = exports.adminCancelRide = exports.getRideDetails = exports.listAllRides = exports.listActiveRides = exports.updateUserDocuments = exports.updateUserStatus = exports.listUsers = exports.getPricingHistory = exports.updateSurgeConfig = exports.getSurgeConfig = exports.updatePricingConfig = exports.getPricingConfig = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../config/firebase");
const WalletService_1 = require("../services/WalletService");
const logger_1 = require("../utils/logger");
const geocoding_1 = require("../utils/geocoding");
// Pricing & surge config
const getPricingConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { region } = req.params;
        const doc = yield firebase_1.db.collection('pricing_rules').doc(region).get();
        if (!doc.exists) {
            res.status(404).json({ message: `Pricing config not found for ${region}` });
            return;
        }
        res.status(200).json(Object.assign({ region }, doc.data()));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to fetch pricing config');
        res.status(500).json({ message: 'Unable to load pricing config' });
    }
});
exports.getPricingConfig = getPricingConfig;
const updatePricingConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { region } = req.params;
        const updateData = Object.assign(Object.assign({}, req.body), { updatedAt: new Date(), updatedBy: req.user.uid });
        yield firebase_1.db
            .collection('pricing_rules')
            .doc(region)
            .set(updateData, { merge: true });
        // Save history
        yield firebase_1.db.collection('pricing_history').add({
            type: 'pricing',
            region,
            data: req.body,
            updatedAt: new Date(),
            updatedBy: req.user.uid
        });
        res.status(200).json({ message: 'Pricing config updated' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to update pricing config');
        res.status(500).json({ message: 'Unable to update pricing config' });
    }
});
exports.updatePricingConfig = updatePricingConfig;
const getSurgeConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { region } = req.params;
        const doc = yield firebase_1.db.collection('surge_config').doc(region).get();
        if (!doc.exists) {
            res.status(404).json({ message: `Surge config not found for ${region}` });
            return;
        }
        res.status(200).json(Object.assign({ region }, doc.data()));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to fetch surge config');
        res.status(500).json({ message: 'Unable to load surge config' });
    }
});
exports.getSurgeConfig = getSurgeConfig;
const updateSurgeConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { region } = req.params;
        const payload = Object.assign(Object.assign({}, req.body), { updatedAt: new Date(), updatedBy: req.user.uid });
        yield firebase_1.db.collection('surge_config').doc(region).set(payload, { merge: true });
        // Save history
        yield firebase_1.db.collection('pricing_history').add({
            type: 'surge',
            region,
            data: req.body,
            updatedAt: new Date(),
            updatedBy: req.user.uid
        });
        logger_1.logger.info({ region, admin: req.user.uid }, 'Surge config updated');
        res.status(200).json({ message: 'Surge config updated' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to update surge config');
        res.status(500).json({ message: 'Unable to update surge config' });
    }
});
exports.updateSurgeConfig = updateSurgeConfig;
const getPricingHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield firebase_1.db.collection('pricing_history')
            .orderBy('updatedAt', 'desc')
            .limit(50)
            .get();
        const history = yield Promise.all(snapshot.docs.map((doc) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const data = doc.data();
            let adminName = 'Unknown';
            if (data.updatedBy) {
                try {
                    const userDoc = yield firebase_1.db.collection('users').doc(data.updatedBy).get();
                    if (userDoc.exists) {
                        adminName = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.displayName) || 'Unknown';
                    }
                }
                catch (e) {
                    // Ignore user fetch error
                }
            }
            return Object.assign(Object.assign({ id: doc.id }, data), { adminName });
        })));
        res.status(200).json(history);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to fetch pricing history');
        res.status(500).json({ message: 'Unable to load pricing history' });
    }
});
exports.getPricingHistory = getPricingHistory;
// ... existing code for user management, rides, disputes, promotions, bonus programs, analytics, and support tickets
const listUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role, status, search } = req.query;
        let query = firebase_1.db.collection('users');
        if (role)
            query = query.where('role', '==', role);
        if (status === 'active')
            query = query.where('isActive', '==', true);
        if (status === 'suspended')
            query = query.where('isActive', '==', false);
        const snapshot = yield query.limit(200).get();
        const results = snapshot.docs
            .map((doc) => (Object.assign({ id: doc.id }, doc.data())))
            .filter((user) => {
            var _a, _b, _c;
            if (!search)
                return true;
            const needle = search.toLowerCase();
            return (((_a = user.displayName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(needle)) ||
                ((_b = user.email) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(needle)) ||
                ((_c = user.phoneNumber) === null || _c === void 0 ? void 0 : _c.includes(search)));
        });
        res.status(200).json(results);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to list users');
        res.status(500).json({ message: 'Unable to load users' });
    }
});
exports.listUsers = listUsers;
const updateUserStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;
        yield firebase_1.db.collection('users').doc(userId).update({
            isActive,
            updatedAt: new Date()
        });
        logger_1.logger.info({ userId, isActive, admin: req.user.uid }, 'User status updated');
        res.status(200).json({ message: `User ${isActive ? 'activated' : 'suspended'}` });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to update user status');
        res.status(500).json({ message: 'Unable to update user' });
    }
});
exports.updateUserStatus = updateUserStatus;
const updateUserDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { documentName, status, rejectionReason } = req.body;
        const userRef = firebase_1.db.collection('users').doc(userId);
        const userSnap = yield userRef.get();
        if (!userSnap.exists) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const userData = userSnap.data();
        const documents = (userData === null || userData === void 0 ? void 0 : userData.documents) || [];
        const docIndex = documents.findIndex((d) => d.name === documentName);
        if (docIndex === -1) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }
        documents[docIndex].status = status;
        if (status === 'rejected' && rejectionReason) {
            documents[docIndex].rejectionReason = rejectionReason;
        }
        // Auto-approve driver if all documents are approved
        const allApproved = documents.every((d) => d.status === 'approved');
        const updatePayload = {
            documents,
            updatedAt: new Date()
        };
        if (allApproved && (userData === null || userData === void 0 ? void 0 : userData.role) === 'driver') {
            updatePayload['driverOnboarding.status'] = 'approved';
            updatePayload['driverStatus.state'] = 'approved';
            // Optionally auto-enable isActive if it was pending
            if (!userData.isActive)
                updatePayload.isActive = true;
        }
        yield userRef.update(updatePayload);
        logger_1.logger.info({ userId, documentName, status, admin: req.user.uid }, 'User document updated');
        res.status(200).json({ message: `Document ${status}` });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to update user document');
        res.status(500).json({ message: 'Unable to update document' });
    }
});
exports.updateUserDocuments = updateUserDocuments;
const listActiveRides = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activeStatuses = ['finding_driver', 'accepted', 'arrived', 'in_progress'];
        const snapshot = yield firebase_1.db.collection('rides').where('status', 'in', activeStatuses).get();
        const rides = yield Promise.all(snapshot.docs.map((doc) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const data = doc.data();
            // Reverse geocode if address is missing
            if (((_a = data.pickupLocation) === null || _a === void 0 ? void 0 : _a.lat) && ((_b = data.pickupLocation) === null || _b === void 0 ? void 0 : _b.lng) && !((_c = data.pickupLocation) === null || _c === void 0 ? void 0 : _c.address)) {
                const address = yield (0, geocoding_1.reverseGeocode)(data.pickupLocation.lat, data.pickupLocation.lng);
                data.pickupLocation = Object.assign(Object.assign({}, data.pickupLocation), { address: address || 'Unknown Location' });
            }
            else if (!((_d = data.pickupLocation) === null || _d === void 0 ? void 0 : _d.address)) {
                data.pickupLocation = Object.assign(Object.assign({}, data.pickupLocation), { address: 'Unknown Location' });
            }
            if (((_e = data.dropoffLocation) === null || _e === void 0 ? void 0 : _e.lat) && ((_f = data.dropoffLocation) === null || _f === void 0 ? void 0 : _f.lng) && !((_g = data.dropoffLocation) === null || _g === void 0 ? void 0 : _g.address)) {
                const address = yield (0, geocoding_1.reverseGeocode)(data.dropoffLocation.lat, data.dropoffLocation.lng);
                data.dropoffLocation = Object.assign(Object.assign({}, data.dropoffLocation), { address: address || 'Unknown Location' });
            }
            else if (!((_h = data.dropoffLocation) === null || _h === void 0 ? void 0 : _h.address)) {
                data.dropoffLocation = Object.assign(Object.assign({}, data.dropoffLocation), { address: 'Unknown Location' });
            }
            // Fetch rider info
            let riderInfo = null;
            if (data.riderId) {
                try {
                    const riderDoc = yield firebase_1.db.collection('users').doc(data.riderId).get();
                    if (riderDoc.exists) {
                        const riderData = riderDoc.data();
                        riderInfo = {
                            name: (riderData === null || riderData === void 0 ? void 0 : riderData.displayName) || 'Unknown',
                            phone: (riderData === null || riderData === void 0 ? void 0 : riderData.phoneNumber) || 'N/A',
                            email: (riderData === null || riderData === void 0 ? void 0 : riderData.email) || 'N/A'
                        };
                    }
                }
                catch (e) {
                    console.warn('Failed to fetch rider info', e);
                }
            }
            // Fetch driver info and vehicle
            let driverInfo = null;
            let vehicleInfo = null;
            if (data.driverId) {
                try {
                    const driverDoc = yield firebase_1.db.collection('users').doc(data.driverId).get();
                    if (driverDoc.exists) {
                        const driverData = driverDoc.data();
                        driverInfo = {
                            name: (driverData === null || driverData === void 0 ? void 0 : driverData.displayName) || 'Unknown',
                            phone: (driverData === null || driverData === void 0 ? void 0 : driverData.phoneNumber) || 'N/A',
                            email: (driverData === null || driverData === void 0 ? void 0 : driverData.email) || 'N/A'
                        };
                        // Fetch vehicle info if vehicleId exists
                        if ((_j = driverData === null || driverData === void 0 ? void 0 : driverData.driverDetails) === null || _j === void 0 ? void 0 : _j.vehicleId) {
                            const vehicleDoc = yield firebase_1.db.collection('vehicles').doc(driverData.driverDetails.vehicleId).get();
                            if (vehicleDoc.exists) {
                                const vehicleData = vehicleDoc.data();
                                vehicleInfo = {
                                    plateNumber: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.plateNumber) || 'N/A',
                                    make: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.make) || 'N/A',
                                    model: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.model) || 'N/A',
                                    year: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.year) || 'N/A',
                                    color: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.color) || 'N/A',
                                    category: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.category) || 'N/A'
                                };
                            }
                        }
                    }
                }
                catch (e) {
                    console.warn('Failed to fetch driver info', e);
                }
            }
            let driverLocation = null;
            if (data.driverId) {
                try {
                    const locationSnap = yield firebase_1.rtdb.ref(`drivers/${data.driverId}/location`).get();
                    driverLocation = locationSnap.val();
                }
                catch (e) {
                    console.warn('Failed to fetch driver location from RTDB', e);
                }
            }
            return Object.assign(Object.assign({ id: doc.id }, data), { driverLocation,
                riderInfo,
                driverInfo,
                vehicleInfo });
        })));
        res.status(200).json(rides);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to list active rides');
        res.status(500).json({ message: 'Unable to load active rides' });
    }
});
exports.listActiveRides = listActiveRides;
const listAllRides = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, region, driverId, riderId, limit = '20', startAfter } = req.query;
        let query = firebase_1.db.collection('rides').orderBy('createdAt', 'desc');
        if (status)
            query = query.where('status', '==', status);
        if (region)
            query = query.where('region', '==', region);
        if (driverId)
            query = query.where('driverId', '==', driverId);
        if (riderId)
            query = query.where('riderId', '==', riderId);
        if (startAfter) {
            const lastDoc = yield firebase_1.db.collection('rides').doc(startAfter).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }
        const snapshot = yield query.limit(parseInt(limit)).get();
        const rides = yield Promise.all(snapshot.docs.map((doc) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const data = doc.data();
            // Reverse geocode if address is missing
            if (((_a = data.pickupLocation) === null || _a === void 0 ? void 0 : _a.lat) && ((_b = data.pickupLocation) === null || _b === void 0 ? void 0 : _b.lng) && !((_c = data.pickupLocation) === null || _c === void 0 ? void 0 : _c.address)) {
                const address = yield (0, geocoding_1.reverseGeocode)(data.pickupLocation.lat, data.pickupLocation.lng);
                data.pickupLocation = Object.assign(Object.assign({}, data.pickupLocation), { address: address || 'Unknown Location' });
            }
            else if (!((_d = data.pickupLocation) === null || _d === void 0 ? void 0 : _d.address)) {
                data.pickupLocation = Object.assign(Object.assign({}, data.pickupLocation), { address: 'Unknown Location' });
            }
            if (((_e = data.dropoffLocation) === null || _e === void 0 ? void 0 : _e.lat) && ((_f = data.dropoffLocation) === null || _f === void 0 ? void 0 : _f.lng) && !((_g = data.dropoffLocation) === null || _g === void 0 ? void 0 : _g.address)) {
                const address = yield (0, geocoding_1.reverseGeocode)(data.dropoffLocation.lat, data.dropoffLocation.lng);
                data.dropoffLocation = Object.assign(Object.assign({}, data.dropoffLocation), { address: address || 'Unknown Location' });
            }
            else if (!((_h = data.dropoffLocation) === null || _h === void 0 ? void 0 : _h.address)) {
                data.dropoffLocation = Object.assign(Object.assign({}, data.dropoffLocation), { address: 'Unknown Location' });
            }
            // Fetch rider info
            let riderInfo = null;
            if (data.riderId) {
                try {
                    const riderDoc = yield firebase_1.db.collection('users').doc(data.riderId).get();
                    if (riderDoc.exists) {
                        const riderData = riderDoc.data();
                        riderInfo = {
                            name: (riderData === null || riderData === void 0 ? void 0 : riderData.displayName) || 'Unknown',
                            phone: (riderData === null || riderData === void 0 ? void 0 : riderData.phoneNumber) || 'N/A',
                            email: (riderData === null || riderData === void 0 ? void 0 : riderData.email) || 'N/A'
                        };
                    }
                }
                catch (e) {
                    console.warn('Failed to fetch rider info', e);
                }
            }
            // Fetch driver info and vehicle
            let driverInfo = null;
            let vehicleInfo = null;
            if (data.driverId) {
                try {
                    const driverDoc = yield firebase_1.db.collection('users').doc(data.driverId).get();
                    if (driverDoc.exists) {
                        const driverData = driverDoc.data();
                        driverInfo = {
                            name: (driverData === null || driverData === void 0 ? void 0 : driverData.displayName) || 'Unknown',
                            phone: (driverData === null || driverData === void 0 ? void 0 : driverData.phoneNumber) || 'N/A',
                            email: (driverData === null || driverData === void 0 ? void 0 : driverData.email) || 'N/A'
                        };
                        // Fetch vehicle info if vehicleId exists
                        if ((_j = driverData === null || driverData === void 0 ? void 0 : driverData.driverDetails) === null || _j === void 0 ? void 0 : _j.vehicleId) {
                            const vehicleDoc = yield firebase_1.db.collection('vehicles').doc(driverData.driverDetails.vehicleId).get();
                            if (vehicleDoc.exists) {
                                const vehicleData = vehicleDoc.data();
                                vehicleInfo = {
                                    plateNumber: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.plateNumber) || 'N/A',
                                    make: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.make) || 'N/A',
                                    model: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.model) || 'N/A',
                                    year: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.year) || 'N/A',
                                    color: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.color) || 'N/A',
                                    category: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.category) || 'N/A'
                                };
                            }
                        }
                    }
                }
                catch (e) {
                    console.warn('Failed to fetch driver info', e);
                }
            }
            return Object.assign(Object.assign({ id: doc.id }, data), { riderInfo,
                driverInfo,
                vehicleInfo });
        })));
        res.status(200).json({ rides, lastId: rides.length > 0 ? rides[rides.length - 1].id : null });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to list all rides');
        res.status(500).json({ message: 'Unable to list rides' });
    }
});
exports.listAllRides = listAllRides;
const getRideDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const doc = yield firebase_1.db.collection('rides').doc(id).get();
        if (!doc.exists) {
            res.status(404).json({ message: 'Ride not found' });
            return;
        }
        const data = doc.data();
        // Fetch rider info
        let riderInfo = null;
        if (data === null || data === void 0 ? void 0 : data.riderId) {
            try {
                const riderDoc = yield firebase_1.db.collection('users').doc(data.riderId).get();
                if (riderDoc.exists) {
                    const riderData = riderDoc.data();
                    riderInfo = {
                        name: (riderData === null || riderData === void 0 ? void 0 : riderData.displayName) || 'Unknown',
                        phone: (riderData === null || riderData === void 0 ? void 0 : riderData.phoneNumber) || 'N/A',
                        email: (riderData === null || riderData === void 0 ? void 0 : riderData.email) || 'N/A'
                    };
                }
            }
            catch (e) {
                console.warn('Failed to fetch rider info', e);
            }
        }
        // Fetch driver info and vehicle
        let driverInfo = null;
        let vehicleInfo = null;
        if (data === null || data === void 0 ? void 0 : data.driverId) {
            try {
                const driverDoc = yield firebase_1.db.collection('users').doc(data.driverId).get();
                if (driverDoc.exists) {
                    const driverData = driverDoc.data();
                    driverInfo = {
                        name: (driverData === null || driverData === void 0 ? void 0 : driverData.displayName) || 'Unknown',
                        phone: (driverData === null || driverData === void 0 ? void 0 : driverData.phoneNumber) || 'N/A',
                        email: (driverData === null || driverData === void 0 ? void 0 : driverData.email) || 'N/A'
                    };
                    // Fetch vehicle info if vehicleId exists
                    if ((_a = driverData === null || driverData === void 0 ? void 0 : driverData.driverDetails) === null || _a === void 0 ? void 0 : _a.vehicleId) {
                        const vehicleDoc = yield firebase_1.db.collection('vehicles').doc(driverData.driverDetails.vehicleId).get();
                        if (vehicleDoc.exists) {
                            const vehicleData = vehicleDoc.data();
                            vehicleInfo = {
                                plateNumber: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.plateNumber) || 'N/A',
                                make: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.make) || 'N/A',
                                model: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.model) || 'N/A',
                                year: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.year) || 'N/A',
                                color: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.color) || 'N/A',
                                category: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.category) || 'N/A'
                            };
                        }
                    }
                }
            }
            catch (e) {
                console.warn('Failed to fetch driver info', e);
            }
        }
        res.status(200).json(Object.assign(Object.assign({ id: doc.id }, data), { riderInfo,
            driverInfo,
            vehicleInfo }));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to get ride details');
        res.status(500).json({ message: 'Unable to get ride details' });
    }
});
exports.getRideDetails = getRideDetails;
const adminCancelRide = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const rideRef = firebase_1.db.collection('rides').doc(id);
        const rideDoc = yield rideRef.get();
        if (!rideDoc.exists) {
            res.status(404).json({ message: 'Ride not found' });
            return;
        }
        const rideData = rideDoc.data();
        if (['completed', 'cancelled'].includes(rideData === null || rideData === void 0 ? void 0 : rideData.status)) {
            res.status(400).json({ message: 'Ride is already completed or cancelled' });
            return;
        }
        yield rideRef.update({
            status: 'cancelled',
            cancellationReason: reason || 'Cancelled by admin',
            cancelledBy: req.user.uid,
            cancelledAt: new Date(),
            updatedAt: new Date()
        });
        // Notify parties (optional but good practice)
        // socketService.notifyRider(rideData.riderId, 'ride:cancelled', { reason });
        // if (rideData.driverId) socketService.notifyDriver(rideData.driverId, 'ride:cancelled', { reason });
        logger_1.logger.info({ rideId: id, admin: req.user.uid }, 'Ride cancelled by admin');
        res.status(200).json({ message: 'Ride cancelled successfully' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to cancel ride');
        res.status(500).json({ message: 'Unable to cancel ride' });
    }
});
exports.adminCancelRide = adminCancelRide;
const createDispute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const payload = {
            rideId: req.body.rideId,
            reporterId: (_a = req.body.reporterId) !== null && _a !== void 0 ? _a : req.user.uid,
            reporterRole: req.body.reporterRole,
            reason: req.body.reason,
            details: req.body.details,
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const ref = yield firebase_1.db.collection('disputes').add(payload);
        logger_1.logger.info({ disputeId: ref.id, admin: req.user.uid }, 'Dispute created');
        res.status(201).json(Object.assign({ id: ref.id }, payload));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to create dispute');
        res.status(500).json({ message: 'Unable to create dispute' });
    }
});
exports.createDispute = createDispute;
const resolveDispute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { resolutionNotes, resolutionType, issueRefund, refundUserId, refundAmount } = req.body;
        const disputeRef = firebase_1.db.collection('disputes').doc(id);
        const disputeSnapshot = yield disputeRef.get();
        if (!disputeSnapshot.exists) {
            res.status(404).json({ message: 'Dispute not found' });
            return;
        }
        const batch = firebase_1.db.batch();
        batch.update(disputeRef, {
            status: 'resolved',
            resolutionNotes,
            resolutionType,
            resolvedAt: new Date(),
            resolvedBy: req.user.uid,
            updatedAt: new Date()
        });
        if (issueRefund && refundUserId && refundAmount > 0) {
            yield WalletService_1.walletService.processTransaction(refundUserId, refundAmount, 'credit', 'refund', 'Dispute refund', `DISPUTE-${id}`);
        }
        yield batch.commit();
        logger_1.logger.info({ disputeId: id, admin: req.user.uid }, 'Dispute resolved');
        res.status(200).json({ message: 'Dispute resolved' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to resolve dispute');
        res.status(500).json({ message: 'Unable to resolve dispute' });
    }
});
exports.resolveDispute = resolveDispute;
const createPromotion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const promo = {
            code: req.body.code,
            description: req.body.description,
            discountType: req.body.discountType,
            amount: req.body.amount,
            maxRedemptions: req.body.maxRedemptions,
            regions: ((_a = req.body.regions) !== null && _a !== void 0 ? _a : []).map((r) => {
                const normalized = r.toLowerCase().trim();
                if (normalized.includes('nigeria') || normalized === 'ng')
                    return 'NG';
                if (normalized.includes('chicago') || normalized.includes('us') || normalized === 'us-chi')
                    return 'US-CHI';
                return normalized;
            }),
            startsAt: req.body.startsAt ? new Date(req.body.startsAt) : new Date(),
            endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
            bonuses: (_b = req.body.bonuses) !== null && _b !== void 0 ? _b : [],
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const ref = yield firebase_1.db.collection('promotions').add(promo);
        logger_1.logger.info({ promoId: ref.id, admin: req.user.uid }, 'Promotion created');
        res.status(201).json(Object.assign({ id: ref.id }, promo));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to create promotion');
        res.status(500).json({ message: 'Unable to create promotion' });
    }
});
exports.createPromotion = createPromotion;
const updatePromotion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield firebase_1.db.collection('promotions').doc(id).update(Object.assign(Object.assign({}, req.body), { updatedAt: new Date() }));
        logger_1.logger.info({ promoId: id, admin: req.user.uid }, 'Promotion updated');
        res.status(200).json({ message: 'Promotion updated' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to update promotion');
        res.status(500).json({ message: 'Unable to update promotion' });
    }
});
exports.updatePromotion = updatePromotion;
const listPromotions = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield firebase_1.db.collection('promotions').orderBy('createdAt', 'desc').get();
        res.status(200).json(snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to list promotions');
        res.status(500).json({ message: 'Unable to load promotions' });
    }
});
exports.listPromotions = listPromotions;
const createBonusProgram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const program = {
            name: req.body.name,
            description: req.body.description,
            criteria: req.body.criteria,
            reward: req.body.reward,
            regions: (_a = req.body.regions) !== null && _a !== void 0 ? _a : [],
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const ref = yield firebase_1.db.collection('bonus_programs').add(program);
        logger_1.logger.info({ bonusId: ref.id, admin: req.user.uid }, 'Bonus program created');
        res.status(201).json(Object.assign({ id: ref.id }, program));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to create bonus program');
        res.status(500).json({ message: 'Unable to create bonus program' });
    }
});
exports.createBonusProgram = createBonusProgram;
const updateBonusProgram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield firebase_1.db.collection('bonus_programs').doc(id).update(Object.assign(Object.assign({}, req.body), { updatedAt: new Date() }));
        logger_1.logger.info({ bonusId: id, admin: req.user.uid }, 'Bonus program updated');
        res.status(200).json({ message: 'Bonus program updated' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to update bonus program');
        res.status(500).json({ message: 'Unable to update bonus program' });
    }
});
exports.updateBonusProgram = updateBonusProgram;
const listBonusPrograms = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield firebase_1.db.collection('bonus_programs').orderBy('createdAt', 'desc').get();
        res.status(200).json(snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to list bonus programs');
        res.status(500).json({ message: 'Unable to load bonus programs' });
    }
});
exports.listBonusPrograms = listBonusPrograms;
const getEarningsAnalytics = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [ridesSnap, payoutsSnap] = yield Promise.all([
            firebase_1.db.collection('rides').where('createdAt', '>=', since).get(),
            firebase_1.db.collection('payout_requests').where('createdAt', '>=', since).get()
        ]);
        const rideRevenue = ridesSnap.docs.reduce((sum, doc) => {
            var _a;
            const pricing = doc.data().pricing;
            return sum + ((_a = pricing === null || pricing === void 0 ? void 0 : pricing.finalFare) !== null && _a !== void 0 ? _a : 0);
        }, 0);
        const driverPayouts = payoutsSnap.docs
            .filter((doc) => doc.data().status === 'completed')
            .reduce((sum, doc) => sum + doc.data().amount, 0);
        const platformCommission = ridesSnap.docs.reduce((sum, doc) => {
            var _a, _b;
            const pricing = doc.data().pricing;
            const commissionRate = (_a = pricing === null || pricing === void 0 ? void 0 : pricing.platformCommission) !== null && _a !== void 0 ? _a : 0.25;
            const fare = (_b = pricing === null || pricing === void 0 ? void 0 : pricing.finalFare) !== null && _b !== void 0 ? _b : 0;
            return sum + fare * commissionRate;
        }, 0);
        res.status(200).json({
            since,
            rideRevenue,
            driverPayouts,
            platformCommission,
            net: rideRevenue - driverPayouts
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to compute earnings analytics');
        res.status(500).json({ message: 'Unable to load analytics' });
    }
});
exports.getEarningsAnalytics = getEarningsAnalytics;
const createSupportTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const ticket = {
            subject: req.body.subject,
            description: req.body.description,
            userId: req.body.userId,
            role: req.body.role,
            priority: (_a = req.body.priority) !== null && _a !== void 0 ? _a : 'normal',
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: req.user.uid
        };
        const ref = yield firebase_1.db.collection('support_tickets').add(ticket);
        logger_1.logger.info({ ticketId: ref.id, admin: req.user.uid }, 'Support ticket created');
        res.status(201).json(Object.assign({ id: ref.id }, ticket));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to create support ticket');
        res.status(500).json({ message: 'Unable to create ticket' });
    }
});
exports.createSupportTicket = createSupportTicket;
const listSupportTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, priority } = req.query;
        let query = firebase_1.db.collection('support_tickets');
        if (status)
            query = query.where('status', '==', status);
        if (priority)
            query = query.where('priority', '==', priority);
        const snapshot = yield query.orderBy('createdAt', 'desc').limit(200).get();
        res.status(200).json(snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to list support tickets');
        res.status(500).json({ message: 'Unable to load support tickets' });
    }
});
exports.listSupportTickets = listSupportTickets;
const updateSupportTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, assignee, resolutionNotes } = req.body;
        yield firebase_1.db.collection('support_tickets').doc(id).update({
            status,
            assignee,
            resolutionNotes,
            updatedAt: new Date(),
            resolvedAt: status === 'resolved' ? new Date() : firestore_1.FieldValue.delete()
        });
        logger_1.logger.info({ ticketId: id, admin: req.user.uid }, 'Support ticket updated');
        res.status(200).json({ message: 'Support ticket updated' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to update support ticket');
        res.status(500).json({ message: 'Unable to update ticket' });
    }
});
exports.updateSupportTicket = updateSupportTicket;
const updateVehicleStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { vehicleId } = req.params;
        const { isApproved, rejectionReason } = req.body;
        // Validate isApproved is provided
        if (isApproved === undefined || isApproved === null) {
            res.status(400).json({ message: 'isApproved is required (true or false)' });
            return;
        }
        const vehicleRef = firebase_1.db.collection('vehicles').doc(vehicleId);
        const vehicleSnap = yield vehicleRef.get();
        if (!vehicleSnap.exists) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        yield vehicleRef.update({
            isApproved,
            rejectionReason: !isApproved ? rejectionReason : firestore_1.FieldValue.delete(),
            updatedAt: new Date(),
            approvedBy: isApproved ? req.user.uid : firestore_1.FieldValue.delete(),
            approvedAt: isApproved ? new Date() : firestore_1.FieldValue.delete()
        });
        logger_1.logger.info({ vehicleId, isApproved, admin: req.user.uid }, 'Vehicle status updated');
        res.status(200).json({ message: `Vehicle ${isApproved ? 'approved' : 'rejected'}` });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to update vehicle status');
        res.status(500).json({ message: 'Unable to update vehicle' });
    }
});
exports.updateVehicleStatus = updateVehicleStatus;
const listDisputes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, rideId } = req.query;
        let query = firebase_1.db.collection('disputes').orderBy('createdAt', 'desc');
        if (status) {
            query = query.where('status', '==', status);
        }
        if (rideId) {
            query = query.where('rideId', '==', rideId);
        }
        const snapshot = yield query.limit(100).get();
        const disputes = yield Promise.all(snapshot.docs.map((doc) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const data = doc.data();
            // Fetch ride details
            let rideInfo = null;
            if (data.rideId) {
                try {
                    const rideDoc = yield firebase_1.db.collection('rides').doc(data.rideId).get();
                    if (rideDoc.exists) {
                        const rideData = rideDoc.data();
                        rideInfo = {
                            id: rideDoc.id,
                            status: rideData === null || rideData === void 0 ? void 0 : rideData.status,
                            pickupLocation: rideData === null || rideData === void 0 ? void 0 : rideData.pickupLocation,
                            dropoffLocation: rideData === null || rideData === void 0 ? void 0 : rideData.dropoffLocation,
                            pricing: rideData === null || rideData === void 0 ? void 0 : rideData.pricing,
                            createdAt: rideData === null || rideData === void 0 ? void 0 : rideData.createdAt
                        };
                        // Fetch rider info
                        let riderInfo = null;
                        if (rideData === null || rideData === void 0 ? void 0 : rideData.riderId) {
                            try {
                                const riderDoc = yield firebase_1.db.collection('users').doc(rideData.riderId).get();
                                if (riderDoc.exists) {
                                    const riderData = riderDoc.data();
                                    riderInfo = {
                                        id: rideData.riderId,
                                        name: (riderData === null || riderData === void 0 ? void 0 : riderData.displayName) || 'Unknown',
                                        phone: (riderData === null || riderData === void 0 ? void 0 : riderData.phoneNumber) || 'N/A',
                                        email: (riderData === null || riderData === void 0 ? void 0 : riderData.email) || 'N/A'
                                    };
                                }
                            }
                            catch (e) {
                                console.warn('Failed to fetch rider info', e);
                            }
                        }
                        // Fetch driver info and vehicle
                        let driverInfo = null;
                        let vehicleInfo = null;
                        if (rideData === null || rideData === void 0 ? void 0 : rideData.driverId) {
                            try {
                                const driverDoc = yield firebase_1.db.collection('users').doc(rideData.driverId).get();
                                if (driverDoc.exists) {
                                    const driverData = driverDoc.data();
                                    driverInfo = {
                                        id: rideData.driverId,
                                        name: (driverData === null || driverData === void 0 ? void 0 : driverData.displayName) || 'Unknown',
                                        phone: (driverData === null || driverData === void 0 ? void 0 : driverData.phoneNumber) || 'N/A',
                                        email: (driverData === null || driverData === void 0 ? void 0 : driverData.email) || 'N/A'
                                    };
                                    // Fetch vehicle info if vehicleId exists
                                    if ((_a = driverData === null || driverData === void 0 ? void 0 : driverData.driverDetails) === null || _a === void 0 ? void 0 : _a.vehicleId) {
                                        const vehicleDoc = yield firebase_1.db.collection('vehicles').doc(driverData.driverDetails.vehicleId).get();
                                        if (vehicleDoc.exists) {
                                            const vehicleData = vehicleDoc.data();
                                            vehicleInfo = {
                                                plateNumber: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.plateNumber) || 'N/A',
                                                make: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.make) || 'N/A',
                                                model: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.model) || 'N/A',
                                                year: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.year) || 'N/A',
                                                color: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.color) || 'N/A',
                                                category: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.category) || 'N/A'
                                            };
                                        }
                                    }
                                }
                            }
                            catch (e) {
                                console.warn('Failed to fetch driver info', e);
                            }
                        }
                        rideInfo.riderInfo = riderInfo;
                        rideInfo.driverInfo = driverInfo;
                        rideInfo.vehicleInfo = vehicleInfo;
                    }
                }
                catch (e) {
                    console.warn('Failed to fetch ride info', e);
                }
            }
            // Fetch reporter info
            let reporterInfo = null;
            if (data.reporterId) {
                try {
                    const reporterDoc = yield firebase_1.db.collection('users').doc(data.reporterId).get();
                    if (reporterDoc.exists) {
                        const reporterData = reporterDoc.data();
                        reporterInfo = {
                            id: data.reporterId,
                            name: (reporterData === null || reporterData === void 0 ? void 0 : reporterData.displayName) || 'Unknown',
                            phone: (reporterData === null || reporterData === void 0 ? void 0 : reporterData.phoneNumber) || 'N/A',
                            email: (reporterData === null || reporterData === void 0 ? void 0 : reporterData.email) || 'N/A',
                            role: (reporterData === null || reporterData === void 0 ? void 0 : reporterData.role) || 'N/A'
                        };
                    }
                }
                catch (e) {
                    console.warn('Failed to fetch reporter info', e);
                }
            }
            return Object.assign(Object.assign({ id: doc.id }, data), { rideInfo,
                reporterInfo });
        })));
        res.status(200).json(disputes);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to list disputes');
        res.status(500).json({ message: 'Unable to load disputes' });
    }
});
exports.listDisputes = listDisputes;
//# sourceMappingURL=admin.controller.js.map