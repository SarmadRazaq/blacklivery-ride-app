/**
 * Firestore Seed Data Script for BlackLivery Rider App
 * 
 * Run this script to populate your Firestore database with test data.
 * 
 * Usage:
 *   1. Install dependencies: npm install firebase-admin
 *   2. Download your Firebase service account key from Firebase Console
 *   3. Set GOOGLE_APPLICATION_CREDENTIALS env var to the key path
 *   4. Run: node seed_firestore.js
 * 
 * Test Rider Account:
 *   Email: testrider@blacklivery.com
 *   Password: TestRider123!
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();
const auth = admin.auth();

// Test rider data
const TEST_RIDER = {
  email: 'testrider@blacklivery.com',
  password: 'TestRider123!',
  displayName: 'Test Rider',
  phoneNumber: '+15555551234',
};

async function createTestRider() {
  console.log('Creating test rider account...');
  
  let userId;
  
  // Create Firebase Auth user
  try {
    const userRecord = await auth.createUser({
      email: TEST_RIDER.email,
      password: TEST_RIDER.password,
      displayName: TEST_RIDER.displayName,
      phoneNumber: TEST_RIDER.phoneNumber,
    });
    userId = userRecord.uid;
    console.log(`Created Firebase user: ${userId}`);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      const existingUser = await auth.getUserByEmail(TEST_RIDER.email);
      userId = existingUser.uid;
      console.log(`User already exists: ${userId}`);
    } else {
      throw error;
    }
  }

  // Create user profile in Firestore
  await db.collection('users').doc(userId).set({
    email: TEST_RIDER.email,
    fullName: 'Test Rider',
    firstName: 'Test',
    lastName: 'Rider',
    phoneNumber: TEST_RIDER.phoneNumber,
    role: 'rider',
    profileImage: null,
    rating: 4.8,
    totalRides: 15,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Created user profile in Firestore');

  return userId;
}

async function seedRideHistory(riderId) {
  console.log('Seeding ride history...');

  const rides = [
    {
      riderId,
      driverId: 'driver_001',
      driverName: 'James Williams',
      driverRating: 4.9,
      driverVehicle: 'Toyota Camry (Black)',
      driverPlate: 'ABC-1234',
      driverPhoto: null,
      pickupAddress: '123 Main Street, Lagos',
      pickupLat: 6.5244,
      pickupLng: 3.3792,
      destinationAddress: 'Victoria Island, Lagos',
      destinationLat: 6.4281,
      destinationLng: 3.4219,
      rideType: 'standard',
      status: 'completed',
      fare: 2500,
      currency: 'NGN',
      distance: 12.5,
      duration: 25,
      paymentMethod: 'card',
      rating: 5,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      riderId,
      driverId: 'driver_002',
      driverName: 'Michael Johnson',
      driverRating: 4.7,
      driverVehicle: 'Honda Accord (Silver)',
      driverPlate: 'XYZ-5678',
      driverPhoto: null,
      pickupAddress: 'Lekki Phase 1, Lagos',
      pickupLat: 6.4474,
      pickupLng: 3.4728,
      destinationAddress: 'Ikeja City Mall, Lagos',
      destinationLat: 6.6018,
      destinationLng: 3.3515,
      rideType: 'comfort',
      status: 'completed',
      fare: 4500,
      currency: 'NGN',
      distance: 22.3,
      duration: 45,
      paymentMethod: 'wallet',
      rating: 4,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      riderId,
      driverId: 'driver_003',
      driverName: 'Sarah Adekunle',
      driverRating: 4.95,
      driverVehicle: 'Mercedes E-Class (Black)',
      driverPlate: 'LUX-9999',
      driverPhoto: null,
      pickupAddress: 'Murtala Muhammed Airport, Lagos',
      pickupLat: 6.5774,
      pickupLng: 3.3212,
      destinationAddress: 'Eko Hotels, Victoria Island',
      destinationLat: 6.4281,
      destinationLng: 3.4219,
      rideType: 'premium',
      status: 'completed',
      fare: 8500,
      currency: 'NGN',
      distance: 18.7,
      duration: 35,
      paymentMethod: 'card',
      rating: 5,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ];

  const batch = db.batch();
  rides.forEach((ride) => {
    const rideRef = db.collection('rides').doc();
    batch.set(rideRef, ride);
  });
  await batch.commit();
  console.log(`Created ${rides.length} ride history records`);
}

async function seedWallet(riderId) {
  console.log('Seeding wallet...');

  await db.collection('wallets').doc(riderId).set({
    balance: 15000,
    currency: 'NGN',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Created wallet with ₦15,000 balance');

  // Add some transactions
  const transactions = [
    {
      userId: riderId,
      type: 'credit',
      amount: 10000,
      currency: 'NGN',
      description: 'Added funds via card',
      status: 'completed',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      userId: riderId,
      type: 'debit',
      amount: 4500,
      currency: 'NGN',
      description: 'Ride payment - Lekki to Ikeja',
      status: 'completed',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      userId: riderId,
      type: 'credit',
      amount: 5000,
      currency: 'NGN',
      description: 'Referral bonus',
      status: 'completed',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ];

  const batch = db.batch();
  transactions.forEach((tx) => {
    const txRef = db.collection('transactions').doc();
    batch.set(txRef, tx);
  });
  await batch.commit();
  console.log(`Created ${transactions.length} wallet transactions`);
}

async function seedPaymentMethods(riderId) {
  console.log('Seeding payment methods...');

  const paymentMethods = [
    {
      userId: riderId,
      type: 'card',
      cardType: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      userId: riderId,
      type: 'card',
      cardType: 'mastercard',
      last4: '8888',
      expiryMonth: 6,
      expiryYear: 2026,
      isDefault: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  const batch = db.batch();
  paymentMethods.forEach((pm) => {
    const pmRef = db.collection('paymentMethods').doc();
    batch.set(pmRef, pm);
  });
  await batch.commit();
  console.log(`Created ${paymentMethods.length} payment methods`);
}

async function seedPromotions(riderId) {
  console.log('Seeding promotions...');

  const promotions = [
    {
      userId: riderId,
      code: 'WELCOME50',
      discount: 50,
      discountType: 'percentage',
      maxDiscount: 2000,
      description: 'Welcome bonus - 50% off your first ride',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isUsed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      userId: riderId,
      code: 'REFER500',
      discount: 500,
      discountType: 'fixed',
      maxDiscount: 500,
      description: 'Referral bonus - ₦500 off',
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      isUsed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  const batch = db.batch();
  promotions.forEach((promo) => {
    const promoRef = db.collection('userPromotions').doc();
    batch.set(promoRef, promo);
  });
  await batch.commit();
  console.log(`Created ${promotions.length} promotions`);
}

async function seedSavedPlaces(riderId) {
  console.log('Seeding saved places...');

  const places = [
    {
      userId: riderId,
      name: 'Home',
      icon: 'home',
      address: '45 Admiralty Way, Lekki Phase 1, Lagos',
      lat: 6.4474,
      lng: 3.4728,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      userId: riderId,
      name: 'Work',
      icon: 'work',
      address: 'Plot 1234, Victoria Island, Lagos',
      lat: 6.4281,
      lng: 3.4219,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  const batch = db.batch();
  places.forEach((place) => {
    const placeRef = db.collection('savedPlaces').doc();
    batch.set(placeRef, place);
  });
  await batch.commit();
  console.log(`Created ${places.length} saved places`);
}

async function main() {
  console.log('========================================');
  console.log('  BlackLivery Firestore Seed Script');
  console.log('========================================\n');

  try {
    const riderId = await createTestRider();
    await seedRideHistory(riderId);
    await seedWallet(riderId);
    await seedPaymentMethods(riderId);
    await seedPromotions(riderId);
    await seedSavedPlaces(riderId);

    console.log('\n========================================');
    console.log('  Seed completed successfully!');
    console.log('========================================');
    console.log('\n📱 TEST RIDER ACCOUNT:');
    console.log(`   Email: ${TEST_RIDER.email}`);
    console.log(`   Password: ${TEST_RIDER.password}`);
    console.log('\n✅ Data seeded:');
    console.log('   - User profile (with rating 4.8, 15 total rides)');
    console.log('   - 3 ride history records');
    console.log('   - Wallet with ₦15,000 balance');
    console.log('   - 2 payment methods (Visa, Mastercard)');
    console.log('   - 2 promo codes (WELCOME50, REFER500)');
    console.log('   - 2 saved places (Home, Work)');
    console.log('========================================\n');
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
