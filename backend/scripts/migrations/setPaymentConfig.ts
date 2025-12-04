import admin from 'firebase-admin';

async function main() {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.GCLOUD_PROJECT
        });
    }

    await admin.firestore().collection('config').doc('payments').set(
        {
            payoutMinimums: { NGN: 5000, USD: 50 }
        },
        { merge: true }
    );

    console.log('payoutMinimums updated');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});