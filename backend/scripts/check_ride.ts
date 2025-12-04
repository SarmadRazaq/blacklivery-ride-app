import { db } from '../src/config/firebase';

async function checkRide(rideId: string) {
    console.log(`Checking ride ${rideId}...`);
    const doc = await db.collection('rides').doc(rideId).get();
    if (!doc.exists) {
        console.log('Ride not found');
        return;
    }
    const data = doc.data();
    console.log('Status:', data?.status);
    console.log('Driver ID:', data?.driverId);
    console.log('Cancellation Reason:', data?.cancellationReason);
    console.log('Created At:', data?.createdAt?.toDate ? data.createdAt.toDate() : data?.createdAt);
    console.log('Updated At:', data?.updatedAt?.toDate ? data.updatedAt.toDate() : data?.updatedAt);
}

// Check the latest ride ID mentioned by the user
checkRide('u1FPmyvpkoMckoZHqZTn').catch(console.error);
