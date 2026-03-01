import { RegionCode, CurrencyCode } from '../config/region.config';

export type UserRole = 'rider' | 'driver' | 'admin';

export interface IDriverStatus {
    isOnline: boolean;
    state?: 'available' | 'busy' | 'offline' | 'pending_documents';
    lastHeartbeat?: Date | null;
    lastKnownLocation?: {
        lat: number;
        lng: number;
    };
    geohash4?: string;
    geohash5?: string;
    offlineReason?: string;
    autoOfflineAt?: Date | null;
    lastOnlineAt?: Date | null;
    updatedAt?: Date;
}

export interface IDriverProfile {
    vehicleId?: string;
    licenseNumber?: string;
    insuranceExpiry?: Date;
    bankDetails?: {
        accountName: string;
        accountNumber: string;
        bankCode: string;
        bankName?: string;
    };
    stripeAccountId?: string;
    autoPayoutEnabled?: boolean;
    autoPayoutThreshold?: number;
    preferredPayoutCurrency?: 'NGN' | 'USD';
}

export interface IStripeConnect {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    updatedAt?: Date;
}

export interface IEmergencyContact {
    name: string;
    phoneNumber: string;
    relationship?: string;
}

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

    // Driver status (real-time online/location tracking)
    driverStatus?: IDriverStatus;

    // Driver profile (onboarding details & payout config)
    driverProfile?: IDriverProfile;

    // Emergency Contacts
    emergencyContacts?: IEmergencyContact[];

    // Legacy driver fields (kept for backward compat)
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

    // Stripe Connect account
    stripeConnectAccountId?: string;
    stripeConnect?: IStripeConnect;

    // Loyalty
    loyaltyPoints?: number;
    loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';

    deviceId?: string;
    isDeviceBanned?: boolean;
    fcmTokens?: string[];
}
