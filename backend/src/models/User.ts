import { RegionCode, CurrencyCode } from '../config/region.config';

export type UserRole = 'rider' | 'driver' | 'admin';

export interface IUser {
    uid: string;
    email: string;
    displayName?: string;
    phoneNumber?: string;
    photoURL?: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    region: RegionCode;
    currency: CurrencyCode;

    // Driver specific fields
    driverDetails?: {
        vehicleId?: string;
        licenseNumber?: string;
        isOnline: boolean;
        currentLocation?: {
            lat: number;
            lng: number;
            geohash: string;
        };
        rating: number;
        totalTrips: number;
        earnings: number;
    };
    deviceId?: string; // For fingerprinting
    isDeviceBanned?: boolean;
}
