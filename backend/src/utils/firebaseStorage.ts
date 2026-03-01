// utils/firebaseStorage.ts — Firebase Storage utility using Admin SDK
//
// SECURITY: Uses time-limited signed URLs instead of permanent public download
// URLs. The Admin SDK bypasses Storage security rules, so server-side uploads
// continue to work even with deny-all rules on the client side.

import * as admin from 'firebase-admin';

const bucket = admin.storage().bucket();

/** Default signed URL expiry (15 minutes). */
const DEFAULT_SIGNED_URL_EXPIRY_MS = 15 * 60 * 1000;

/**
 * Upload a buffer to Firebase Storage and return a time-limited signed URL.
 *
 * @param fileBuffer - Raw file contents (Buffer)
 * @param path       - Storage path, e.g. `drivers/{id}/documents/driver_license_12345.jpg`
 * @param mimeType   - MIME type of the file, e.g. `image/jpeg`
 * @param expiryMs   - Optional signed URL expiry in ms (default 15 min)
 * @returns A signed URL valid for `expiryMs` milliseconds
 */
export const uploadToStorage = async (
    fileBuffer: Buffer,
    path: string,
    mimeType: string = 'application/octet-stream',
    expiryMs: number = DEFAULT_SIGNED_URL_EXPIRY_MS
): Promise<{ signedUrl: string; storagePath: string }> => {
    const file = bucket.file(path);

    await file.save(fileBuffer, {
        metadata: { contentType: mimeType },
        resumable: false
    });

    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiryMs
    });

    return { signedUrl, storagePath: path };
};

/**
 * Generate a fresh signed URL for an existing file.
 * Use this when a previously-issued URL has expired and the admin/driver
 * needs to view the document again.
 *
 * @param storagePath - The path stored in Firestore, e.g. `drivers/{id}/documents/...`
 * @param expiryMs    - How long the URL should be valid (default 15 min)
 */
export const getSignedUrl = async (
    storagePath: string,
    expiryMs: number = DEFAULT_SIGNED_URL_EXPIRY_MS
): Promise<string> => {
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
        throw new Error(`Storage object not found: ${storagePath}`);
    }

    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiryMs
    });
    return signedUrl;
};

/**
 * Find the latest uploaded file for a driver document type and return a signed URL.
 */
export const getLatestDriverDocumentSignedUrl = async (
    driverId: string,
    documentType: string,
    expiryMs: number = DEFAULT_SIGNED_URL_EXPIRY_MS
): Promise<{ signedUrl: string; storagePath: string }> => {
    const prefix = `drivers/${driverId}/documents/${documentType}_`;
    const [files] = await bucket.getFiles({ prefix, maxResults: 50, autoPaginate: false });

    if (!files.length) {
        throw new Error(`No storage objects found for prefix: ${prefix}`);
    }

    const sorted = [...files].sort((a, b) => {
        const aTime = Date.parse(a.metadata?.updated || '') || 0;
        const bTime = Date.parse(b.metadata?.updated || '') || 0;
        if (aTime !== bTime) return bTime - aTime;
        return b.name.localeCompare(a.name);
    });

    const latestFile = sorted[0];
    const [signedUrl] = await latestFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiryMs
    });

    return {
        signedUrl,
        storagePath: latestFile.name
    };
};

/**
 * Delete a file from Firebase Storage by path.
 * Safe for replacement flows: ignores missing files.
 */
export const deleteFromStorage = async (storagePath: string): Promise<void> => {
    if (!storagePath) return;
    try {
        await bucket.file(storagePath).delete({ ignoreNotFound: true });
    } catch {
        // No-op: replacement should not fail if previous file cleanup fails.
    }
};

/**
 * Upload car images (front + back) for a driver's vehicle.
 *
 * @returns Signed URLs for both images
 */
export const uploadCarImages = async (
    frontBuffer: Buffer,
    backBuffer: Buffer,
    driverId: string,
    mimeType: string = 'image/jpeg'
): Promise<{ front: { signedUrl: string; storagePath: string }; back: { signedUrl: string; storagePath: string } }> => {
    const timestamp = Date.now();

    const [front, back] = await Promise.all([
        uploadToStorage(frontBuffer, `vehicles/${driverId}/front_${timestamp}.jpg`, mimeType),
        uploadToStorage(backBuffer, `vehicles/${driverId}/back_${timestamp}.jpg`, mimeType)
    ]);

    return { front, back };
};

/**
 * Upload a driver document (license, registration, insurance, etc.).
 *
 * @returns Signed URL + storage path (store the storagePath in Firestore
 *          so you can regenerate signed URLs later via `getSignedUrl`).
 */
export const uploadDriverDocument = async (
    fileBuffer: Buffer,
    driverId: string,
    documentType: string,
    fileExtension: string = 'jpg',
    mimeType: string = 'image/jpeg'
): Promise<{ signedUrl: string; storagePath: string }> => {
    const timestamp = Date.now();
    const storagePath = `drivers/${driverId}/documents/${documentType}_${timestamp}.${fileExtension}`;

    return uploadToStorage(fileBuffer, storagePath, mimeType);
};