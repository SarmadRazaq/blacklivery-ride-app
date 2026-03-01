import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { wrap } from '../utils/errorHandler';
import { addSavedPlaceSchema, updateSavedPlaceSchema, addRecentLocationSchema, searchLocationsSchema } from '../schemas/places.schema';
import {
    getSavedPlaces,
    addSavedPlace,
    updateSavedPlace,
    deleteSavedPlace,
    getRecentLocations,
    addRecentLocation,
    searchLocations
} from '../controllers/places.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Places
 *   description: Saved Places and Location History
 */

/**
 * @swagger
 * /places/saved:
 *   get:
 *     summary: Get user's saved places
 *     tags: [Places]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved places
 */
router.get('/saved', verifyToken, wrap(getSavedPlaces));

/**
 * @swagger
 * /places/saved:
 *   post:
 *     summary: Add a new saved place
 *     tags: [Places]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - lat
 *               - lng
 *             properties:
 *               name:
 *                 type: string
 *               label:
 *                 type: string
 *                 enum: [home, work, other]
 *               address:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *     responses:
 *       201:
 *         description: Place saved successfully
 */
router.post('/saved', verifyToken, validate(addSavedPlaceSchema), wrap(addSavedPlace));

/**
 * @swagger
 * /places/saved/{placeId}:
 *   put:
 *     summary: Update a saved place
 *     tags: [Places]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: placeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Place updated successfully
 */
router.put('/saved/:placeId', verifyToken, validate(updateSavedPlaceSchema), wrap(updateSavedPlace));

/**
 * @swagger
 * /places/saved/{placeId}:
 *   delete:
 *     summary: Delete a saved place
 *     tags: [Places]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: placeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Place deleted successfully
 */
router.delete('/saved/:placeId', verifyToken, wrap(deleteSavedPlace));

/**
 * @swagger
 * /places/recent:
 *   get:
 *     summary: Get recent locations
 *     tags: [Places]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recent locations
 */
router.get('/recent', verifyToken, wrap(getRecentLocations));

/**
 * @swagger
 * /places/recent:
 *   post:
 *     summary: Add a location to recent history
 *     tags: [Places]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - lat
 *               - lng
 *             properties:
 *               address:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Location added to recent
 */
router.post('/recent', verifyToken, validate(addRecentLocationSchema), wrap(addRecentLocation));

/**
 * @swagger
 * /places/search:
 *   get:
 *     summary: Search locations
 *     tags: [Places]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', verifyToken, validate(searchLocationsSchema), wrap(searchLocations));

export default router;
