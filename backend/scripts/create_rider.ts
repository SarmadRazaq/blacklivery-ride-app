import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const auth = admin.auth();
const db = admin.firestore();

type RegionCode = 'NG' | 'US-CHI';
type CurrencyCode = 'NGN' | 'USD';

const normalizeRegionInput = (value?: string): string =>
  (value ?? '').trim().toUpperCase().replace(/[_\s-]+/g, '');

const NIGERIA_REGION_ALIASES = new Set(['NG', 'NIGERIA', 'NGA', 'NIG', 'LAGOS']);
const US_REGION_ALIASES = new Set([
  'US',
  'USA',
  'UNITEDSTATES',
  'UNITEDSTATESOFAMERICA',
  'USCHI',
  'CHICAGO',
]);

const resolveRegion = (raw?: string): { region: RegionCode; currency: CurrencyCode; countryCode: 'NG' | 'US' } => {
  const normalized = normalizeRegionInput(raw);

  if (NIGERIA_REGION_ALIASES.has(normalized) || normalized.startsWith('NG')) {
    return { region: 'NG', currency: 'NGN', countryCode: 'NG' };
  }

  if (US_REGION_ALIASES.has(normalized) || normalized.startsWith('US')) {
    return { region: 'US-CHI', currency: 'USD', countryCode: 'US' };
  }

  return { region: 'NG', currency: 'NGN', countryCode: 'NG' };
};

async function createRider(): Promise<void> {
  const cliEmail = process.argv.find((arg) => arg.startsWith('--email='))?.split('=')[1];
  const cliPassword = process.argv.find((arg) => arg.startsWith('--password='))?.split('=')[1];
  const cliDisplayName = process.argv.find((arg) => arg.startsWith('--name='))?.split('=')[1];
  const cliRegion = process.argv.find((arg) => arg.startsWith('--region='))?.split('=')[1];

  const email = cliEmail || process.env.RIDER_EMAIL || 'rider@blacklivery.com';
  const password = cliPassword || process.env.RIDER_PASSWORD;
  const displayName = cliDisplayName || 'Test Rider';

  if (!password || password.length < 8) {
    throw new Error('RIDER_PASSWORD (or --password) is required and must be at least 8 characters');
  }

  const { region, currency, countryCode } = resolveRegion(cliRegion ?? process.env.RIDER_REGION);

  let userRecord: admin.auth.UserRecord;

  try {
    userRecord = await auth.getUserByEmail(email);
    userRecord = await auth.updateUser(userRecord.uid, {
      password,
      displayName,
      emailVerified: true,
    });
    console.log('✅ Existing rider found: password/profile reset in Firebase Auth.');
  } catch {
    userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    console.log('✅ New rider created in Firebase Auth.');
  }

  await auth.setCustomUserClaims(userRecord.uid, { role: 'rider' });

  const now = new Date();
  await db
    .collection('users')
    .doc(userRecord.uid)
    .set(
      {
        uid: userRecord.uid,
        email,
        emailLowercase: email.toLowerCase(),
        displayName,
        photoURL: userRecord.photoURL || '',
        role: 'rider',
        isActive: true,
        region,
        currency,
        countryCode,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    );

  console.log('✅ Rider profile created/updated in Firestore.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Region: ${region}`);
  console.log(`Currency: ${currency}`);
  console.log(`UID: ${userRecord.uid}`);
}

createRider()
  .catch((error) => {
    console.error('❌ Failed to create rider:', error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
