import { Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';
import { AuthRequest } from '../middlewares/auth.middleware';
import { rideService } from '../services/RideService';
import { pricingService } from '../services/pricing/PricingService';
import { googleMapsService } from '../services/GoogleMapsService';
import { socketService } from '../services/SocketService';
import { db } from '../config/firebase';
import { b2bPricingService } from '../services/pricing/B2BPricingService';
import { logger } from '../utils/logger';

const deliveryRequestSchema = z.object({
    pickup: z.object({ lat: z.number(), lng: z.number(), address: z.string().min(3) }),
    dropoff: z.object({ lat: z.number(), lng: z.number(), address: z.string().min(3) }),
    city: z.string().optional(),
    region: z.enum(['nigeria', 'chicago']).optional(),
    vehicleCategory: z.string().min(3).optional(),
    addOns: z
        .object({
            fragileCare: z.boolean().optional(),
            extraStops: z.number().int().min(0).optional(),
            afterHours: z.boolean().optional()
        })
        .optional(),
    deliveryDetails: z.object({
        packageType: z.enum(['documents', 'parcel', 'bulk', 'food', 'medical']),
        packageValue: z.number().min(0).optional(),
        weightKg: z.number().min(0.1).max(50),
        serviceType: z.enum(['instant', 'same_day', 'scheduled']),
        requiresReturn: z.boolean().optional(),
        extraStops: z.number().int().min(0).max(5).optional(),
        dropoffContact: z.object({
            name: z.string().min(2),
            phone: z.string().min(6),
            instructions: z.string().optional()
        }),
        pickupContact: z
            .object({
                name: z.string().min(2),
                phone: z.string().min(6)
            })
            .optional(),
        expectedReadyAt: z.string().datetime().optional(),
        proofRequired: z.enum(['photo', 'signature', 'both', 'none']).optional()
    })
});

const ensureDeliveryNotification = async (riderId: string, payload: Record<string, unknown>): Promise<void> => {
    await db.collection('notifications').add({
        userId: riderId,
        type: 'delivery',
        title: 'Delivery Request Created',
        body: 'Your delivery request is live. We will notify you once a driver accepts.',
        metadata: payload,
        read: false,
        createdAt: new Date()
    });
};

export const createDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Body already validated by createDeliverySchema middleware (pickupLocation/dropoffLocation/packageDetails)
        const { pickupLocation, dropoffLocation, vehicleCategory, serviceType, region, city,
                packageDetails, recipientName, recipientPhone, notes, scheduledAt, extraStops, isReturnTrip } = req.body;

        const routeData = await googleMapsService.getDistanceAndDuration(
            { lat: pickupLocation.lat, lng: pickupLocation.lng },
            { lat: dropoffLocation.lat, lng: dropoffLocation.lng }
        );

        let distanceKm = routeData.distanceMeters / 1000;
        let durationMinutes = routeData.durationSeconds / 60;

        if (isReturnTrip) {
            distanceKm *= 1.8;
            durationMinutes *= 2;
        }

        const resolvedRegion = region === 'chicago' || region === 'US-CHI' ? 'US-CHI' : 'NG';

        const mockRide = {
            vehicleCategory: vehicleCategory ?? 'motorbike',
            region: resolvedRegion,
            bookingType: 'delivery',
            city,
            pickupLocation,
            dropoffLocation,
            deliveryDetails: {
                packageType: packageDetails?.category ?? 'parcel',
                requiresReturn: isReturnTrip ?? false,
                extraStops: extraStops?.length ?? 0,
                serviceType: serviceType ?? 'instant'
            },
            addOns: {
                extraStops: extraStops?.length ?? 0,
                extraLuggage: false,
                premiumVehicle: vehicleCategory ? vehicleCategory !== 'motorbike' : false,
                meetAndGreet: true,
            },
            pricing: { surgeMultiplier: 1.0 }
        };

        const estimatedFare = await pricingService.calculateFare(
            mockRide as any,
            distanceKm,
            durationMinutes
        );

        const requestData = {
            pickupLocation,
            dropoffLocation,
            vehicleCategory: vehicleCategory ?? 'motorbike',
            region: resolvedRegion,
            city,
            bookingType: 'delivery',
            deliveryDetails: {
                packageDetails,
                recipientName,
                recipientPhone,
                notes,
                serviceType: serviceType ?? 'instant',
                requiresReturn: isReturnTrip ?? false,
                proofRequired: 'photo'
            },
            ...(extraStops && { extraStops }),
            ...(scheduledAt && { scheduledAt }),
            pricing: {
                estimatedFare: estimatedFare.totalFare,
                currency: resolvedRegion === 'NG' ? 'NGN' : 'USD',
                breakdown: estimatedFare
            }
        };

        const delivery = await rideService.createRideRequest(req.user.uid, requestData as any);
        await rideService.startDriverMatching(delivery.id!);

        await ensureDeliveryNotification(req.user.uid, { rideId: delivery.id });
        socketService.notifyRider(req.user.uid, 'delivery:created', { rideId: delivery.id });

        res.status(201).json({
            message: 'Delivery request created successfully',
            delivery,
            estimatedFare
        });
    } catch (error) {
        logger.error({ err: error }, 'createDelivery failed');
        res.status(400).json({ message: (error as Error).message ?? 'Failed to create delivery' });
    }
};

export const getDeliveryQuote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Body already validated by deliveryQuoteSchema middleware (pickupLocation/dropoffLocation)
        const { pickupLocation, dropoffLocation, vehicleCategory, serviceType, isFragile, extraStops, isReturnTrip, region } = req.body;

        const routeData = await googleMapsService.getDistanceAndDuration(
            { lat: pickupLocation.lat, lng: pickupLocation.lng },
            { lat: dropoffLocation.lat, lng: dropoffLocation.lng }
        );

        let distanceKm = routeData.distanceMeters / 1000;
        let durationMinutes = routeData.durationSeconds / 60;

        if (isReturnTrip) {
            distanceKm *= 1.8;
            durationMinutes *= 2;
        }

        const mockRide = {
            vehicleCategory: vehicleCategory ?? 'motorbike',
            region: region === 'chicago' ? 'US-CHI' : (region === 'US-CHI' ? 'US-CHI' : 'NG'),
            bookingType: 'delivery',
            pickupLocation,
            dropoffLocation,
            deliveryDetails: {
                serviceType: serviceType ?? 'instant',
                requiresReturn: isReturnTrip ?? false,
                extraStops: extraStops ?? 0,
                packageType: isFragile ? 'parcel' : 'parcel'
            },
            addOns: {
                extraStops: extraStops ?? 0,
                fragileCare: isFragile ?? false,
            },
            pricing: { surgeMultiplier: 1.0 }
        };

        const estimatedFare = await pricingService.calculateFare(
            mockRide as any,
            distanceKm,
            durationMinutes
        );

        // Check for B2B pricing discount
        let b2bDiscount = null;
        const b2bAccount = await b2bPricingService.getAccount(req.user.uid);
        if (b2bAccount) {
            const result = b2bPricingService.applyBusinessDiscount(estimatedFare.totalFare, b2bAccount);
            b2bDiscount = {
                originalFare: estimatedFare.totalFare,
                discount: result.discount,
                discountedFare: result.discountedFare,
                discountRate: result.discountRate,
                tier: result.tier,
            };
        }

        res.status(200).json({
            estimatedFare: b2bDiscount ? b2bDiscount.discountedFare : estimatedFare.totalFare,
            currency: mockRide.region === 'NG' ? 'NGN' : 'USD',
            distanceKm: Number(distanceKm.toFixed(2)),
            durationMinutes: Number(durationMinutes.toFixed(1)),
            breakdown: estimatedFare,
            ...(b2bDiscount && { b2bDiscount }),
        });
    } catch (error) {
        logger.error({ err: error }, 'getDeliveryQuote failed');
        res.status(400).json({ message: (error as Error).message ?? 'Failed to get delivery quote' });
    }
};

export const uploadProofOfDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rideId } = req.params;
        const { photoBase64, signatureBase64, notes } = req.body as {
            photoBase64?: string;
            signatureBase64?: string;
            notes?: string;
        };

        if (!photoBase64 && !signatureBase64) {
            res.status(400).json({ message: 'Proof of delivery requires a photo or signature.' });
            return;
        }

        // Validate base64 payload sizes to prevent DoS/OOM (max 10MB per field)
        const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10MB
        if (photoBase64 && Buffer.byteLength(photoBase64, 'utf8') > MAX_BASE64_SIZE) {
            res.status(400).json({ message: 'Photo too large. Maximum size is 10MB.' });
            return;
        }
        if (signatureBase64 && Buffer.byteLength(signatureBase64, 'utf8') > MAX_BASE64_SIZE) {
            res.status(400).json({ message: 'Signature too large. Maximum size is 10MB.' });
            return;
        }

        const rideSnapshot = await db.collection('rides').doc(rideId).get();
        if (!rideSnapshot.exists) {
            res.status(404).json({ message: 'Ride not found' });
            return;
        }
        const ride = rideSnapshot.data();
        if (ride?.bookingType !== 'delivery') {
            res.status(400).json({ message: 'Proof uploads only apply to delivery rides.' });
            return;
        }

        // Auth check: only the assigned driver or the rider can upload proof
        if (req.user.uid !== ride?.driverId && req.user.uid !== ride?.riderId) {
            res.status(403).json({ message: 'Not authorized to upload proof for this delivery' });
            return;
        }

        const proofRequired = ride.deliveryDetails?.proofRequired ?? 'photo';
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

        const proof: Record<string, unknown> = {
            notes: notes ?? null,
            capturedBy: req.user.uid,
            uploadedAt: new Date()
        };

        if (photoBase64) {
            const buffer = Buffer.from(photoBase64, 'base64');
            const file = admin.storage().bucket().file(`proofs/${rideId}/photo_${Date.now()}.jpg`);
            await file.save(buffer, { contentType: 'image/jpeg' });
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 365 * 24 * 60 * 60 * 1000
            });
            proof.photoUrl = url;
        }

        if (signatureBase64) {
            const buffer = Buffer.from(signatureBase64, 'base64');
            const file = admin.storage().bucket().file(`proofs/${rideId}/signature_${Date.now()}.png`);
            await file.save(buffer, { contentType: 'image/png' });
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 365 * 24 * 60 * 60 * 1000
            });
            proof.signatureUrl = url;
        }

        const deliveryCompletionStatuses = ['in_progress', 'delivery_en_route_dropoff', 'delivery_picked_up', 'delivery_delivered'];
        await rideSnapshot.ref.update({
            proofOfDelivery: proof,
            status: deliveryCompletionStatuses.includes(ride?.status) ? 'completed' : ride?.status,
            deliveryTimeline: admin.firestore.FieldValue.arrayUnion({
                at: new Date(),
                event: 'proof_uploaded',
                actor: req.user.uid,
                notes
            }),
            updatedAt: new Date()
        });

        socketService.notifyRider(ride?.riderId, 'delivery:proof_uploaded', { rideId });

        res.status(200).json({ message: 'Proof uploaded', proof });
    } catch (error) {
        logger.error({ err: error }, 'uploadProofOfDelivery failed');
        res.status(500).json({ message: (error as Error).message ?? 'Proof upload failed' });
    }
};

export const getDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const rideSnap = await db.collection('rides').doc(id).get();
        if (!rideSnap.exists) {
            res.status(404).json({ message: 'Delivery not found' });
            return;
        }
        const ride = rideSnap.data();
        if (ride?.bookingType !== 'delivery') {
            res.status(404).json({ message: 'Delivery not found' });
            return;
        }

        // Auth check: only rider, driver, or admin can view delivery details
        const isAdmin = req.user.role === 'admin';
        if (!isAdmin && req.user.uid !== ride?.riderId && req.user.uid !== ride?.driverId) {
            res.status(403).json({ message: 'Not authorized to view this delivery' });
            return;
        }

        res.status(200).json({ id: rideSnap.id, ...ride });
    } catch (error) {
        logger.error({ err: error }, 'getDelivery failed');
        res.status(500).json({ message: 'Failed to fetch delivery' });
    }
};

export const getDeliveryHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.uid;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        let query = db.collection('rides')
            .where('riderId', '==', userId)
            .where('bookingType', '==', 'delivery')
            .orderBy('createdAt', 'desc');

        if (page > 1) {
            const skipCount = (page - 1) * limit;
            const skipSnap = await query.limit(skipCount).get();
            if (!skipSnap.empty) {
                const lastDoc = skipSnap.docs[skipSnap.docs.length - 1];
                query = query.startAfter(lastDoc);
            }
        }

        const snapshot = await query.limit(limit).get();
        const deliveries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({ data: deliveries });
    } catch (error) {
        logger.error({ err: error }, 'getDeliveryHistory failed');
        res.status(500).json({ message: 'Failed to fetch delivery history' });
    }
};
