import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        logger.info('Firebase Admin Initialized');
    } catch (error) {
        logger.fatal({ err: error }, 'Firebase Admin Initialization Error');
        process.exit(1); // Cannot run without Firebase
    }
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

export { db };
export const auth = admin.auth();
export const rtdb = admin.database();
