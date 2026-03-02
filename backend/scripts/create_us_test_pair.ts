/**
 * Create a US-based rider + driver pair at the same Chicago location for testing.
 * Run from backend/:  npx ts-node scripts/create_us_test_pair.ts
 */
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
}

const auth = admin.auth();
const db = admin.firestore();

// Same location: downtown Chicago (Willis Tower area)
const CHICAGO_LAT = 41.8789;
const CHICAGO_LNG = -87.6359;
const GEOHASH4 = 'dp3w';
const GEOHASH5 = 'dp3wj';

const PASSWORD = 'Test1234!';

async function upsertUser(uid: string, email: string, displayName: string, role: string) {
    let userRecord: admin.auth.UserRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
        userRecord = await auth.updateUser(userRecord.uid, {
            password: PASSWORD,
            displayName,
            emailVerified: true,
        });
        console.log(`  ↳ Updated existing user: ${email}`);
    } catch {
        userRecord = await auth.createUser({
            uid,
            email,
            password: PASSWORD,
            displayName,
            emailVerified: true,
        });
        console.log(`  ↳ Created new user: ${email}`);
    }
    await auth.setCustomUserClaims(userRecord.uid, { role });
    return userRecord;
}

async function main() {
    console.log('\n🇺🇸 Creating US test pair (Chicago)...\n');

    // ── Rider ────────────────────────────────────────────────────────
    const rider = await upsertUser(
        'us-rider-test',
        'rider.us@blacklivery.test',
        'Alex Chicago',
        'rider',
    );

    const now = new Date();
    await db.collection('users').doc(rider.uid).set({
        uid: rider.uid,
        email: 'rider.us@blacklivery.test',
        emailLowercase: 'rider.us@blacklivery.test',
        displayName: 'Alex Chicago',
        firstName: 'Alex',
        lastName: 'Chicago',
        phoneNumber: '+14155550201',
        photoURL: '',
        role: 'rider',
        isActive: true,
        region: 'US-CHI',
        currency: 'USD',
        countryCode: 'US',
        createdAt: now,
        updatedAt: now,
        loyaltyPoints: 0,
        loyaltyTier: 'bronze',
        phoneVerified: true,
        linkedProviders: ['password'],
    }, { merge: true });

    console.log('  ✅ Rider ready');

    // ── Driver ───────────────────────────────────────────────────────
    const driver = await upsertUser(
        'us-driver-test',
        'driver.us@blacklivery.test',
        'Marcus Willis',
        'driver',
    );

    await db.collection('users').doc(driver.uid).set({
        uid: driver.uid,
        email: 'driver.us@blacklivery.test',
        emailLowercase: 'driver.us@blacklivery.test',
        displayName: 'Marcus Willis',
        firstName: 'Marcus',
        lastName: 'Willis',
        phoneNumber: '+14155550202',
        photoURL: '',
        role: 'driver',
        isActive: true,
        region: 'US-CHI',
        currency: 'USD',
        countryCode: 'US',
        createdAt: now,
        updatedAt: now,
        loyaltyPoints: 0,
        loyaltyTier: 'bronze',
        phoneVerified: true,
        linkedProviders: ['password'],
        driverOnboarding: {
            status: 'approved',
            completedAt: now,
        },
        driverStatus: {
            isOnline: true,
            state: 'available',
            lastHeartbeat: now,
            lastKnownLocation: { lat: CHICAGO_LAT, lng: CHICAGO_LNG },
            geohash4: GEOHASH4,
            geohash5: GEOHASH5,
            lastOnlineAt: now,
            updatedAt: now,
        },
        driverProfile: {
            vehicleId: 'vehicle-us-001',
            licenseNumber: 'IL-DRV-2026-001',
        },
        driverDetails: {
            vehicleId: 'vehicle-us-001',
            vehicleType: 'sedan',
            licensePlate: 'BLK-US-01',
            licenseNumber: 'IL-DRV-2026-001',
            isOnline: true,
            currentLocation: { lat: CHICAGO_LAT, lng: CHICAGO_LNG, geohash: GEOHASH5 },
            rating: 4.9,
            totalTrips: 0,
            earnings: 0,
        },
    }, { merge: true });

    // Create vehicle document
    await db.collection('vehicles').doc('vehicle-us-001').set({
        id: 'vehicle-us-001',
        driverId: driver.uid,
        make: 'Toyota',
        model: 'Camry',
        year: 2024,
        color: 'Black',
        licensePlate: 'BLK-US-01',
        vehicleType: 'sedan',
        isActive: true,
        createdAt: now,
        updatedAt: now,
    }, { merge: true });

    console.log('  ✅ Driver ready (online, at same location)\n');

    // ── Summary ──────────────────────────────────────────────────────
    console.log('════════════════════════════════════════════');
    console.log('  US TEST CREDENTIALS (Chicago)');
    console.log('════════════════════════════════════════════');
    console.log('');
    console.log('  📱 RIDER APP');
    console.log('  Email:    rider.us@blacklivery.test');
    console.log(`  Password: ${PASSWORD}`);
    console.log('');
    console.log('  🚗 DRIVER APP');
    console.log('  Email:    driver.us@blacklivery.test');
    console.log(`  Password: ${PASSWORD}`);
    console.log('');
    console.log(`  📍 Location: Chicago (${CHICAGO_LAT}, ${CHICAGO_LNG})`);
    console.log('  💵 Region:  US-CHI / USD');
    console.log('════════════════════════════════════════════\n');

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});
