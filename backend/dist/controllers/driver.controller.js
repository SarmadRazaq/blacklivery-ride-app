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
exports.recordDriverHeartbeat = exports.updateDriverAvailability = exports.adminRequestDocumentResubmission = exports.adminReviewDriverApplication = exports.adminGetDriverApplication = exports.adminListDriverApplications = exports.getDriverApplication = exports.updateDriverBankInfo = exports.uploadDriverDocuments = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
const RideTrackingService_1 = require("../services/RideTrackingService");
const geohash_1 = require("../utils/geohash");
const REQUIRED_DOCUMENTS = [
    'driver_license',
    'vehicle_registration',
    'vehicle_insurance',
    'vehicle_photo_front',
    'vehicle_photo_back'
];
const notifyUser = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    yield firebase_1.db.collection('notifications').add(Object.assign(Object.assign({ userId }, payload), { read: false, createdAt: new Date() }));
});
const ensureDriverWallet = (tx, userId, currency) => __awaiter(void 0, void 0, void 0, function* () {
    const walletRef = firebase_1.db.collection('wallets').doc(userId);
    const existing = yield tx.get(walletRef);
    if (!existing.exists) {
        tx.set(walletRef, {
            userId,
            balance: { amount: 0, currency },
            lifetimeEarnings: 0,
            pendingWithdrawals: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
});
const uploadDriverDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }
    try {
        const { uid } = req.user;
        const { documents } = req.body;
        const applicationRef = firebase_1.db.collection('driver_applications').doc(uid);
        const snapshot = yield applicationRef.get();
        const current = ((_b = (_a = snapshot.data()) === null || _a === void 0 ? void 0 : _a.documents) !== null && _b !== void 0 ? _b : {});
        const updatedDocs = Object.assign({}, current);
        documents.forEach((doc) => {
            updatedDocs[doc.type] = Object.assign(Object.assign({}, doc), { uploadedAt: new Date() });
        });
        const documentsComplete = REQUIRED_DOCUMENTS.every((docType) => !!updatedDocs[docType]);
        yield applicationRef.set({
            userId: uid,
            documents: updatedDocs,
            status: documentsComplete ? 'pending_review' : 'pending_documents',
            updatedAt: new Date(),
            requiredDocuments: REQUIRED_DOCUMENTS,
            countryCode: (_d = (_c = req.user.country) !== null && _c !== void 0 ? _c : req.body.countryCode) !== null && _d !== void 0 ? _d : 'NG',
            auditTrail: firestore_1.FieldValue.arrayUnion({
                at: new Date(),
                action: 'documents_uploaded',
                actor: uid,
                notes: documents.map((doc) => doc.type)
            })
        }, { merge: true });
        yield firebase_1.db
            .collection('users')
            .doc(uid)
            .set({
            driverOnboarding: {
                status: documentsComplete ? 'pending_review' : 'pending_documents',
                updatedAt: new Date()
            },
            driverStatus: {
                state: documentsComplete ? 'pending_review' : 'pending_documents',
                isOnline: false
            },
            updatedAt: new Date()
        }, { merge: true });
        res.status(200).json({
            message: 'Documents uploaded successfully',
            status: documentsComplete ? 'pending_review' : 'pending_documents'
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'uploadDriverDocuments failed');
        res.status(500).json({ error: 'Unable to upload documents' });
    }
});
exports.uploadDriverDocuments = uploadDriverDocuments;
const updateDriverBankInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }
    try {
        const { uid } = req.user;
        const bankDetails = {
            accountName: req.body.accountName,
            accountNumber: req.body.accountNumber,
            bankCode: req.body.bankCode,
            bankName: req.body.bankName,
            countryCode: (_a = req.body.countryCode) !== null && _a !== void 0 ? _a : 'NG',
            updatedAt: new Date()
        };
        const applicationRef = firebase_1.db.collection('driver_applications').doc(uid);
        yield applicationRef.set({
            userId: uid,
            bankDetails,
            updatedAt: new Date(),
            auditTrail: firestore_1.FieldValue.arrayUnion({
                at: new Date(),
                action: 'bank_details_updated',
                actor: uid
            })
        }, { merge: true });
        yield firebase_1.db
            .collection('users')
            .doc(uid)
            .set({
            bankDetails,
            driverOnboarding: {
                status: firestore_1.FieldValue.delete(),
                updatedAt: new Date()
            },
            updatedAt: new Date()
        }, { merge: true });
        res.status(200).json({ message: 'Bank details saved' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'updateDriverBankInfo failed');
        res.status(500).json({ error: 'Unable to save bank info' });
    }
});
exports.updateDriverBankInfo = updateDriverBankInfo;
const getDriverApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }
    try {
        const doc = yield firebase_1.db.collection('driver_applications').doc(req.user.uid).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }
        res.status(200).json(doc.data());
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'getDriverApplication failed');
        res.status(500).json({ error: 'Unable to load application' });
    }
});
exports.getDriverApplication = getDriverApplication;
const adminListDriverApplications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, vehicleType } = req.query;
        let query = firebase_1.db.collection('driver_applications');
        if (status) {
            query = query.where('status', '==', status);
        }
        if (vehicleType) {
            query = query.where('vehicleType', '==', vehicleType);
        }
        const snapshot = yield query.orderBy('updatedAt', 'desc').limit(200).get();
        res.status(200).json(snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'adminListDriverApplications failed');
        res.status(500).json({ error: 'Unable to list driver applications' });
    }
});
exports.adminListDriverApplications = adminListDriverApplications;
const adminGetDriverApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doc = yield firebase_1.db.collection('driver_applications').doc(req.params.driverId).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }
        res.status(200).json(doc.data());
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'adminGetDriverApplication failed');
        res.status(500).json({ error: 'Unable to load driver application' });
    }
});
exports.adminGetDriverApplication = adminGetDriverApplication;
const adminReviewDriverApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { driverId } = req.params;
        const { action, notes, rejectionReason } = req.body;
        const now = new Date();
        yield firebase_1.db.runTransaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const applicationRef = firebase_1.db.collection('driver_applications').doc(driverId);
            const userRef = firebase_1.db.collection('users').doc(driverId);
            const [applicationSnap, userSnap] = yield Promise.all([tx.get(applicationRef), tx.get(userRef)]);
            if (!applicationSnap.exists) {
                throw new Error('Application not found');
            }
            const userData = (_a = userSnap.data()) !== null && _a !== void 0 ? _a : {};
            if (action === 'approve') {
                tx.update(applicationRef, {
                    status: 'approved',
                    approvedAt: now,
                    reviewedBy: req.user.uid,
                    auditTrail: firestore_1.FieldValue.arrayUnion({
                        at: now,
                        action: 'approved',
                        actor: req.user.uid,
                        notes
                    })
                });
                tx.set(userRef, {
                    driverOnboarding: {
                        status: 'approved',
                        reviewedAt: now,
                        reviewedBy: req.user.uid
                    },
                    driverStatus: {
                        state: 'approved',
                        isOnline: false,
                        lastHeartbeat: null
                    },
                    isActive: true,
                    updatedAt: now
                }, { merge: true });
                yield ensureDriverWallet(tx, driverId, (_b = userData.currency) !== null && _b !== void 0 ? _b : 'NGN');
            }
            else if (action === 'reject') {
                tx.update(applicationRef, {
                    status: 'rejected',
                    rejectedAt: now,
                    rejectionReason,
                    auditTrail: firestore_1.FieldValue.arrayUnion({
                        at: now,
                        action: 'rejected',
                        actor: req.user.uid,
                        notes: rejectionReason
                    })
                });
                tx.set(userRef, {
                    driverOnboarding: {
                        status: 'rejected',
                        reviewedAt: now,
                        rejectionReason
                    },
                    driverStatus: {
                        state: 'suspended',
                        isOnline: false
                    },
                    updatedAt: now
                }, { merge: true });
            }
            else {
                tx.update(applicationRef, {
                    status: 'needs_resubmission',
                    resubmissionNotes: notes,
                    auditTrail: firestore_1.FieldValue.arrayUnion({
                        at: now,
                        action: 'resubmission_requested',
                        actor: req.user.uid,
                        notes
                    })
                });
                tx.set(userRef, {
                    driverOnboarding: {
                        status: 'needs_resubmission',
                        updatedAt: now
                    },
                    driverStatus: {
                        state: 'needs_resubmission',
                        isOnline: false
                    },
                    updatedAt: now
                }, { merge: true });
            }
        }));
        const notificationMessage = req.body.action === 'approve'
            ? 'Your driver profile has been approved. You can now go online.'
            : req.body.action === 'reject'
                ? `Your driver application was rejected: ${rejectionReason !== null && rejectionReason !== void 0 ? rejectionReason : 'Please contact support.'}`
                : 'Additional documents are required for your driver application.';
        yield notifyUser(req.params.driverId, {
            title: 'Driver Application Update',
            body: notificationMessage,
            type: 'driver_onboarding',
            metadata: {
                action: req.body.action
            }
        });
        res.status(200).json({ message: 'Application updated' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'adminReviewDriverApplication failed');
        res.status(500).json({ error: 'Unable to update driver application' });
    }
});
exports.adminReviewDriverApplication = adminReviewDriverApplication;
const adminRequestDocumentResubmission = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { driverId } = req.params;
        const { documents, note } = req.body;
        const now = new Date();
        yield firebase_1.db
            .collection('driver_applications')
            .doc(driverId)
            .set({
            status: 'needs_resubmission',
            requestedDocuments: documents,
            resubmissionNotes: note,
            updatedAt: now,
            auditTrail: firestore_1.FieldValue.arrayUnion({
                at: now,
                action: 'documents_requested',
                actor: req.user.uid,
                notes: note,
                documents
            })
        }, { merge: true });
        yield notifyUser(driverId, {
            title: 'Additional Documents Required',
            body: note !== null && note !== void 0 ? note : 'Please upload the requested documents to proceed.',
            type: 'driver_onboarding',
            metadata: { documents }
        });
        res.status(200).json({ message: 'Resubmission requested' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'adminRequestDocumentResubmission failed');
        res.status(500).json({ error: 'Unable to request resubmission' });
    }
});
exports.adminRequestDocumentResubmission = adminRequestDocumentResubmission;
const updateDriverAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }
    try {
        const { uid } = req.user;
        const { isOnline, location } = req.body;
        const now = new Date();
        const geohash = location ? (0, geohash_1.encodeGeohash)(location.lat, location.lng, 7) : null;
        const geohash5 = geohash ? geohash.substring(0, 5) : null;
        const geohash4 = geohash ? geohash.substring(0, 4) : null;
        yield firebase_1.db
            .collection('users')
            .doc(uid)
            .set({
            driverStatus: {
                state: isOnline ? 'active' : 'offline',
                isOnline,
                lastHeartbeat: now,
                lastKnownLocation: location !== null && location !== void 0 ? location : firestore_1.FieldValue.delete(),
                lastKnownGeohash: geohash !== null && geohash !== void 0 ? geohash : firestore_1.FieldValue.delete(),
                geohash5: geohash5 !== null && geohash5 !== void 0 ? geohash5 : firestore_1.FieldValue.delete(),
                geohash4: geohash4 !== null && geohash4 !== void 0 ? geohash4 : firestore_1.FieldValue.delete(),
                lastOnlineAt: isOnline ? firestore_1.FieldValue.delete() : now
            },
            driverDetails: {
                isOnline
            },
            updatedAt: now
        }, { merge: true });
        yield firebase_1.rtdb
            .ref(`drivers/${uid}/status`)
            .set({
            isOnline,
            state: isOnline ? 'active' : 'offline',
            updatedAt: now.toISOString(),
            location: location !== null && location !== void 0 ? location : null
        });
        res.status(200).json({ message: `Driver is now ${isOnline ? 'online' : 'offline'}` });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'updateDriverAvailability failed');
        res.status(500).json({ error: 'Unable to update availability' });
    }
});
exports.updateDriverAvailability = updateDriverAvailability;
const recordDriverHeartbeat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }
    try {
        const now = new Date();
        const { location } = req.body;
        const geohash = location ? (0, geohash_1.encodeGeohash)(location.lat, location.lng, 7) : null;
        const geohash5 = geohash ? geohash.substring(0, 5) : null;
        const geohash4 = geohash ? geohash.substring(0, 4) : null;
        yield firebase_1.db
            .collection('users')
            .doc(req.user.uid)
            .set({
            driverStatus: {
                lastHeartbeat: now,
                lastKnownLocation: location !== null && location !== void 0 ? location : firestore_1.FieldValue.delete(),
                lastKnownGeohash: geohash !== null && geohash !== void 0 ? geohash : firestore_1.FieldValue.delete(),
                geohash5: geohash5 !== null && geohash5 !== void 0 ? geohash5 : firestore_1.FieldValue.delete(),
                geohash4: geohash4 !== null && geohash4 !== void 0 ? geohash4 : firestore_1.FieldValue.delete()
            }
        }, { merge: true });
        yield firebase_1.rtdb.ref(`drivers/${req.user.uid}/heartbeat`).set({
            timestamp: now.toISOString(),
            location: location !== null && location !== void 0 ? location : null
        });
        yield RideTrackingService_1.rideTrackingService.handleDriverHeartbeat(req.user.uid, location !== null && location !== void 0 ? location : null);
        res.status(200).json({ message: 'Heartbeat recorded' });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'recordDriverHeartbeat failed');
        res.status(500).json({ error: 'Unable to record heartbeat' });
    }
});
exports.recordDriverHeartbeat = recordDriverHeartbeat;
//# sourceMappingURL=driver.controller.js.map