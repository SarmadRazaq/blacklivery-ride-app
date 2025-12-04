"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REGION = exports.REGIONS = void 0;
exports.REGIONS = {
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
exports.DEFAULT_REGION = 'NG';
//# sourceMappingURL=region.config.js.map