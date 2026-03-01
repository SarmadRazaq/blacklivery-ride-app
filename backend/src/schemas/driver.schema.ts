import { z } from 'zod';

const subscriptionSchema = z.object({
    planId: z.string().min(1),
    status: z.enum(['active', 'inactive', 'cancelled', 'expired']),
    discountRate: z.number().min(0).max(1).optional(),
    expiresAt: z.string().datetime().optional(),
    waiveMicroFees: z.boolean().optional()
});

const documentSchema = z.object({
    type: z.enum([
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
    fileUrl: z.string().url(),
    storagePath: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    fileSize: z.number().int().positive()
});

const driverBankInfoBodySchema = z
    .object({
        accountName: z.string().min(3),
        accountNumber: z.string().min(6),
        bankName: z.string().min(3),
        bankCode: z.string().min(2),
        countryCode: z.string().length(2).optional(),
        preferredPayoutCurrency: z.enum(['NGN', 'USD']).default('NGN'),
        stripeConnectAccountId: z.string().min(5).optional(),
        subscription: subscriptionSchema.optional()
    })
    .refine(
        (data) => (data.preferredPayoutCurrency === 'USD' ? !!data.stripeConnectAccountId : true),
        {
            message: 'Stripe Connect account ID is required for USD payouts',
            path: ['stripeConnectAccountId']
        }
    );

export const driverDocumentUploadSchema = z.object({
    body: z.object({
        documents: z.array(documentSchema).min(1)
    }),
    params: z.object({}),
    query: z.object({})
});

export const driverBankInfoSchema = z.object({
    body: driverBankInfoBodySchema,
    params: z.object({}),
    query: z.object({})
});

export const driverAvailabilitySchema = z.object({
    body: z.object({
        isOnline: z.boolean(),
        location: z
            .object({
                lat: z.number(),
                lng: z.number(),
                heading: z.number().optional()
            })
            .optional()
    }),
    params: z.object({}),
    query: z.object({})
});

export const driverHeartbeatSchema = z.object({
    body: z.object({
        location: z
            .object({
                lat: z.number(),
                lng: z.number(),
                heading: z.number().optional()
            })
            .optional()
    }),
    params: z.object({}),
    query: z.object({})
});

export const listDriverApplicationsSchema = z.object({
    query: z.object({
        status: z.enum(['pending_documents', 'pending_review', 'needs_resubmission', 'approved', 'rejected']).optional(),
        vehicleType: z.string().optional()
    }),
    body: z.object({}).optional(),
    params: z.object({})
});

export const adminReviewDriverApplicationSchema = z.object({
    params: z.object({
        driverId: z.string().min(1)
    }),
    body: z.object({
        action: z.enum(['approve', 'reject', 'resubmit']),
        notes: z.string().optional(),
        rejectionReason: z.string().optional()
    }),
    query: z.object({})
});

export const adminRequestDriverDocumentsSchema = z.object({
    params: z.object({
        driverId: z.string().min(1)
    }),
    body: z.object({
        documents: z.array(documentSchema.shape.type).min(1),
        note: z.string().optional()
    }),
    query: z.object({})
});