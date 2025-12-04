import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const auth = admin.auth();
const db = admin.firestore();

async function createAdmin() {
    const email = 'admin@blacklivery.com';
    const password = 'password123'; // CHANGE THIS!

    try {
        // 1. Create Authentication User
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
            console.log('Admin user already exists in Auth.');
        } catch (e) {
            userRecord = await auth.createUser({
                email,
                password,
                displayName: 'Super Admin',
                emailVerified: true
            });
            console.log('Created new Admin User in Auth.');
        }

        // 2. Set Custom Claims (Vital for Role-Based Access)
        await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });

        // 3. Create/Update Firestore Profile
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: email,
            role: 'admin',
            displayName: 'Super Admin',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }, { merge: true });

        console.log('✅ Admin setup complete!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (error) {
        console.error('Error creating admin:', error);
    }
    process.exit(0);
}

createAdmin();
