import { RegionCode } from '../config/region.config';

export interface IIncentive {
    id?: string;
    driverId: string;
    region: RegionCode;
    date: Date; // Daily tracking

    // Trip Counts
    ridesCompleted: number;
    deliveriesCompleted: number;
    peakHourTrips: number;
    airportTrips: number;

    // Bonuses Earned
    dailyBonus: number;
    weeklyBonus: number;
    peakHourBonus: number;
    airportBonus: number;
    weatherBonus: number;
    deliveryBonus?: number;
    weatherBonusTrips?: number;
    totalEarned: number;

    // Status
    isPaid: boolean;
    paidAt?: Date;

    createdAt: Date;
    updatedAt?: Date;
}

export interface IWeeklyIncentive {
    id?: string;
    driverId: string;
    region: RegionCode;
    weekStart: Date;
    weekEnd: Date;

    totalRides: number;
    totalDeliveries: number;
    weeklyBonus: number;
    weeklyEarnings?: number; // Cumulative driver earnings for the week
    guaranteeEarnings?: number; // Chicago weekly guarantee

    isPaid: boolean;
    paidAt?: Date;

    createdAt: Date;
}
