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
exports.updateVehicle = exports.getDriverVehicles = exports.addVehicle = void 0;
const firebase_1 = require("../config/firebase");
const addVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid } = req.user;
    const { name, year, plateNumber, seats, category, images, documents } = req.body;
    try {
        // Validate required fields
        if (!name || !year || !plateNumber || !seats || !category) {
            res.status(400).json({ error: 'Missing required vehicle information' });
            return;
        }
        // Validate images
        if (!(images === null || images === void 0 ? void 0 : images.front) || !(images === null || images === void 0 ? void 0 : images.back)) {
            res.status(400).json({ error: 'Car images (front and back) are required' });
            return;
        }
        const newVehicle = {
            driverId: uid,
            name,
            year,
            plateNumber,
            seats,
            category,
            images: {
                front: images.front,
                back: images.back
            },
            documents: documents || {},
            isApproved: false, // Requires admin approval
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const ref = yield firebase_1.db.collection('vehicles').add(newVehicle);
        res.status(201).json(Object.assign({ id: ref.id }, newVehicle));
    }
    catch (error) {
        console.error('Error adding vehicle:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.addVehicle = addVehicle;
const getDriverVehicles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid } = req.user;
    try {
        const snapshot = yield firebase_1.db.collection('vehicles').where('driverId', '==', uid).get();
        const vehicles = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.status(200).json(vehicles);
    }
    catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.getDriverVehicles = getDriverVehicles;
const updateVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid } = req.user;
    const { vehicleId } = req.params;
    const { name, year, plateNumber, seats, category, images, documents } = req.body;
    try {
        const vehicleRef = firebase_1.db.collection('vehicles').doc(vehicleId);
        const vehicleSnap = yield vehicleRef.get();
        if (!vehicleSnap.exists) {
            res.status(404).json({ error: 'Vehicle not found' });
            return;
        }
        const vehicleData = vehicleSnap.data();
        if ((vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.driverId) !== uid) {
            res.status(403).json({ error: 'Not authorized to update this vehicle' });
            return;
        }
        const updateData = {
            updatedAt: new Date()
        };
        if (name)
            updateData.name = name;
        if (year)
            updateData.year = year;
        if (plateNumber)
            updateData.plateNumber = plateNumber;
        if (seats)
            updateData.seats = seats;
        if (category)
            updateData.category = category;
        if (images)
            updateData.images = images;
        if (documents)
            updateData.documents = documents;
        yield vehicleRef.update(updateData);
        res.status(200).json({ message: 'Vehicle updated successfully', id: vehicleId });
    }
    catch (error) {
        console.error('Error updating vehicle:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.updateVehicle = updateVehicle;
//# sourceMappingURL=vehicle.controller.js.map