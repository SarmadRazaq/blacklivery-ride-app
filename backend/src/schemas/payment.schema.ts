import { z } from 'zod';

export const initiatePaymentSchema = z.object({
    body: z.object({
        amount: z.number().positive('Amount must be positive'),
        currency: z.string().min(3).max(3).optional(),
        region: z.string().optional(),
        rideId: z.string().optional(),
        purpose: z.string().optional(),
        description: z.string().optional(),
        callbackUrl: z.string().url().optional(),
        captureNow: z.boolean().optional(),
        reference: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
    })
});

export const verifyPaymentSchema = z.object({
    body: z.object({
        reference: z.string().optional(),
        transactionId: z.string().optional(),
        currency: z.string().min(3).max(3).optional(),
        purpose: z.string().optional(),
        region: z.string().optional(),
    }).refine(data => data.reference || data.transactionId, {
        message: 'Either reference or transactionId is required'
    })
});

export const addWalletSchema = z.object({
    body: z.object({
        amount: z.number().positive(),
        currency: z.string().min(3).max(3).optional(),
        region: z.string().optional(),
    })
});

export const withdrawWalletSchema = z.object({
    body: z.object({
        amount: z.number().positive(),
        currency: z.string().min(3).max(3).optional(),
        bankAccountId: z.string().optional(),
        bankCode: z.string().optional(),
        accountNumber: z.string().optional(),
    })
});

export const addPaymentMethodSchema = z.object({
    body: z.object({
        type: z.string().min(1),
        details: z.record(z.string(), z.any()),
        isDefault: z.boolean().optional(),
    })
});

export const walletChargeRideSchema = z.object({
    body: z.object({
        rideId: z.string().min(1, 'rideId is required'),
        amount: z.number().positive('Amount must be positive'),
        currency: z.string().length(3).optional(),
    })
});
