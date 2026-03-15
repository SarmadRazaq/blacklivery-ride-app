import * as admin from 'firebase-admin';
const sa = require('../share-ride-app-25e6c-firebase-adminsdk-fbsvc-93dad948aa.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  // Find the rider who created deliveries
  const rideSnap = await db.collection('rides').doc('4dBBmUP7JWBB4oproVHP').get();
  const riderId = rideSnap.data()?.riderId;
  console.log('Rider:', riderId);

  // Check their transactions
  const txSnap = await db.collection('transactions').where('userId', '==', riderId).limit(20).get();
  console.log('Transactions count:', txSnap.size);
  txSnap.docs.forEach(d => {
    const t = d.data();
    console.log(`${d.id} | ${t.category} | ${t.type} | ${t.amount} ${t.currency} | ${t.description} | ${t.createdAt?.toDate?.()}`);
  });

  // Also check if ANY transactions exist at all
  const allTx = await db.collection('transactions').limit(5).get();
  console.log('\nAll transactions in system:', allTx.size);
  allTx.docs.forEach(d => {
    const t = d.data();
    console.log(`${d.id} | userId: ${t.userId} | ${t.category} | ${t.type} | ${t.amount} ${t.currency}`);
  });

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
