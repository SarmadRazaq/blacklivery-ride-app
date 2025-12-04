import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.firestore();

async function seedData() {
    console.log('🌱 Starting comprehensive seed...');

    // 1. Cleanup
    console.log('Cleaning up...');
    const collections = ['users', 'rides', 'vehicles', 'disputes', 'promotions', 'support_tickets', 'incentives', 'payout_requests'];
    
    for (const col of collections) {
        let query: FirebaseFirestore.Query = db.collection(col);
        if (col === 'users') {
            query = query.where('role', 'in', ['rider', 'driver']); // Keep admins
        }
        const snap = await query.get();
        if (!snap.empty) {
            const batch = db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 2. Seed Users (Drivers & Riders)
    console.log('Seeding users...');
    
    const documentsTemplate = [
        { name: 'Driver License', url: 'https://via.placeholder.com/400x300?text=License', status: 'approved' },
        { name: 'Vehicle Registration', url: 'https://via.placeholder.com/400x300?text=Registration', status: 'approved' },
        { name: 'Insurance', url: 'https://via.placeholder.com/400x300?text=Insurance', status: 'approved' }
    ];

    const users = [
        // Nigeria Drivers
        { uid: 'driver_ng_1', displayName: 'Musa Ibrahim', email: 'musa@blacklivery.ng', role: 'driver', region: 'NG', currency: 'NGN', isActive: true, phoneNumber: '+2348012345678', driverOnboarding: { status: 'approved' }, documents: documentsTemplate, createdAt: yesterday, updatedAt: now },
        { uid: 'driver_ng_2', displayName: 'Chinedu Okafor', email: 'chinedu@blacklivery.ng', role: 'driver', region: 'NG', currency: 'NGN', isActive: true, phoneNumber: '+2348087654321', driverOnboarding: { status: 'approved' }, documents: documentsTemplate, createdAt: yesterday, updatedAt: now },
        
        // Chicago Drivers
        { uid: 'driver_chi_1', displayName: 'John Smith', email: 'john@blacklivery.us', role: 'driver', region: 'US-CHI', currency: 'USD', isActive: true, phoneNumber: '+13125550101', driverOnboarding: { status: 'approved' }, documents: documentsTemplate, createdAt: yesterday, updatedAt: now },
        { uid: 'driver_chi_2', displayName: 'Sarah Connor', email: 'sarah@blacklivery.us', role: 'driver', region: 'US-CHI', currency: 'USD', isActive: true, phoneNumber: '+13125550102', driverOnboarding: { status: 'approved' }, documents: documentsTemplate, createdAt: yesterday, updatedAt: now },

        // Riders
        { uid: 'rider_ng_1', displayName: 'Tola Adebayo', email: 'tola@gmail.com', role: 'rider', region: 'NG', currency: 'NGN', isActive: true, phoneNumber: '+2348099999999', createdAt: yesterday, updatedAt: now },
        { uid: 'rider_chi_1', displayName: 'Mike Ross', email: 'mike@gmail.com', role: 'rider', region: 'US-CHI', currency: 'USD', isActive: true, phoneNumber: '+13125550909', createdAt: yesterday, updatedAt: now }
    ];

    for (const user of users) await db.collection('users').doc(user.uid).set(user);

    // 3. Seed Vehicles
    console.log('Seeding vehicles...');
    const vehicles = [
        { id: 'veh_ng_1', driverId: 'driver_ng_1', make: 'Toyota', model: 'Corolla', year: 2018, color: 'Silver', plateNumber: 'LND-123-AB', category: 'sedan', region: 'NG', isApproved: true },
        { id: 'veh_ng_2', driverId: 'driver_ng_2', make: 'Honda', model: 'Ace', year: 2020, color: 'Red', plateNumber: 'KJA-456-CD', category: 'motorbike', region: 'NG', isApproved: true },
        { id: 'veh_chi_1', driverId: 'driver_chi_1', make: 'Cadillac', model: 'Escalade', year: 2022, color: 'Black', plateNumber: 'CHI-LUX-1', category: 'business_suv', region: 'US-CHI', isApproved: true },
        { id: 'veh_chi_2', driverId: 'driver_chi_2', make: 'Mercedes', model: 'S-Class', year: 2023, color: 'Black', plateNumber: 'CHI-VIP-9', category: 'first_class', region: 'US-CHI', isApproved: true }
    ];

    for (const veh of vehicles) await db.collection('vehicles').doc(veh.id).set(veh);

    // Update drivers with vehicle info
    await db.collection('users').doc('driver_ng_1').update({ 'driverDetails.vehicleId': 'veh_ng_1' });
    await db.collection('users').doc('driver_ng_2').update({ 'driverDetails.vehicleId': 'veh_ng_2' });
    await db.collection('users').doc('driver_chi_1').update({ 'driverDetails.vehicleId': 'veh_chi_1' });
    await db.collection('users').doc('driver_chi_2').update({ 'driverDetails.vehicleId': 'veh_chi_2' });

    // 4. Seed Rides
    console.log('Seeding rides...');
    const rides = [
        // Nigeria - Completed Ride
        {
            id: 'ride_ng_1',
            riderId: 'rider_ng_1',
            driverId: 'driver_ng_1',
            region: 'NG',
            city: 'lagos',
            status: 'completed',
            bookingType: 'on_demand',
            vehicleCategory: 'sedan',
            pickupLocation: { lat: 6.4281, lng: 3.4219, address: 'Victoria Island, Lagos' },
            dropoffLocation: { lat: 6.4500, lng: 3.4000, address: 'Ikoyi, Lagos' },
            pricing: { estimatedFare: 2500, finalFare: 2500, currency: 'NGN', breakdown: { baseFare: 1500, distanceFare: 500, timeFare: 500, totalFare: 2500 } },
            createdAt: yesterday,
            completedAt: new Date(yesterday.getTime() + 30 * 60 * 1000)
        },
        // Nigeria - Active Delivery
        {
            id: 'del_ng_1',
            riderId: 'rider_ng_1',
            driverId: 'driver_ng_2',
            region: 'NG',
            city: 'lagos',
            status: 'in_progress',
            bookingType: 'delivery',
            vehicleCategory: 'motorbike',
            pickupLocation: { lat: 6.5000, lng: 3.3500, address: 'Surulere, Lagos' },
            dropoffLocation: { lat: 6.6000, lng: 3.3000, address: 'Ikeja, Lagos' },
            deliveryDetails: { packageType: 'parcel', serviceType: 'instant' },
            pricing: { estimatedFare: 1800, currency: 'NGN', breakdown: { baseFare: 700, distanceFare: 800, timeFare: 300, totalFare: 1800 } },
            createdAt: oneHourAgo,
            startedAt: new Date(oneHourAgo.getTime() + 10 * 60 * 1000)
        },
        // Chicago - Active Hourly
        {
            id: 'ride_chi_1',
            riderId: 'rider_chi_1',
            driverId: 'driver_chi_1',
            region: 'US-CHI',
            city: 'chicago',
            status: 'in_progress',
            bookingType: 'hourly',
            hoursBooked: 4,
            vehicleCategory: 'business_suv',
            pickupLocation: { lat: 41.8781, lng: -87.6298, address: 'The Loop, Chicago' },
            dropoffLocation: { lat: 41.8917, lng: -87.6063, address: 'Navy Pier, Chicago' }, // Dropoff irrelevant for hourly but required
            pricing: { estimatedFare: 440, currency: 'USD', breakdown: { baseFare: 440, totalFare: 440 } }, // 4 hours * $110
            createdAt: oneHourAgo,
            startedAt: new Date(oneHourAgo.getTime() + 5 * 60 * 1000)
        },
        // Chicago - Scheduled Airport
        {
            id: 'ride_chi_2',
            riderId: 'rider_chi_1',
            driverId: 'driver_chi_2',
            region: 'US-CHI',
            city: 'chicago',
            status: 'accepted',
            bookingType: 'on_demand',
            isAirport: true,
            airportCode: 'ORD',
            vehicleCategory: 'first_class',
            pickupLocation: { lat: 41.9742, lng: -87.9073, address: 'O\'Hare Airport' },
            dropoffLocation: { lat: 41.8781, lng: -87.6298, address: 'Downtown Chicago' },
            pricing: { estimatedFare: 150, currency: 'USD', breakdown: { baseFare: 150, totalFare: 150 } },
            createdAt: now
        }
    ];

    for (const r of rides) await db.collection('rides').doc(r.id).set(r);

    // 5. Seed Disputes
    console.log('Seeding disputes...');
    const disputes = [
        { rideId: 'ride_ng_1', reporterId: 'rider_ng_1', reason: 'Driver rude', status: 'open', createdAt: now },
        { rideId: 'ride_chi_1', reporterId: 'driver_chi_1', reason: 'Rider late', status: 'resolved', createdAt: yesterday }
    ];
    for (const d of disputes) await db.collection('disputes').add(d);

    // 6. Seed Promotions
    console.log('Seeding promotions...');
    const promos = [
        { code: 'WELCOME50', discountType: 'percentage', amount: 50, maxRedemptions: 1000, active: true, regions: ['NG'], createdAt: now },
        { code: 'CHICAGOVIP', discountType: 'fixed', amount: 20, maxRedemptions: 100, active: true, regions: ['US-CHI'], createdAt: now }
    ];
    for (const p of promos) await db.collection('promotions').add(p);

    // 7. Seed Support Tickets
    console.log('Seeding support tickets...');
    const tickets = [
        { userId: 'driver_ng_1', subject: 'Payment Issue', priority: 'high', status: 'open', createdAt: now, description: 'My payout is pending' },
        { userId: 'rider_chi_1', subject: 'Lost Item', priority: 'normal', status: 'open', createdAt: yesterday, description: 'Left my umbrella' }
    ];
    for (const t of tickets) await db.collection('support_tickets').add(t);

    console.log('✅ Comprehensive seed complete!');
    process.exit(0);
}

seedData().catch(console.error);
