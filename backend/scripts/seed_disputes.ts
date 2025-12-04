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

async function seedDisputes() {
    console.log('🌱 Seeding disputes...');

    const now = new Date();
    
    const disputes = [
        {
            rideId: 'ride_1',
            reporterId: 'rider_1',
            reporterRole: 'rider',
            reason: 'Overcharged',
            details: 'I was charged more than the estimated fare',
            status: 'open',
            createdAt: now,
            updatedAt: now
        },
        {
            rideId: 'ride_2',
            reporterId: 'driver_2',
            reporterRole: 'driver',
            reason: 'Rider rude',
            details: 'Rider was disrespectful during the ride',
            status: 'open',
            createdAt: now,
            updatedAt: now
        }
    ];

    for (const dispute of disputes) {
        const ref = await db.collection('disputes').add(dispute);
        console.log(`✅ Created dispute: ${ref.id}`);
    }

    console.log('✅ Dispute seeding complete!');
    process.exit(0);
}

seedDisputes().catch(console.error);
