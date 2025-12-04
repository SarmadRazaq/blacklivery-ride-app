import { IRide } from '../../models/Ride';

export interface PriceBreakdown {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeFare: number;
    waitTimeFare: number;
    addOnsFare: number;
    otherFees: number; // e.g. cancellation, no-show
    totalFare: number;
    currency: string;
    surgeMultiplier?: number; // Added
}

export interface IPricingStrategy {
    calculateFare(ride: IRide, distanceKm: number, durationMinutes: number): Promise<PriceBreakdown>;
    calculateCancellationFee(ride: IRide, minutesSinceBooking: number): number;
    calculateNoShowFee(ride: IRide): number;
    calculateWaitTimeFee(ride: IRide, waitMinutes: number): number;
}
