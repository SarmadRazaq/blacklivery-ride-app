"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleMapsService = exports.GoogleMapsService = void 0;
const axios_1 = __importDefault(require("axios"));
class GoogleMapsService {
    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
        if (!this.apiKey) {
            console.warn('GOOGLE_MAPS_API_KEY is not set. Using fallback calculations.');
        }
    }
    /**
     * Get distance and duration between two points using Google Maps Distance Matrix API
     */
    getDistanceAndDuration(origin_1, destination_1) {
        return __awaiter(this, arguments, void 0, function* (origin, destination, mode = 'driving') {
            var _a;
            // Validate inputs
            if (!origin || origin.lat === undefined || origin.lng === undefined) {
                throw new Error('Invalid origin: lat and lng are required');
            }
            if (!destination || destination.lat === undefined || destination.lng === undefined) {
                throw new Error('Invalid destination: lat and lng are required');
            }
            if (!this.apiKey) {
                // Fallback to haversine calculation
                return this.fallbackCalculation(origin, destination);
            }
            try {
                const response = yield axios_1.default.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
                    params: {
                        origins: `${origin.lat},${origin.lng}`,
                        destinations: `${destination.lat},${destination.lng}`,
                        mode,
                        key: this.apiKey,
                        units: 'metric'
                    }
                });
                if (response.data.status !== 'OK') {
                    console.error('Google Maps API error:', response.data.status);
                    return this.fallbackCalculation(origin, destination);
                }
                const element = (_a = response.data.rows[0]) === null || _a === void 0 ? void 0 : _a.elements[0];
                if ((element === null || element === void 0 ? void 0 : element.status) !== 'OK') {
                    console.error('Route not found:', element === null || element === void 0 ? void 0 : element.status);
                    return this.fallbackCalculation(origin, destination);
                }
                return {
                    distanceMeters: element.distance.value,
                    durationSeconds: element.duration.value,
                    distanceText: element.distance.text,
                    durationText: element.duration.text
                };
            }
            catch (error) {
                console.error('Google Maps API request failed:', error);
                return this.fallbackCalculation(origin, destination);
            }
        });
    }
    /**
     * Fallback calculation using Haversine formula
     */
    fallbackCalculation(origin, destination) {
        const distanceKm = this.haversineDistance(origin, destination);
        const distanceMeters = distanceKm * 1000;
        // Assume average speed of 30 km/h in city traffic
        const durationSeconds = (distanceKm / 30) * 3600;
        return {
            distanceMeters,
            durationSeconds,
            distanceText: `${distanceKm.toFixed(1)} km`,
            durationText: `${Math.round(durationSeconds / 60)} mins`
        };
    }
    /**
     * Calculate distance between two coordinates using Haversine formula
     */
    haversineDistance(coord1, coord2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(coord2.lat - coord1.lat);
        const dLng = this.toRad(coord2.lng - coord1.lng);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(coord1.lat)) *
                Math.cos(this.toRad(coord2.lat)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Geocode an address to coordinates
     */
    geocodeAddress(address) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.apiKey) {
                console.warn('Cannot geocode without API key');
                return null;
            }
            try {
                const response = yield axios_1.default.get('https://maps.googleapis.com/maps/api/geocode/json', {
                    params: {
                        address,
                        key: this.apiKey
                    }
                });
                if (response.data.status === 'OK' && response.data.results.length > 0) {
                    const location = response.data.results[0].geometry.location;
                    return {
                        lat: location.lat,
                        lng: location.lng
                    };
                }
                return null;
            }
            catch (error) {
                console.error('Geocoding failed:', error);
                return null;
            }
        });
    }
    /**
     * Reverse geocode coordinates to address
     */
    reverseGeocode(lat, lng) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.apiKey) {
                return null;
            }
            try {
                const response = yield axios_1.default.get('https://maps.googleapis.com/maps/api/geocode/json', {
                    params: {
                        latlng: `${lat},${lng}`,
                        key: this.apiKey
                    }
                });
                if (response.data.status === 'OK' && response.data.results.length > 0) {
                    return response.data.results[0].formatted_address;
                }
                return null;
            }
            catch (error) {
                console.error('Reverse geocoding failed:', error);
                return null;
            }
        });
    }
}
exports.GoogleMapsService = GoogleMapsService;
exports.googleMapsService = new GoogleMapsService();
//# sourceMappingURL=GoogleMapsService.js.map