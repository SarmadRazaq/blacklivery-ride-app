export type RegionCode = 'NG' | 'US-CHI';
export type CurrencyCode = 'NGN' | 'USD';
export type UnitSystem = 'metric' | 'imperial'; // km vs miles

export interface RegionSettings {
    code: RegionCode;
    name: string;
    currency: CurrencyCode;
    currencySymbol: string;
    timezone: string;
    units: UnitSystem;
    services: {
        ride: boolean;
        delivery: boolean;
        hourly: boolean;
        airport: boolean;
    };
    defaultCommission: number;
}

export const REGIONS: Record<RegionCode, RegionSettings> = {
    'NG': {
        code: 'NG',
        name: 'Nigeria',
        currency: 'NGN',
        currencySymbol: '₦',
        timezone: 'Africa/Lagos',
        units: 'metric',
        services: {
            ride: true,
            delivery: true,
            hourly: false, // Not mentioned for Nigeria
            airport: false // Not explicitly fixed-price like Chicago
        },
        defaultCommission: 0.25
    },
    'US-CHI': {
        code: 'US-CHI',
        name: 'Chicago',
        currency: 'USD',
        currencySymbol: '$',
        timezone: 'America/Chicago',
        units: 'imperial',
        services: {
            ride: true,
            delivery: false, // "Premium services rarely use..." implied focus on ride
            hourly: true,
            airport: true
        },
        defaultCommission: 0.25
    }
};

export const DEFAULT_REGION: RegionCode = 'NG';

