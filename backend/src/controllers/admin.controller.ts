import { Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { db, rtdb } from '../config/firebase';
import { AuthRequest } from '../types/express';
import { walletService } from '../services/WalletService';
import { socketService } from '../services/SocketService';
import { logger } from '../utils/logger';
import { reverseGeocode } from '../utils/geocoding';
import { getLatestDriverDocumentSignedUrl, getSignedUrl } from '../utils/firebaseStorage';

// ── Shared helpers to avoid code duplication across ride/dispute endpoints ──

interface BasicUserInfo {
    id?: string;
    name: string;
    phone: string;
    email: string;
    role?: string;
}

interface VehicleInfo {
    plateNumber: string;
    make: string;
    model: string;
    year: string;
    color: string;
    category: string;
}

async function fetchUserInfo(userId: string, includeId = false): Promise<BasicUserInfo | null> {
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (!doc.exists) return null;
        const data = doc.data();
        const info: BasicUserInfo = {
            name: data?.displayName || 'Unknown',
            phone: data?.phoneNumber || 'N/A',
            email: data?.email || 'N/A',
        };
        if (includeId) info.id = userId;
        return info;
    } catch (e) {
        logger.warn({ err: e, userId }, 'Failed to fetch user info');
        return null;
    }
}

async function fetchVehicleInfo(vehicleId: string): Promise<VehicleInfo | null> {
    try {
        const doc = await db.collection('vehicles').doc(vehicleId).get();
        if (!doc.exists) return null;
        const data = doc.data();
        return {
            plateNumber: data?.plateNumber || 'N/A',
            make: data?.make || 'N/A',
            model: data?.model || 'N/A',
            year: data?.year || 'N/A',
            color: data?.color || 'N/A',
            category: data?.category || 'N/A',
        };
    } catch (e) {
        logger.warn({ err: e, vehicleId }, 'Failed to fetch vehicle info');
        return null;
    }
}

async function fetchDriverAndVehicle(driverId: string, includeId = false): Promise<{ driverInfo: BasicUserInfo | null; vehicleInfo: VehicleInfo | null }> {
    try {
        const doc = await db.collection('users').doc(driverId).get();
        if (!doc.exists) return { driverInfo: null, vehicleInfo: null };
        const data = doc.data();
        const driverInfo: BasicUserInfo = {
            name: data?.displayName || 'Unknown',
            phone: data?.phoneNumber || 'N/A',
            email: data?.email || 'N/A',
        };
        if (includeId) driverInfo.id = driverId;

        let vehicleInfo: VehicleInfo | null = null;
        if (data?.driverDetails?.vehicleId) {
            vehicleInfo = await fetchVehicleInfo(data.driverDetails.vehicleId);
        }
        return { driverInfo, vehicleInfo };
    } catch (e) {
        logger.warn({ err: e, driverId }, 'Failed to fetch driver info');
        return { driverInfo: null, vehicleInfo: null };
    }
}

async function enrichLocationAddress(location: any): Promise<any> {
    if (!location) return location;
    if (location.lat && location.lng && !location.address) {
        const address = await reverseGeocode(location.lat, location.lng);
        return { ...location, address: address || 'Unknown Location' };
    }
    if (!location.address) {
        return { ...location, address: 'Unknown Location' };
    }
    return location;
}

const toDateSafe = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') {
        try {
            return value.toDate();
        } catch {
            return null;
        }
    }
    if (typeof value === 'object' && typeof value._seconds === 'number') {
        return new Date(value._seconds * 1000);
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Pricing & surge config
export const getPricingConfig = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const regionParam = String(req.params.region || '').toLowerCase().trim();
        const region =
            regionParam === 'ng' || regionParam === 'nigeria'
                ? 'nigeria'
                : regionParam === 'us-chi' || regionParam === 'chicago'
                    ? 'chicago'
                    : regionParam;
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
        const regionParam = String(req.params.region || '').toLowerCase().trim();
        const region =
            regionParam === 'ng' || regionParam === 'nigeria'
                ? 'nigeria'
                : regionParam === 'us-chi' || regionParam === 'chicago'
                    ? 'chicago'
                    : regionParam;

        if (!region || !['nigeria', 'chicago', 'nigeria_delivery'].includes(region)) {
            res.status(400).json({ message: 'Invalid region' });
            return;
        }

        const updateData: Record<string, any> = {
            ...req.body,
            updatedAt: new Date(),
            updatedBy: req.user.uid
        };

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
        const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

        const driverIds = users.filter((user) => user.role === 'driver').map((user) => user.id);
        const applicationMap = new Map<string, any>();

        if (driverIds.length > 0) {
            const appSnapshots = await Promise.all(driverIds.map((id) => db.collection('driver_applications').doc(id).get()));
            appSnapshots.forEach((appSnap, index) => {
                if (appSnap.exists) {
                    applicationMap.set(driverIds[index], appSnap.data() ?? {});
                }
            });
        }

        const enrichedUsers = await Promise.all(users.map(async (user: any) => {
                if (user.role !== 'driver') return user;

                const application = applicationMap.get(user.id);
                const documentMap = (application?.documents ?? {}) as Record<string, any>;

                const documents = await Promise.all(
                    Object.entries(documentMap).map(async ([type, value]) => {
                        let url = value?.fileUrl ?? '';
                        let resolvedStoragePath = value?.storagePath ?? '';
                        if (value?.storagePath) {
                            try {
                                url = await getSignedUrl(value.storagePath, 24 * 60 * 60 * 1000);
                            } catch {
                                try {
                                    const recovered = await getLatestDriverDocumentSignedUrl(
                                        user.id,
                                        type,
                                        24 * 60 * 60 * 1000
                                    );
                                    url = recovered.signedUrl;
                                    resolvedStoragePath = recovered.storagePath;
                                } catch {
                                    // Keep existing URL if recovery fails.
                                }
                            }
                        }

                        return {
                            name: type,
                            url,
                            storagePath: resolvedStoragePath,
                            fileName: value?.fileName ?? '',
                            mimeType: value?.mimeType ?? '',
                            status: value?.status ?? 'pending',
                            rejectionReason: value?.rejectionReason,
                            uploadedAt: value?.uploadedAt ?? null
                        };
                    })
                );

                return {
                    ...user,
                    documents,
                    driverOnboarding: {
                        ...(user.driverOnboarding ?? {}),
                        status: application?.status ?? user.driverOnboarding?.status
                    }
                };
            }));

        const results = enrichedUsers
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
        const applicationRef = db.collection('driver_applications').doc(userId);
        const userSnap = await userRef.get();
        const applicationSnap = await applicationRef.get();

        if (!userSnap.exists) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (!applicationSnap.exists) {
            res.status(404).json({ message: 'Driver application not found' });
            return;
        }

        const userData = userSnap.data();
        const applicationData = applicationSnap.data() ?? {};
        const documentMap = (applicationData.documents ?? {}) as Record<string, any>;
        const target = documentMap[documentName];

        if (!target) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        const nextDocument = {
            ...target,
            status,
            reviewedAt: new Date(),
            reviewedBy: req.user.uid
        } as Record<string, any>;

        if (status === 'rejected') {
            nextDocument.rejectionReason = rejectionReason ?? null;
        } else {
            delete nextDocument.rejectionReason;
        }

        documentMap[documentName] = nextDocument;

        const documentEntries = Object.entries(documentMap) as Array<[string, any]>;
        const allApproved = documentEntries.length > 0 && documentEntries.every(([, doc]) => doc?.status === 'approved');
        const hasRejected = documentEntries.some(([, doc]) => doc?.status === 'rejected');

        let nextApplicationStatus = applicationData.status;
        if (allApproved) {
            nextApplicationStatus = 'approved';
        } else if (hasRejected) {
            nextApplicationStatus = 'needs_resubmission';
        } else {
            nextApplicationStatus = 'pending_review';
        }

        await applicationRef.set(
            {
                documents: documentMap,
                status: nextApplicationStatus,
                updatedAt: new Date(),
                reviewedBy: req.user.uid,
                auditTrail: FieldValue.arrayUnion({
                    at: new Date(),
                    action: 'document_reviewed',
                    actor: req.user.uid,
                    document: documentName,
                    status,
                    rejectionReason: status === 'rejected' ? rejectionReason ?? null : null
                })
            },
            { merge: true }
        );

        const uiDocuments = documentEntries.map(([name, doc]) => ({
            name,
            url: doc?.fileUrl ?? '',
            status: doc?.status ?? 'pending',
            rejectionReason: doc?.rejectionReason,
            uploadedAt: doc?.uploadedAt ?? null
        }));

        const updatePayload: any = {
            documents: uiDocuments,
            'driverOnboarding.status': nextApplicationStatus,
            updatedAt: new Date()
        };

        if (userData?.role === 'driver' && allApproved) {
            updatePayload['driverStatus.state'] = 'approved';
            updatePayload['driverStatus.isOnline'] = false;
            // Optionally auto-enable isActive if it was pending
            if (!userData.isActive) updatePayload.isActive = true;
        } else if (userData?.role === 'driver' && hasRejected) {
            updatePayload['driverStatus.state'] = 'needs_resubmission';
            updatePayload['driverStatus.isOnline'] = false;
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

                // Enrich location addresses
                data.pickupLocation = await enrichLocationAddress(data.pickupLocation);
                data.dropoffLocation = await enrichLocationAddress(data.dropoffLocation);

                // Fetch rider/driver/vehicle info
                const riderInfo = data.riderId ? await fetchUserInfo(data.riderId) : null;
                const { driverInfo, vehicleInfo } = data.driverId
                    ? await fetchDriverAndVehicle(data.driverId)
                    : { driverInfo: null, vehicleInfo: null };

                let driverLocation: any = null;
                if (data.driverId) {
                    try {
                        const locationSnap = await rtdb.ref(`drivers/${data.driverId}/location`).get();
                        driverLocation = locationSnap.val();
                    } catch (e) {
                        logger.warn({ err: e, driverId: data.driverId }, 'Failed to fetch driver location from RTDB');
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
        const parsedLimit = Number.parseInt(limit, 10) || 20;

        let baseQuery: FirebaseFirestore.Query = db.collection('rides');
        if (status) baseQuery = baseQuery.where('status', '==', status);
        if (region) baseQuery = baseQuery.where('region', '==', region);
        if (driverId) baseQuery = baseQuery.where('driverId', '==', driverId);
        if (riderId) baseQuery = baseQuery.where('riderId', '==', riderId);

        let snapshot: FirebaseFirestore.QuerySnapshot;
        let total = 0;

        try {
            const countSnap = await baseQuery.count().get();
            total = countSnap.data().count;

            let orderedQuery = baseQuery.orderBy('createdAt', 'desc');
            if (startAfter) {
                const lastDoc = await db.collection('rides').doc(startAfter).get();
                if (lastDoc.exists) orderedQuery = orderedQuery.startAfter(lastDoc);
            }

            snapshot = await orderedQuery.limit(parsedLimit).get();
        } catch (queryError) {
            logger.warn({ err: queryError }, 'listAllRides indexed query failed, using fallback');

            const fallback = await baseQuery.limit(Math.max(parsedLimit * 10, 200)).get();
            const docs = [...fallback.docs].sort((a, b) => {
                const aDate = toDateSafe(a.data().createdAt)?.getTime() ?? 0;
                const bDate = toDateSafe(b.data().createdAt)?.getTime() ?? 0;
                return bDate - aDate;
            });

            total = docs.length;
            const pagedDocs = docs.slice(0, parsedLimit);
            snapshot = { ...fallback, docs: pagedDocs, size: pagedDocs.length, empty: pagedDocs.length === 0 } as FirebaseFirestore.QuerySnapshot;
        }

        const rides = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = doc.data();

                // Enrich location addresses
                data.pickupLocation = await enrichLocationAddress(data.pickupLocation);
                data.dropoffLocation = await enrichLocationAddress(data.dropoffLocation);

                // Fetch rider/driver/vehicle info
                const riderInfo = data.riderId ? await fetchUserInfo(data.riderId) : null;
                const { driverInfo, vehicleInfo } = data.driverId
                    ? await fetchDriverAndVehicle(data.driverId)
                    : { driverInfo: null, vehicleInfo: null };

                return {
                    id: doc.id,
                    ...data,
                    riderInfo,
                    driverInfo,
                    vehicleInfo
                };
            })
        );

        res.status(200).json({ rides, total, lastId: rides.length > 0 ? rides[rides.length - 1].id : null });
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

        // Fetch rider/driver/vehicle info
        const riderInfo = data?.riderId ? await fetchUserInfo(data.riderId) : null;
        const { driverInfo, vehicleInfo } = data?.driverId
            ? await fetchDriverAndVehicle(data.driverId)
            : { driverInfo: null, vehicleInfo: null };

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
        if (!rideData || ['completed', 'cancelled'].includes(rideData.status)) {
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

        // Notify parties
        socketService.notifyRider(rideData.riderId, 'ride:cancelled', { rideId: id, reason: reason || 'Cancelled by admin' });
        if (rideData.driverId) socketService.notifyDriver(rideData.driverId, 'ride:cancelled', { rideId: id, reason: reason || 'Cancelled by admin' });

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
            reporterRole: req.user.role || 'rider', // Derive from auth, not body
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

        // Process refund and resolve dispute together for consistency
        if (issueRefund && refundUserId && refundAmount > 0) {
            // Update dispute first
            await batch.commit();
            try {
                await walletService.processTransaction(
                    refundUserId,
                    refundAmount,
                    'credit',
                    'refund',
                    'Dispute refund',
                    `DISPUTE-${id}`
                );
            } catch (refundError) {
                // Dispute is resolved but refund failed — mark it for manual attention
                await disputeRef.update({
                    refundStatus: 'failed',
                    refundError: (refundError as Error).message,
                    needsAttention: true
                });
                logger.error({ err: refundError, disputeId: id }, 'Dispute resolved but refund failed — requires manual action');
                res.status(200).json({ message: 'Dispute resolved but refund failed. Marked for manual processing.' });
                return;
            }
        } else {
            await batch.commit();
        }

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
            regions: (req.body.regions ?? []).map((r: string) => {
                const normalized = r.toLowerCase().trim();
                if (normalized.includes('nigeria') || normalized === 'ng') return 'NG';
                if (normalized.includes('chicago') || normalized.includes('us') || normalized === 'us-chi') return 'US-CHI';
                return normalized;
            }),
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
        const allowedFields = ['code', 'description', 'discountType', 'amount', 'maxRedemptions', 'regions', 'startsAt', 'endsAt', 'bonuses', 'active'];
        const updates: Record<string, any> = {};
        for (const key of allowedFields) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        if (Object.keys(updates).length === 0) {
            res.status(400).json({ message: 'No valid fields to update' });
            return;
        }
        const docRef = db.collection('promotions').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            res.status(404).json({ message: 'Promotion not found' });
            return;
        }
        updates.updatedAt = new Date();
        await docRef.update(updates);
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
        // Whitelist allowed bonus fields
        const allowedFields = ['name', 'description', 'type', 'target', 'reward', 'region',
            'isActive', 'startsAt', 'endsAt', 'requirements'];
        const updateData: Record<string, any> = { updatedAt: new Date() };
        for (const key of Object.keys(req.body)) {
            if (allowedFields.includes(key)) {
                updateData[key] = req.body[key];
            }
        }
        await db.collection('bonus_programs').doc(id).update(updateData);
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

/**
 * Admin: List all payout requests (all drivers) with pagination
 */
export const listAllPayouts = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string | undefined;
        const offset = (page - 1) * limit;

        let baseQuery: FirebaseFirestore.Query = db.collection('payout_requests');
        if (status) baseQuery = baseQuery.where('status', '==', status);

        const countSnap = await baseQuery.count().get();
        const total = countSnap.data().count;

        const snapshot = await baseQuery
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit)
            .get();

        const payouts = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = doc.data();
                let driverInfo: BasicUserInfo | null = null;
                if (data.userId) {
                    driverInfo = await fetchUserInfo(data.userId, true);
                }
                return { id: doc.id, ...data, driverInfo };
            })
        );

        res.status(200).json({
            success: true,
            data: payouts,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to list all payouts');
        res.status(500).json({ message: 'Unable to load payouts' });
    }
};

export const getEarningsAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const period = (req.query.period as string) || 'month';
        const now = Date.now();
        let since: Date;
        switch (period) {
            case 'today':
                since = new Date(now - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                since = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
                since = new Date(0); // epoch — all time
                break;
            case 'month':
            default:
                since = new Date(now - 30 * 24 * 60 * 60 * 1000);
                break;
        }

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

/**
 * Admin: Get lightweight aggregate counts for the analytics dashboard.
 * Returns ride counts (total, completed, cancelled, active) and user counts
 * (riders, drivers, activeDrivers) using Firestore aggregation queries
 * instead of fetching full documents.
 */
export const getAnalyticsCounts = async (_req: AuthRequest, res: Response) => {
    try {
        const activeStatuses = ['finding_driver', 'accepted', 'arrived', 'in_progress'];

        const [
            totalRidesSnap,
            completedRidesSnap,
            cancelledRidesSnap,
            activeRidesSnap,
            ridersSnap,
            driversSnap,
            activeDriversSnap,
        ] = await Promise.all([
            db.collection('rides').count().get(),
            db.collection('rides').where('status', '==', 'completed').count().get(),
            db.collection('rides').where('status', '==', 'cancelled').count().get(),
            db.collection('rides').where('status', 'in', activeStatuses).count().get(),
            db.collection('users').where('role', '==', 'rider').count().get(),
            db.collection('users').where('role', '==', 'driver').count().get(),
            db.collection('users').where('role', '==', 'driver').where('isActive', '==', true).count().get(),
        ]);

        res.status(200).json({
            rides: {
                total: totalRidesSnap.data().count,
                completed: completedRidesSnap.data().count,
                cancelled: cancelledRidesSnap.data().count,
                active: activeRidesSnap.data().count,
            },
            users: {
                riders: ridersSnap.data().count,
                drivers: driversSnap.data().count,
                activeDrivers: activeDriversSnap.data().count,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to compute analytics counts');
        res.status(500).json({ message: 'Unable to load analytics counts' });
    }
};

/**
 * Admin: Get earnings time-series data (daily breakdown for last N days)
 */
export const getEarningsTimeSeries = async (req: AuthRequest, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const ridesPromise = db.collection('rides').where('createdAt', '>=', since).get();
        const payoutsPromise = db.collection('payout_requests')
            .where('createdAt', '>=', since)
            .where('status', '==', 'completed')
            .get()
            .catch(async (err) => {
                logger.warn({ err }, 'getEarningsTimeSeries payout indexed query failed, using fallback');
                const fallback = await db.collection('payout_requests').where('createdAt', '>=', since).get();
                const docs = fallback.docs.filter((d) => d.data().status === 'completed');
                return { ...fallback, docs, size: docs.length, empty: docs.length === 0 } as FirebaseFirestore.QuerySnapshot;
            });

        const [ridesSnap, payoutsSnap] = await Promise.all([ridesPromise, payoutsPromise]);

        // Build a map of daily buckets
        const dailyMap: Record<string, { revenue: number; rides: number; payouts: number }> = {};
        for (let i = 0; i < days; i++) {
            const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
            const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
            dailyMap[key] = { revenue: 0, rides: 0, payouts: 0 };
        }

        ridesSnap.docs.forEach((doc) => {
            const data = doc.data();
            const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const key = ts.toISOString().split('T')[0];
            if (dailyMap[key]) {
                dailyMap[key].rides += 1;
                dailyMap[key].revenue += data.pricing?.finalFare ?? 0;
            }
        });

        payoutsSnap.docs.forEach((doc) => {
            const data = doc.data();
            const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const key = ts.toISOString().split('T')[0];
            if (dailyMap[key]) {
                dailyMap[key].payouts += data.amount ?? 0;
            }
        });

        const timeSeries = Object.entries(dailyMap).map(([date, values]) => ({
            date,
            ...values
        }));

        res.status(200).json({ success: true, days, data: timeSeries });
    } catch (error) {
        logger.error({ err: error }, 'Failed to compute earnings time series');
        res.status(500).json({ message: 'Unable to load time series data' });
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

        let snapshot: FirebaseFirestore.QuerySnapshot;
        try {
            snapshot = await query.orderBy('createdAt', 'desc').limit(200).get();
        } catch (queryError) {
            logger.warn({ err: queryError }, 'listSupportTickets indexed query failed, using fallback');
            const fallback = await query.limit(200).get();
            const docs = [...fallback.docs].sort((a, b) => {
                const aDate = toDateSafe(a.data().createdAt)?.getTime() ?? 0;
                const bDate = toDateSafe(b.data().createdAt)?.getTime() ?? 0;
                return bDate - aDate;
            });
            snapshot = { ...fallback, docs, size: docs.length, empty: docs.length === 0 } as FirebaseFirestore.QuerySnapshot;
        }

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

        // Validate isApproved is provided
        if (isApproved === undefined || isApproved === null) {
            res.status(400).json({ message: 'isApproved is required (true or false)' });
            return;
        }

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

                // Fetch ride details with rider/driver/vehicle info
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
                                createdAt: rideData?.createdAt,
                                riderInfo: rideData?.riderId ? await fetchUserInfo(rideData.riderId, true) : null,
                                ...(rideData?.driverId ? await fetchDriverAndVehicle(rideData.driverId, true) : { driverInfo: null, vehicleInfo: null }),
                            };
                        }
                    } catch (e) {
                        logger.warn({ err: e, rideId: data.rideId }, 'Failed to fetch ride info');
                    }
                }

                // Fetch reporter info
                let reporterInfo: any = null;
                if (data.reporterId) {
                    const info = await fetchUserInfo(data.reporterId, true);
                    if (info) {
                        reporterInfo = { ...info, role: 'N/A' };
                        // Fetch role separately since fetchUserInfo doesn't include it
                        try {
                            const reporterDoc = await db.collection('users').doc(data.reporterId).get();
                            if (reporterDoc.exists) reporterInfo.role = reporterDoc.data()?.role || 'N/A';
                        } catch (_) { /* already have basic info */ }
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

/**
 * Admin: Award loyalty points to a specific user
 */
export const awardLoyaltyPoints = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, amount, type } = req.body;
        if (!userId || !amount || amount <= 0) {
            res.status(400).json({ message: 'userId and a positive amount are required' });
            return;
        }

        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Use atomic increment to avoid read-then-write race condition
        await userRef.update({
            loyaltyPoints: FieldValue.increment(amount),
            loyaltyTotalEarned: FieldValue.increment(amount),
            updatedAt: new Date()
        });

        // Re-read to calculate tier correctly
        const updatedSnap = await userRef.get();
        const newTotalEarned = updatedSnap.data()?.loyaltyTotalEarned || 0;
        const newPoints = updatedSnap.data()?.loyaltyPoints || 0;

        // Calculate tier based on total earned
        let tier = 'bronze';
        if (newTotalEarned >= 10000) tier = 'platinum';
        else if (newTotalEarned >= 5000) tier = 'gold';
        else if (newTotalEarned >= 1000) tier = 'silver';

        await userRef.update({ loyaltyTier: tier });

        logger.info({ userId, amount, type: type || 'loyalty_bonus', admin: req.user.uid }, 'Loyalty points awarded');
        res.status(200).json({ message: `Awarded ${amount} points`, points: newPoints, tier });
    } catch (error) {
        logger.error({ err: error }, 'Failed to award loyalty points');
        res.status(500).json({ message: 'Unable to award points' });
    }
};
