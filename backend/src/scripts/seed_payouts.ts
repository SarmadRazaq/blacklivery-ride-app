import { db } from '../config/firebase';

const seedPayouts = async () => {
    const email = 'sarmad.razaq5@gmail.com';
    console.log(`Looking for user with email: ${email}`);

    try {
        const userSnapshot = await db.collection('users').where('email', '==', email).get();

        if (userSnapshot.empty) {
            console.error('User not found!');
            process.exit(1);
        }

        const userDoc = userSnapshot.docs[0];
        const driverId = userDoc.id;
        console.log(`Found driver: ${driverId}`);

        const payouts = [
            {
                amount: 35000,
                status: 'completed',
                method: 'bank_transfer',
                bankName: 'GTBank',
                accountNumber: '******1234',
                referenceId: 'WKG20241120',
                createdAt: new Date('2024-11-20T10:00:00Z'),
                driverId: driverId
            },
            {
                amount: 35000,
                status: 'completed',
                method: 'bank_transfer',
                bankName: 'GTBank',
                accountNumber: '******1234',
                referenceId: 'WKG20241113',
                createdAt: new Date('2024-11-13T10:00:00Z'),
                driverId: driverId
            },
            {
                amount: 35000,
                status: 'completed',
                method: 'bank_transfer',
                bankName: 'GTBank',
                accountNumber: '******1234',
                referenceId: 'WKG20241106',
                createdAt: new Date('2024-11-06T10:00:00Z'),
                driverId: driverId
            },
            {
                amount: 45000,
                status: 'completed',
                method: 'bank_transfer',
                bankName: 'GTBank',
                accountNumber: '******1234',
                referenceId: 'WKG20241030',
                createdAt: new Date('2024-10-30T10:00:00Z'),
                driverId: driverId
            }
        ];

        const batch = db.batch();

        for (const payout of payouts) {
            const ref = db.collection('payouts').doc();
            batch.set(ref, payout);
        }

        await batch.commit();
        console.log(`Successfully seeded ${payouts.length} payouts!`);
        process.exit(0);

    } catch (error) {
        console.error('Error seeding payouts:', error);
        process.exit(1);
    }
};

seedPayouts();
