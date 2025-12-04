import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db } from '../config/firebase';
import { IVehicle } from '../models/Vehicle';

export const addVehicle = async (req: AuthRequest, res: Response) => {
    const { uid } = req.user;
    const { make, model, year, color, plateNumber, category, documents } = req.body;

    try {
        const newVehicle: IVehicle = {
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

        const ref = await db.collection('vehicles').add(newVehicle);
        res.status(201).json({ id: ref.id, ...newVehicle });
    } catch (error) {
        console.error('Error adding vehicle:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getDriverVehicles = async (req: AuthRequest, res: Response) => {
    const { uid } = req.user;

    try {
        const snapshot = await db.collection('vehicles').where('driverId', '==', uid).get();
        const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
