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

        const locationData = {
            address,
            lat,
            lng,
            name: name || '',
            timestamp: new Date().toISOString(),
        };

        await db.collection('users').doc(uid)
            .collection('recentLocations').add(locationData);

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
                placeId: p.place_id,
                description: p.description,
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
