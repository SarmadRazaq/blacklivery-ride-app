import * as admin from 'firebase-admin';
const sa = require('../share-ride-app-25e6c-firebase-adminsdk-fbsvc-93dad948aa.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const rides = ['3VNOGqLluGFjjAreeGto','4dBBmUP7JWBB4oproVHP','7G4VbOTfPsv0oIQcIehL','xOd1xtoGzgGZLICflaX9'];
  for (const rideId of rides) {
    const rideDoc = await db.collection('rides').doc(rideId).get();
    const r = rideDoc.data();
    console.log(`\n=== ${rideId} | status: ${r?.status} | payMethod: ${r?.paymentMethod} | hold: ${r?.payment?.holdStatus} ===`);
    
    const snap = await db.collection('transactions').where('metadata.rideId', '==', rideId).get();
    if (snap.empty) console.log('  NO TRANSACTIONS');
    for (const d of snap.docs) {
      const t = d.data();
      console.log(`  ${d.id} | user: ${t.userId} | type: ${t.type} | amt: ${t.amount} | desc: ${t.description}`);
    }
  }
  process.exit(0);
}
main().catch((e: unknown) => { console.error(e); process.exit(1); });
