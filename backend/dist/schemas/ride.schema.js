"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ridePaymentUpdateSchema = exports.nearbyDriversSchema = exports.createRideSchema = void 0;
const zod_1 = require("zod");
const paymentGatewayEnum = zod_1.z.enum(['paystack', 'flutterwave', 'stripe', 'monnify']);
const paymentSettlementSchema = zod_1.z.object({
    driverAmount: zod_1.z.number().nonnegative(),
    commissionAmount: zod_1.z.number().nonnegative(),
    microAmount: zod_1.z.number().nonnegative().optional()
});
const subscriptionSnapshotSchema = zod_1.z.object({
    planId: zod_1.z.string().optional(),
    discountRate: zod_1.z.number().min(0).max(1).optional(),
    activeUntil: zod_1.z.string().datetime().optional(),
    status: zod_1.z.string().optional()
});
exports.createRideSchema = zod_1.z.object({
    body: zod_1.z.object({
        pickup: zod_1.z.object({
            lat: zod_1.z.number().min(-90).max(90),
            lng: zod_1.z.number().min(-180).max(180),
            address: zod_1.z.string().optional()
        }),
        dropoff: zod_1.z.object({
            lat: zod_1.z.number().min(-90).max(90),
            lng: zod_1.z.number().min(-180).max(180),
            address: zod_1.z.string().min(1)
        }).optional(),
        vehicleCategory: zod_1.z.enum(['motorbike', 'sedan', 'suv', 'xl', 'first_class', 'business_sedan']),
        region: zod_1.z.enum(['nigeria', 'chicago']),
        isDelivery: zod_1.z.boolean().optional(),
        bookingType: zod_1.z.enum(['on_demand', 'hourly', 'delivery', 'airport_transfer']),
        hoursBooked: zod_1.z.number().min(2).optional(),
        isAirport: zod_1.z.boolean().optional(),
        airportCode: zod_1.z.enum(['ORD', 'MDW']).optional(),
        pricing: zod_1.z
            .object({
            paymentReference: zod_1.z.string().min(6),
            currency: zod_1.z.enum(['NGN', 'USD']).optional()
        })
            .optional(),
        payment: zod_1.z
            .object({
            holdReference: zod_1.z.string().min(6).optional(),
            gateway: paymentGatewayEnum.optional(),
            settlement: paymentSettlementSchema.optional(),
            subscriptionSnapshot: subscriptionSnapshotSchema.optional()
        })
            .optional()
    }).superRefine((val, ctx) => {
        if (val.bookingType !== 'hourly' && !val.dropoff) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Dropoff location is required for non-hourly rides",
                path: ["dropoff"]
            });
        }
        if (val.bookingType === 'hourly' && !val.hoursBooked) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "hoursBooked is required for hourly rides",
                path: ["hoursBooked"]
            });
        }
    })
});
exports.nearbyDriversSchema = zod_1.z.object({
    query: zod_1.z.object({
        lat: zod_1.z.string().transform(val => parseFloat(val)),
        lng: zod_1.z.string().transform(val => parseFloat(val)),
        radius: zod_1.z.string().optional().transform(val => val ? parseFloat(val) : 5)
    })
});
exports.ridePaymentUpdateSchema = zod_1.z.object({
    params: zod_1.z.object({ rideId: zod_1.z.string().min(1) }),
    body: zod_1.z.object({
        pricing: zod_1.z
            .object({
            paymentReference: zod_1.z.string().min(6)
        })
            .optional(),
        payment: zod_1.z.object({
            holdReference: zod_1.z.string().min(6).optional(),
            gateway: paymentGatewayEnum.optional(),
            settlement: paymentSettlementSchema.optional(),
            subscriptionSnapshot: subscriptionSnapshotSchema.optional()
        })
    }),
    query: zod_1.z.object({})
});
//# sourceMappingURL=ride.schema.js.map