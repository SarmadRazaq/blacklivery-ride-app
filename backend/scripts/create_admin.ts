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
    const cliEmail = process.argv.find((arg) => arg.startsWith('--email='))?.split('=')[1];
    const cliPassword = process.argv.find((arg) => arg.startsWith('--password='))?.split('=')[1];

    const email = cliEmail || process.env.ADMIN_EMAIL || 'admin@blacklivery.com';
    const password = cliPassword || process.env.ADMIN_PASSWORD;

    if (!password || password.length < 8) {
        throw new Error('ADMIN_PASSWORD (or --password) is required and must be at least 8 characters');
    }

    try {
        // 1. Create Authentication User
        let userRecord: admin.auth.UserRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
            console.log('Admin user already exists in Auth.');

            userRecord = await auth.updateUser(userRecord.uid, {
                password,
                displayName: 'Super Admin',
                emailVerified: true
            });
            console.log('✅ Admin password/profile reset in Auth.');
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
        console.log('✅ Custom claims set for user.');

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
        console.log('✅ Firestore user document created/updated.');

        // 4. Verify the Firestore document has the role
        const verifyDoc = await db.collection('users').doc(userRecord.uid).get();
        if (verifyDoc.exists && verifyDoc.data()?.role === 'admin') {
            console.log('✅ Verified: Firestore role is set to "admin".');
        } else {
            console.error('❌ ERROR: Firestore role was NOT set correctly!');
        }

        // 5. Verify custom claims
        const updatedUser = await auth.getUser(userRecord.uid);
        console.log('Custom Claims:', updatedUser.customClaims);

        console.log('✅ Admin setup complete!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`UID: ${userRecord.uid}`);

    } catch (error) {
        console.error('Error creating admin:', error);
    }
    process.exit(0);
}

createAdmin();
