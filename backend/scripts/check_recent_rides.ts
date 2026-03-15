import * as admin from 'firebase-admin';
const sa = require('../share-ride-app-25e6c-firebase-adminsdk-fbsvc-93dad948aa.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  // Get the most recent rides (any type, not just deliveries)
  console.log('=== MOST RECENT RIDES (all types) ===');
  const snap = await db.collection('rides')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
  
  for (const d of snap.docs) {
    const r = d.data();
    const created = r.createdAt?.toDate?.() || r.createdAt;
    const updated = r.updatedAt?.toDate?.() || r.updatedAt;
    console.log(`\n${d.id}`);
    console.log(`  type: ${r.bookingType} | status: ${r.status} | region: ${r.region}`);
    console.log(`  payMethod: ${r.paymentMethod} | holdStatus: ${r.payment?.holdStatus}`);
    console.log(`  driverId: ${r.driverId} | riderId: ${r.riderId}`);
    console.log(`  created: ${created} | updated: ${updated}`);
    console.log(`  settlement: ${JSON.stringify(r.payment?.settlement)}`);
    
    // Check for transactions
    const txSnap = await db.collection('transactions')
      .where('metadata.rideId', '==', d.id)
      .get();
    if (txSnap.empty) {
      console.log(`  TRANSACTIONS: NONE`);
    } else {
      for (const t of txSnap.docs) {
        const tx = t.data();
        console.log(`  TX: ${tx.userId?.substring(0, 10)}... | ${tx.type} | $${tx.amount} | ${tx.description}`);
      }
    }
  }

  // Also check most recent deliveries specifically 
  console.log('\n\n=== MOST RECENT DELIVERIES ===');
  const delSnap = await db.collection('rides')
    .where('bookingType', '==', 'delivery')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  for (const d of delSnap.docs) {
    const r = d.data();
    const created = r.createdAt?.toDate?.() || r.createdAt;
    console.log(`\n${d.id} | ${r.status} | pay:${r.paymentMethod} | hold:${r.payment?.holdStatus} | created:${created}`);
  }

  process.exit(0);
}
main().catch((e: unknown) => { console.error(e); process.exit(1); });
