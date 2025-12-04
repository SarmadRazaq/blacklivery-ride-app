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
            address: z.string().min(1)
        }),
        dropoff: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
            address: z.string().min(1)
        }),
        vehicleCategory: z.enum(['motorbike', 'sedan', 'suv', 'xl', 'first_class']),
        region: z.enum(['nigeria', 'chicago']),
        isDelivery: z.boolean().optional(),
        bookingType: z.enum(['on_demand', 'hourly', 'delivery']),
        hoursBooked: z.number().min(2).optional(),
        isAirport: z.boolean().optional(),
        airportCode: z.enum(['ORD', 'MDW']).optional(),
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
    })
});

export const nearbyDriversSchema = z.object({
    query: z.object({
        lat: z.string().transform(val => parseFloat(val)),
        lng: z.string().transform(val => parseFloat(val)),
        radius: z.string().optional().transform(val => val ? parseFloat(val) : 5)
    })
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
