"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSupportTicketSchema = exports.createSupportTicketSchema = exports.updateBonusSchema = exports.createBonusSchema = exports.updatePromotionSchema = exports.createPromotionSchema = exports.resolveDisputeSchema = exports.createDisputeSchema = exports.updateUserStatusSchema = void 0;
const zod_1 = require("zod");
exports.updateUserStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().min(1)
    }),
    body: zod_1.z.object({
        isActive: zod_1.z.boolean()
    }),
    query: zod_1.z.any()
});
exports.createDisputeSchema = zod_1.z.object({
    body: zod_1.z.object({
        rideId: zod_1.z.string().min(1),
        reporterId: zod_1.z.string().optional(),
        reporterRole: zod_1.z.enum(['rider', 'driver', 'admin']),
        reason: zod_1.z.string().min(3),
        details: zod_1.z.string().min(3)
    }),
    params: zod_1.z.any(),
    query: zod_1.z.any()
});
exports.resolveDisputeSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    }),
    body: zod_1.z.object({
        resolutionNotes: zod_1.z.string().min(3),
        resolutionType: zod_1.z.enum(['refund', 'penalty', 'warning', 'dismissed']),
        issueRefund: zod_1.z.boolean().optional(),
        refundUserId: zod_1.z.string().optional(),
        refundAmount: zod_1.z.number().positive().optional()
    }),
    query: zod_1.z.any()
});
exports.createPromotionSchema = zod_1.z.object({
    body: zod_1.z.object({
        code: zod_1.z.string().min(3),
        description: zod_1.z.string().min(3),
        discountType: zod_1.z.enum(['flat', 'percentage']),
        amount: zod_1.z.number().positive(),
        maxRedemptions: zod_1.z.number().int().positive(),
        regions: zod_1.z.array(zod_1.z.string()).optional(),
        startsAt: zod_1.z.string().datetime().optional(),
        endsAt: zod_1.z.string().datetime().optional().nullable(),
        bonuses: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.any())).optional()
    }),
    params: zod_1.z.any(),
    query: zod_1.z.any()
});
exports.updatePromotionSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    }),
    body: zod_1.z.object({
        description: zod_1.z.string().min(3).optional(),
        discountType: zod_1.z.enum(['flat', 'percentage']).optional(),
        amount: zod_1.z.number().positive().optional(),
        maxRedemptions: zod_1.z.number().int().positive().optional(),
        regions: zod_1.z.array(zod_1.z.string()).optional(),
        startsAt: zod_1.z.string().datetime().optional(),
        endsAt: zod_1.z.string().datetime().optional().nullable(),
        active: zod_1.z.boolean().optional(),
        bonuses: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.any())).optional()
    }),
    query: zod_1.z.any()
});
exports.createBonusSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(3),
        description: zod_1.z.string().min(3),
        criteria: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        reward: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        regions: zod_1.z.array(zod_1.z.string()).optional()
    }),
    params: zod_1.z.any(),
    query: zod_1.z.any()
});
exports.updateBonusSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        criteria: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        reward: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        regions: zod_1.z.array(zod_1.z.string()).optional(),
        active: zod_1.z.boolean().optional()
    }),
    query: zod_1.z.any()
});
exports.createSupportTicketSchema = zod_1.z.object({
    body: zod_1.z.object({
        subject: zod_1.z.string().min(3),
        description: zod_1.z.string().min(3),
        userId: zod_1.z.string().min(1),
        role: zod_1.z.enum(['rider', 'driver', 'admin', 'guest']),
        priority: zod_1.z.enum(['low', 'normal', 'high']).optional()
    }),
    params: zod_1.z.any(),
    query: zod_1.z.any()
});
exports.updateSupportTicketSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(['open', 'in_progress', 'resolved']),
        assignee: zod_1.z.string().optional(),
        resolutionNotes: zod_1.z.string().optional()
    }),
    query: zod_1.z.any()
});
//# sourceMappingURL=admin.schema.js.map