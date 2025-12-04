import { Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { db, rtdb } from '../config/firebase';
import { AuthRequest } from '../types/express';
import { walletService } from '../services/WalletService';
import { logger } from '../utils/logger';
import { reverseGeocode } from '../utils/geocoding';

// Pricing & surge config
export const getPricingConfig = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { region } = req.params;
        const doc = await db.collection('pricing_rules').doc(region).get();
        if (!doc.exists) {
            res.status(404).json({ message: `Pricing config not found for ${region}` });
            return;
        }
        res.status(200).json({ region, ...doc.data() });
    } catch (error) {
        logger.error({ err: error }, 'Failed to fetch pricing config');
        res.status(500).json({ message: 'Unable to load pricing config' });
    }
};

export const updatePricingConfig = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { region } = req.params;
        const updateData = { ...req.body, updatedAt: new Date(), updatedBy: req.user.uid };
        
        await db
            .collection('pricing_rules')
            .doc(region)
            .set(updateData, { merge: true });

        // Save history
        await db.collection('pricing_history').add({
            type: 'pricing',
            region,
            data: req.body,
            updatedAt: new Date(),
            updatedBy: req.user.uid
        });

        res.status(200).json({ message: 'Pricing config updated' });
    } catch (error) {
        logger.error({ err: error }, 'Failed to update pricing config');
        res.status(500).json({ message: 'Unable to update pricing config' });
    }
};

export const getSurgeConfig = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { region } = req.params;
        const doc = await db.collection('surge_config').doc(region).get();
        if (!doc.exists) {
            res.status(404).json({ message: `Surge config not found for ${region}` });
            return;
        }
        res.status(200).json({ region, ...doc.data() });
    } catch (error) {
        logger.error({ err: error }, 'Failed to fetch surge config');
        res.status(500).json({ message: 'Unable to load surge config' });
    }
};

export const updateSurgeConfig = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { region } = req.params;
        const payload = {
            ...req.body,
            updatedAt: new Date(),
            updatedBy: req.user.uid
        };

        await db.collection('surge_config').doc(region).set(payload, { merge: true });

        // Save history
        await db.collection('pricing_history').add({
            type: 'surge',
            region,
            data: req.body,
            updatedAt: new Date(),
            updatedBy: req.user.uid
        });

        logger.info({ region, admin: req.user.uid }, 'Surge config updated');
        res.status(200).json({ message: 'Surge config updated' });
    } catch (error) {
        logger.error({ err: error }, 'Failed to update surge config');
        res.status(500).json({ message: 'Unable to update surge config' });
    }
};

export const getPricingHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const snapshot = await db.collection('pricing_history')
            .orderBy('updatedAt', 'desc')
            .limit(50)
            .get();

        const history = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            let adminName = 'Unknown';
            
            if (data.updatedBy) {
                try {
                    const userDoc = await db.collection('users').doc(data.updatedBy).get();
                    if (userDoc.exists) {
                        adminName = userDoc.data()?.displayName || 'Unknown';
                    }
                } catch (e) {
                    // Ignore user fetch error
                }
            }

            return {
                id: doc.id,
                ...data,
                adminName
            };
        }));

        res.status(200).json(history);
    } catch (error) {
        logger.error({ err: error }, 'Failed to fetch pricing history');
        res.status(500).json({ message: 'Unable to load pricing history' });
    }
};

// ... existing code for user management, rides, disputes, promotions, bonus programs, analytics, and support tickets
export const listUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { role, status, search } = req.query as { role?: string; status?: string; search?: string };
        let query: FirebaseFirestore.Query = db.collection('users');

        if (role) query = query.where('role', '==', role);
        if (status === 'active') query = query.where('isActive', '==', true);
        if (status === 'suspended') query = query.where('isActive', '==', false);

        const snapshot = await query.limit(200).get();
        const results = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((user: any) => {
                if (!search) return true;
                const needle = search.toLowerCase();
                return (
                    user.displayName?.toLowerCase().includes(needle) ||
                    user.email?.toLowerCase().includes(needle) ||
                    user.phoneNumber?.includes(search)
                );
            });

        res.status(200).json(results);
    } catch (error) {
        logger.error({ err: error }, 'Failed to list users');
        res.status(500).json({ message: 'Unable to load users' });
    }
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;

        await db.collection('users').doc(userId).update({
            isActive,
            updatedAt: new Date()
        });

        logger.info({ userId, isActive, admin: req.user.uid }, 'User status updated');
        res.status(200).json({ message: `User ${isActive ? 'activated' : 'suspended'}` });
    } catch (error) {
        logger.error({ err: error }, 'Failed to update user status');
        res.status(500).json({ message: 'Unable to update user' });
    }
};

export const updateUserDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { documentName, status, rejectionReason } = req.body;

        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const userData = userSnap.data();
        const documents = userData?.documents || [];
        const docIndex = documents.findIndex((d: any) => d.name === documentName);

        if (docIndex === -1) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        documents[docIndex].status = status;
        if (status === 'rejected' && rejectionReason) {
            documents[docIndex].rejectionReason = rejectionReason;
        }

        // Auto-approve driver if all documents are approved
        const allApproved = documents.every((d: any) => d.status === 'approved');
        const updatePayload: any = {
            documents,
            updatedAt: new Date()
        };

        if (allApproved && userData?.role === 'driver') {
            updatePayload['driverOnboarding.status'] = 'approved';
            updatePayload['driverStatus.state'] = 'approved';
            // Optionally auto-enable isActive if it was pending
            if (!userData.isActive) updatePayload.isActive = true;
        }

        await userRef.update(updatePayload);

        logger.info({ userId, documentName, status, admin: req.user.uid }, 'User document updated');
        res.status(200).json({ message: `Document ${status}` });
    } catch (error) {
        logger.error({ err: error }, 'Failed to update user document');
        res.status(500).json({ message: 'Unable to update document' });
    }
};

export const listActiveRides = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const activeStatuses = ['finding_driver', 'accepted', 'arrived', 'in_progress'];

        const snapshot = await db.collection('rides').where('status', 'in', activeStatuses).get();
        const rides = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = doc.data();
                
                // Reverse geocode if address is missing
                if (data.pickupLocation?.lat && data.pickupLocation?.lng && !data.pickupLocation?.address) {
                    const address = await reverseGeocode(data.pickupLocation.lat, data.pickupLocation.lng);
                    data.pickupLocation = { ...data.pickupLocation, address: address || 'Unknown Location' };
                } else if (!data.pickupLocation?.address) {
                    data.pickupLocation = { ...data.pickupLocation, address: 'Unknown Location' };
                }

                if (data.dropoffLocation?.lat && data.dropoffLocation?.lng && !data.dropoffLocation?.address) {
                    const address = await reverseGeocode(data.dropoffLocation.lat, data.dropoffLocation.lng);
                    data.dropoffLocation = { ...data.dropoffLocation, address: address || 'Unknown Location' };
                } else if (!data.dropoffLocation?.address) {
                    data.dropoffLocation = { ...data.dropoffLocation, address: 'Unknown Location' };
                }

                // Fetch rider info
                let riderInfo: any = null;
                if (data.riderId) {
                    try {
                        const riderDoc = await db.collection('users').doc(data.riderId).get();
                        if (riderDoc.exists) {
                            const riderData = riderDoc.data();
                            riderInfo = {
                                name: riderData?.displayName || 'Unknown',
                                phone: riderData?.phoneNumber || 'N/A',
                                email: riderData?.email || 'N/A'
                            };
                        }
                    } catch (e) {
                        console.warn('Failed to fetch rider info', e);
                    }
                }

                // Fetch driver info and vehicle
                let driverInfo: any = null;
                let vehicleInfo: any = null;
                if (data.driverId) {
                    try {
                        const driverDoc = await db.collection('users').doc(data.driverId).get();
                        if (driverDoc.exists) {
                            const driverData = driverDoc.data();
                            driverInfo = {
                                name: driverData?.displayName || 'Unknown',
                                phone: driverData?.phoneNumber || 'N/A',
                                email: driverData?.email || 'N/A'
                            };

                            // Fetch vehicle info if vehicleId exists
                            if (driverData?.driverDetails?.vehicleId) {
                                const vehicleDoc = await db.collection('vehicles').doc(driverData.driverDetails.vehicleId).get();
                                if (vehicleDoc.exists) {
                                    const vehicleData = vehicleDoc.data();
                                    vehicleInfo = {
                                        plateNumber: vehicleData?.plateNumber || 'N/A',
                                        make: vehicleData?.make || 'N/A',
                                        model: vehicleData?.model || 'N/A',
                                        year: vehicleData?.year || 'N/A',
                                        color: vehicleData?.color || 'N/A',
                                        category: vehicleData?.category || 'N/A'
                                    };
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to fetch driver info', e);
                    }
                }

                let driverLocation: any = null;

                if (data.driverId) {
                    try {
                        const locationSnap = await rtdb.ref(`drivers/${data.driverId}/location`).get();
                        driverLocation = locationSnap.val();
                    } catch (e) {
                        console.warn('Failed to fetch driver location from RTDB', e);
                    }
                }

                return { 
                    id: doc.id, 
                    ...data, 
                    driverLocation,
                    riderInfo,
                    driverInfo,
                    vehicleInfo
                };
            })
        );

        res.status(200).json(rides);
    } catch (error) {
        logger.error({ err: error }, 'Failed to list active rides');
        res.status(500).json({ message: 'Unable to load active rides' });
    }
};

export const listAllRides = async (req: AuthRequest, res: Response) => {
    try {
        const { status, region, driverId, riderId, limit = '20', startAfter } = req.query as any;
        let query: FirebaseFirestore.Query = db.collection('rides').orderBy('createdAt', 'desc');

        if (status) query = query.where('status', '==', status);
        if (region) query = query.where('region', '==', region);
        if (driverId) query = query.where('driverId', '==', driverId);
        if (riderId) query = query.where('riderId', '==', riderId);

        if (startAfter) {
            const lastDoc = await db.collection('rides').doc(startAfter).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snapshot = await query.limit(parseInt(limit)).get();
        const rides = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = doc.data();
                
                // Reverse geocode if address is missing
                if (data.pickupLocation?.lat && data.pickupLocation?.lng && !data.pickupLocation?.address) {
                    const address = await reverseGeocode(data.pickupLocation.lat, data.pickupLocation.lng);
                    data.pickupLocation = { ...data.pickupLocation, address: address || 'Unknown Location' };
                } else if (!data.pickupLocation?.address) {
                    data.pickupLocation = { ...data.pickupLocation, address: 'Unknown Location' };
                }

                if (data.dropoffLocation?.lat && data.dropoffLocation?.lng && !data.dropoffLocation?.address) {
                    const address = await reverseGeocode(data.dropoffLocation.lat, data.dropoffLocation.lng);
                    data.dropoffLocation = { ...data.dropoffLocation, address: address || 'Unknown Location' };
                } else if (!data.dropoffLocation?.address) {
                    data.dropoffLocation = { ...data.dropoffLocation, address: 'Unknown Location' };
                }

                // Fetch rider info
                let riderInfo: any = null;
                if (data.riderId) {
                    try {
                        const riderDoc = await db.collection('users').doc(data.riderId).get();
                        if (riderDoc.exists) {
                            const riderData = riderDoc.data();
                            riderInfo = {
                                name: riderData?.displayName || 'Unknown',
                                phone: riderData?.phoneNumber || 'N/A',
                                email: riderData?.email || 'N/A'
                            };
                        }
                    } catch (e) {
                        console.warn('Failed to fetch rider info', e);
                    }
                }

                // Fetch driver info and vehicle
                let driverInfo: any = null;
                let vehicleInfo: any = null;
                if (data.driverId) {
                    try {
                        const driverDoc = await db.collection('users').doc(data.driverId).get();
                        if (driverDoc.exists) {
                            const driverData = driverDoc.data();
                            driverInfo = {
                                name: driverData?.displayName || 'Unknown',
                                phone: driverData?.phoneNumber || 'N/A',
                                email: driverData?.email || 'N/A'
                            };

                            // Fetch vehicle info if vehicleId exists
                            if (driverData?.driverDetails?.vehicleId) {
                                const vehicleDoc = await db.collection('vehicles').doc(driverData.driverDetails.vehicleId).get();
                                if (vehicleDoc.exists) {
                                    const vehicleData = vehicleDoc.data();
                                    vehicleInfo = {
                                        plateNumber: vehicleData?.plateNumber || 'N/A',
                                        make: vehicleData?.make || 'N/A',
                                        model: vehicleData?.model || 'N/A',
                                        year: vehicleData?.year || 'N/A',
                                        color: vehicleData?.color || 'N/A',
                                        category: vehicleData?.category || 'N/A'
                                    };
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to fetch driver info', e);
                    }
                }

                return { 
                    id: doc.id, 
                    ...data,
                    riderInfo,
                    driverInfo,
                    vehicleInfo
                };
            })
        );

        res.status(200).json({ rides, lastId: rides.length > 0 ? rides[rides.length - 1].id : null });
    } catch (error) {
        logger.error({ err: error }, 'Failed to list all rides');
        res.status(500).json({ message: 'Unable to list rides' });
    }
};

export const getRideDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('rides').doc(id).get();
        if (!doc.exists) {
            res.status(404).json({ message: 'Ride not found' });
            return;
        }
        
        const data = doc.data();
        
        // Fetch rider info
        let riderInfo: any = null;
        if (data?.riderId) {
            try {
                const riderDoc = await db.collection('users').doc(data.riderId).get();
                if (riderDoc.exists) {
                    const riderData = riderDoc.data();
                    riderInfo = {
                        name: riderData?.displayName || 'Unknown',
                        phone: riderData?.phoneNumber || 'N/A',
                        email: riderData?.email || 'N/A'
                    };
                }
            } catch (e) {
                console.warn('Failed to fetch rider info', e);
            }
        }

        // Fetch driver info and vehicle
        let driverInfo: any = null;
        let vehicleInfo: any = null;
        if (data?.driverId) {
            try {
                const driverDoc = await db.collection('users').doc(data.driverId).get();
                if (driverDoc.exists) {
                    const driverData = driverDoc.data();
                    driverInfo = {
                        name: driverData?.displayName || 'Unknown',
                        phone: driverData?.phoneNumber || 'N/A',
                        email: driverData?.email || 'N/A'
                    };

                    // Fetch vehicle info if vehicleId exists
                    if (driverData?.driverDetails?.vehicleId) {
                        const vehicleDoc = await db.collection('vehicles').doc(driverData.driverDetails.vehicleId).get();
                        if (vehicleDoc.exists) {
                            const vehicleData = vehicleDoc.data();
                            vehicleInfo = {
                                plateNumber: vehicleData?.plateNumber || 'N/A',
                                make: vehicleData?.make || 'N/A',
                                model: vehicleData?.model || 'N/A',
                                year: vehicleData?.year || 'N/A',
                                color: vehicleData?.color || 'N/A',
                                category: vehicleData?.category || 'N/A'
                            };
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch driver info', e);
            }
        }
        
        res.status(200).json({ 
            id: doc.id, 
            ...data,
            riderInfo,
            driverInfo,
            vehicleInfo
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to get ride details');
        res.status(500).json({ message: 'Unable to get ride details' });
    }
};

export const adminCancelRide = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const rideRef = db.collection('rides').doc(id);
        const rideDoc = await rideRef.get();

        if (!rideDoc.exists) {
            res.status(404).json({ message: 'Ride not found' });
            return;
        }

        const rideData = rideDoc.data();
        if (['completed', 'cancelled'].includes(rideData?.status)) {
            res.status(400).json({ message: 'Ride is already completed or cancelled' });
            return;
        }

        await rideRef.update({
            status: 'cancelled',
            cancellationReason: reason || 'Cancelled by admin',
            cancelledBy: req.user.uid,
            cancelledAt: new Date(),
            updatedAt: new Date()
        });

        // Notify parties (optional but good practice)
        // socketService.notifyRider(rideData.riderId, 'ride:cancelled', { reason });
        // if (rideData.driverId) socketService.notifyDriver(rideData.driverId, 'ride:cancelled', { reason });

        logger.info({ rideId: id, admin: req.user.uid }, 'Ride cancelled by admin');
        res.status(200).json({ message: 'Ride cancelled successfully' });
    } catch (error) {
        logger.error({ err: error }, 'Failed to cancel ride');
        res.status(500).json({ message: 'Unable to cancel ride' });
    }
};

export const createDispute = async (req: AuthRequest, res: Response) => {
    try {
        const payload = {
            rideId: req.body.rideId,
            reporterId: req.body.reporterId ?? req.user.uid,
            reporterRole: req.body.reporterRole,
            reason: req.body.reason,
            details: req.body.details,
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const ref = await db.collection('disputes').add(payload);
        logger.info({ disputeId: ref.id, admin: req.user.uid }, 'Dispute created');
        res.status(201).json({ id: ref.id, ...payload });
    } catch (error) {
        logger.error({ err: error }, 'Failed to create dispute');
        res.status(500).json({ message: 'Unable to create dispute' });
    }
};

export const resolveDispute = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { resolutionNotes, resolutionType, issueRefund, refundUserId, refundAmount } = req.body;

        const disputeRef = db.collection('disputes').doc(id);
        const disputeSnapshot = await disputeRef.get();
        if (!disputeSnapshot.exists) {
            res.status(404).json({ message: 'Dispute not found' });
            return;
        }

        const batch = db.batch();
        batch.update(disputeRef, {
            status: 'resolved',
            resolutionNotes,
            resolutionType,
            resolvedAt: new Date(),
            resolvedBy: req.user.uid,
            updatedAt: new Date()
        });

        if (issueRefund && refundUserId && refundAmount > 0) {
            await walletService.processTransaction(
                refundUserId,
                refundAmount,
                'credit',
                'refund',
                'Dispute refund',
                `DISPUTE-${id}`
            );
        }

        await batch.commit();
        logger.info({ disputeId: id, admin: req.user.uid }, 'Dispute resolved');
        res.status(200).json({ message: 'Dispute resolved' });
    } catch (error) {
        logger.error({ err: error }, 'Failed to resolve dispute');
        res.status(500).json({ message: 'Unable to resolve dispute' });
    }
};

export const createPromotion = async (req: AuthRequest, res: Response) => {
    try {
        const promo = {
            code: req.body.code,
            description: req.body.description,
            discountType: req.body.discountType,
            amount: req.body.amount,
            maxRedemptions: req.body.maxRedemptions,
            regions: req.body.regions ?? [],
            startsAt: req.body.startsAt ? new Date(req.body.startsAt) : new Date(),
            endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
            bonuses: req.body.bonuses ?? [],
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const ref = await db.collection('promotions').add(promo);
        logger.info({ promoId: ref.id, admin: req.user.uid }, 'Promotion created');
        res.status(201).json({ id: ref.id, ...promo });
    } catch (error) {
        logger.error({ err: error }, 'Failed to create promotion');
        res.status(500).json({ message: 'Unable to create promotion' });
    }
};

export const updatePromotion = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await db.collection('promotions').doc(id).update({
            ...req.body,
            updatedAt: new Date()
        });
        logger.info({ promoId: id, admin: req.user.uid }, 'Promotion updated');
        res.status(200).json({ message: 'Promotion updated' });
    } catch (error) {
        logger.error({ err: error }, 'Failed to update promotion');
        res.status(500).json({ message: 'Unable to update promotion' });
    }
};

export const listPromotions = async (_req: AuthRequest, res: Response) => {
    try {
        const snapshot = await db.collection('promotions').orderBy('createdAt', 'desc').get();
        res.status(200).json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
        logger.error({ err: error }, 'Failed to list promotions');
        res.status(500).json({ message: 'Unable to load promotions' });
    }
};

export const createBonusProgram = async (req: AuthRequest, res: Response) => {
    try {
        const program = {
            name: req.body.name,
            description: req.body.description,
            criteria: req.body.criteria,
            reward: req.body.reward,
            regions: req.body.regions ?? [],
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const ref = await db.collection('bonus_programs').add(program);
        logger.info({ bonusId: ref.id, admin: req.user.uid }, 'Bonus program created');
        res.status(201).json({ id: ref.id, ...program });
    } catch (error) {
        logger.error({ err: error }, 'Failed to create bonus program');
        res.status(500).json({ message: 'Unable to create bonus program' });
    }
};

export const updateBonusProgram = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await db.collection('bonus_programs').doc(id).update({
            ...req.body,
            updatedAt: new Date()
        });
        logger.info({ bonusId: id, admin: req.user.uid }, 'Bonus program updated');
        res.status(200).json({ message: 'Bonus program updated' });
    } catch (error) {
        logger.error({ err: error }, 'Failed to update bonus program');
        res.status(500).json({ message: 'Unable to update bonus program' });
    }
};

export const listBonusPrograms = async (_req: AuthRequest, res: Response) => {
    try {
        const snapshot = await db.collection('bonus_programs').orderBy('createdAt', 'desc').get();
        res.status(200).json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
        logger.error({ err: error }, 'Failed to list bonus programs');
        res.status(500).json({ message: 'Unable to load bonus programs' });
    }
};

export const getEarningsAnalytics = async (_req: AuthRequest, res: Response) => {
    try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [ridesSnap, payoutsSnap] = await Promise.all([
            db.collection('rides').where('createdAt', '>=', since).get(),
            db.collection('payout_requests').where('createdAt', '>=', since).get()
        ]);

        const rideRevenue = ridesSnap.docs.reduce((sum, doc) => {
            const pricing = doc.data().pricing;
            return sum + (pricing?.finalFare ?? 0);
        }, 0);

        const driverPayouts = payoutsSnap.docs
            .filter((doc) => doc.data().status === 'completed')
            .reduce((sum, doc) => sum + doc.data().amount, 0);

        const platformCommission = ridesSnap.docs.reduce((sum, doc) => {
            const pricing = doc.data().pricing;
            const commissionRate = pricing?.platformCommission ?? 0.25;
            const fare = pricing?.finalFare ?? 0;
            return sum + fare * commissionRate;
        }, 0);

        res.status(200).json({
            since,
            rideRevenue,
            driverPayouts,
            platformCommission,
            net: rideRevenue - driverPayouts
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to compute earnings analytics');
        res.status(500).json({ message: 'Unable to load analytics' });
    }
};

export const createSupportTicket = async (req: AuthRequest, res: Response) => {
    try {
        const ticket = {
            subject: req.body.subject,
            description: req.body.description,
            userId: req.body.userId,
            role: req.body.role,
            priority: req.body.priority ?? 'normal',
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: req.user.uid
        };

        const ref = await db.collection('support_tickets').add(ticket);
        logger.info({ ticketId: ref.id, admin: req.user.uid }, 'Support ticket created');
        res.status(201).json({ id: ref.id, ...ticket });
    } catch (error) {
        logger.error({ err: error }, 'Failed to create support ticket');
        res.status(500).json({ message: 'Unable to create ticket' });
    }
};

export const listSupportTickets = async (req: AuthRequest, res: Response) => {
    try {
        const { status, priority } = req.query as { status?: string; priority?: string };
        let query: FirebaseFirestore.Query = db.collection('support_tickets');

        if (status) query = query.where('status', '==', status);
        if (priority) query = query.where('priority', '==', priority);

        const snapshot = await query.orderBy('createdAt', 'desc').limit(200).get();
        res.status(200).json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
        logger.error({ err: error }, 'Failed to list support tickets');
        res.status(500).json({ message: 'Unable to load support tickets' });
    }
};

export const updateSupportTicket = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, assignee, resolutionNotes } = req.body;

        await db.collection('support_tickets').doc(id).update({
            status,
            assignee,
            resolutionNotes,
            updatedAt: new Date(),
            resolvedAt: status === 'resolved' ? new Date() : FieldValue.delete()
        });

        logger.info({ ticketId: id, admin: req.user.uid }, 'Support ticket updated');
        res.status(200).json({ message: 'Support ticket updated' });
    } catch (error) {
        logger.error({ err: error }, 'Failed to update support ticket');
        res.status(500).json({ message: 'Unable to update ticket' });
    }
};

export const updateVehicleStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { vehicleId } = req.params;
        const { isApproved, rejectionReason } = req.body;

        const vehicleRef = db.collection('vehicles').doc(vehicleId);
        const vehicleSnap = await vehicleRef.get();

        if (!vehicleSnap.exists) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }

        await vehicleRef.update({
            isApproved,
            rejectionReason: !isApproved ? rejectionReason : FieldValue.delete(),
            updatedAt: new Date(),
            approvedBy: isApproved ? req.user.uid : FieldValue.delete(),
            approvedAt: isApproved ? new Date() : FieldValue.delete()
        });

        logger.info({ vehicleId, isApproved, admin: req.user.uid }, 'Vehicle status updated');
        res.status(200).json({ message: `Vehicle ${isApproved ? 'approved' : 'rejected'}` });
    } catch (error) {
        logger.error({ err: error }, 'Failed to update vehicle status');
        res.status(500).json({ message: 'Unable to update vehicle' });
    }
};

export const listDisputes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status, rideId } = req.query as { status?: string; rideId?: string };
        let query: FirebaseFirestore.Query = db.collection('disputes').orderBy('createdAt', 'desc');

        if (status) {
            query = query.where('status', '==', status);
        }
        if (rideId) {
            query = query.where('rideId', '==', rideId);
        }

        const snapshot = await query.limit(100).get();
        const disputes = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = doc.data();
                
                // Fetch ride details
                let rideInfo: any = null;
                if (data.rideId) {
                    try {
                        const rideDoc = await db.collection('rides').doc(data.rideId).get();
                        if (rideDoc.exists) {
                            const rideData = rideDoc.data();
                            rideInfo = {
                                id: rideDoc.id,
                                status: rideData?.status,
                                pickupLocation: rideData?.pickupLocation,
                                dropoffLocation: rideData?.dropoffLocation,
                                pricing: rideData?.pricing,
                                createdAt: rideData?.createdAt
                            };

                            // Fetch rider info
                            let riderInfo: any = null;
                            if (rideData?.riderId) {
                                try {
                                    const riderDoc = await db.collection('users').doc(rideData.riderId).get();
                                    if (riderDoc.exists) {
                                        const riderData = riderDoc.data();
                                        riderInfo = {
                                            id: rideData.riderId,
                                            name: riderData?.displayName || 'Unknown',
                                            phone: riderData?.phoneNumber || 'N/A',
                                            email: riderData?.email || 'N/A'
                                        };
                                    }
                                } catch (e) {
                                    console.warn('Failed to fetch rider info', e);
                                }
                            }

                            // Fetch driver info and vehicle
                            let driverInfo: any = null;
                            let vehicleInfo: any = null;
                            if (rideData?.driverId) {
                                try {
                                    const driverDoc = await db.collection('users').doc(rideData.driverId).get();
                                    if (driverDoc.exists) {
                                        const driverData = driverDoc.data();
                                        driverInfo = {
                                            id: rideData.driverId,
                                            name: driverData?.displayName || 'Unknown',
                                            phone: driverData?.phoneNumber || 'N/A',
                                            email: driverData?.email || 'N/A'
                                        };

                                        // Fetch vehicle info if vehicleId exists
                                        if (driverData?.driverDetails?.vehicleId) {
                                            const vehicleDoc = await db.collection('vehicles').doc(driverData.driverDetails.vehicleId).get();
                                            if (vehicleDoc.exists) {
                                                const vehicleData = vehicleDoc.data();
                                                vehicleInfo = {
                                                    plateNumber: vehicleData?.plateNumber || 'N/A',
                                                    make: vehicleData?.make || 'N/A',
                                                    model: vehicleData?.model || 'N/A',
                                                    year: vehicleData?.year || 'N/A',
                                                    color: vehicleData?.color || 'N/A',
                                                    category: vehicleData?.category || 'N/A'
                                                };
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.warn('Failed to fetch driver info', e);
                                }
                            }

                            rideInfo.riderInfo = riderInfo;
                            rideInfo.driverInfo = driverInfo;
                            rideInfo.vehicleInfo = vehicleInfo;
                        }
                    } catch (e) {
                        console.warn('Failed to fetch ride info', e);
                    }
                }

                // Fetch reporter info
                let reporterInfo: any = null;
                if (data.reporterId) {
                    try {
                        const reporterDoc = await db.collection('users').doc(data.reporterId).get();
                        if (reporterDoc.exists) {
                            const reporterData = reporterDoc.data();
                            reporterInfo = {
                                id: data.reporterId,
                                name: reporterData?.displayName || 'Unknown',
                                phone: reporterData?.phoneNumber || 'N/A',
                                email: reporterData?.email || 'N/A',
                                role: reporterData?.role || 'N/A'
                            };
                        }
                    } catch (e) {
                        console.warn('Failed to fetch reporter info', e);
                    }
                }

                return {
                    id: doc.id,
                    ...data,
                    rideInfo,
                    reporterInfo
                };
            })
        );

        res.status(200).json(disputes);
    } catch (error) {
        logger.error({ err: error }, 'Failed to list disputes');
        res.status(500).json({ message: 'Unable to load disputes' });
    }
};
