// src/schemas/chat.schema.ts
import { z } from 'zod';

export const sendChatMessageSchema = z.object({
    params: z.object({
        rideId: z.string().min(1)
    }),
    body: z.object({
        message: z.string().min(1).max(1000),
        messageType: z.enum(['text', 'location', 'system']).default('text'),
        metadata: z.object({
            lat: z.number().optional(),
            lng: z.number().optional()
        }).optional()
    }),
    query: z.object({})
});

export const getChatMessagesSchema = z.object({
    params: z.object({
        rideId: z.string().min(1)
    }),
    query: z.object({
        limit: z.string().transform(Number).optional(),
        before: z.string().optional() // timestamp for pagination
    }),
    body: z.object({}).optional()
});

export const markMessagesReadSchema = z.object({
    params: z.object({
        rideId: z.string().min(1)
    }),
    body: z.object({
        messageIds: z.array(z.string()).optional()
    }),
    query: z.object({})
});