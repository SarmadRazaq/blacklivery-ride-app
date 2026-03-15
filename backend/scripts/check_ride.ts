import * as admin from 'firebase-admin';
const sa = require('../share-ride-app-25e6c-firebase-adminsdk-fbsvc-93dad948aa.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const rideId = 'xOd1xtoGzgGZLICflaX9';
  const doc = await db.collection('rides').doc(rideId).get();
  if (!doc.exists) {
    console.log('Ride NOT FOUND');
  } else {
    const r = doc.data()!;
    console.log('Ride ID:', doc.id);
    console.log('Status:', r.status);
    console.log('BookingType:', r.bookingType);
    console.log('DriverId:', r.driverId);
    console.log('RiderId:', r.riderId);
    console.log('CreatedAt:', r.createdAt?.toDate?.() || r.createdAt);
    console.log('UpdatedAt:', r.updatedAt?.toDate?.() || r.updatedAt);
  }

  // Also clear the stale currentRideId from the driver
  const driverId = '7T03ifmMHdPiTMGpSzMslpbSTDi2';
  console.log('\n--- Clearing stale currentRideId from driver ---');
  await db.collection('users').doc(driverId).update({
    'driverStatus.currentRideId': admin.firestore.FieldValue.delete()
  });
  console.log('Done. Driver currentRideId cleared.');

  // Verify
  const driverDoc = await db.collection('users').doc(driverId).get();
  const ds = driverDoc.data()?.driverStatus || {};
  console.log('Verification - currentRideId:', ds.currentRideId ?? 'CLEARED', '| online:', ds.isOnline);

  process.exit(0);
}
main().catch((e: unknown) => { console.error(e); process.exit(1); });
