import * as admin from 'firebase-admin';
const sa = require('../share-ride-app-25e6c-firebase-adminsdk-fbsvc-93dad948aa.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const driverId = '7T03ifmMHdPiTMGpSzMslpbSTDi2';
  
  // 1. Clear stale currentRideId
  console.log(`Clearing currentRideId for driver ${driverId}...`);
  await db.collection('users').doc(driverId).update({
    'driverStatus.currentRideId': admin.firestore.FieldValue.delete()
  });
  console.log('Done - currentRideId cleared');

  // 2. Cancel the stuck finding_driver delivery
  const stuckDeliveryId = 'VRn6qEuj8xwkKGJWu2Da';
  console.log(`\nCancelling stuck delivery ${stuckDeliveryId}...`);
  await db.collection('rides').doc(stuckDeliveryId).update({
    status: 'cancelled',
    cancelReason: 'No driver available - stale state',
    updatedAt: new Date()
  });
  console.log('Done - delivery cancelled');

  // 3. Verify
  const driverDoc = await db.collection('users').doc(driverId).get();
  const ds = driverDoc.data()?.driverStatus || {};
  console.log(`\nVerification - driver currentRideId: ${ds.currentRideId ?? 'CLEARED'} | online: ${ds.isOnline}`);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
