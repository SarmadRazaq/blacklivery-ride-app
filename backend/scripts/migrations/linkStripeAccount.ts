import admin from 'firebase-admin';

async function link(driverId: string, connectAccountId: string) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.GCLOUD_PROJECT
        });
    }

    const db = admin.firestore();

    await db.collection('stripe_accounts').doc(driverId).set({
        userId: driverId,
        connectAccountId,
        linkedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('users').doc(driverId).set(
        {
            stripeConnectAccountId: connectAccountId,
            payouts: { stripeConnectAccountId: connectAccountId }
        },
        { merge: true }
    );

    console.log('Stripe Connect linked');
}

// Example: link('driverUid', 'acct_123XYZ');
link(process.argv[2], process.argv[3]).catch((err) => {
    console.error(err);
    process.exit(1);
});