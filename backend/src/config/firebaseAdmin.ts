import admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.GCLOUD_PROJECT,
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

export default admin;