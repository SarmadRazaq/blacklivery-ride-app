import { z } from 'zod';

export const requestPayoutSchema = z.object({
    body: z.object({
        amount: z.number().positive('Amount must be positive'),
        currency: z.enum(['NGN', 'USD']).optional(),
        accountNumber: z.string().optional(),
        bankCode: z.string().optional(),
        bankAccountId: z.string().optional(),
        accountName: z.string().optional(),
    })
});
