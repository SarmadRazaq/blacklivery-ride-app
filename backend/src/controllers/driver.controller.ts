import { Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { AuthRequest } from '../types/express';
import { db, rtdb } from '../config/firebase';
import { logger } from '../utils/logger';
import { rideTrackingService } from '../services/RideTrackingService';
import { encodeGeohash } from '../utils/geohash';

type DriverDocumentType =
    | 'driver_license'
    | 'vehicle_registration'
    | 'vehicle_insurance'
    | 'vehicle_photo_front'
    | 'vehicle_photo_back'
    | 'vehicle_photo_interior'
    | 'identity_document'
    | 'proof_of_address'
    | 'other';

interface DriverDocumentInput {
    type: DriverDocumentType;
    fileUrl: string;
    storagePath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    uploadedAt?: Date;
}

const REQUIRED_DOCUMENTS: DriverDocumentType[] = [
    'driver_license',
    'vehicle_registration',
    'vehicle_insurance',
    'vehicle_photo_front',
    'vehicle_photo_back'
];

const notifyUser = async (
    userId: string,
    payload: { title: string; body: string; type: string; metadata?: Record<string, unknown> }
) => {
    await db.collection('notifications').add({
        userId,
        ...payload,
        read: false,
        createdAt: new Date()
    });
};

const ensureDriverWallet = async (
    tx: FirebaseFirestore.Transaction,
    userId: string,
    currency: string
): Promise<void> => {
    const walletRef = db.collection('wallets').doc(userId);
    const existing = await tx.get(walletRef);
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
};

export const uploadDriverDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;
        const { documents } = req.body as { documents: DriverDocumentInput[] };

        const applicationRef = db.collection('driver_applications').doc(uid);
        const snapshot = await applicationRef.get();
        const current = (snapshot.data()?.documents ?? {}) as Record<string, DriverDocumentInput>;

        const updatedDocs = { ...current };
        documents.forEach((doc) => {
            updatedDocs[doc.type] = {
                ...doc,
                uploadedAt: new Date()
            };
        });

        const documentsComplete = REQUIRED_DOCUMENTS.every((docType) => !!updatedDocs[docType]);

        await applicationRef.set(
            {
                userId: uid,
                documents: updatedDocs,
                status: documentsComplete ? 'pending_review' : 'pending_documents',
                updatedAt: new Date(),
                requiredDocuments: REQUIRED_DOCUMENTS,
                countryCode: req.user.country ?? req.body.countryCode ?? 'NG',
                auditTrail: FieldValue.arrayUnion({
                    at: new Date(),
                    action: 'documents_uploaded',
                    actor: uid,
                    notes: documents.map((doc) => doc.type)
                })
            },
            { merge: true }
        );

        await db
            .collection('users')
            .doc(uid)
            .set(
                {
                    driverOnboarding: {
                        status: documentsComplete ? 'pending_review' : 'pending_documents',
                        updatedAt: new Date()
                    },
                    driverStatus: {
                        state: documentsComplete ? 'pending_review' : 'pending_documents',
                        isOnline: false
                    },
                    updatedAt: new Date()
                },
                { merge: true }
            );

        res.status(200).json({
            message: 'Documents uploaded successfully',
            status: documentsComplete ? 'pending_review' : 'pending_documents'
        });
    } catch (error) {
        logger.error({ err: error }, 'uploadDriverDocuments failed');
        res.status(500).json({ error: 'Unable to upload documents' });
    }
};

export const updateDriverBankInfo = async (req: AuthRequest, res: Response): Promise<void> => {
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
            countryCode: req.body.countryCode ?? 'NG',
            updatedAt: new Date()
        };

        const applicationRef = db.collection('driver_applications').doc(uid);
        await applicationRef.set(
            {
                userId: uid,
                bankDetails,
                updatedAt: new Date(),
                auditTrail: FieldValue.arrayUnion({
                    at: new Date(),
                    action: 'bank_details_updated',
                    actor: uid
                })
            },
            { merge: true }
        );

        await db
            .collection('users')
            .doc(uid)
            .set(
                {
                    bankDetails,
                    driverOnboarding: {
                        status: FieldValue.delete(),
                        updatedAt: new Date()
                    },
                    updatedAt: new Date()
                },
                { merge: true }
            );

        res.status(200).json({ message: 'Bank details saved' });
    } catch (error) {
        logger.error({ err: error }, 'updateDriverBankInfo failed');
        res.status(500).json({ error: 'Unable to save bank info' });
    }
};

export const getDriverApplication = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const doc = await db.collection('driver_applications').doc(req.user.uid).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }
        res.status(200).json(doc.data());
    } catch (error) {
        logger.error({ err: error }, 'getDriverApplication failed');
        res.status(500).json({ error: 'Unable to load application' });
    }
};

export const adminListDriverApplications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status, vehicleType } = req.query as { status?: string; vehicleType?: string };

        let query: FirebaseFirestore.Query = db.collection('driver_applications');

        if (status) {
            query = query.where('status', '==', status);
        }

        if (vehicleType) {
            query = query.where('vehicleType', '==', vehicleType);
        }

        const snapshot = await query.orderBy('updatedAt', 'desc').limit(200).get();
        res.status(200).json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
        logger.error({ err: error }, 'adminListDriverApplications failed');
        res.status(500).json({ error: 'Unable to list driver applications' });
    }
};

export const adminGetDriverApplication = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const doc = await db.collection('driver_applications').doc(req.params.driverId).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }
        res.status(200).json(doc.data());
    } catch (error) {
        logger.error({ err: error }, 'adminGetDriverApplication failed');
        res.status(500).json({ error: 'Unable to load driver application' });
    }
};

export const adminReviewDriverApplication = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { driverId } = req.params;
        const { action, notes, rejectionReason } = req.body;
        const now = new Date();

        await db.runTransaction(async (tx) => {
            const applicationRef = db.collection('driver_applications').doc(driverId);
            const userRef = db.collection('users').doc(driverId);

            const [applicationSnap, userSnap] = await Promise.all([tx.get(applicationRef), tx.get(userRef)]);

            if (!applicationSnap.exists) {
                throw new Error('Application not found');
            }

            const userData = userSnap.data() ?? {};
            if (action === 'approve') {
                tx.update(applicationRef, {
                    status: 'approved',
                    approvedAt: now,
                    reviewedBy: req.user.uid,
                    auditTrail: FieldValue.arrayUnion({
                        at: now,
                        action: 'approved',
                        actor: req.user.uid,
                        notes
                    })
                });

                tx.set(
                    userRef,
                    {
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
                    },
                    { merge: true }
                );

                await ensureDriverWallet(tx, driverId, userData.currency ?? 'NGN');
            } else if (action === 'reject') {
                tx.update(applicationRef, {
                    status: 'rejected',
                    rejectedAt: now,
                    rejectionReason,
                    auditTrail: FieldValue.arrayUnion({
                        at: now,
                        action: 'rejected',
                        actor: req.user.uid,
                        notes: rejectionReason
                    })
                });

                tx.set(
                    userRef,
                    {
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
                    },
                    { merge: true }
                );
            } else {
                tx.update(applicationRef, {
                    status: 'needs_resubmission',
                    resubmissionNotes: notes,
                    auditTrail: FieldValue.arrayUnion({
                        at: now,
                        action: 'resubmission_requested',
                        actor: req.user.uid,
                        notes
                    })
                });

                tx.set(
                    userRef,
                    {
                        driverOnboarding: {
                            status: 'needs_resubmission',
                            updatedAt: now
                        },
                        driverStatus: {
                            state: 'needs_resubmission',
                            isOnline: false
                        },
                        updatedAt: now
                    },
                    { merge: true }
                );
            }
        });

        const notificationMessage =
            req.body.action === 'approve'
                ? 'Your driver profile has been approved. You can now go online.'
                : req.body.action === 'reject'
                    ? `Your driver application was rejected: ${rejectionReason ?? 'Please contact support.'}`
                    : 'Additional documents are required for your driver application.';

        await notifyUser(req.params.driverId, {
            title: 'Driver Application Update',
            body: notificationMessage,
            type: 'driver_onboarding',
            metadata: {
                action: req.body.action
            }
        });

        res.status(200).json({ message: 'Application updated' });
    } catch (error) {
        logger.error({ err: error }, 'adminReviewDriverApplication failed');
        res.status(500).json({ error: 'Unable to update driver application' });
    }
};

export const adminRequestDocumentResubmission = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { driverId } = req.params;
        const { documents, note } = req.body;
        const now = new Date();

        await db
            .collection('driver_applications')
            .doc(driverId)
            .set(
                {
                    status: 'needs_resubmission',
                    requestedDocuments: documents,
                    resubmissionNotes: note,
                    updatedAt: now,
                    auditTrail: FieldValue.arrayUnion({
                        at: now,
                        action: 'documents_requested',
                        actor: req.user.uid,
                        notes: note,
                        documents
                    })
                },
                { merge: true }
            );

        await notifyUser(driverId, {
            title: 'Additional Documents Required',
            body: note ?? 'Please upload the requested documents to proceed.',
            type: 'driver_onboarding',
            metadata: { documents }
        });

        res.status(200).json({ message: 'Resubmission requested' });
    } catch (error) {
        logger.error({ err: error }, 'adminRequestDocumentResubmission failed');
        res.status(500).json({ error: 'Unable to request resubmission' });
    }
};

export const updateDriverAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;
        console.log('Update Driver Availability Body:', JSON.stringify(req.body, null, 2)); // Debug log
        const { isOnline, location } = req.body as { isOnline: boolean; location?: { lat: number; lng: number } };
        const now = new Date();
        const geohash = location ? encodeGeohash(location.lat, location.lng, 7) : null;
        const geohash5 = geohash ? geohash.substring(0, 5) : null;
        const geohash4 = geohash ? geohash.substring(0, 4) : null;

        await db
            .collection('users')
            .doc(uid)
            .set(
                {
                    driverStatus: {
                        state: isOnline ? 'active' : 'offline',
                        isOnline,
                        lastHeartbeat: now,
                        lastKnownLocation: location ?? FieldValue.delete(),
                        lastKnownGeohash: geohash ?? FieldValue.delete(),
                        geohash5: geohash5 ?? FieldValue.delete(),
                        geohash4: geohash4 ?? FieldValue.delete(),
                        lastOnlineAt: isOnline ? FieldValue.delete() : now
                    },
                    driverDetails: {
                        isOnline
                    },
                    updatedAt: now
                },
                { merge: true }
            );

        await rtdb
            .ref(`drivers/${uid}/status`)
            .set({
                isOnline,
                state: isOnline ? 'active' : 'offline',
                updatedAt: now.toISOString(),
                location: location ?? null
            });

        res.status(200).json({ message: `Driver is now ${isOnline ? 'online' : 'offline'}` });
    } catch (error) {
        logger.error({ err: error }, 'updateDriverAvailability failed');
        res.status(500).json({ error: 'Unable to update availability' });
    }
};

export const recordDriverHeartbeat = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const now = new Date();
        const { location } = req.body as { location?: { lat: number; lng: number; heading?: number } };
        const geohash = location ? encodeGeohash(location.lat, location.lng, 7) : null;
        const geohash5 = geohash ? geohash.substring(0, 5) : null;
        const geohash4 = geohash ? geohash.substring(0, 4) : null;

        await db
            .collection('users')
            .doc(req.user.uid)
            .set(
                {
                    driverStatus: {
                        lastHeartbeat: now,
                        lastKnownLocation: location ?? FieldValue.delete(),
                        lastKnownGeohash: geohash ?? FieldValue.delete(),
                        geohash5: geohash5 ?? FieldValue.delete(),
                        geohash4: geohash4 ?? FieldValue.delete()
                    }
                },
                { merge: true }
            );

        await rtdb.ref(`drivers/${req.user.uid}/heartbeat`).set({
            timestamp: now.toISOString(),
            location: location ?? null
        });

        await rideTrackingService.handleDriverHeartbeat(req.user.uid, location ?? null);

        res.status(200).json({ message: 'Heartbeat recorded' });
    } catch (error) {
        logger.error({ err: error }, 'recordDriverHeartbeat failed');
        res.status(500).json({ error: 'Unable to record heartbeat' });
    }
};