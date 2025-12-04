import { z } from 'zod';

export const updateUserStatusSchema = z.object({
    params: z.object({
        userId: z.string().min(1)
    }),
    body: z.object({
        isActive: z.boolean()
    }),
    query: z.any()
});

export const createDisputeSchema = z.object({
    body: z.object({
        rideId: z.string().min(1),
        reporterId: z.string().optional(),
        reporterRole: z.enum(['rider', 'driver', 'admin']),
        reason: z.string().min(3),
        details: z.string().min(3)
    }),
    params: z.any(),
    query: z.any()
});

export const resolveDisputeSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    body: z.object({
        resolutionNotes: z.string().min(3),
        resolutionType: z.enum(['refund', 'penalty', 'warning', 'dismissed']),
        issueRefund: z.boolean().optional(),
        refundUserId: z.string().optional(),
        refundAmount: z.number().positive().optional()
    }),
    query: z.any()
});

export const createPromotionSchema = z.object({
    body: z.object({
        code: z.string().min(3),
        description: z.string().min(3),
        discountType: z.enum(['flat', 'percentage']),
        amount: z.number().positive(),
        maxRedemptions: z.number().int().positive(),
        regions: z.array(z.string()).optional(),
        startsAt: z.string().datetime().optional(),
        endsAt: z.string().datetime().optional().nullable(),
        bonuses: z.array(z.record(z.string(), z.any())).optional()
    }),
    params: z.any(),
    query: z.any()
});

export const updatePromotionSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    body: z.object({
        description: z.string().min(3).optional(),
        discountType: z.enum(['flat', 'percentage']).optional(),
        amount: z.number().positive().optional(),
        maxRedemptions: z.number().int().positive().optional(),
        regions: z.array(z.string()).optional(),
        startsAt: z.string().datetime().optional(),
        endsAt: z.string().datetime().optional().nullable(),
        active: z.boolean().optional(),
        bonuses: z.array(z.record(z.string(), z.any())).optional()
    }),
    query: z.any()
});

export const createBonusSchema = z.object({
    body: z.object({
        name: z.string().min(3),
        description: z.string().min(3),
        criteria: z.record(z.string(), z.any()),
        reward: z.record(z.string(), z.any()),
        regions: z.array(z.string()).optional()
    }),
    params: z.any(),
    query: z.any()
});

export const updateBonusSchema = z.object({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        criteria: z.record(z.string(), z.any()).optional(),
        reward: z.record(z.string(), z.any()).optional(),
        regions: z.array(z.string()).optional(),
        active: z.boolean().optional()
    }),
    query: z.any()
});

export const createSupportTicketSchema = z.object({
    body: z.object({
        subject: z.string().min(3),
        description: z.string().min(3),
        userId: z.string().min(1),
        role: z.enum(['rider', 'driver', 'admin', 'guest']),
        priority: z.enum(['low', 'normal', 'high']).optional()
    }),
    params: z.any(),
    query: z.any()
});

export const updateSupportTicketSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    body: z.object({
        status: z.enum(['open', 'in_progress', 'resolved']),
        assignee: z.string().optional(),
        resolutionNotes: z.string().optional()
    }),
    query: z.any()
});
