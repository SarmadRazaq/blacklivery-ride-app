import { z } from 'zod';

export const addSavedPlaceSchema = z.object({
    body: z.object({
        name: z.string().max(100).optional(),
        label: z.enum(['home', 'work', 'other']).optional().default('other'),
        address: z.string().min(1).max(500),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
    }),
});

export const updateSavedPlaceSchema = z.object({
    params: z.object({
        placeId: z.string().min(1),
    }),
    body: z.object({
        name: z.string().max(100).optional(),
        label: z.enum(['home', 'work', 'other']).optional(),
        address: z.string().min(1).max(500).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
    }),
});

export const addRecentLocationSchema = z.object({
    body: z.object({
        address: z.string().min(1).max(500),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        name: z.string().max(100).optional(),
    }),
});

export const searchLocationsSchema = z.object({
    query: z.object({
        q: z.string().min(1).max(200),
        lat: z.coerce.number().min(-90).max(90).optional(),
        lng: z.coerce.number().min(-180).max(180).optional(),
    }),
});
