import * as admin from 'firebase-admin';
const sa = require('../share-ride-app-25e6c-firebase-adminsdk-fbsvc-93dad948aa.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  // Check latest delivery rides
  console.log('=== RECENT DELIVERIES ===');
  const snap = await db.collection('rides').where('bookingType', '==', 'delivery').limit(10).get();
  for (const d of snap.docs) {
    const r = d.data();
    console.log(`${d.id} | status: ${r.status} | region: ${r.region} | vCat: ${r.vehicleCategory} | driverId: ${r.driverId}`);
    console.log(`  paymentMethod: ${r.paymentMethod} | pricing: ${JSON.stringify(r.pricing)}`);
    console.log(`  payment: ${JSON.stringify(r.payment)}`);
  }

  // Check online drivers
  console.log('\n=== ONLINE DRIVERS ===');
  const dSnap = await db.collection('users').where('role', '==', 'driver').where('driverStatus.isOnline', '==', true).get();
  if (dSnap.empty) {
    console.log('NO ONLINE DRIVERS');
  }
  for (const d of dSnap.docs) {
    const u = d.data();
    const ds = u.driverStatus || {};
    const dp = u.driverProfile || {};
    console.log(`${d.id} | region: ${u.region} | online: ${ds.isOnline} | currentRide: ${ds.currentRideId ?? 'none'} | vCat: ${dp.vehicleCategory || ds.vehicleCategory} | gh5: ${ds.geohash5} | gh4: ${ds.geohash4} | lastKnown: ${JSON.stringify(ds.lastKnownLocation)}`);
  }

  // Check ALL drivers (even offline)
  console.log('\n=== ALL DRIVERS ===');
  const allD = await db.collection('users').where('role', '==', 'driver').get();
  for (const d of allD.docs) {
    const u = d.data();
    const ds = u.driverStatus || {};
    const dp = u.driverProfile || {};
    console.log(`${d.id} | region: ${u.region} | online: ${ds.isOnline} | currentRide: ${ds.currentRideId ?? 'none'} | vCat: ${dp.vehicleCategory || ds.vehicleCategory} | gh5: ${ds.geohash5} | gh4: ${ds.geohash4} | lastKnown: ${JSON.stringify(ds.lastKnownLocation)}`);
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
