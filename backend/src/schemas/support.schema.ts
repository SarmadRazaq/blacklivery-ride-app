import { z } from 'zod';

export const createSupportTicketSchema = z.object({
    body: z.object({
        subject: z.string().min(1).max(200),
        message: z.string().min(1).max(5000),
        category: z.enum(['ride_issue', 'payment', 'account', 'safety', 'emergency', 'driver_issue', 'general']).optional(),
        rideId: z.string().optional(),
    }),
});

export const replyToTicketSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
    body: z.object({
        message: z.string().min(1).max(5000),
    }),
});
