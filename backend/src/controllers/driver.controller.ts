import { Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { AuthRequest } from '../types/express';
import { db, rtdb } from '../config/firebase';
import { logger } from '../utils/logger';
import { rideTrackingService } from '../services/RideTrackingService';
import { encodeGeohash } from '../utils/geohash';
import { uploadDriverDocument, deleteFromStorage, getSignedUrl } from '../utils/firebaseStorage';
import { loyaltyService } from '../services/LoyaltyService';

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
        const vehicleType = String((req.body as any)?.vehicleType ?? '').trim();
        const liveryPlateNumber = String((req.body as any)?.liveryPlateNumber ?? '').trim().toUpperCase();

        const normalizeDocumentType = (rawType: string): DriverDocumentType => {
            const normalized = (rawType || '').toLowerCase().trim();
            const typeMap: Record<string, DriverDocumentType> = {
                // App variants
                chauffeur_license: 'driver_license',
                drivers_license: 'driver_license',
                driver_license: 'driver_license',
                vehicle_inspection: 'vehicle_registration',
                vehicle_registration: 'vehicle_registration',
                vehicle_insurance: 'vehicle_insurance',
                profile_photo: 'identity_document',
                background_check: 'other',

                // Backend-native
                vehicle_photo_front: 'vehicle_photo_front',
                vehicle_photo_back: 'vehicle_photo_back',
                vehicle_photo_interior: 'vehicle_photo_interior',
                identity_document: 'identity_document',
                proof_of_address: 'proof_of_address',
                other: 'other'
            };

            return typeMap[normalized] ?? 'other';
        };

        let documents: DriverDocumentInput[] = [];

        const uploadedFile = (req as any).file as
            | {
                  originalname?: string;
                  mimetype?: string;
                  size?: number;
                  buffer?: Buffer;
              }
            | undefined;

        if (uploadedFile?.buffer) {
            const rawType = String((req.body as any)?.type || '').trim();
            if (!rawType) {
                res.status(400).json({ error: 'Document type is required' });
                return;
            }

            const docType = normalizeDocumentType(rawType);
            const originalName = uploadedFile.originalname || 'document.bin';
            const extension = originalName.includes('.') ? originalName.split('.').pop() || 'bin' : 'bin';
            const mimeType = uploadedFile.mimetype || 'application/octet-stream';

            // File type whitelist and magic byte validation
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];
            const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

            const fileSize = uploadedFile.size || uploadedFile.buffer.length;
            if (fileSize > MAX_FILE_SIZE) {
                res.status(400).json({ error: 'File size exceeds 10MB limit' });
                return;
            }

            const extLower = extension.toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(extLower)) {
                res.status(400).json({ error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` });
                return;
            }

            if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
                res.status(400).json({ error: `Invalid MIME type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` });
                return;
            }

            // Magic byte check
            const buf = uploadedFile.buffer;
            const isJpg = buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
            const isPng = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
            const isPdf = buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;

            const magicValid =
                ((mimeType === 'image/jpeg' || extLower === 'jpg' || extLower === 'jpeg') && isJpg) ||
                ((mimeType === 'image/png' || extLower === 'png') && isPng) ||
                ((mimeType === 'application/pdf' || extLower === 'pdf') && isPdf);

            if (!magicValid) {
                res.status(400).json({ error: 'File content does not match declared file type' });
                return;
            }

            const uploadResult = await uploadDriverDocument(uploadedFile.buffer, uid, docType, extension, mimeType);

            documents = [
                {
                    type: docType,
                    fileUrl: uploadResult.signedUrl,
                    storagePath: uploadResult.storagePath,
                    fileName: originalName,
                    mimeType,
                    fileSize: uploadedFile.size || uploadedFile.buffer.length,
                    uploadedAt: new Date()
                }
            ];
        } else {
            const bodyDocuments = (req.body as any)?.documents;
            if (!Array.isArray(bodyDocuments) || bodyDocuments.length === 0) {
                res.status(400).json({ error: 'No documents provided' });
                return;
            }

            documents = bodyDocuments.map((doc: any) => ({
                ...doc,
                type: normalizeDocumentType(String(doc?.type || 'other'))
            }));
        }

        const applicationRef = db.collection('driver_applications').doc(uid);
        const snapshot = await applicationRef.get();
        const current = (snapshot.data()?.documents ?? {}) as Record<string, DriverDocumentInput>;

        const updatedDocs = { ...current };
        const pathsToDelete: string[] = [];
        const historyUpdates: Record<string, any> = {};

        for (const doc of documents) {
            const previousDoc = current[doc.type];
            if (
                previousDoc?.storagePath &&
                previousDoc.storagePath !== doc.storagePath
            ) {
                pathsToDelete.push(previousDoc.storagePath);
                // Archive previous version before overwriting
                historyUpdates[`documentHistory.${doc.type}`] = FieldValue.arrayUnion({
                    ...previousDoc,
                    replacedAt: new Date()
                });
            }

            updatedDocs[doc.type] = {
                ...doc,
                uploadedAt: new Date()
            };
        }

        const documentsComplete = REQUIRED_DOCUMENTS.every((docType) => !!updatedDocs[docType]);

        await applicationRef.set(
            {
                userId: uid,
                documents: updatedDocs,
                ...(vehicleType ? { vehicleType } : {}),
                ...(liveryPlateNumber ? { liveryPlateNumber } : {}),
                status: documentsComplete ? 'pending_review' : 'pending_documents',
                updatedAt: new Date(),
                requiredDocuments: REQUIRED_DOCUMENTS,
                countryCode: req.user.country ?? req.body.countryCode ?? 'NG',
                auditTrail: FieldValue.arrayUnion({
                    at: new Date(),
                    action: 'documents_uploaded',
                    actor: uid,
                    notes: documents.map((doc) => doc.type)
                }),
                ...historyUpdates
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
                        ...(vehicleType ? { vehicleType } : {}),
                        ...(liveryPlateNumber ? { liveryPlateNumber } : {}),
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

        await Promise.all(pathsToDelete.map((path) => deleteFromStorage(path)));

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

export const getDriverDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const doc = await db.collection('driver_applications').doc(req.user.uid).get();
        if (!doc.exists) {
            res.status(200).json({ data: [] });
            return;
        }

        const documentsMap = ((doc.data() ?? {}).documents ?? {}) as Record<string, any>;
        const documents = Object.entries(documentsMap).map(([type, value]) => ({
            type,
            status: value?.status ?? 'pending',
            fileUrl: value?.fileUrl ?? '',
            fileName: value?.fileName ?? '',
            mimeType: value?.mimeType ?? '',
            fileSize: value?.fileSize ?? 0,
            uploadedAt: value?.uploadedAt ?? null,
            reviewedAt: value?.reviewedAt ?? null,
            rejectionReason: value?.rejectionReason ?? null
        }));

        res.status(200).json({
            data: documents,
            verificationDetails: {
                vehicleType: (doc.data() as any)?.vehicleType ?? null,
                liveryPlateNumber: (doc.data() as any)?.liveryPlateNumber ?? null
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getDriverDocuments failed');
        res.status(500).json({ error: 'Unable to load documents' });
    }
};

/**
 * Refresh a signed URL for one of the authenticated driver's own documents.
 * The storagePath is never exposed to clients — it stays server-side.
 */
export const refreshDocumentSignedUrl = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    const { docType } = req.params;
    try {
        const appDoc = await db.collection('driver_applications').doc(req.user.uid).get();
        if (!appDoc.exists) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }

        const storagePath = (appDoc.data() as any)?.documents?.[docType]?.storagePath;
        if (!storagePath) {
            res.status(404).json({ error: 'Document not found or not yet uploaded' });
            return;
        }

        const signedUrl = await getSignedUrl(storagePath);
        res.status(200).json({ signedUrl, expiresIn: 900 }); // 900 s = 15 min
    } catch (error) {
        logger.error({ err: error, docType }, 'refreshDocumentSignedUrl failed');
        res.status(500).json({ error: 'Unable to refresh signed URL' });
    }
};

/**
 * Admin variant: refresh a signed URL for any driver's document.
 */
export const adminRefreshDocumentSignedUrl = async (req: AuthRequest, res: Response): Promise<void> => {
    const { driverId, docType } = req.params;
    try {
        const appDoc = await db.collection('driver_applications').doc(driverId).get();
        if (!appDoc.exists) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }

        const storagePath = (appDoc.data() as any)?.documents?.[docType]?.storagePath;
        if (!storagePath) {
            res.status(404).json({ error: 'Document not found or not yet uploaded' });
            return;
        }

        const signedUrl = await getSignedUrl(storagePath);
        res.status(200).json({ signedUrl, expiresIn: 900 });
    } catch (error) {
        logger.error({ err: error, driverId, docType }, 'adminRefreshDocumentSignedUrl failed');
        res.status(500).json({ error: 'Unable to refresh signed URL' });
    }
};

export const updateDriverVerificationDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;
        const vehicleType = String(req.body.vehicleType ?? '').trim();
        const liveryPlateNumber = String(req.body.liveryPlateNumber ?? '').trim().toUpperCase();

        if (!vehicleType) {
            res.status(400).json({ error: 'vehicleType is required' });
            return;
        }

        if (!liveryPlateNumber) {
            res.status(400).json({ error: 'liveryPlateNumber is required' });
            return;
        }

        await db
            .collection('driver_applications')
            .doc(uid)
            .set(
                {
                    userId: uid,
                    vehicleType,
                    liveryPlateNumber,
                    updatedAt: new Date(),
                    auditTrail: FieldValue.arrayUnion({
                        at: new Date(),
                        action: 'verification_details_updated',
                        actor: uid,
                        notes: { vehicleType, liveryPlateNumber }
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
                        vehicleType,
                        liveryPlateNumber,
                        updatedAt: new Date()
                    },
                    updatedAt: new Date()
                },
                { merge: true }
            );

        res.status(200).json({
            message: 'Verification details saved',
            data: { vehicleType, liveryPlateNumber }
        });
    } catch (error) {
        logger.error({ err: error }, 'updateDriverVerificationDetails failed');
        res.status(500).json({ error: 'Unable to save verification details' });
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
            const walletRef = db.collection('wallets').doc(driverId);

            // All reads FIRST (Firestore transaction requirement)
            const [applicationSnap, userSnap, walletSnap] = await Promise.all([
                tx.get(applicationRef),
                tx.get(userRef),
                tx.get(walletRef)
            ]);

            if (!applicationSnap.exists) {
                throw new Error('Application not found');
            }

            const userData = userSnap.data() ?? {};
            const applicationData = applicationSnap.data() ?? {};
            const currentDocuments = (applicationData.documents ?? {}) as Record<string, Record<string, unknown>>;

            if (action === 'approve') {
                const approvedDocuments = Object.fromEntries(
                    Object.entries(currentDocuments).map(([type, doc]) => [
                        type,
                        {
                            ...doc,
                            status: 'approved',
                            reviewedAt: now,
                            rejectionReason: null
                        }
                    ])
                );

                tx.update(applicationRef, {
                    status: 'approved',
                    approvedAt: now,
                    reviewedBy: req.user.uid,
                    reviewedAt: now,
                    documents: approvedDocuments,
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

                // Create wallet if doesn't exist (using pre-fetched data)
                if (!walletSnap.exists) {
                    tx.set(walletRef, {
                        userId: driverId,
                        balance: { amount: 0, currency: userData.currency ?? 'NGN' },
                        lifetimeEarnings: 0,
                        pendingWithdrawals: 0,
                        createdAt: now,
                        updatedAt: now
                    });
                }
            } else if (action === 'reject') {
                const rejectedDocuments = Object.fromEntries(
                    Object.entries(currentDocuments).map(([type, doc]) => [
                        type,
                        {
                            ...doc,
                            status: 'rejected',
                            reviewedAt: now,
                            rejectionReason: rejectionReason ?? 'Application rejected'
                        }
                    ])
                );

                tx.update(applicationRef, {
                    status: 'rejected',
                    rejectedAt: now,
                    reviewedAt: now,
                    rejectionReason,
                    documents: rejectedDocuments,
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

                // Use 'pending_documents' so the mobile app and requireApprovedDriver
                // middleware recognise the driver needs to re-upload (not a new custom state).
                tx.set(
                    userRef,
                    {
                        driverOnboarding: {
                            status: 'pending_documents',
                            updatedAt: now
                        },
                        driverStatus: {
                            state: 'pending_documents',
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

        const batch = db.batch();

        batch.set(
            db.collection('driver_applications').doc(driverId),
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

        // Sync user record so the mobile app and requireApprovedDriver gate see the correct state.
        batch.set(
            db.collection('users').doc(driverId),
            {
                driverOnboarding: {
                    status: 'pending_documents',
                    updatedAt: now
                },
                driverStatus: {
                    state: 'pending_documents',
                    isOnline: false
                },
                updatedAt: now
            },
            { merge: true }
        );

        await batch.commit();

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
        const { isOnline, location } = req.body as { isOnline: boolean; location?: { lat: number; lng: number } };
        const now = new Date();

        // Note: requireApprovedDriver middleware already blocks unapproved drivers
        // from reaching this handler, so no second approval check is needed here.

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

        // Validate coordinate ranges
        if (location) {
            if (typeof location.lat !== 'number' || typeof location.lng !== 'number' ||
                location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) {
                res.status(400).json({ error: 'Invalid coordinates. lat must be -90..90, lng must be -180..180.' });
                return;
            }
        }

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
/**
 * Get driver earnings for a specific period
 */
export const getDriverEarnings = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;
        const period = (req.query.period as string) || 'week';

        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'week':
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
        }

        const ridesSnap = await db.collection('rides')
            .where('driverId', '==', uid)
            .where('status', '==', 'completed')
            .where('completedAt', '>=', startDate)
            .orderBy('completedAt', 'desc')
            .get();

        let totalEarnings = 0;
        let totalTrips = 0;
        let totalCommission = 0;

        ridesSnap.forEach(doc => {
            const ride = doc.data();
            const settlement = ride.payment?.settlement;
            if (settlement?.driverAmount) {
                totalEarnings += settlement.driverAmount;
                totalCommission += settlement.commissionAmount || 0;
            } else if (ride.pricing?.estimatedFare) {
                totalEarnings += ride.pricing.estimatedFare * 0.8;
            }
            totalTrips++;
        });

        const walletSnap = await db.collection('wallets').doc(uid).get();
        const wallet = walletSnap.exists ? walletSnap.data() : null;

        res.status(200).json({
            success: true,
            data: {
                period,
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
                totalEarnings: Math.round(totalEarnings * 100) / 100,
                totalCommission: Math.round(totalCommission * 100) / 100,
                totalTrips,
                averagePerTrip: totalTrips > 0 ? Math.round((totalEarnings / totalTrips) * 100) / 100 : 0,
                currency: wallet?.balance?.currency || 'NGN',
                walletBalance: wallet?.balance?.amount || 0
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getDriverEarnings failed');
        res.status(500).json({ error: 'Unable to fetch earnings' });
    }
};

/**
 * Get driver's ride history
 */
/**
 * Get driver's ride history
 * Query params:
 *  - type: 'upcoming' | 'history' (default: 'history')
 *  - page: number
 *  - limit: number
 */
export const getDriverRideHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const type = (req.query.type as string) || 'history';
        const offset = (page - 1) * limit;

        let query = db.collection('rides').where('driverId', '==', uid);

        if (type === 'upcoming') {
            // "Upcoming" = Scheduled, Accepted, Arrived, In Progress
            // We want to see them in order of scheduled time (soonest first)
            query = query
                .where('status', 'in', ['scheduled', 'accepted', 'arrived', 'in_progress'])
                .orderBy('scheduledTime', 'asc') // Ensure scheduledTime exists on these
                .orderBy('createdAt', 'asc'); // Fallback sort
        } else {
            // "History" = Completed, Cancelled
            query = query
                .where('status', 'in', ['completed', 'cancelled'])
                .orderBy('createdAt', 'desc');
        }

        // Get total count for pagination (approximate or separate query)
        // Note: Firestore count() with complex filters can be expensive/limited.
        // For now, simpler aggregate count if possible, or just fetch.
        const countQuery = query.count();
        const countSnap = await countQuery.get();
        const total = countSnap.data().count;

        const snapshot = await query
            .offset(offset)
            .limit(limit)
            .get();

        const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({
            success: true,
            data: rides,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        logger.error({ err: error }, 'getDriverRideHistory failed');
        res.status(500).json({ error: 'Unable to fetch ride history' });
    }
};

/**
 * Get driver's current active ride
 */
export const getDriverActiveRide = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;

        const snapshot = await db.collection('rides')
            .where('driverId', '==', uid)
            .where('status', 'in', ['accepted', 'arrived', 'in_progress'])
            .limit(1)
            .get();

        if (snapshot.empty) {
            res.status(200).json({ success: true, data: null, message: 'No active ride' });
            return;
        }

        const doc = snapshot.docs[0];
        res.status(200).json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
        logger.error({ err: error }, 'getDriverActiveRide failed');
        res.status(500).json({ error: 'Unable to fetch active ride' });
    }
};

/**
 * Get driver rating distribution — aggregated from completed rides
 */
export const getDriverRatingDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;

        // Get all completed rides for this driver that have a driver rating
        const ridesSnap = await db.collection('rides')
            .where('driverId', '==', uid)
            .where('status', '==', 'completed')
            .get();

        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const recentFeedback: Array<{ rating: number; feedback: string; createdAt: string }> = [];
        let totalRating = 0;
        let ratedCount = 0;

        ridesSnap.forEach(doc => {
            const ride = doc.data();
            const rating = ride.driverRating ?? ride.rating;
            if (rating && typeof rating === 'number' && rating >= 1 && rating <= 5) {
                const rounded = Math.round(rating);
                distribution[rounded] = (distribution[rounded] || 0) + 1;
                totalRating += rating;
                ratedCount++;

                // Collect recent feedback (max 10)
                const feedback = ride.driverFeedback ?? ride.feedback;
                if (feedback && recentFeedback.length < 10) {
                    recentFeedback.push({
                        rating: rounded,
                        feedback,
                        createdAt: ride.completedAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
                    });
                }
            }
        });

        const averageRating = ratedCount > 0 ? Math.round((totalRating / ratedCount) * 10) / 10 : 0;

        res.status(200).json({
            success: true,
            data: {
                averageRating,
                totalRated: ratedCount,
                totalRides: ridesSnap.size,
                distribution,
                recentFeedback,
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getDriverRatingDistribution failed');
        res.status(500).json({ error: 'Unable to fetch rating distribution' });
    }
};

export const getDriverNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;
        const parsedLimit = parseInt((req.query.limit as string) || '30', 10);
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 100)
            : 30;

        const mapNotification = (doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data()
        });

        let notifications: Array<Record<string, unknown>> = [];

        try {
            const snapshot = await db
                .collection('notifications')
                .where('userId', '==', uid)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            notifications = snapshot.docs.map(mapNotification);
        } catch (queryError) {
            logger.warn({ err: queryError, uid }, 'getDriverNotifications indexed query failed, using fallback query');

            const fallbackSnapshot = await db
                .collection('notifications')
                .where('userId', '==', uid)
                .limit(limit)
                .get();

            const toEpoch = (value: unknown): number => {
                if (!value) return 0;
                if (value instanceof Date) return value.getTime();
                if (typeof value === 'string') {
                    const parsed = Date.parse(value);
                    return Number.isNaN(parsed) ? 0 : parsed;
                }
                if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
                    try {
                        return (value as any).toDate().getTime();
                    } catch {
                        return 0;
                    }
                }
                return 0;
            };

            notifications = fallbackSnapshot.docs
                .map(mapNotification)
                .sort((a, b) => toEpoch((b as { createdAt?: unknown }).createdAt) - toEpoch((a as { createdAt?: unknown }).createdAt));
        }

        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error) {
        logger.error({ err: error }, 'getDriverNotifications failed');
        res.status(500).json({ error: 'Unable to load notifications' });
    }
};

export const markAllDriverNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;
        const unreadSnapshot = await db
            .collection('notifications')
            .where('userId', '==', uid)
            .where('read', '==', false)
            .limit(200)
            .get();

        const batch = db.batch();
        unreadSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { read: true, readAt: new Date() });
        });
        await batch.commit();

        res.status(200).json({
            success: true,
            updated: unreadSnapshot.size
        });
    } catch (error) {
        logger.error({ err: error }, 'markAllDriverNotificationsRead failed');
        res.status(500).json({ error: 'Unable to mark notifications as read' });
    }
};

export const markDriverNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;
        const { id } = req.params;

        const docRef = db.collection('notifications').doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data()?.userId !== uid) {
            res.status(404).json({ error: 'Notification not found' });
            return;
        }

        await docRef.update({ read: true, readAt: new Date() });
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error({ err: error }, 'markDriverNotificationRead failed');
        res.status(500).json({ error: 'Unable to mark notification as read' });
    }
};

export const getDriverLoyaltyOverview = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const { uid } = req.user;
        const [account, history, rewards] = await Promise.all([
            loyaltyService.getAccount(uid),
            loyaltyService.getHistory(uid, 20),
            Promise.resolve(loyaltyService.getAvailableRewards())
        ]);

        res.status(200).json({
            success: true,
            data: {
                account: account ?? {
                    userId: uid,
                    points: 0,
                    tier: 'bronze',
                    lifetimePoints: 0,
                    lifetimeTrips: 0
                },
                rewards,
                history
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getDriverLoyaltyOverview failed');
        res.status(500).json({ error: 'Unable to load loyalty overview' });
    }
};

export const getDriverDemandZones = async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user.role !== 'driver') {
        res.status(403).json({ error: 'Drivers only' });
        return;
    }

    try {
        const selectedFilter = String(req.query.filter ?? 'All');
        const allowRides = selectedFilter === 'All' || selectedFilter === 'Rides' || selectedFilter === 'Surge';
        const allowDeliveries =
            selectedFilter === 'All' || selectedFilter === 'Deliveries' || selectedFilter === 'Surge';
        const surgeOnly = selectedFilter === 'Surge';

        const activeStatuses = ['requested', 'finding_driver'] as const;
        const ridesSnapshot = await db
            .collection('rides')
            .where('status', 'in', activeStatuses)
            .limit(400)
            .get();

        type DemandAggregate = {
            latSum: number;
            lngSum: number;
            count: number;
            rides: number;
            deliveries: number;
            surgeCount: number;
            latestAt: number;
        };

        const grid = new Map<string, DemandAggregate>();

        for (const doc of ridesSnapshot.docs) {
            const ride = doc.data() as any;
            const pickup = ride.pickupLocation ?? ride.pickup ?? {};
            const lat = Number(pickup.lat ?? pickup?.coordinates?.lat);
            const lng = Number(pickup.lng ?? pickup?.coordinates?.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

            const bookingType = String(ride.bookingType ?? 'on_demand');
            const isDelivery = bookingType === 'delivery';
            if (isDelivery && !allowDeliveries) continue;
            if (!isDelivery && !allowRides) continue;

            const surgeMultiplier = Number(ride.pricing?.surgeMultiplier ?? 1);
            const isSurge = surgeMultiplier > 1.0;
            if (surgeOnly && !isSurge) continue;

            const latKey = Math.round(lat * 100) / 100;
            const lngKey = Math.round(lng * 100) / 100;
            const key = `${latKey.toFixed(2)}:${lngKey.toFixed(2)}`;

            const existing =
                grid.get(key) ??
                {
                    latSum: 0,
                    lngSum: 0,
                    count: 0,
                    rides: 0,
                    deliveries: 0,
                    surgeCount: 0,
                    latestAt: 0
                };

            existing.latSum += lat;
            existing.lngSum += lng;
            existing.count += 1;
            existing.rides += isDelivery ? 0 : 1;
            existing.deliveries += isDelivery ? 1 : 0;
            existing.surgeCount += isSurge ? 1 : 0;
            const createdAt = ride.createdAt?.toDate?.()?.getTime?.() ?? Date.now();
            existing.latestAt = Math.max(existing.latestAt, createdAt);

            grid.set(key, existing);
        }

        const zones = Array.from(grid.entries())
            .map(([cellKey, value], index) => {
                const centerLat = value.latSum / value.count;
                const centerLng = value.lngSum / value.count;
                const type =
                    value.surgeCount > 0
                        ? 'Surge'
                        : value.deliveries > value.rides
                          ? 'Deliveries'
                          : 'Rides';

                const intensityRaw = Math.min(1, 0.2 + value.count * 0.15 + value.surgeCount * 0.1);
                const intensity = Number(intensityRaw.toFixed(2));
                const radiusMeters = Math.round(250 + intensity * 450);

                return {
                    id: `zone_${index}`,
                    key: cellKey,
                    lat: Number(centerLat.toFixed(6)),
                    lng: Number(centerLng.toFixed(6)),
                    type,
                    intensity,
                    radiusMeters,
                    openRequests: value.count,
                    rides: value.rides,
                    deliveries: value.deliveries,
                    surgeRequests: value.surgeCount,
                    pickupGeohash5: encodeGeohash(centerLat, centerLng, 5)
                };
            })
            .sort((a, b) => b.intensity - a.intensity)
            .slice(0, 50);

        res.status(200).json({
            success: true,
            data: zones,
            meta: {
                filter: selectedFilter,
                sourceRequests: ridesSnapshot.size,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getDriverDemandZones failed');
        res.status(500).json({ error: 'Unable to load demand zones' });
    }
};
