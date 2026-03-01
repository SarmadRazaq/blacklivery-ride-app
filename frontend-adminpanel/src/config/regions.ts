// ─── Region Configuration ────────────────────────────────────────────────────
// Defines all supported regions, their currencies, cities, vehicle categories,
// and other region-specific data. Adding a new region only requires editing
// this file.

export interface RegionConfig {
    code: string;
    label: string;
    currency: string;
    currencySymbol: string;
    cities?: { code: string; label: string }[];
}

// ─── Supported Regions ───────────────────────────────────────────────────────
export const REGIONS: RegionConfig[] = [
    {
        code: 'NG',
        label: 'Nigeria',
        currency: 'NGN',
        currencySymbol: '₦',
        cities: [
            { code: 'lagos', label: 'Lagos' },
            { code: 'abuja', label: 'Abuja' },
        ],
    },
    {
        code: 'US-CHI',
        label: 'Chicago',
        currency: 'USD',
        currencySymbol: '$',
    },
];

export const DEFAULT_REGION_CODE = 'NG';
export const DEFAULT_CURRENCY = 'NGN';
export const DEFAULT_CURRENCY_SYMBOL = '₦';
export const NIGERIA_DEFAULT_CITY = 'lagos';

/** Look up a region by code. Falls back to the first region if not found. */
export const getRegion = (code: string): RegionConfig =>
    REGIONS.find((r) => r.code === code) || REGIONS[0];

/** Get the currency symbol for a given currency code (e.g. 'NGN' → '₦'). */
export const getCurrencySymbol = (currencyCode?: string): string => {
    if (!currencyCode) return DEFAULT_CURRENCY_SYMBOL;
    const region = REGIONS.find((r) => r.currency === currencyCode);
    return region?.currencySymbol ?? currencyCode;
};

/** Format a monetary value with the appropriate currency symbol. */
export const formatCurrency = (amount: number, currencyCode?: string): string => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toLocaleString()}`;
};

// ─── Default Map Center ──────────────────────────────────────────────────────
// Used when no driver locations are available.
export const DEFAULT_MAP_CENTER = {
    lat: parseFloat(import.meta.env.VITE_DEFAULT_MAP_LAT || '6.5244'),
    lng: parseFloat(import.meta.env.VITE_DEFAULT_MAP_LNG || '3.3792'),
};

// ─── Vehicle Categories ──────────────────────────────────────────────────────
export const VEHICLE_CATEGORIES = [
    { value: 'economy', label: 'Economy' },
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'suv', label: 'SUV' },
    { value: 'business_sedan', label: 'Business Sedan' },
    { value: 'business_suv', label: 'Business SUV' },
    { value: 'cargo_van', label: 'Cargo Van' },
] as const;

// ─── Nigeria Vehicle Categories ──────────────────────────────────────────────
export const NIGERIA_VEHICLE_CATEGORIES = [
    { key: 'sedan', label: 'Sedan (Luxury)' },
    { key: 'suv', label: 'SUV (Premium)' },
    { key: 'xl', label: 'XL (7-Seater)' },
] as const;

// ─── Chicago Vehicle Categories ──────────────────────────────────────────────
export const CHICAGO_VEHICLE_CATEGORIES = [
    { key: 'business_sedan', label: 'Business Sedan' },
    { key: 'business_suv', label: 'Business SUV' },
    { key: 'first_class', label: 'First Class' },
] as const;

// ─── Delivery Vehicle Categories ─────────────────────────────────────────────
export const DELIVERY_VEHICLE_CATEGORIES = [
    { key: 'motorbike', label: 'Motorbike' },
    { key: 'sedan', label: 'Sedan' },
    { key: 'suv', label: 'SUV' },
    { key: 'van', label: 'Van / Truck' },
] as const;

// ─── Chicago Airports ────────────────────────────────────────────────────────
export const CHICAGO_AIRPORTS = [
    { code: 'ORD', label: "O'Hare" },
    { code: 'MDW', label: 'Midway' },
] as const;

// ─── Pricing Tab Regions ─────────────────────────────────────────────────────
export const PRICING_REGIONS = ['nigeria', 'chicago', 'nigeria_delivery'] as const;

// ─── Loyalty Tiers ───────────────────────────────────────────────────────────
export const LOYALTY_TIERS = [
    { key: 'bronze', label: 'Bronze', colorClass: 'text-orange-600' },
    { key: 'silver', label: 'Silver', colorClass: 'text-gray-400' },
    { key: 'gold', label: 'Gold', colorClass: 'text-yellow-500' },
    { key: 'platinum', label: 'Platinum', colorClass: 'text-purple-500' },
] as const;

export const TIER_BADGE_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    bronze: 'default',
    silver: 'info',
    gold: 'warning',
    platinum: 'success',
};

// ─── Delivery Statuses ───────────────────────────────────────────────────────
export const DELIVERY_STATUSES = ['finding_driver', 'accepted', 'picked_up', 'in_transit', 'delivered'] as const;

// ─── Ride Statuses (for dashboard refresh triggers) ──────────────────────────
export const RIDE_STATUS_REFRESH_TRIGGERS = ['completed', 'cancelled', 'in_progress', 'accepted', 'arrived', 'finding_driver'] as const;

// ─── Ride Status Badge Mapping ───────────────────────────────────────────────
export const RIDE_STATUS_BADGE: Record<string, 'success' | 'danger' | 'info' | 'warning' | 'default'> = {
    completed: 'success',
    cancelled: 'danger',
    in_progress: 'info',
    accepted: 'warning',
};
