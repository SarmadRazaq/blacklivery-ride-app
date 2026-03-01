import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db } from '../config/firebase';
import { IVehicle } from '../models/Vehicle';
import { logger } from '../utils/logger';
import { REGIONS, RegionCode } from '../config/region.config';

/** Valid vehicle categories per region */
const VEHICLE_CATEGORIES: Record<string, { id: string; name: string; description: string; regions: RegionCode[] }[]> = {
    ride: [
        { id: 'sedan', name: 'Sedan', description: 'Standard sedan, 4 passengers', regions: ['NG'] },
        { id: 'suv', name: 'SUV', description: 'Sport utility vehicle, 5-6 passengers', regions: ['NG'] },
        { id: 'xl', name: 'XL', description: 'Extra large vehicle, 6-8 passengers', regions: ['NG'] },
        { id: 'business_sedan', name: 'Business Sedan', description: 'Premium sedan for business', regions: ['US-CHI'] },
        { id: 'business_suv', name: 'Business SUV', description: 'Premium SUV for business', regions: ['US-CHI'] },
        { id: 'first_class', name: 'First Class', description: 'Luxury first class experience', regions: ['US-CHI'] },
    ],
    delivery: [
        { id: 'motorbike', name: 'Motorbike', description: 'Quick delivery via motorbike', regions: ['NG'] },
        { id: 'sedan', name: 'Sedan (Delivery)', description: 'Medium packages via sedan', regions: ['NG'] },
        { id: 'suv', name: 'SUV (Delivery)', description: 'Larger packages via SUV', regions: ['NG'] },
        { id: 'van', name: 'Van', description: 'Large/heavy cargo van', regions: ['NG'] },
        { id: 'business_sedan', name: 'Business Sedan (Delivery)', description: 'Standard delivery via sedan', regions: ['US-CHI'] },
        { id: 'business_suv', name: 'Business SUV (Delivery)', description: 'Larger delivery via SUV', regions: ['US-CHI'] },
        { id: 'cargo_van', name: 'Cargo Van', description: 'Large cargo deliveries', regions: ['US-CHI'] },
    ]
};

/**
 * List valid vehicle categories for a region/service type
 */
export const listVehicleCategories = async (req: AuthRequest, res: Response) => {
    const region = (req.query.region as string)?.toUpperCase() || 'NG';
    const serviceType = (req.query.serviceType as string) || 'ride';

    try {
        const categories = VEHICLE_CATEGORIES[serviceType]?.filter(c => c.regions.includes(region as RegionCode)) || [];
        res.status(200).json({ region, serviceType, categories });
    } catch (error) {
        logger.error({ err: error }, 'Error listing vehicle categories');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
export const addVehicle = async (req: AuthRequest, res: Response) => {
    const { uid } = req.user;
    const { name, year, plateNumber, seats, category, images, documents } = req.body;

    try {
        // Validate required fields
        if (!name || !year || !plateNumber || !seats || !category) {
            res.status(400).json({ error: 'Missing required vehicle information' });
            return;
        }

        // Validate images
        if (!images?.front || !images?.back) {
            res.status(400).json({ error: 'Car images (front and back) are required' });
            return;
        }

        const newVehicle: IVehicle = {
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

        const ref = await db.collection('vehicles').add(newVehicle);
        res.status(201).json({ id: ref.id, ...newVehicle });
    } catch (error) {
        logger.error({ err: error }, 'Error adding vehicle');
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
        logger.error({ err: error }, 'Error fetching vehicles');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateVehicle = async (req: AuthRequest, res: Response) => {
    const { uid } = req.user;
    const { vehicleId } = req.params;
    const { name, year, plateNumber, seats, category, images, documents } = req.body;

    try {
        const vehicleRef = db.collection('vehicles').doc(vehicleId);
        const vehicleSnap = await vehicleRef.get();

        if (!vehicleSnap.exists) {
            res.status(404).json({ error: 'Vehicle not found' });
            return;
        }

        const vehicleData = vehicleSnap.data();
        if (vehicleData?.driverId !== uid) {
            res.status(403).json({ error: 'Not authorized to update this vehicle' });
            return;
        }

        const updateData: Partial<IVehicle> = {
            updatedAt: new Date()
        };

        if (name) updateData.name = name;
        if (year) updateData.year = year;
        if (plateNumber) updateData.plateNumber = plateNumber;
        if (seats) updateData.seats = seats;
        if (category) updateData.category = category;
        if (images) updateData.images = images;
        if (documents) updateData.documents = documents;

        // Reset approval when material fields change (require re-approval)
        const materialFieldChanged = name || year || plateNumber || category;
        if (materialFieldChanged && vehicleData?.isApproved) {
            (updateData as any).isApproved = false;
            (updateData as any).approvalNote = 'Re-approval required after vehicle details changed';
        }

        await vehicleRef.update(updateData);
        res.status(200).json({ message: 'Vehicle updated successfully', id: vehicleId });
    } catch (error) {
        logger.error({ err: error }, 'Error updating vehicle');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteVehicle = async (req: AuthRequest, res: Response) => {
    const { uid } = req.user;
    const { vehicleId } = req.params;

    try {
        const vehicleRef = db.collection('vehicles').doc(vehicleId);
        const vehicleSnap = await vehicleRef.get();

        if (!vehicleSnap.exists) {
            res.status(404).json({ error: 'Vehicle not found' });
            return;
        }

        const vehicleData = vehicleSnap.data();
        if (vehicleData?.driverId !== uid) {
            res.status(403).json({ error: 'Not authorized to delete this vehicle' });
            return;
        }

        await vehicleRef.delete();
        res.status(200).json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        logger.error({ err: error }, 'Error deleting vehicle');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
