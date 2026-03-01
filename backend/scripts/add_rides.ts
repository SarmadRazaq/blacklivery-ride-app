/**
 * Adds 4 completed rides to the driver account for sarmad.razaq5@gmail.com
 *
 * Usage:  npx ts-node scripts/add_rides.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as admin from 'firebase-admin';

// ── Firebase init ────────────────────────────────────────────────────
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// ── Helpers ──────────────────────────────────────────────────────────
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000);

async function main() {
    console.log('\n🔍 Looking up driver by email: sarmad.razaq5@gmail.com\n');

    // Find the driver's UID by email
    const usersSnap = await db.collection('users')
        .where('emailLowercase', '==', 'sarmad.razaq5@gmail.com')
        .limit(1)
        .get();

    let driverId: string;

    if (usersSnap.empty) {
        // Try searching by email field directly
        const usersSnap2 = await db.collection('users')
            .where('email', '==', 'sarmad.razaq5@gmail.com')
            .limit(1)
            .get();

        if (usersSnap2.empty) {
            // Try Firebase Auth lookup
            try {
                const userRecord = await admin.auth().getUserByEmail('sarmad.razaq5@gmail.com');
                driverId = userRecord.uid;
                console.log(`  ✓ Found via Firebase Auth: ${driverId}`);
            } catch {
                console.error('  ✗ Could not find user by email. Aborting.');
                process.exit(1);
            }
        } else {
            driverId = usersSnap2.docs[0].id;
            console.log(`  ✓ Found via email field: ${driverId}`);
        }
    } else {
        driverId = usersSnap.docs[0].id;
        console.log(`  ✓ Found via emailLowercase: ${driverId}`);
    }

    // Use test riders as the rider on these rides
    // First check if test riders exist, otherwise use a generic rider ID
    let riderId = 'rider-test-001';
    const riderSnap = await db.collection('users').doc(riderId).get();
    if (!riderSnap.exists) {
        // Create a minimal test rider
        await db.collection('users').doc(riderId).set({
            uid: riderId,
            email: 'testrider@blacklivery.test',
            displayName: 'Alex Johnson',
            firstName: 'Alex',
            lastName: 'Johnson',
            role: 'rider',
            isActive: true,
            region: 'NG',
            currency: 'NGN',
            createdAt: daysAgo(30),
            updatedAt: now,
        });
        console.log('  ✓ Created test rider: Alex Johnson');
    }

    // 4 completed rides with realistic Lagos locations
    const rides = [
        {
            id: `ride-sarmad-001`,
            riderId: riderId,
            driverId: driverId,
            status: 'completed',
            bookingType: 'on_demand',
            pickupLocation: {
                lat: 6.5244,
                lng: 3.3792,
                address: 'Eko Atlantic City, Victoria Island, Lagos',
            },
            dropoffLocation: {
                lat: 6.4281,
                lng: 3.4219,
                address: 'Lekki Phase 1, Admiralty Way, Lagos',
            },
            vehicleCategory: 'sedan',
            region: 'NG',
            city: 'lagos',
            pricing: {
                estimatedFare: 4500,
                finalFare: 4800,
                currency: 'NGN',
                surgeMultiplier: 1.0,
                breakdown: {
                    baseFare: 1000,
                    distanceFare: 2500,
                    timeFare: 800,
                    surgeFare: 0,
                    waitTimeFare: 500,
                    addOnsFare: 0,
                    otherFees: 0,
                },
            },
            payment: {
                status: 'captured',
                gateway: 'paystack',
                commissionRate: 0.20,
                settlement: {
                    driverAmount: 3840,
                    commissionAmount: 960,
                },
            },
            createdAt: daysAgo(1),
            acceptedAt: daysAgo(1),
            arrivedAt: daysAgo(1),
            startedAt: daysAgo(1),
            completedAt: daysAgo(1),
            driverRating: 5,
            driverFeedback: 'Very professional driver!',
            riderRating: 5,
        },
        {
            id: `ride-sarmad-002`,
            riderId: riderId,
            driverId: driverId,
            status: 'completed',
            bookingType: 'on_demand',
            pickupLocation: {
                lat: 6.5955,
                lng: 3.3421,
                address: 'Ikeja City Mall, Alausa, Lagos',
            },
            dropoffLocation: {
                lat: 6.4541,
                lng: 3.3947,
                address: 'Ikoyi, Bourdillon Road, Lagos',
            },
            vehicleCategory: 'sedan',
            region: 'NG',
            city: 'lagos',
            pricing: {
                estimatedFare: 5500,
                finalFare: 6200,
                currency: 'NGN',
                surgeMultiplier: 1.3,
                breakdown: {
                    baseFare: 1000,
                    distanceFare: 3200,
                    timeFare: 1000,
                    surgeFare: 600,
                    waitTimeFare: 400,
                    addOnsFare: 0,
                    otherFees: 0,
                },
            },
            payment: {
                status: 'captured',
                gateway: 'paystack',
                commissionRate: 0.20,
                settlement: {
                    driverAmount: 4960,
                    commissionAmount: 1240,
                },
            },
            createdAt: daysAgo(2),
            acceptedAt: daysAgo(2),
            arrivedAt: daysAgo(2),
            startedAt: daysAgo(2),
            completedAt: daysAgo(2),
            driverRating: 4,
            driverFeedback: 'Good ride.',
            riderRating: 5,
        },
        {
            id: `ride-sarmad-003`,
            riderId: riderId,
            driverId: driverId,
            status: 'completed',
            bookingType: 'on_demand',
            pickupLocation: {
                lat: 6.4326,
                lng: 3.4196,
                address: 'Lekki Conservation Centre, Lagos',
            },
            dropoffLocation: {
                lat: 6.5630,
                lng: 3.3685,
                address: 'Murtala Muhammed Airport, Ikeja, Lagos',
            },
            vehicleCategory: 'sedan',
            region: 'NG',
            city: 'lagos',
            pricing: {
                estimatedFare: 8000,
                finalFare: 8500,
                currency: 'NGN',
                surgeMultiplier: 1.0,
                breakdown: {
                    baseFare: 1500,
                    distanceFare: 4500,
                    timeFare: 1500,
                    surgeFare: 0,
                    waitTimeFare: 500,
                    addOnsFare: 0,
                    otherFees: 500,
                },
            },
            payment: {
                status: 'captured',
                gateway: 'paystack',
                commissionRate: 0.20,
                settlement: {
                    driverAmount: 6800,
                    commissionAmount: 1700,
                },
            },
            createdAt: daysAgo(3),
            acceptedAt: daysAgo(3),
            arrivedAt: daysAgo(3),
            startedAt: daysAgo(3),
            completedAt: daysAgo(3),
            driverRating: 5,
            driverFeedback: 'Excellent service, very comfortable ride!',
            riderRating: 5,
        },
        {
            id: `ride-sarmad-004`,
            riderId: riderId,
            driverId: driverId,
            status: 'completed',
            bookingType: 'on_demand',
            pickupLocation: {
                lat: 6.4412,
                lng: 3.4178,
                address: 'The Palms Shopping Mall, Lekki, Lagos',
            },
            dropoffLocation: {
                lat: 6.4638,
                lng: 3.3601,
                address: 'National Theatre, Iganmu, Lagos',
            },
            vehicleCategory: 'sedan',
            region: 'NG',
            city: 'lagos',
            pricing: {
                estimatedFare: 3800,
                finalFare: 3800,
                currency: 'NGN',
                surgeMultiplier: 1.0,
                breakdown: {
                    baseFare: 800,
                    distanceFare: 2000,
                    timeFare: 700,
                    surgeFare: 0,
                    waitTimeFare: 300,
                    addOnsFare: 0,
                    otherFees: 0,
                },
            },
            payment: {
                status: 'captured',
                gateway: 'paystack',
                commissionRate: 0.20,
                settlement: {
                    driverAmount: 3040,
                    commissionAmount: 760,
                },
            },
            createdAt: hoursAgo(5),
            acceptedAt: hoursAgo(5),
            arrivedAt: hoursAgo(5),
            startedAt: hoursAgo(4),
            completedAt: hoursAgo(4),
            driverRating: 5,
            riderRating: 4,
            riderFeedback: 'Smooth ride!',
        },
    ];

    console.log(`\n🗺️  Adding 4 completed rides for driver: ${driverId}\n`);

    for (const ride of rides) {
        await db.collection('rides').doc(ride.id).set(ride, { merge: true });
        console.log(`  ✓ ${ride.id} — ₦${ride.pricing.finalFare} (${ride.pickupLocation.address} → ${ride.dropoffLocation.address})`);
    }

    console.log('\n✅ Done! 4 completed rides added successfully.\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
