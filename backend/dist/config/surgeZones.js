"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_SURGE_ZONES = exports.CHICAGO_SURGE_ZONES = exports.NIGERIA_SURGE_ZONES = void 0;
// Predefined surge zones for Nigeria
exports.NIGERIA_SURGE_ZONES = [
    {
        id: 'lagos-vi',
        name: 'Victoria Island',
        region: 'nigeria',
        city: 'lagos',
        boundaries: [
            { lat: 6.4280, lng: 3.4219 },
            { lat: 6.4280, lng: 3.4350 },
            { lat: 6.4180, lng: 3.4350 },
            { lat: 6.4180, lng: 3.4219 }
        ],
        baseMultiplier: 1.3,
        peakMultiplier: 1.5,
        isActive: true
    },
    {
        id: 'lagos-lekki',
        name: 'Lekki',
        region: 'nigeria',
        city: 'lagos',
        boundaries: [
            { lat: 6.4650, lng: 3.5500 },
            { lat: 6.4650, lng: 3.6000 },
            { lat: 6.4400, lng: 3.6000 },
            { lat: 6.4400, lng: 3.5500 }
        ],
        baseMultiplier: 1.3,
        peakMultiplier: 1.6,
        isActive: true
    },
    {
        id: 'lagos-ajah',
        name: 'Ajah',
        region: 'nigeria',
        city: 'lagos',
        boundaries: [
            { lat: 6.4700, lng: 3.5800 },
            { lat: 6.4700, lng: 3.6200 },
            { lat: 6.4500, lng: 3.6200 },
            { lat: 6.4500, lng: 3.5800 }
        ],
        baseMultiplier: 1.2,
        peakMultiplier: 1.5,
        isActive: true
    },
    {
        id: 'lagos-ikeja',
        name: 'Ikeja',
        region: 'nigeria',
        city: 'lagos',
        boundaries: [
            { lat: 6.6050, lng: 3.3400 },
            { lat: 6.6050, lng: 3.3700 },
            { lat: 6.5800, lng: 3.3700 },
            { lat: 6.5800, lng: 3.3400 }
        ],
        baseMultiplier: 1.2,
        peakMultiplier: 1.4,
        isActive: true
    },
    {
        id: 'abuja-wuse',
        name: 'Wuse',
        region: 'nigeria',
        city: 'abuja',
        boundaries: [
            { lat: 9.0700, lng: 7.4800 },
            { lat: 9.0700, lng: 7.5000 },
            { lat: 9.0500, lng: 7.5000 },
            { lat: 9.0500, lng: 7.4800 }
        ],
        baseMultiplier: 1.2,
        peakMultiplier: 1.4,
        isActive: true
    },
    {
        id: 'abuja-maitama',
        name: 'Maitama',
        region: 'nigeria',
        city: 'abuja',
        boundaries: [
            { lat: 9.0900, lng: 7.4900 },
            { lat: 9.0900, lng: 7.5100 },
            { lat: 9.0700, lng: 7.5100 },
            { lat: 9.0700, lng: 7.4900 }
        ],
        baseMultiplier: 1.3,
        peakMultiplier: 1.5,
        isActive: true
    }
];
// Predefined surge zones for Chicago
exports.CHICAGO_SURGE_ZONES = [
    {
        id: 'chicago-loop',
        name: 'The Loop',
        region: 'chicago',
        boundaries: [
            { lat: 41.8856, lng: -87.6321 },
            { lat: 41.8856, lng: -87.6200 },
            { lat: 41.8750, lng: -87.6200 },
            { lat: 41.8750, lng: -87.6321 }
        ],
        baseMultiplier: 1.2,
        peakMultiplier: 1.4,
        isActive: true
    },
    {
        id: 'chicago-gold-coast',
        name: 'Gold Coast',
        region: 'chicago',
        boundaries: [
            { lat: 41.9100, lng: -87.6350 },
            { lat: 41.9100, lng: -87.6250 },
            { lat: 41.9000, lng: -87.6250 },
            { lat: 41.9000, lng: -87.6350 }
        ],
        baseMultiplier: 1.2,
        peakMultiplier: 1.3,
        isActive: true
    },
    {
        id: 'chicago-ohare',
        name: "O'Hare Airport",
        region: 'chicago',
        boundaries: [
            { lat: 41.9850, lng: -87.9100 },
            { lat: 41.9850, lng: -87.8900 },
            { lat: 41.9700, lng: -87.8900 },
            { lat: 41.9700, lng: -87.9100 }
        ],
        baseMultiplier: 1.3,
        peakMultiplier: 1.5,
        isActive: true
    }
];
exports.ALL_SURGE_ZONES = [...exports.NIGERIA_SURGE_ZONES, ...exports.CHICAGO_SURGE_ZONES];
//# sourceMappingURL=surgeZones.js.map