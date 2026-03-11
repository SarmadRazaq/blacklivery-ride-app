import { z } from 'zod';

const paymentGatewayEnum = z.enum(['paystack', 'flutterwave', 'stripe', 'monnify']);
const paymentSettlementSchema = z.object({
    driverAmount: z.number().nonnegative(),
    commissionAmount: z.number().nonnegative(),
    microAmount: z.number().nonnegative().optional()
});
const subscriptionSnapshotSchema = z.object({
    planId: z.string().optional(),
    discountRate: z.number().min(0).max(1).optional(),
    activeUntil: z.string().datetime().optional(),
    status: z.string().optional()
});

export const createRideSchema = z.object({
    body: z.object({
        pickup: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
            address: z.string().optional()
        }),
        dropoff: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
            address: z.string().min(1)
        }).optional(),
        vehicleCategory: z.enum(['motorbike', 'sedan', 'suv', 'xl', 'first_class', 'business_sedan', 'business_suv', 'cargo_van']),
        region: z.enum(['nigeria', 'chicago', 'NG', 'US-CHI']).transform(val => {
            const map: Record<string, string> = { 'nigeria': 'NG', 'chicago': 'US-CHI', 'NG': 'NG', 'US-CHI': 'US-CHI' };
            return map[val] || val;
        }),
        isDelivery: z.boolean().optional(),
        bookingType: z.enum(['on_demand', 'hourly', 'delivery', 'airport_transfer']),
        hoursBooked: z.number().min(2).optional(),
        isAirport: z.boolean().optional(),
        airportCode: z.enum(['ORD', 'MDW']).optional(),
        paymentMethod: z.enum(['cash', 'wallet', 'card']).optional(),
        scheduledAt: z.string().optional(),
        isForSomeoneElse: z.boolean().optional(),
        recipientName: z.string().optional(),
        recipientPhone: z.string().optional(),
        pricing: z
            .object({
                paymentReference: z.string().min(6),
                currency: z.enum(['NGN', 'USD']).optional()
            })
            .optional(),
        payment: z
            .object({
                holdReference: z.string().min(6).optional(),
                gateway: paymentGatewayEnum.optional(),
                settlement: paymentSettlementSchema.optional(),
                subscriptionSnapshot: subscriptionSnapshotSchema.optional()
            })
            .optional()
    }).superRefine((val, ctx) => {
        if (val.bookingType !== 'hourly' && !val.dropoff) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Dropoff location is required for non-hourly rides",
                path: ["dropoff"]
            });
        }
        if (val.bookingType === 'hourly' && !val.hoursBooked) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "hoursBooked is required for hourly rides",
                path: ["hoursBooked"]
            });
        }
    })
});

export const nearbyDriversSchema = z.object({
    query: z.object({
        lat: z.string().transform(val => parseFloat(val)),
        lng: z.string().transform(val => parseFloat(val)),
        radius: z.string().optional().transform(val => val ? parseFloat(val) : 5)
    })
});

const rideStatusEnum = z.enum([
    'accepted',
    'arrived',
    'in_progress',
    'completed',
    'cancelled',
    'delivery_en_route_pickup',
    'delivery_picked_up',
    'delivery_en_route_dropoff',
    'delivery_delivered'
]);

export const updateRideStatusSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Ride id is required')
    }),
    body: z
        .object({
            status: rideStatusEnum,
            reason: z.string().trim().min(3).max(300).optional()
        })
        .strict()
        .superRefine((val, ctx) => {
            if (val.status === 'cancelled' && !val.reason) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['reason'],
                    message: 'Cancellation reason is required when cancelling a ride'
                });
            }
        }),
    query: z.object({})
});

export const ridePaymentUpdateSchema = z.object({
    params: z.object({ rideId: z.string().min(1) }),
    body: z.object({
        pricing: z
            .object({
                paymentReference: z.string().min(6)
            })
            .optional(),
        payment: z.object({
            holdReference: z.string().min(6).optional(),
            gateway: paymentGatewayEnum.optional(),
            settlement: paymentSettlementSchema.optional(),
            subscriptionSnapshot: subscriptionSnapshotSchema.optional()
        })
    }),
    query: z.object({})
});
