// backend/src/utils/geocoding.ts
import { logger } from './logger';

interface NominatimResponse {
    display_name?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
        // Using OpenStreetMap Nominatim (free, no API key needed)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            {
                headers: {
                    'User-Agent': 'RiderApp/1.0' // Required by Nominatim
                }
            }
        );
        
        if (!response.ok) return null;
        
        const data = await response.json() as NominatimResponse;
        return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
        logger.warn({ err: error }, 'Reverse geocoding failed');
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`; // Fallback to coordinates
    }
}