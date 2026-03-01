"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRequestDriverDocumentsSchema = exports.adminReviewDriverApplicationSchema = exports.listDriverApplicationsSchema = exports.driverHeartbeatSchema = exports.driverAvailabilitySchema = exports.driverBankInfoSchema = exports.driverDocumentUploadSchema = void 0;
const zod_1 = require("zod");
const subscriptionSchema = zod_1.z.object({
    planId: zod_1.z.string().min(1),
    status: zod_1.z.enum(['active', 'inactive', 'cancelled', 'expired']),
    discountRate: zod_1.z.number().min(0).max(1).optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
    waiveMicroFees: zod_1.z.boolean().optional()
});
const documentSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'driver_license',
        'vehicle_registration',
        'vehicle_insurance',
        'vehicle_photo_front',
        'vehicle_photo_back',
        'vehicle_photo_interior',
        'identity_document',
        'proof_of_address',
        'other'
    ]),
    fileUrl: zod_1.z.string().url(),
    storagePath: zod_1.z.string().min(1),
    fileName: zod_1.z.string().min(1),
    mimeType: zod_1.z.string().min(1),
    fileSize: zod_1.z.number().int().positive()
});
const driverBankInfoBodySchema = zod_1.z
    .object({
    accountName: zod_1.z.string().min(3),
    accountNumber: zod_1.z.string().min(6),
    bankName: zod_1.z.string().min(3),
    bankCode: zod_1.z.string().min(2),
    countryCode: zod_1.z.string().length(2).optional(),
    preferredPayoutCurrency: zod_1.z.enum(['NGN', 'USD']).default('NGN'),
    stripeConnectAccountId: zod_1.z.string().min(5).optional(),
    subscription: subscriptionSchema.optional()
})
    .refine((data) => (data.preferredPayoutCurrency === 'USD' ? !!data.stripeConnectAccountId : true), {
    message: 'Stripe Connect account ID is required for USD payouts',
    path: ['stripeConnectAccountId']
});
exports.driverDocumentUploadSchema = zod_1.z.object({
    body: zod_1.z.object({
        documents: zod_1.z.array(documentSchema).min(1)
    }),
    params: zod_1.z.object({}),
    query: zod_1.z.object({})
});
exports.driverBankInfoSchema = zod_1.z.object({
    body: driverBankInfoBodySchema,
    params: zod_1.z.object({}),
    query: zod_1.z.object({})
});
exports.driverAvailabilitySchema = zod_1.z.object({
    body: zod_1.z.object({
        isOnline: zod_1.z.boolean(),
        location: zod_1.z
            .object({
            lat: zod_1.z.number(),
            lng: zod_1.z.number(),
            heading: zod_1.z.number().optional()
        })
            .optional()
    }),
    params: zod_1.z.object({}),
    query: zod_1.z.object({})
});
exports.driverHeartbeatSchema = zod_1.z.object({
    body: zod_1.z.object({
        location: zod_1.z
            .object({
            lat: zod_1.z.number(),
            lng: zod_1.z.number(),
            heading: zod_1.z.number().optional()
        })
            .optional()
    }),
    params: zod_1.z.object({}),
    query: zod_1.z.object({})
});
exports.listDriverApplicationsSchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z.enum(['pending_documents', 'pending_review', 'needs_resubmission', 'approved', 'rejected']).optional(),
        vehicleType: zod_1.z.string().optional()
    }),
    body: zod_1.z.object({}).optional(),
    params: zod_1.z.object({})
});
exports.adminReviewDriverApplicationSchema = zod_1.z.object({
    params: zod_1.z.object({
        driverId: zod_1.z.string().min(1)
    }),
    body: zod_1.z.object({
        action: zod_1.z.enum(['approve', 'reject', 'resubmit']),
        notes: zod_1.z.string().optional(),
        rejectionReason: zod_1.z.string().optional()
    }),
    query: zod_1.z.object({})
});
exports.adminRequestDriverDocumentsSchema = zod_1.z.object({
    params: zod_1.z.object({
        driverId: zod_1.z.string().min(1)
    }),
    body: zod_1.z.object({
        documents: zod_1.z.array(documentSchema.shape.type).min(1),
        note: zod_1.z.string().optional()
    }),
    query: zod_1.z.object({})
});
//# sourceMappingURL=driver.schema.js.map