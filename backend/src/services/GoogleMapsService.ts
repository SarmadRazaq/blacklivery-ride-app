import axios from 'axios';

interface DistanceMatrixResult {
    distanceMeters: number;
    durationSeconds: number;
    distanceText: string;
    durationText: string;
}

export class GoogleMapsService {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
        if (!this.apiKey) {
            console.warn('GOOGLE_MAPS_API_KEY is not set. Using fallback calculations.');
        }
    }

    /**
     * Get distance and duration between two points using Google Maps Distance Matrix API
     */
    async getDistanceAndDuration(
        origin: { lat: number; lng: number },
        destination: { lat: number; lng: number },
        mode: 'driving' | 'walking' | 'bicycling' = 'driving'
    ): Promise<DistanceMatrixResult> {
        if (!this.apiKey) {
            // Fallback to haversine calculation
            return this.fallbackCalculation(origin, destination);
        }

        try {
            const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
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

            const element = response.data.rows[0]?.elements[0];

            if (element?.status !== 'OK') {
                console.error('Route not found:', element?.status);
                return this.fallbackCalculation(origin, destination);
            }

            return {
                distanceMeters: element.distance.value,
                durationSeconds: element.duration.value,
                distanceText: element.distance.text,
                durationText: element.duration.text
            };

        } catch (error) {
            console.error('Google Maps API request failed:', error);
            return this.fallbackCalculation(origin, destination);
        }
    }

    /**
     * Fallback calculation using Haversine formula
     */
    private fallbackCalculation(
        origin: { lat: number; lng: number },
        destination: { lat: number; lng: number }
    ): DistanceMatrixResult {
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
    private haversineDistance(
        coord1: { lat: number; lng: number },
        coord2: { lat: number; lng: number }
    ): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(coord2.lat - coord1.lat);
        const dLng = this.toRad(coord2.lng - coord1.lng);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(coord1.lat)) *
            Math.cos(this.toRad(coord2.lat)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Geocode an address to coordinates
     */
    async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
        if (!this.apiKey) {
            console.warn('Cannot geocode without API key');
            return null;
        }

        try {
            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
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
        } catch (error) {
            console.error('Geocoding failed:', error);
            return null;
        }
    }

    /**
     * Reverse geocode coordinates to address
     */
    async reverseGeocode(lat: number, lng: number): Promise<string | null> {
        if (!this.apiKey) {
            return null;
        }

        try {
            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    latlng: `${lat},${lng}`,
                    key: this.apiKey
                }
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                return response.data.results[0].formatted_address;
            }

            return null;
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            return null;
        }
    }
}

export const googleMapsService = new GoogleMapsService();
