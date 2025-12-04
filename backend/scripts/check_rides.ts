import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.firestore();

async function check() {
    console.log('🔎 Checking Rides in DB...');
    try {
        const snaps = await db.collection('rides').get();
        console.log(`✅ Found ${snaps.size} rides in DB:`);
        
        snaps.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id} | Status: ${data.status} | Driver: ${data.driverId || 'None'}`);
        });
    } catch (error) {
        console.error('❌ Error checking rides:', error);
    }
    process.exit(0);
}

check();
