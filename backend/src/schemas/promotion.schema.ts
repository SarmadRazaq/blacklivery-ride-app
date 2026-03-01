import { z } from 'zod';

export const applyPromotionSchema = z.object({
    body: z.object({
        code: z.string().min(1).max(50).transform(val => val.trim().toUpperCase()),
    }),
});
