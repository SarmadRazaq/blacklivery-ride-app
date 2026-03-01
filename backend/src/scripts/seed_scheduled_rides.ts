import { db } from '../config/firebase';

const seedRides = async () => {
    const email = 'sarmad.razaq5@gmail.com';
    console.log(`Looking for user with email: ${email}`);

    try {
        const userQuery = await db.collection('users').where('email', '==', email).get();

        if (userQuery.empty) {
            console.error('User not found!');
            process.exit(1);
        }

        const user = userQuery.docs[0];
        const uid = user.id;
        console.log(`Found user: ${uid} (${user.data().fullName})`);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(14, 30, 0, 0);

        const rides = [
            {
                driverId: uid,
                status: 'scheduled',
                bookingType: 'scheduled',
                scheduledTime: tomorrow.toISOString(),
                createdAt: new Date().toISOString(),
                pickupLocation: {
                    address: '123 Main St, New York, NY',
                    lat: 40.7128,
                    lng: -74.0060
                },
                dropoffLocation: {
                    address: 'JFK Airport, Queens, NY',
                    lat: 40.6413,
                    lng: -73.7781
                },
                pricing: {
                    estimatedFare: 45.50,
                    currency: 'USD'
                },
                rider: {
                    name: 'John Doe',
                    rating: 4.8,
                    image: null
                },
                vehicleCategory: 'sedan'
            },
            {
                driverId: uid,
                status: 'scheduled',
                bookingType: 'scheduled',
                scheduledTime: nextWeek.toISOString(),
                createdAt: new Date().toISOString(),
                pickupLocation: {
                    address: '456 Park Ave, New York, NY',
                    lat: 40.7605,
                    lng: -73.9712
                },
                dropoffLocation: {
                    address: 'Central Park Zoo, New York, NY',
                    lat: 40.7678,
                    lng: -73.9718
                },
                pricing: {
                    estimatedFare: 22.00,
                    currency: 'USD'
                },
                rider: {
                    name: 'Alice Smith',
                    rating: 4.9,
                    image: null
                },
                vehicleCategory: 'suv'
            }
        ];

        for (const ride of rides) {
            const res = await db.collection('rides').add(ride);
            console.log(`Added ride: ${res.id} for ${ride.scheduledTime}`);
        }

        console.log('Seeding complete!');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding rides:', error);
        process.exit(1);
    }
};

seedRides();
