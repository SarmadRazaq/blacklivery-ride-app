/**
 * Seed script — populates Firestore with test data for riders, drivers, admin,
 * vehicles, rides, wallets, and transactions.
 *
 * Usage:  npx ts-node scripts/seed.ts
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to your service account key
 *     OR `gcloud auth application-default login` has been run.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as admin from 'firebase-admin';

// ── Firebase init ────────────────────────────────────────────────────
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const auth = admin.auth();

// ── Helpers ──────────────────────────────────────────────────────────
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000);

async function ensureFirebaseUser(uid: string, email: string, displayName: string, phone?: string) {
    try {
        await auth.getUser(uid);
        console.log(`  ↳ Firebase Auth user ${uid} already exists`);
    } catch {
        await auth.createUser({
            uid,
            email,
            displayName,
            phoneNumber: phone,
            password: 'Test1234!',
        });
        console.log(`  ↳ Created Firebase Auth user ${uid}`);
    }
}

// ── DATA ─────────────────────────────────────────────────────────────

// 1. USERS — 2 riders, 3 drivers, 1 admin
const users = [
    // ─── Riders ───
    {
        uid: 'rider-test-001',
        email: 'rider1@blacklivery.test',
        displayName: 'Alex Johnson',
        phoneNumber: '+2348012345001',
        photoURL: '',
        role: 'rider' as const,
        createdAt: daysAgo(30),
        updatedAt: now,
        isActive: true,
        region: 'NG',
        currency: 'NGN',
        countryCode: 'NG',
        emailLowercase: 'rider1@blacklivery.test',
        loyaltyPoints: 250,
        loyaltyTier: 'silver',
    },
    {
        uid: 'rider-test-002',
        email: 'rider2@blacklivery.test',
        displayName: 'Jordan Smith',
        phoneNumber: '+14155550002',
        photoURL: '',
        role: 'rider' as const,
        createdAt: daysAgo(15),
        updatedAt: now,
        isActive: true,
        region: 'US-CHI',
        currency: 'USD',
        countryCode: 'US',
        emailLowercase: 'rider2@blacklivery.test',
        loyaltyPoints: 50,
        loyaltyTier: 'bronze',
    },

    // ─── Drivers ───
    {
        uid: 'driver-test-001',
        email: 'driver1@blacklivery.test',
        displayName: 'Michael Eze',
        phoneNumber: '+2348012345101',
        photoURL: '',
        role: 'driver' as const,
        createdAt: daysAgo(60),
        updatedAt: now,
        isActive: true,
        region: 'NG',
        currency: 'NGN',
        countryCode: 'NG',
        emailLowercase: 'driver1@blacklivery.test',
        driverStatus: {
            isOnline: true,
            state: 'available',
            lastHeartbeat: now,
            lastKnownLocation: { lat: 6.5244, lng: 3.3792 }, // Lagos
            geohash4: 's1z2',
            geohash5: 's1z2m',
            lastOnlineAt: now,
            updatedAt: now,
        },
        driverProfile: {
            vehicleId: 'vehicle-001',
            licenseNumber: 'LG-DRV-2025-001',
        },
        driverDetails: {
            vehicleId: 'vehicle-001',
            licenseNumber: 'LG-DRV-2025-001',
            isOnline: true,
            currentLocation: { lat: 6.5244, lng: 3.3792, geohash: 's1z2m' },
            rating: 4.8,
            totalTrips: 142,
            earnings: 385000,
        },
        loyaltyPoints: 500,
        loyaltyTier: 'gold',
    },
    {
        uid: 'driver-test-002',
        email: 'driver2@blacklivery.test',
        displayName: 'Chidi Okoro',
        phoneNumber: '+2348012345102',
        photoURL: '',
        role: 'driver' as const,
        createdAt: daysAgo(45),
        updatedAt: now,
        isActive: true,
        region: 'NG',
        currency: 'NGN',
        countryCode: 'NG',
        emailLowercase: 'driver2@blacklivery.test',
        driverStatus: {
            isOnline: false,
            state: 'offline',
            lastHeartbeat: hoursAgo(3),
            lastKnownLocation: { lat: 6.4541, lng: 3.3947 }, // VI, Lagos
            geohash4: 's1z1',
            geohash5: 's1z1t',
            updatedAt: hoursAgo(3),
        },
        driverProfile: {
            vehicleId: 'vehicle-002',
            licenseNumber: 'LG-DRV-2025-002',
        },
        driverDetails: {
            vehicleId: 'vehicle-002',
            licenseNumber: 'LG-DRV-2025-002',
            isOnline: false,
            currentLocation: { lat: 6.4541, lng: 3.3947, geohash: 's1z1t' },
            rating: 4.5,
            totalTrips: 87,
            earnings: 215000,
        },
    },
    {
        uid: 'driver-test-003',
        email: 'driver3@blacklivery.test',
        displayName: 'Marcus Williams',
        phoneNumber: '+14155550103',
        photoURL: '',
        role: 'driver' as const,
        createdAt: daysAgo(20),
        updatedAt: now,
        isActive: true,
        region: 'US-CHI',
        currency: 'USD',
        countryCode: 'US',
        emailLowercase: 'driver3@blacklivery.test',
        driverStatus: {
            isOnline: true,
            state: 'available',
            lastHeartbeat: now,
            lastKnownLocation: { lat: 41.8781, lng: -87.6298 }, // Chicago
            geohash4: 'dp3w',
            geohash5: 'dp3wj',
            lastOnlineAt: now,
            updatedAt: now,
        },
        driverProfile: {
            vehicleId: 'vehicle-003',
            licenseNumber: 'IL-DRV-2025-003',
        },
        driverDetails: {
            vehicleId: 'vehicle-003',
            licenseNumber: 'IL-DRV-2025-003',
            isOnline: true,
            currentLocation: { lat: 41.8781, lng: -87.6298, geohash: 'dp3wj' },
            rating: 4.9,
            totalTrips: 56,
            earnings: 8500,
        },
    },

    // ─── Admin ───
    {
        uid: 'admin-test-001',
        email: 'admin@blacklivery.test',
        displayName: 'Admin User',
        phoneNumber: '+2348012345200',
        photoURL: '',
        role: 'admin' as const,
        createdAt: daysAgo(90),
        updatedAt: now,
        isActive: true,
        region: 'NG',
        currency: 'NGN',
        countryCode: 'NG',
        emailLowercase: 'admin@blacklivery.test',
    },
];

// 2. VEHICLES
const vehicles = [
    {
        id: 'vehicle-001',
        driverId: 'driver-test-001',
        name: 'Toyota Camry 2023',
        year: 2023,
        plateNumber: 'LG-456-ABC',
        seats: 4,
        category: 'sedan',
        images: {
            front: 'https://placehold.co/600x400?text=Camry+Front',
            back: 'https://placehold.co/600x400?text=Camry+Back',
        },
        documents: {
            insurance: 'https://placehold.co/600x400?text=Insurance',
            registration: 'https://placehold.co/600x400?text=Registration',
        },
        isApproved: true,
        createdAt: daysAgo(55),
        updatedAt: now,
    },
    {
        id: 'vehicle-002',
        driverId: 'driver-test-002',
        name: 'Honda Accord 2022',
        year: 2022,
        plateNumber: 'LG-789-DEF',
        seats: 4,
        category: 'sedan',
        images: {
            front: 'https://placehold.co/600x400?text=Accord+Front',
            back: 'https://placehold.co/600x400?text=Accord+Back',
        },
        documents: {
            insurance: 'https://placehold.co/600x400?text=Insurance',
            registration: 'https://placehold.co/600x400?text=Registration',
        },
        isApproved: true,
        createdAt: daysAgo(40),
        updatedAt: now,
    },
    {
        id: 'vehicle-003',
        driverId: 'driver-test-003',
        name: 'Chevrolet Suburban 2024',
        year: 2024,
        plateNumber: 'IL-321-XYZ',
        seats: 7,
        category: 'xl',
        images: {
            front: 'https://placehold.co/600x400?text=Suburban+Front',
            back: 'https://placehold.co/600x400?text=Suburban+Back',
        },
        documents: {
            insurance: 'https://placehold.co/600x400?text=Insurance',
            registration: 'https://placehold.co/600x400?text=Registration',
            inspection: 'https://placehold.co/600x400?text=Inspection',
        },
        isApproved: true,
        createdAt: daysAgo(18),
        updatedAt: now,
    },
];

// 3. RIDES — various statuses for testing all screens
const rides = [
    // Completed ride in Lagos
    {
        id: 'ride-001',
        riderId: 'rider-test-001',
        driverId: 'driver-test-001',
        status: 'completed',
        bookingType: 'on_demand',
        pickupLocation: {
            lat: 6.5244,
            lng: 3.3792,
            address: 'Eko Atlantic, Victoria Island, Lagos',
        },
        dropoffLocation: {
            lat: 6.4281,
            lng: 3.4219,
            address: 'Lekki Phase 1, Lagos',
        },
        vehicleCategory: 'sedan',
        region: 'NG',
        city: 'lagos',
        pricing: {
            estimatedFare: 4500,
            finalFare: 4800,
            currency: 'NGN',
            surgeMultiplier: 1.0,
            breakdown: {
                baseFare: 1000,
                distanceFare: 2500,
                timeFare: 800,
                surgeFare: 0,
                waitTimeFare: 500,
                addOnsFare: 0,
                otherFees: 0,
            },
        },
        payment: {
            status: 'captured',
            gateway: 'paystack',
            commissionRate: 0.20,
            settlement: {
                driverAmount: 3840,
                commissionAmount: 960,
                microAmount: 0,
            },
        },
        createdAt: daysAgo(3),
        acceptedAt: daysAgo(3),
        arrivedAt: daysAgo(3),
        startedAt: daysAgo(3),
        completedAt: daysAgo(3),
        driverRating: 5,
        driverFeedback: 'Great ride, very professional!',
        riderRating: 5,
    },
    // Completed ride in Chicago
    {
        id: 'ride-002',
        riderId: 'rider-test-002',
        driverId: 'driver-test-003',
        status: 'completed',
        bookingType: 'on_demand',
        pickupLocation: {
            lat: 41.8827,
            lng: -87.6233,
            address: 'Millennium Park, Chicago',
        },
        dropoffLocation: {
            lat: 41.8786,
            lng: -87.6359,
            address: 'Willis Tower, Chicago',
        },
        vehicleCategory: 'xl',
        region: 'US-CHI',
        city: 'chicago',
        pricing: {
            estimatedFare: 18.50,
            finalFare: 20.00,
            currency: 'USD',
            surgeMultiplier: 1.2,
            breakdown: {
                baseFare: 5.0,
                distanceFare: 8.0,
                timeFare: 3.5,
                surgeFare: 3.5,
                waitTimeFare: 0,
                addOnsFare: 0,
                otherFees: 0,
            },
        },
        payment: {
            status: 'captured',
            gateway: 'stripe',
            commissionRate: 0.20,
            settlement: {
                driverAmount: 16.00,
                commissionAmount: 4.00,
                microAmount: 0,
            },
        },
        createdAt: daysAgo(1),
        acceptedAt: daysAgo(1),
        arrivedAt: daysAgo(1),
        startedAt: daysAgo(1),
        completedAt: daysAgo(1),
        driverRating: 4,
        riderRating: 5,
    },
    // In-progress ride (Lagos)
    {
        id: 'ride-003',
        riderId: 'rider-test-001',
        driverId: 'driver-test-002',
        status: 'in_progress',
        bookingType: 'on_demand',
        pickupLocation: {
            lat: 6.5244,
            lng: 3.3792,
            address: 'Ikeja City Mall, Lagos',
        },
        dropoffLocation: {
            lat: 6.4541,
            lng: 3.3947,
            address: 'Ikoyi, Lagos',
        },
        vehicleCategory: 'sedan',
        region: 'NG',
        city: 'lagos',
        pricing: {
            estimatedFare: 5500,
            currency: 'NGN',
            surgeMultiplier: 1.5,
        },
        payment: {
            status: 'held',
            gateway: 'paystack',
        },
        createdAt: hoursAgo(1),
        acceptedAt: hoursAgo(1),
        arrivedAt: hoursAgo(1),
        startedAt: new Date(now.getTime() - 30 * 60000), // 30 min ago
    },
    // Cancelled ride
    {
        id: 'ride-004',
        riderId: 'rider-test-001',
        driverId: 'driver-test-001',
        status: 'cancelled',
        bookingType: 'on_demand',
        pickupLocation: {
            lat: 6.45,
            lng: 3.40,
            address: 'Surulere, Lagos',
        },
        dropoffLocation: {
            lat: 6.52,
            lng: 3.38,
            address: 'Yaba, Lagos',
        },
        vehicleCategory: 'sedan',
        region: 'NG',
        city: 'lagos',
        pricing: {
            estimatedFare: 3800,
            currency: 'NGN',
            cancellationFee: 500,
        },
        payment: {
            status: 'released',
            gateway: 'paystack',
        },
        createdAt: daysAgo(7),
        cancelledAt: daysAgo(7),
        cancellationReason: 'Driver took too long to arrive',
    },
    // Delivery ride (completed)
    {
        id: 'ride-005',
        riderId: 'rider-test-001',
        driverId: 'driver-test-001',
        status: 'completed',
        bookingType: 'delivery',
        pickupLocation: {
            lat: 6.45,
            lng: 3.39,
            address: 'Apapa Wharf, Lagos',
        },
        dropoffLocation: {
            lat: 6.52,
            lng: 3.37,
            address: 'Maryland Mall, Lagos',
        },
        vehicleCategory: 'sedan',
        region: 'NG',
        city: 'lagos',
        deliveryDetails: {
            packageType: 'Documents',
            isFragile: false,
            requiresReturn: false,
            serviceType: 'instant',
        },
        pricing: {
            estimatedFare: 3000,
            finalFare: 3000,
            currency: 'NGN',
        },
        payment: {
            status: 'captured',
            gateway: 'paystack',
            commissionRate: 0.15,
            settlement: {
                driverAmount: 2550,
                commissionAmount: 450,
            },
        },
        createdAt: daysAgo(5),
        acceptedAt: daysAgo(5),
        startedAt: daysAgo(5),
        completedAt: daysAgo(5),
        driverRating: 5,
    },
    // Ride waiting for driver (finding_driver)
    {
        id: 'ride-006',
        riderId: 'rider-test-002',
        status: 'finding_driver',
        bookingType: 'on_demand',
        pickupLocation: {
            lat: 41.8819,
            lng: -87.6278,
            address: 'Art Institute of Chicago',
        },
        dropoffLocation: {
            lat: 41.9484,
            lng: -87.6553,
            address: 'Wrigley Field, Chicago',
        },
        vehicleCategory: 'sedan',
        region: 'US-CHI',
        city: 'chicago',
        pricing: {
            estimatedFare: 25.00,
            currency: 'USD',
            surgeMultiplier: 1.0,
        },
        createdAt: new Date(now.getTime() - 2 * 60000), // 2 min ago
    },
];

// 4. WALLETS
const wallets = [
    {
        id: 'wallet-rider-001',
        userId: 'rider-test-001',
        currency: 'NGN',
        createdAt: daysAgo(30),
        updatedAt: now,
    },
    {
        id: 'wallet-rider-002',
        userId: 'rider-test-002',
        currency: 'USD',
        createdAt: daysAgo(15),
        updatedAt: now,
    },
    {
        id: 'wallet-driver-001',
        userId: 'driver-test-001',
        currency: 'NGN',
        createdAt: daysAgo(60),
        updatedAt: now,
    },
    {
        id: 'wallet-driver-002',
        userId: 'driver-test-002',
        currency: 'NGN',
        createdAt: daysAgo(45),
        updatedAt: now,
    },
    {
        id: 'wallet-driver-003',
        userId: 'driver-test-003',
        currency: 'USD',
        createdAt: daysAgo(20),
        updatedAt: now,
    },
];

// 5. TRANSACTIONS
const transactions = [
    // Rider 1 topped up wallet
    {
        id: 'txn-001',
        walletId: 'wallet-rider-001',
        amount: 10000,
        currency: 'NGN',
        type: 'credit',
        status: 'success',
        category: 'wallet_topup',
        description: 'Wallet top-up via Paystack',
        reference: 'PSK-REF-001',
        createdAt: daysAgo(25),
    },
    // Rider 1 ride payment
    {
        id: 'txn-002',
        walletId: 'wallet-rider-001',
        amount: 4800,
        currency: 'NGN',
        type: 'debit',
        status: 'success',
        category: 'ride_payment',
        description: 'Payment for ride #ride-001',
        reference: 'RIDE-001-PAY',
        metadata: { rideId: 'ride-001' },
        createdAt: daysAgo(3),
    },
    // Driver 1 ride earnings
    {
        id: 'txn-003',
        walletId: 'wallet-driver-001',
        amount: 3840,
        currency: 'NGN',
        type: 'credit',
        status: 'success',
        category: 'ride_payment',
        description: 'Earnings from ride #ride-001',
        reference: 'RIDE-001-EARN',
        metadata: { rideId: 'ride-001' },
        createdAt: daysAgo(3),
    },
    // Commission deduction
    {
        id: 'txn-004',
        walletId: 'wallet-driver-001',
        amount: 960,
        currency: 'NGN',
        type: 'debit',
        status: 'success',
        category: 'commission_deduction',
        description: '20% commission for ride #ride-001',
        reference: 'RIDE-001-COM',
        metadata: { rideId: 'ride-001' },
        createdAt: daysAgo(3),
    },
    // Rider 2 topup (USD)
    {
        id: 'txn-005',
        walletId: 'wallet-rider-002',
        amount: 50.00,
        currency: 'USD',
        type: 'credit',
        status: 'success',
        category: 'wallet_topup',
        description: 'Wallet top-up via Stripe',
        reference: 'STR-REF-001',
        createdAt: daysAgo(10),
    },
    // Driver 3 ride earnings (USD)
    {
        id: 'txn-006',
        walletId: 'wallet-driver-003',
        amount: 16.00,
        currency: 'USD',
        type: 'credit',
        status: 'success',
        category: 'ride_payment',
        description: 'Earnings from ride #ride-002',
        reference: 'RIDE-002-EARN',
        metadata: { rideId: 'ride-002' },
        createdAt: daysAgo(1),
    },
    // Bonus for driver 1
    {
        id: 'txn-007',
        walletId: 'wallet-driver-001',
        amount: 2000,
        currency: 'NGN',
        type: 'credit',
        status: 'success',
        category: 'bonus',
        description: 'Weekly bonus for 100+ trips',
        reference: 'BONUS-WEEK-01',
        createdAt: daysAgo(2),
    },
    // Delivery payment
    {
        id: 'txn-008',
        walletId: 'wallet-driver-001',
        amount: 2550,
        currency: 'NGN',
        type: 'credit',
        status: 'success',
        category: 'ride_payment',
        description: 'Delivery earnings — ride #ride-005',
        reference: 'RIDE-005-EARN',
        metadata: { rideId: 'ride-005' },
        createdAt: daysAgo(5),
    },
];

// 6. LEDGER ENTRIES
const ledgerEntries = [
    {
        id: 'ledger-001',
        transactionId: 'txn-002',
        walletId: 'wallet-rider-001',
        type: 'debit',
        amount: 4800,
        currency: 'NGN',
        category: 'ride_payment',
        description: 'Ride payment for ride-001',
        reference: 'RIDE-001-PAY',
        createdAt: daysAgo(3),
    },
    {
        id: 'ledger-002',
        transactionId: 'txn-003',
        walletId: 'wallet-driver-001',
        type: 'credit',
        amount: 3840,
        currency: 'NGN',
        category: 'ride_payment',
        description: 'Driver payout for ride-001',
        reference: 'RIDE-001-EARN',
        createdAt: daysAgo(3),
    },
    {
        id: 'ledger-003',
        transactionId: 'txn-004',
        walletId: 'wallet-driver-001',
        type: 'debit',
        amount: 960,
        currency: 'NGN',
        category: 'commission_deduction',
        description: 'Commission 20% for ride-001',
        reference: 'RIDE-001-COM',
        createdAt: daysAgo(3),
    },
];

// 7. SUPPORT TICKETS
const supportTickets = [
    {
        id: 'ticket-001',
        userId: 'rider-test-001',
        subject: 'Overcharged on recent trip',
        description: 'I was charged ₦4800 instead of the estimated ₦4500. Please review.',
        status: 'open',
        priority: 'medium',
        rideId: 'ride-001',
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
    },
    {
        id: 'ticket-002',
        userId: 'driver-test-002',
        subject: 'Cannot go online',
        description: 'My driver status is stuck on offline. I have restarted the app multiple times.',
        status: 'in_progress',
        priority: 'high',
        createdAt: daysAgo(1),
        updatedAt: hoursAgo(5),
    },
    {
        id: 'ticket-003',
        userId: 'rider-test-002',
        subject: 'Left item in car',
        description: 'I left my laptop bag in the car after ride #ride-002.',
        status: 'resolved',
        priority: 'high',
        rideId: 'ride-002',
        createdAt: daysAgo(1),
        updatedAt: hoursAgo(12),
        resolvedAt: hoursAgo(12),
    },
];

// ── SEEDING ──────────────────────────────────────────────────────────
async function seed() {
    console.log('\n🌱 Starting seed…\n');

    // Users
    console.log('👤 Creating users…');
    for (const user of users) {
        await ensureFirebaseUser(user.uid, user.email, user.displayName ?? '', user.phoneNumber);
        await db.collection('users').doc(user.uid).set(user, { merge: true });
        console.log(`  ✓ ${user.role}: ${user.displayName} (${user.uid})`);
    }

    // Vehicles
    console.log('\n🚗 Creating vehicles…');
    for (const v of vehicles) {
        await db.collection('vehicles').doc(v.id).set(v, { merge: true });
        console.log(`  ✓ ${v.name} (${v.id})`);
    }

    // Rides
    console.log('\n🗺️  Creating rides…');
    for (const r of rides) {
        await db.collection('rides').doc(r.id).set(r, { merge: true });
        console.log(`  ✓ ${r.status} — ${r.id}`);
    }

    // Wallets
    console.log('\n💰 Creating wallets…');
    for (const w of wallets) {
        await db.collection('wallets').doc(w.id).set(w, { merge: true });
        console.log(`  ✓ ${w.id} (${w.currency})`);
    }

    // Transactions
    console.log('\n💳 Creating transactions…');
    for (const t of transactions) {
        await db.collection('transactions').doc(t.id).set(t, { merge: true });
        console.log(`  ✓ ${t.category}: ${t.amount} ${t.currency} (${t.id})`);
    }

    // Ledger
    console.log('\n📒 Creating ledger entries…');
    for (const l of ledgerEntries) {
        await db.collection('ledger').doc(l.id).set(l, { merge: true });
        console.log(`  ✓ ${l.category}: ${l.amount} ${l.currency} (${l.id})`);
    }

    // Support tickets
    console.log('\n🎫 Creating support tickets…');
    for (const t of supportTickets) {
        await db.collection('support_tickets').doc(t.id).set(t, { merge: true });
        console.log(`  ✓ ${t.status}: ${t.subject} (${t.id})`);
    }

    console.log('\n✅ Seed complete!\n');
    console.log('Test Credentials (password: Test1234!):');
    console.log('  Rider 1:  rider1@blacklivery.test');
    console.log('  Rider 2:  rider2@blacklivery.test');
    console.log('  Driver 1: driver1@blacklivery.test');
    console.log('  Driver 2: driver2@blacklivery.test');
    console.log('  Driver 3: driver3@blacklivery.test');
    console.log('  Admin:    admin@blacklivery.test');
    console.log('');
}

seed()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    });
