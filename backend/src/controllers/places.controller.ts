import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db } from '../config/firebase';
import { logger } from '../utils/logger';
import axios from 'axios';

/**
 * Get user's saved places (home, work, etc.)
 */
export const getSavedPlaces = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const snapshot = await db.collection('users').doc(uid)
            .collection('savedPlaces').orderBy('updatedAt', 'desc').get();

        const places = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ data: places });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching saved places');
        res.status(500).json({ error: 'Failed to fetch saved places' });
    }
};

/**
 * Add a new saved place
 */
export const addSavedPlace = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { name, label, address, lat, lng } = req.body;

        if (!address || lat === undefined || lng === undefined) {
            res.status(400).json({ error: 'address, lat, and lng are required' });
            return;
        }

        const placeData = {
            name: name || '',
            label: label || 'other',
            address,
            lat,
            lng,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const docRef = await db.collection('users').doc(uid)
            .collection('savedPlaces').add(placeData);

        res.status(201).json({ data: { id: docRef.id, ...placeData } });
    } catch (error) {
        logger.error({ err: error }, 'Error adding saved place');
        res.status(500).json({ error: 'Failed to add saved place' });
    }
};

/**
 * Update a saved place
 */
export const updateSavedPlace = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { placeId } = req.params;

        // Whitelist allowed fields
        const allowedFields = ['label', 'address', 'lat', 'lng', 'type', 'notes'];
        const updates: Record<string, any> = {};
        for (const key of Object.keys(req.body)) {
            if (allowedFields.includes(key)) {
                updates[key] = req.body[key];
            }
        }

        const placeRef = db.collection('users').doc(uid)
            .collection('savedPlaces').doc(placeId);

        const placeDoc = await placeRef.get();
        if (!placeDoc.exists) {
            res.status(404).json({ error: 'Place not found' });
            return;
        }

        updates.updatedAt = new Date().toISOString();
        await placeRef.update(updates);

        const updated = await placeRef.get();
        res.status(200).json({ data: { id: updated.id, ...updated.data() } });
    } catch (error) {
        logger.error({ err: error }, 'Error updating saved place');
        res.status(500).json({ error: 'Failed to update saved place' });
    }
};

/**
 * Delete a saved place
 */
export const deleteSavedPlace = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { placeId } = req.params;

        const placeRef = db.collection('users').doc(uid)
            .collection('savedPlaces').doc(placeId);

        const placeDoc = await placeRef.get();
        if (!placeDoc.exists) {
            res.status(404).json({ error: 'Place not found' });
            return;
        }

        await placeRef.delete();
        res.status(200).json({ message: 'Place deleted' });
    } catch (error) {
        logger.error({ err: error }, 'Error deleting saved place');
        res.status(500).json({ error: 'Failed to delete saved place' });
    }
};

/**
 * Get recent locations
 */
export const getRecentLocations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const snapshot = await db.collection('users').doc(uid)
            .collection('recentLocations')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        const locations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ data: locations });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching recent locations');
        res.status(500).json({ error: 'Failed to fetch recent locations' });
    }
};

/**
 * Add a location to recent history
 */
export const addRecentLocation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user;
        const { address, lat, lng, name } = req.body;

        if (!address || lat === undefined || lng === undefined) {
            res.status(400).json({ error: 'address, lat, and lng are required' });
            return;
        }

        const collRef = db.collection('users').doc(uid).collection('recentLocations');

        // De-duplicate: round to ~11 m precision and check for existing entry
        const roundedLat = Math.round(lat * 10000) / 10000;
        const roundedLng = Math.round(lng * 10000) / 10000;

        const existing = await collRef
            .where('lat', '>=', roundedLat - 0.0002)
            .where('lat', '<=', roundedLat + 0.0002)
            .limit(10)
            .get();

        // Check if any existing doc is effectively the same location
        const duplicate = existing.docs.find(doc => {
            const d = doc.data();
            return Math.abs(d.lng - lng) < 0.0002;
        });

        if (duplicate) {
            // Just bump the timestamp so it appears at the top
            await duplicate.ref.update({
                timestamp: new Date().toISOString(),
                name: name || duplicate.data().name || '',
                address,
            });
            res.status(200).json({ message: 'Recent location updated' });
            return;
        }

        const locationData = {
            address,
            lat,
            lng,
            name: name || '',
            timestamp: new Date().toISOString(),
        };

        await collRef.add(locationData);

        // Keep collection capped at 20 entries
        const allDocs = await collRef.orderBy('timestamp', 'desc').get();
        if (allDocs.size > 20) {
            const toDelete = allDocs.docs.slice(20);
            const batch = db.batch();
            toDelete.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        res.status(201).json({ message: 'Location added to recent' });
    } catch (error) {
        logger.error({ err: error }, 'Error adding recent location');
        res.status(500).json({ error: 'Failed to add recent location' });
    }
};

/**
 * Search locations — delegates to Google Places API or local geocoding
 * For now returns empty results; integrate with Google Places API as needed
 */
export const searchLocations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { q } = req.query;

        if (!q || (q as string).trim().length === 0) {
            res.status(400).json({ error: 'Query parameter "q" is required' });
            return;
        }

        const query = (q as string).trim();
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            logger.warn('GOOGLE_MAPS_API_KEY not set — returning empty search results');
            res.status(200).json({ data: [] });
            return;
        }

        try {
            const response = await axios.get(
                'https://maps.googleapis.com/maps/api/place/autocomplete/json',
                {
                    params: {
                        input: query,
                        key: apiKey,
                        types: 'geocode|establishment',
                        // Optional: bias results towards a specific region
                        ...(req.query.lat && req.query.lng && {
                            location: `${req.query.lat},${req.query.lng}`,
                            radius: 50000 // 50km radius bias
                        }),
                    },
                    timeout: 10000,
                }
            );

            if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
                logger.warn({ status: response.data.status }, 'Google Places API non-OK status');
            }

            const predictions = (response.data.predictions || []).map((p: any) => ({
                id: p.place_id,
                placeId: p.place_id,
                name: p.structured_formatting?.main_text || p.description || '',
                address: p.description || '',
                mainText: p.structured_formatting?.main_text || '',
                secondaryText: p.structured_formatting?.secondary_text || '',
                types: p.types || [],
            }));

            res.status(200).json({ data: predictions });
        } catch (apiError) {
            logger.error({ err: apiError }, 'Google Places API request failed');
            // Fallback to empty results rather than failing
            res.status(200).json({ data: [] });
        }
    } catch (error) {
        logger.error({ err: error }, 'Error searching locations');
        res.status(500).json({ error: 'Failed to search locations' });
    }
};

/**
 * Get place details (coordinates) from a Google Place ID
 */
export const getPlaceDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { placeId } = req.params;

        if (!placeId) {
            res.status(400).json({ error: 'placeId is required' });
            return;
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            logger.warn('GOOGLE_MAPS_API_KEY not set — cannot resolve place details');
            res.status(503).json({ error: 'Location service unavailable' });
            return;
        }

        // Try Place Details API first
        let placeResult: { id: string; name: string; address: string; lat: number; lng: number } | null = null;

        try {
            const response = await axios.get(
                'https://maps.googleapis.com/maps/api/place/details/json',
                {
                    params: {
                        place_id: placeId,
                        key: apiKey,
                        fields: 'geometry,name,formatted_address,place_id',
                    },
                    timeout: 10000,
                }
            );

            if (response.data.status === 'OK' && response.data.result) {
                const result = response.data.result;
                placeResult = {
                    id: result.place_id || placeId,
                    name: result.name || '',
                    address: result.formatted_address || '',
                    lat: result.geometry?.location?.lat ?? 0,
                    lng: result.geometry?.location?.lng ?? 0,
                };
            } else {
                logger.warn({
                    status: response.data.status,
                    errorMessage: response.data.error_message,
                    placeId,
                }, 'Place Details API non-OK — trying Geocoding fallback');
            }
        } catch (detailsError) {
            logger.warn({ err: detailsError, placeId }, 'Place Details API failed — trying Geocoding fallback');
        }

        // Fallback: use Geocoding API with place_id
        if (!placeResult) {
            try {
                const geoResponse = await axios.get(
                    'https://maps.googleapis.com/maps/api/geocode/json',
                    {
                        params: {
                            place_id: placeId,
                            key: apiKey,
                        },
                        timeout: 10000,
                    }
                );

                if (geoResponse.data.status === 'OK' && geoResponse.data.results?.length > 0) {
                    const geoResult = geoResponse.data.results[0];
                    placeResult = {
                        id: geoResult.place_id || placeId,
                        name: geoResult.address_components?.[0]?.long_name || geoResult.formatted_address || '',
                        address: geoResult.formatted_address || '',
                        lat: geoResult.geometry?.location?.lat ?? 0,
                        lng: geoResult.geometry?.location?.lng ?? 0,
                    };
                } else {
                    logger.warn({
                        status: geoResponse.data.status,
                        errorMessage: geoResponse.data.error_message,
                        placeId,
                    }, 'Geocoding fallback also failed');
                }
            } catch (geoError) {
                logger.warn({ err: geoError, placeId }, 'Geocoding fallback request failed');
            }
        }

        if (!placeResult) {
            res.status(404).json({ error: 'Place not found' });
            return;
        }

        res.status(200).json({
            data: {
                id: placeResult.id,
                placeId: placeResult.id,
                name: placeResult.name,
                address: placeResult.address,
                lat: placeResult.lat,
                lng: placeResult.lng,
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching place details');
        res.status(500).json({ error: 'Failed to fetch place details' });
    }
};
