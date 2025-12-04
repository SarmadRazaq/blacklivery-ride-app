import * as admin from 'firebase-admin';
import * as fs from 'fs';

// Initialize Firebase Admin
// Assuming serviceAccountKey.json exists or using default credential if available
// For this environment, we might need to mock or use existing config
// Let's try to use the existing config/firebase.ts logic but simplified for a script

const serviceAccountPath = './serviceAccountKey.json';
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    console.log('No serviceAccountKey.json found. Trying default credentials...');
    admin.initializeApp();
}

const db = admin.firestore();

async function checkPricing() {
    try {
        const doc = await db.collection('pricing_rules').doc('nigeria').get();
        if (doc.exists) {
            console.log('Nigeria Pricing Data:');
            console.log(JSON.stringify(doc.data(), null, 2));
        } else {
            console.log('No pricing data found for Nigeria.');
        }
    } catch (error) {
        console.error('Error fetching pricing:', error);
    }
}

checkPricing();
