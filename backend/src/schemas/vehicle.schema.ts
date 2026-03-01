import { z } from 'zod';

const vehicleImagesSchema = z.object({
    front: z.string().url().or(z.string().min(1)),
    back: z.string().url().or(z.string().min(1)),
});

const vehicleDocumentsSchema = z.object({
    insurance: z.string().optional(),
    registration: z.string().optional(),
    inspection: z.string().optional(),
});

export const addVehicleSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100),
        year: z.number().int().min(2000).max(new Date().getFullYear() + 1),
        plateNumber: z.string().min(2).max(20),
        seats: z.number().int().min(1).max(20),
        category: z.enum(['motorbike', 'sedan', 'suv', 'xl', 'first_class', 'business_sedan', 'business_suv', 'cargo_van']),
        color: z.string().max(30).optional(),
        images: vehicleImagesSchema,
        documents: vehicleDocumentsSchema.optional(),
    }),
});

export const updateVehicleSchema = z.object({
    params: z.object({
        vehicleId: z.string().min(1),
    }),
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        year: z.number().int().min(2000).max(new Date().getFullYear() + 1).optional(),
        plateNumber: z.string().min(2).max(20).optional(),
        seats: z.number().int().min(1).max(20).optional(),
        category: z.enum(['motorbike', 'sedan', 'suv', 'xl', 'first_class', 'business_sedan', 'business_suv', 'cargo_van']).optional(),
        color: z.string().max(30).optional(),
        images: vehicleImagesSchema.partial().optional(),
        documents: vehicleDocumentsSchema.optional(),
    }),
});
