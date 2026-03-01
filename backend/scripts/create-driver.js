/**
 * One-off script: Create a driver account in Firebase Auth + Firestore.
 * Run from backend folder:  node scripts/create-driver.js
 */
const admin = require('firebase-admin');
const path = require('path');

// Reuse the backend's service account
const serviceAccountPath = path.resolve(__dirname, '..', 'share-ride-app-25e6c-firebase-adminsdk-fbsvc-93dad948aa.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://share-ride-app-25e6c-default-rtdb.firebaseio.com/'
});

const auth = admin.auth();
const db = admin.firestore();

async function main() {
    const email = 'driver@blacklivery.com';
    const password = 'Driver@123';
    const displayName = 'Test Driver';

    try {
        // 1. Create Firebase Auth user
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
            console.log('User already exists:', userRecord.uid);
        } catch (e) {
            userRecord = await auth.createUser({
                email,
                password,
                displayName,
                emailVerified: true,
            });
            console.log('Created Firebase Auth user:', userRecord.uid);
        }

        // 2. Create / overwrite Firestore profile with role = driver
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            displayName,
            phoneNumber: '',
            photoURL: '',
            role: 'driver',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            region: 'US',
            currency: 'USD',
            countryCode: 'US',
            emailLowercase: email.toLowerCase(),
            phoneVerified: false,
            linkedProviders: ['password'],
            driverOnboarding: {
                status: 'approved',       // skip onboarding for testing
                completedAt: new Date(),
            },
            driverDetails: {
                vehicleType: 'sedan',
                licensePlate: 'BLK-DRV-01',
            },
        }, { merge: true });

        console.log('\n✅ Driver account ready!');
        console.log('────────────────────────────');
        console.log(`   Email:    ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Role:     driver`);
        console.log(`   UID:      ${userRecord.uid}`);
        console.log('────────────────────────────\n');

        process.exit(0);
    } catch (err) {
        console.error('Failed:', err);
        process.exit(1);
    }
}

main();
