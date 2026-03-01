/**
 * KYC Document Flow Tests
 *
 * Tests file upload validation (extension, MIME type, magic bytes) and
 * document lifecycle (required doc completion, history on resubmission).
 *
 * Validation logic under test (extracted from uploadDriverDocuments):
 *   - Extension whitelist: jpg, jpeg, png, pdf
 *   - MIME type whitelist: image/jpeg, image/png, application/pdf
 *   - Magic byte check: FF D8 FF (JPG), 89 50 4E 47 (PNG), 25 50 44 46 (PDF)
 *   - Required documents: driver_license, vehicle_registration, vehicle_insurance,
 *                         vehicle_photo_front, vehicle_photo_back
 */

// ─── Constants (mirror driver.controller.ts) ──────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const REQUIRED_DOCUMENTS = [
    'driver_license',
    'vehicle_registration',
    'vehicle_insurance',
    'vehicle_photo_front',
    'vehicle_photo_back'
] as const;

// ─── Validation helpers (mirrors controller logic) ────────────────────────────

interface FileValidationInput {
    extension: string;
    mimeType: string;
    buffer: Buffer;
    size: number;
}

interface ValidationResult {
    valid: boolean;
    error?: string;
}

function validateUploadedFile(file: FileValidationInput): ValidationResult {
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    const extLower = file.extension.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extLower)) {
        return { valid: false, error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
        return { valid: false, error: `Invalid MIME type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` };
    }

    const buf = file.buffer;
    const isJpg = buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
    const isPng = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    const isPdf = buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;

    const magicValid =
        ((file.mimeType === 'image/jpeg' || extLower === 'jpg' || extLower === 'jpeg') && isJpg) ||
        ((file.mimeType === 'image/png' || extLower === 'png') && isPng) ||
        ((file.mimeType === 'application/pdf' || extLower === 'pdf') && isPdf);

    if (!magicValid) {
        return { valid: false, error: 'File content does not match declared file type' };
    }

    return { valid: true };
}

// ─── Magic byte factories ─────────────────────────────────────────────────────

function makeJpgBuffer(): Buffer {
    const buf = Buffer.alloc(10);
    buf[0] = 0xFF; buf[1] = 0xD8; buf[2] = 0xFF; buf[3] = 0xE0;
    return buf;
}

function makePngBuffer(): Buffer {
    const buf = Buffer.alloc(10);
    buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4E; buf[3] = 0x47;
    return buf;
}

function makePdfBuffer(): Buffer {
    const buf = Buffer.alloc(10);
    buf[0] = 0x25; buf[1] = 0x50; buf[2] = 0x44; buf[3] = 0x46; // %PDF
    return buf;
}

function makeRandomBuffer(): Buffer {
    const buf = Buffer.alloc(10);
    buf[0] = 0x00; buf[1] = 0x01; buf[2] = 0x02; buf[3] = 0x03;
    return buf;
}

// ═════════════════════════════════════════════════════════════════════════════
// Test Suite 1 — Extension Whitelist
// ═════════════════════════════════════════════════════════════════════════════

describe('File extension whitelist', () => {
    it('rejects .exe extension', () => {
        const result = validateUploadedFile({
            extension: 'exe',
            mimeType: 'application/octet-stream',
            buffer: makeRandomBuffer(),
            size: 100
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
    });

    it('rejects .js extension', () => {
        const result = validateUploadedFile({
            extension: 'js',
            mimeType: 'application/javascript',
            buffer: makeRandomBuffer(),
            size: 100
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
    });

    it('rejects .html extension', () => {
        const result = validateUploadedFile({
            extension: 'html',
            mimeType: 'text/html',
            buffer: makeRandomBuffer(),
            size: 100
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
    });

    it('accepts .jpg extension with correct magic bytes', () => {
        const result = validateUploadedFile({
            extension: 'jpg',
            mimeType: 'image/jpeg',
            buffer: makeJpgBuffer(),
            size: 10
        });
        expect(result.valid).toBe(true);
    });

    it('accepts .pdf extension with correct magic bytes', () => {
        const result = validateUploadedFile({
            extension: 'pdf',
            mimeType: 'application/pdf',
            buffer: makePdfBuffer(),
            size: 10
        });
        expect(result.valid).toBe(true);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// Test Suite 2 — Magic Byte Validation
// ═════════════════════════════════════════════════════════════════════════════

describe('Magic byte validation', () => {
    it('rejects file claiming to be PDF but has random bytes', () => {
        const result = validateUploadedFile({
            extension: 'pdf',
            mimeType: 'application/pdf',
            buffer: makeRandomBuffer(),
            size: 10
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('File content does not match declared file type');
    });

    it('rejects file claiming to be JPEG but has PNG magic bytes', () => {
        const result = validateUploadedFile({
            extension: 'jpg',
            mimeType: 'image/jpeg',
            buffer: makePngBuffer(), // PNG magic bytes
            size: 10
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('File content does not match declared file type');
    });

    it('rejects file claiming to be PNG but has PDF magic bytes', () => {
        const result = validateUploadedFile({
            extension: 'png',
            mimeType: 'image/png',
            buffer: makePdfBuffer(), // PDF magic bytes
            size: 10
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('File content does not match declared file type');
    });

    it('accepts valid .pdf with %PDF magic bytes', () => {
        const result = validateUploadedFile({
            extension: 'pdf',
            mimeType: 'application/pdf',
            buffer: makePdfBuffer(),
            size: 10
        });
        expect(result.valid).toBe(true);
    });

    it('accepts valid .png with PNG magic bytes', () => {
        const result = validateUploadedFile({
            extension: 'png',
            mimeType: 'image/png',
            buffer: makePngBuffer(),
            size: 10
        });
        expect(result.valid).toBe(true);
    });

    it('accepts valid .jpeg with JPG magic bytes', () => {
        const result = validateUploadedFile({
            extension: 'jpeg',
            mimeType: 'image/jpeg',
            buffer: makeJpgBuffer(),
            size: 10
        });
        expect(result.valid).toBe(true);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// Test Suite 3 — File Size
// ═════════════════════════════════════════════════════════════════════════════

describe('File size validation', () => {
    it('rejects files over 10MB', () => {
        const result = validateUploadedFile({
            extension: 'pdf',
            mimeType: 'application/pdf',
            buffer: makePdfBuffer(),
            size: MAX_FILE_SIZE + 1
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('10MB');
    });

    it('accepts files exactly at 10MB limit', () => {
        const result = validateUploadedFile({
            extension: 'pdf',
            mimeType: 'application/pdf',
            buffer: makePdfBuffer(),
            size: MAX_FILE_SIZE
        });
        expect(result.valid).toBe(true);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// Test Suite 4 — Document Completion Logic
// ═════════════════════════════════════════════════════════════════════════════

describe('Document completion status', () => {
    type DocRecord = Record<string, { fileUrl: string }>;

    function checkCompletion(docs: DocRecord): 'pending_review' | 'pending_documents' {
        const complete = REQUIRED_DOCUMENTS.every((docType) => !!docs[docType]);
        return complete ? 'pending_review' : 'pending_documents';
    }

    it('status becomes pending_review when all 5 required docs uploaded', () => {
        const docs: DocRecord = {
            driver_license: { fileUrl: 'https://storage/1' },
            vehicle_registration: { fileUrl: 'https://storage/2' },
            vehicle_insurance: { fileUrl: 'https://storage/3' },
            vehicle_photo_front: { fileUrl: 'https://storage/4' },
            vehicle_photo_back: { fileUrl: 'https://storage/5' }
        };
        expect(checkCompletion(docs)).toBe('pending_review');
    });

    it('status stays pending_documents when only 3 of 5 uploaded', () => {
        const docs: DocRecord = {
            driver_license: { fileUrl: 'https://storage/1' },
            vehicle_registration: { fileUrl: 'https://storage/2' },
            vehicle_insurance: { fileUrl: 'https://storage/3' }
        };
        expect(checkCompletion(docs)).toBe('pending_documents');
    });

    it('status stays pending_documents when 4 of 5 uploaded', () => {
        const docs: DocRecord = {
            driver_license: { fileUrl: 'https://storage/1' },
            vehicle_registration: { fileUrl: 'https://storage/2' },
            vehicle_insurance: { fileUrl: 'https://storage/3' },
            vehicle_photo_front: { fileUrl: 'https://storage/4' }
            // missing vehicle_photo_back
        };
        expect(checkCompletion(docs)).toBe('pending_documents');
    });

    it('status stays pending_documents when no docs uploaded', () => {
        expect(checkCompletion({})).toBe('pending_documents');
    });

    it('extra non-required documents do not trigger pending_review without all required', () => {
        const docs: DocRecord = {
            driver_license: { fileUrl: 'https://storage/1' },
            vehicle_registration: { fileUrl: 'https://storage/2' },
            vehicle_insurance: { fileUrl: 'https://storage/3' },
            other: { fileUrl: 'https://storage/extra' }
            // missing vehicle_photo_front and vehicle_photo_back
        };
        expect(checkCompletion(docs)).toBe('pending_documents');
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// Test Suite 5 — Document Version History
// ═════════════════════════════════════════════════════════════════════════════

describe('Document history on resubmission', () => {
    interface DocEntry {
        fileUrl: string;
        storagePath: string;
        mimeType: string;
    }

    function computeHistoryUpdates(
        current: Record<string, DocEntry>,
        incoming: Array<{ type: string; storagePath: string; fileUrl: string; mimeType: string }>
    ): Record<string, DocEntry> {
        // Mirrors the historyUpdates logic in uploadDriverDocuments
        const archived: Record<string, DocEntry> = {};
        for (const doc of incoming) {
            const prev = current[doc.type];
            if (prev?.storagePath && prev.storagePath !== doc.storagePath) {
                archived[doc.type] = { ...prev };
            }
        }
        return archived;
    }

    it('archives old document when driver resubmits same doc type', () => {
        const current: Record<string, DocEntry> = {
            driver_license: {
                fileUrl: 'https://storage/old-license.pdf',
                storagePath: 'drivers/uid1/driver_license/old.pdf',
                mimeType: 'application/pdf'
            }
        };

        const incoming = [{
            type: 'driver_license',
            fileUrl: 'https://storage/new-license.pdf',
            storagePath: 'drivers/uid1/driver_license/new.pdf',
            mimeType: 'application/pdf'
        }];

        const history = computeHistoryUpdates(current, incoming);
        expect(history['driver_license']).toBeDefined();
        expect(history['driver_license'].storagePath).toBe('drivers/uid1/driver_license/old.pdf');
    });

    it('does not archive when uploading a different doc type', () => {
        const current: Record<string, DocEntry> = {
            driver_license: {
                fileUrl: 'https://storage/license.pdf',
                storagePath: 'drivers/uid1/driver_license/doc.pdf',
                mimeType: 'application/pdf'
            }
        };

        const incoming = [{
            type: 'vehicle_insurance',
            fileUrl: 'https://storage/insurance.pdf',
            storagePath: 'drivers/uid1/vehicle_insurance/doc.pdf',
            mimeType: 'application/pdf'
        }];

        const history = computeHistoryUpdates(current, incoming);
        expect(Object.keys(history)).toHaveLength(0);
    });

    it('does not archive when same storage path is reused (no change)', () => {
        const current: Record<string, DocEntry> = {
            driver_license: {
                fileUrl: 'https://storage/license.pdf',
                storagePath: 'drivers/uid1/driver_license/doc.pdf',
                mimeType: 'application/pdf'
            }
        };

        const incoming = [{
            type: 'driver_license',
            fileUrl: 'https://storage/license.pdf',
            storagePath: 'drivers/uid1/driver_license/doc.pdf', // same path
            mimeType: 'application/pdf'
        }];

        const history = computeHistoryUpdates(current, incoming);
        expect(Object.keys(history)).toHaveLength(0);
    });

    it('archives multiple doc types when multiple are resubmitted', () => {
        const current: Record<string, DocEntry> = {
            driver_license: {
                fileUrl: 'https://storage/old-license.pdf',
                storagePath: 'drivers/uid1/driver_license/old.pdf',
                mimeType: 'application/pdf'
            },
            vehicle_insurance: {
                fileUrl: 'https://storage/old-insurance.pdf',
                storagePath: 'drivers/uid1/vehicle_insurance/old.pdf',
                mimeType: 'application/pdf'
            }
        };

        const incoming = [
            {
                type: 'driver_license',
                fileUrl: 'https://storage/new-license.pdf',
                storagePath: 'drivers/uid1/driver_license/new.pdf',
                mimeType: 'application/pdf'
            },
            {
                type: 'vehicle_insurance',
                fileUrl: 'https://storage/new-insurance.pdf',
                storagePath: 'drivers/uid1/vehicle_insurance/new.pdf',
                mimeType: 'application/pdf'
            }
        ];

        const history = computeHistoryUpdates(current, incoming);
        expect(Object.keys(history)).toHaveLength(2);
        expect(history['driver_license']).toBeDefined();
        expect(history['vehicle_insurance']).toBeDefined();
    });
});
