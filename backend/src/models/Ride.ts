import { RegionCode, CurrencyCode } from '../config/region.config';

export type RideStatus =
    | 'requested'
    | 'finding_driver'
    | 'accepted'
    | 'arrived'
    | 'in_progress'
    | 'delivery_en_route_pickup'
    | 'delivery_picked_up'
    | 'delivery_en_route_dropoff'
    | 'delivery_delivered'
    | 'completed'
    | 'cancelled';

export interface IRide {
    id?: string;
    riderId: string;
    driverId?: string;
    status: RideStatus;
    bookingType: 'on_demand' | 'hourly' | 'delivery';
    pickupLocation: {
        lat: number;
        lng: number;
        address: string;
    };
    dropoffLocation: {
        lat: number;
        lng: number;
        address: string;
    };
    vehicleCategory: string;
    region: RegionCode;
    city?: 'lagos' | 'abuja' | 'chicago';

    // Airport Transfer
    isAirport?: boolean;
    airportCode?: 'ORD' | 'MDW';

    // Hourly Booking
    hoursBooked?: number;
    hourlyStartTime?: Date;

    // Delivery Details
    deliveryDetails?: {
        packageType?: string;
        isFragile?: boolean;
        requiresReturn?: boolean;
        extraStops?: number;
        serviceType?: 'instant' | 'same_day' | 'scheduled';
    };

    // Premium Add-ons
    addOns?: {
        childSeat?: number;
        extraLuggage?: boolean;
        meetAndGreet?: boolean;
        quietRide?: boolean;
        premiumVehicle?: boolean;
    };

    pricing: {
        estimatedFare: number;
        finalFare?: number;
        currency: CurrencyCode;
        surgeMultiplier?: number;
        waitTimeFee?: number;
        cancellationFee?: number;
        noShowFee?: number;
        paymentReference?: string;
        breakdown?: {
            baseFare: number;
            distanceFare: number;
            timeFare: number;
            surgeFare: number;
            waitTimeFare: number;
            addOnsFare: number;
            otherFees: number;
        };
    };
    payment?: {
        reference?: string;
        holdReference?: string;
        status?: 'pending' | 'held' | 'captured' | 'released';
        gateway?: 'paystack' | 'flutterwave' | 'stripe' | 'monnify';
        commissionRate?: number;
        metadata?: Record<string, any>;
        capturedAt?: Date;
        settlement?: {
            driverAmount: number;
            commissionAmount: number;
            microAmount?: number;
        };
    };
    pickupGeohash?: string;
    pickupGeohash5?: string;
    dropoffGeohash5?: string;
    matching?: {
        batch?: number;
        radiusKm?: number;
        dispatchedAt?: Date;
    };
    requestedDriverIds?: string[];
    createdAt: Date;
    updatedAt?: Date;
    acceptedAt?: Date;
    arrivedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
}
