/**
 * Seed pricing zones for Lagos, Abuja, and Chicago
 *
 * Usage:
 *   npx ts-node src/scripts/seed-pricing-zones.ts
 *
 * This creates zone documents in Firestore under config/pricing_zones/zones subcollection.
 * Each zone can have a surge multiplier override and price adjustment factor.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase if not already done
if (!admin.apps.length) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

interface PricingZone {
    name: string;
    region: 'NG' | 'US-CHI';
    city: string;
    center: { lat: number; lng: number };
    radiusKm: number;
    surgeMultiplier: number;   // Base surge offset for this zone (1.0 = none)
    priceAdjustment: number;   // Multiplier on top of base fare (1.0 = none, 1.1 = +10%)
    isAirport: boolean;
    isHighDemand: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ZONES: PricingZone[] = [
    // ─── Lagos Zones ─────────────────────────────────────────────────
    {
        name: 'Victoria Island',
        region: 'NG', city: 'lagos',
        center: { lat: 6.4281, lng: 3.4219 },
        radiusKm: 3,
        surgeMultiplier: 1.2, priceAdjustment: 1.1,
        isAirport: false, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Lekki Phase 1',
        region: 'NG', city: 'lagos',
        center: { lat: 6.4478, lng: 3.4740 },
        radiusKm: 4,
        surgeMultiplier: 1.1, priceAdjustment: 1.05,
        isAirport: false, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Ajah',
        region: 'NG', city: 'lagos',
        center: { lat: 6.4671, lng: 3.5720 },
        radiusKm: 5,
        surgeMultiplier: 1.0, priceAdjustment: 1.0,
        isAirport: false, isHighDemand: false,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Ikeja GRA',
        region: 'NG', city: 'lagos',
        center: { lat: 6.5833, lng: 3.3454 },
        radiusKm: 3,
        surgeMultiplier: 1.1, priceAdjustment: 1.05,
        isAirport: false, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Murtala Muhammed Airport (LOS)',
        region: 'NG', city: 'lagos',
        center: { lat: 6.5774, lng: 3.3212 },
        radiusKm: 5,
        surgeMultiplier: 1.3, priceAdjustment: 1.0,
        isAirport: true, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    // ─── Abuja Zones ─────────────────────────────────────────────────
    {
        name: 'Wuse II',
        region: 'NG', city: 'abuja',
        center: { lat: 9.0705, lng: 7.4869 },
        radiusKm: 3,
        surgeMultiplier: 1.1, priceAdjustment: 1.05,
        isAirport: false, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Garki',
        region: 'NG', city: 'abuja',
        center: { lat: 9.0228, lng: 7.4944 },
        radiusKm: 3,
        surgeMultiplier: 1.0, priceAdjustment: 1.0,
        isAirport: false, isHighDemand: false,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Maitama',
        region: 'NG', city: 'abuja',
        center: { lat: 9.0851, lng: 7.4977 },
        radiusKm: 3,
        surgeMultiplier: 1.2, priceAdjustment: 1.1,
        isAirport: false, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Nnamdi Azikiwe Airport (ABV)',
        region: 'NG', city: 'abuja',
        center: { lat: 9.0067, lng: 7.2632 },
        radiusKm: 5,
        surgeMultiplier: 1.3, priceAdjustment: 1.0,
        isAirport: true, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    // ─── Chicago Zones ───────────────────────────────────────────────
    {
        name: 'The Loop',
        region: 'US-CHI', city: 'chicago',
        center: { lat: 41.8819, lng: -87.6278 },
        radiusKm: 2,
        surgeMultiplier: 1.2, priceAdjustment: 1.1,
        isAirport: false, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Gold Coast',
        region: 'US-CHI', city: 'chicago',
        center: { lat: 41.9042, lng: -87.6283 },
        radiusKm: 2,
        surgeMultiplier: 1.1, priceAdjustment: 1.15,
        isAirport: false, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Hyde Park',
        region: 'US-CHI', city: 'chicago',
        center: { lat: 41.7943, lng: -87.5907 },
        radiusKm: 2.5,
        surgeMultiplier: 1.0, priceAdjustment: 1.0,
        isAirport: false, isHighDemand: false,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: "O'Hare Airport (ORD)",
        region: 'US-CHI', city: 'chicago',
        center: { lat: 41.9742, lng: -87.9073 },
        radiusKm: 5,
        surgeMultiplier: 1.0, priceAdjustment: 1.0,
        isAirport: true, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Midway Airport (MDW)',
        region: 'US-CHI', city: 'chicago',
        center: { lat: 41.7868, lng: -87.7522 },
        radiusKm: 4,
        surgeMultiplier: 1.0, priceAdjustment: 1.0,
        isAirport: true, isHighDemand: true,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Evanston',
        region: 'US-CHI', city: 'evanston',
        center: { lat: 42.0451, lng: -87.6877 },
        radiusKm: 4,
        surgeMultiplier: 1.0, priceAdjustment: 1.05,
        isAirport: false, isHighDemand: false,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Schaumburg',
        region: 'US-CHI', city: 'schaumburg',
        center: { lat: 42.0334, lng: -88.0833 },
        radiusKm: 5,
        surgeMultiplier: 1.0, priceAdjustment: 1.05,
        isAirport: false, isHighDemand: false,
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        name: 'Naperville',
        region: 'US-CHI', city: 'naperville',
        center: { lat: 41.7508, lng: -88.1535 },
        radiusKm: 6,
        surgeMultiplier: 1.0, priceAdjustment: 1.1,
        isAirport: false, isHighDemand: false,
        createdAt: new Date(), updatedAt: new Date()
    },
];

async function seedZones() {
    const zonesRef = db.collection('config').doc('pricing_zones').collection('zones');

    // Check if zones already exist
    const existing = await zonesRef.limit(1).get();
    if (!existing.empty) {
        console.log(`⚠️  Zones already exist (${(await zonesRef.get()).size} found). Skipping seed.`);
        console.log('   To re-seed, delete the config/pricing_zones/zones collection first.');
        return;
    }

    const batch = db.batch();
    for (const zone of ZONES) {
        const slug = zone.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const docRef = zonesRef.doc(slug);
        batch.set(docRef, zone);
    }

    await batch.commit();
    console.log(`✅ Seeded ${ZONES.length} pricing zones:`);
    const ngZones = ZONES.filter(z => z.region === 'NG');
    const chiZones = ZONES.filter(z => z.region === 'US-CHI');
    console.log(`   Nigeria: ${ngZones.length} zones (${ngZones.map(z => z.name).join(', ')})`);
    console.log(`   Chicago: ${chiZones.length} zones (${chiZones.map(z => z.name).join(', ')})`);
}

seedZones()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Failed to seed zones:', err);
        process.exit(1);
    });
