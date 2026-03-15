import * as admin from 'firebase-admin';
const sa = require('../share-ride-app-25e6c-firebase-adminsdk-fbsvc-93dad948aa.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const deliveryId = '3VNOGqLluGFjjAreeGto';
  const riderId = 'PgvAnc1JKwUjiAt9PP7KaNMYYS52';
  const driverId = '7T03ifmMHdPiTMGpSzMslpbSTDi2';

  // 1. Check the full delivery doc
  console.log('=== DELIVERY DOC ===');
  const dDoc = await db.collection('rides').doc(deliveryId).get();
  const d = dDoc.data()!;
  console.log('status:', d.status);
  console.log('paymentMethod:', d.paymentMethod);
  console.log('payment:', JSON.stringify(d.payment));
  console.log('pricing:', JSON.stringify(d.pricing));

  // 2. Check ALL rider transactions
  console.log('\n=== RIDER TRANSACTIONS ===');
  const riderTx = await db.collection('transactions')
    .where('userId', '==', riderId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  if (riderTx.empty) console.log('NO TRANSACTIONS FOUND');
  for (const t of riderTx.docs) {
    const tx = t.data();
    console.log(`${t.id} | type: ${tx.type} | amount: ${tx.amount} | desc: ${tx.description} | ref: ${tx.reference} | created: ${tx.createdAt?.toDate?.()}`);
    if (tx.metadata) console.log('  metadata:', JSON.stringify(tx.metadata));
  }

  // 3. Check driver transactions  
  console.log('\n=== DRIVER TRANSACTIONS ===');
  const driverTx = await db.collection('transactions')
    .where('userId', '==', driverId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  if (driverTx.empty) console.log('NO TRANSACTIONS FOUND');
  for (const t of driverTx.docs) {
    const tx = t.data();
    console.log(`${t.id} | type: ${tx.type} | amount: ${tx.amount} | desc: ${tx.description} | ref: ${tx.reference} | created: ${tx.createdAt?.toDate?.()}`);
    if (tx.metadata) console.log('  metadata:', JSON.stringify(tx.metadata));
  }

  // 4. Check wallet balances
  console.log('\n=== WALLET BALANCES ===');
  const riderWallet = await db.collection('wallet_balances').doc(riderId).get();
  console.log('Rider wallet:', riderWallet.exists ? JSON.stringify(riderWallet.data()) : 'NOT FOUND');
  const driverWallet = await db.collection('wallet_balances').doc(driverId).get();
  console.log('Driver wallet:', driverWallet.exists ? JSON.stringify(driverWallet.data()) : 'NOT FOUND');

  // 5. Check ledger entries for this ride
  console.log('\n=== LEDGER ENTRIES ===');
  const ledger = await db.collection('ledger')
    .where('rideId', '==', deliveryId)
    .get();
  if (ledger.empty) console.log('NO LEDGER ENTRIES FOUND');
  for (const l of ledger.docs) {
    const le = l.data();
    console.log(`${l.id} | type: ${le.type} | amount: ${le.amount} | desc: ${le.description}`);
  }

  // 6. Search transactions by rideId metadata
  console.log('\n=== TRANSACTIONS BY RIDE ID ===');
  const byRide = await db.collection('transactions')
    .where('metadata.rideId', '==', deliveryId)
    .get();
  if (byRide.empty) console.log('NO TRANSACTIONS WITH THIS RIDE ID');
  for (const t of byRide.docs) {
    const tx = t.data();
    console.log(`${t.id} | userId: ${tx.userId} | type: ${tx.type} | amount: ${tx.amount} | desc: ${tx.description}`);
  }

  process.exit(0);
}
main().catch((e: unknown) => { console.error(e); process.exit(1); });
