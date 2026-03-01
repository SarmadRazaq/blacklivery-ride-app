import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

if (!admin.apps.length) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json';
    const absoluteServiceAccountPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(absoluteServiceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const nigeriaPricing = {
    pricing: {
        lagos: { baseFare: 1500, perMinute: 45, waitTimeFee: 100 },
        abuja: { baseFare: 1200, perMinute: 30, waitTimeFee: 100 },
        default: { baseFare: 1500, perMinute: 45, waitTimeFee: 100 }
    },
    categories: {
        sedan: { perKm: 250, minFare: 5000 },
        suv: { perKm: 300, minFare: 7000 },
        xl: { perKm: 350, minFare: 10000 }
    },
    addOns: {
        premiumVehicle: 1500,
        chauffeurSedan: 1000,
        extraLuggage: {
            sedan: 1000,
            suv: 1500,
            xl: 2000,
            min: 1000,
            max: 2000
        },
        airportPriorityPickup: 1500
    },
    fees: {
        cancellation: {
            sedan: 1500,
            suv: 2000,
            xl: 2500
        },
        noShow: {
            sedan: 2000,
            suv: 3000,
            xl: 4000
        },
        waitTime: {
            freeMinutes: 3,
            perMinute: 100
        }
    },
    surge: {
        normal: 1.0,
        peak: 1.2,
        high: 1.5,
        extreme: 2.0,
        maxMultiplier: 3.0,
        trigger: {
            supplyThreshold: 0.6,
            highTrafficZones: ['VI', 'Lekki', 'Ajah', 'Ikeja', 'Wuse', 'Bannex'],
            timedSurgeWindows: [
                { startHour: 7, endHour: 9, multiplier: 1.2 },
                { startHour: 16, endHour: 20, multiplier: 1.3 }
            ]
        }
    },
    platformCommission: 0.25,
    incentives: {
        dailyTrips: [
            { trips: 6, bonus: 3000 },
            { trips: 10, bonus: 7000 }
        ],
        weeklyTrips: { trips: 40, bonus: 10000 },
        peakHourBoost: { min: 300, max: 500 },
        ratingTiers: {
            priorityMin: 4.8,
            neutralMin: 4.5,
            reviewBelow: 4.5
        }
    },
    loyalty: {
        pointsPerCurrency: 0.1,
        tiers: {
            bronze: 0,
            silver: 500,
            gold: 2000,
            platinum: 5000
        }
    },
    updatedAt: new Date()
};

const chicagoPricing = {
    rates: {
        business_sedan: { base: 35, perMile: 3.0, perMin: 0.5, minFare: 55 },
        business_suv: { base: 45, perMile: 3.75, perMin: 0.7, minFare: 75 },
        first_class: { base: 60, perMile: 4.5, perMin: 0.9, minFare: 95 }
    },
    airport: {
        ORD: {
            business_sedan: 95,
            business_suv: 125,
            first_class: 150
        },
        MDW: {
            business_sedan: 85,
            business_suv: 110,
            first_class: 135
        }
    },
    hourly: {
        business_sedan: 80,
        business_suv: 110,
        first_class: 140
    },
    addOns: {
        childSeat: 10,
        extraStop: 15,
        meetAndGreet: 10,
        afterHoursFee: 10
    },
    fees: {
        cancellation: {
            standard: 25,
            airportPercent: 0.5,
            hourlyHoursCharge: 1
        },
        waitTime: {
            airportFreeMinutes: 60,
            airportPerMinute: 1
        }
    },
    surge: {
        normal: 1.0,
        moderate: 1.1,
        high: 1.3,
        extreme: 1.6,
        maxMultiplier: 2.0,
        trigger: {
            supplyThreshold: 0.5,
            zones: ['Loop', 'Gold Coast', 'Hyde Park', 'North Side'],
            timedSurgeWindows: [
                { startHour: 6, endHour: 9, multiplier: 1.2 },
                { startHour: 16, endHour: 19, multiplier: 1.3 }
            ]
        }
    },
    platformCommission: 0.25,
    incentives: {
        weeklyGuarantee: { trips: 20, minimum: 1200 },
        peakHourBonus: 5,
        airportBonus: { ORD: 10, MDW: 8 },
        ratingTiers: {
            priorityMin: 4.9,
            neutralMin: 4.7,
            reviewBelow: 4.7
        }
    },
    loyalty: {
        pointsPerCurrency: 10,
        tiers: {
            bronze: 0,
            silver: 500,
            gold: 2000,
            platinum: 5000
        }
    },
    updatedAt: new Date()
};

const nigeriaDeliveryPricing = {
    rates: {
        motorbike: { base: 700, perKm: 120, perMin: 15, minFare: 1500, cancel: 300, noShow: 500 },
        sedan: { base: 1000, perKm: 150, perMin: 20, minFare: 2500, cancel: 500, noShow: 750 },
        suv: { base: 1500, perKm: 200, perMin: 30, minFare: 4000, cancel: 500, noShow: 750 },
        van: { base: 3000, perKm: 250, perMin: 35, minFare: 7000, cancel: 1000, noShow: 1500 }
    },
    serviceMultipliers: {
        instant: 1.2,
        same_day: 1.0,
        scheduled: 0.9
    },
    fees: {
        waitTime: {
            freeMinutes: 7,
            perCategory: {
                motorbike: 20,
                sedan: 25,
                suv: 30,
                van: 35
            }
        },
        extraStop: {
            motorbike: 500,
            sedan: 750,
            suv: 1000,
            van: 1200
        },
        fragileItem: {
            motorbike: 500,
            sedan: 1000,
            suv: 1000,
            van: 1500
        },
        returnTripMultiplier: 0.7,
        cancellation: {
            motorbike: 300,
            sedan: 500,
            suv: 500,
            van: 1000
        },
        noShow: {
            motorbike: 500,
            sedan: 750,
            suv: 750,
            van: 1500
        }
    },
    platformCommission: 0.25,
    updatedAt: new Date()
};

async function seedPricingRules() {
    const batch = db.batch();

    batch.set(db.collection('pricing_rules').doc('nigeria'), nigeriaPricing, { merge: true });
    batch.set(db.collection('pricing_rules').doc('chicago'), chicagoPricing, { merge: true });
    batch.set(db.collection('pricing_rules').doc('nigeria_delivery'), nigeriaDeliveryPricing, { merge: true });

    batch.set(db.collection('config').doc('payments'), {
        NG: {
            commissionRate: 0.25,
            defaultCommissionRate: 0.25,
            microDeductions: { flatFee: 75, percentage: 0 },
            subscription: {
                discountRate: 0.1,
                defaultDiscount: 0.1,
                waiveMicroFees: false
            }
        },
        'US-CHI': {
            commissionRate: 0.25,
            defaultCommissionRate: 0.25,
            microDeductions: { flatFee: 0, percentage: 0 },
            subscription: {
                discountRate: 0.1,
                defaultDiscount: 0.1,
                waiveMicroFees: false
            }
        },
        updatedAt: new Date()
    }, { merge: true });

    await batch.commit();
    console.log('✅ Seeded pricing rules for nigeria, chicago, and nigeria_delivery');
}

seedPricingRules()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Failed to seed pricing rules', err);
        process.exit(1);
    });
