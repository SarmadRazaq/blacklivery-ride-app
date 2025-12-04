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
exports.getDriverVehicles = exports.addVehicle = void 0;
const firebase_1 = require("../config/firebase");
const addVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid } = req.user;
    const { make, model, year, color, plateNumber, category, documents } = req.body;
    try {
        const newVehicle = {
            driverId: uid,
            make,
            model,
            year,
            color,
            plateNumber,
            category,
            documents,
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
//# sourceMappingURL=vehicle.controller.js.map