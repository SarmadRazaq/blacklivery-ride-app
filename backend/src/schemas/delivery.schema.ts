import { z } from 'zod';

const locationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(1),
});

const packageDetailsSchema = z.object({
    description: z.string().min(1).max(500),
    weight: z.number().positive().optional(),
    isFragile: z.boolean().optional(),
    category: z.enum(['document', 'small_package', 'medium_package', 'large_package', 'food', 'other']).optional(),
});

export const createDeliverySchema = z.object({
    body: z.object({
        pickupLocation: locationSchema,
        dropoffLocation: locationSchema,
        packageDetails: packageDetailsSchema,
        vehicleCategory: z.enum(['motorbike', 'sedan', 'suv', 'cargo_van']).optional(),
        serviceType: z.enum(['instant', 'same_day', 'scheduled']).optional(),
        scheduledAt: z.string().datetime().optional(),
        recipientName: z.string().min(1).max(100).optional(),
        recipientPhone: z.string().min(7).max(20).optional(),
        notes: z.string().max(500).optional(),
        paymentMethod: z.enum(['wallet', 'card', 'cash']).optional(),
        region: z.enum(['nigeria', 'chicago', 'NG', 'US-CHI']).optional(),
        extraStops: z.array(locationSchema).max(3).optional(),
        isReturnTrip: z.boolean().optional(),
    }),
});

const locationSchemaQuote = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
});

export const deliveryQuoteSchema = z.object({
    body: z.object({
        pickupLocation: locationSchemaQuote,
        dropoffLocation: locationSchemaQuote,
        vehicleCategory: z.enum(['motorbike', 'sedan', 'suv', 'cargo_van']).optional(),
        serviceType: z.enum(['instant', 'same_day', 'scheduled']).optional(),
        isFragile: z.boolean().optional(),
        extraStops: z.number().int().min(0).max(3).optional(),
        isReturnTrip: z.boolean().optional(),
        region: z.enum(['nigeria', 'chicago', 'NG', 'US-CHI']).optional(),
    }),
});

export const proofOfDeliverySchema = z.object({
    params: z.object({
        rideId: z.string().min(1),
    }),
    body: z.object({
        photoBase64: z.string().min(1).optional(),
        signatureBase64: z.string().min(1).optional(),
        notes: z.string().max(500).optional(),
    }).refine(data => data.photoBase64 || data.signatureBase64, {
        message: 'Either photoBase64 or signatureBase64 is required',
    }),
});
