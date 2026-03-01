import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.firestore();

type RegionCode = 'NG' | 'US-CHI';
type CurrencyCode = 'NGN' | 'USD';

const normalizeText = (value?: string): string =>
  (value ?? '').toString().trim().toUpperCase().replace(/[_\s-]+/g, '');

const normalizePhone = (phone?: string): string => (phone ?? '').replace(/\D/g, '');

const NIGERIA_ALIASES = new Set(['NG', 'NIGERIA', 'NGA', 'NIG', 'LAGOS']);
const US_ALIASES = new Set([
  'US',
  'USA',
  'UNITEDSTATES',
  'UNITEDSTATESOFAMERICA',
  'USCHI',
  'CHICAGO',
]);

const regionFromString = (raw?: string): RegionCode | null => {
  const text = normalizeText(raw);
  if (!text) return null;

  if (NIGERIA_ALIASES.has(text) || text.startsWith('NG')) return 'NG';
  if (US_ALIASES.has(text) || text.startsWith('US')) return 'US-CHI';

  return null;
};

const expectedCurrency = (region: RegionCode): CurrencyCode =>
  region === 'NG' ? 'NGN' : 'USD';

const expectedCountryCode = (region: RegionCode): 'NG' | 'US' =>
  region === 'NG' ? 'NG' : 'US';

const inferRegion = (user: FirebaseFirestore.DocumentData): RegionCode => {
  const directRegion = regionFromString(user.region);
  if (directRegion) return directRegion;

  const directCountry = regionFromString(user.countryCode) || regionFromString(user.country);
  if (directCountry) return directCountry;

  const currency = normalizeText(user.currency);
  if (currency === 'USD') return 'US-CHI';
  if (currency === 'NGN') return 'NG';

  const phone = user.phoneNumber as string | undefined;
  const phoneNormalized = normalizePhone(phone);
  if (phone?.startsWith('+234') || phoneNormalized.startsWith('234')) return 'NG';
  if (phone?.startsWith('+1') || phoneNormalized.startsWith('1')) return 'US-CHI';

  return 'NG';
};

interface ScanResult {
  total: number;
  changed: number;
  unchanged: number;
  skipped: number;
}

async function run(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
  const uidArg = process.argv.find((arg) => arg.startsWith('--uid='))?.split('=')[1];

  const limit = limitArg ? Number(limitArg) : undefined;
  if (limitArg && (!Number.isFinite(limit) || limit! <= 0)) {
    throw new Error('--limit must be a positive number');
  }

  let total = 0;
  let changed = 0;
  let unchanged = 0;
  let skipped = 0;

  const updates: Array<{
    ref: FirebaseFirestore.DocumentReference;
    data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
  }> = [];

  if (uidArg) {
    const doc = await db.collection('users').doc(uidArg).get();
    if (!doc.exists) {
      console.log(`No user found for uid=${uidArg}`);
      return;
    }
    const data = doc.data() || {};
    total += 1;

    const region = inferRegion(data);
    const currency = expectedCurrency(region);
    const countryCode = expectedCountryCode(region);

    const currentRegion = data.region as string | undefined;
    const currentCurrency = (data.currency as string | undefined)?.toUpperCase();
    const currentCountryCode = (data.countryCode as string | undefined)?.toUpperCase();

    const needsUpdate =
      currentRegion !== region ||
      currentCurrency !== currency ||
      currentCountryCode !== countryCode;

    if (needsUpdate) {
      changed += 1;
      updates.push({
        ref: doc.ref,
        data: {
          region,
          currency,
          countryCode,
          updatedAt: new Date(),
        },
      });
      console.log(`↺ ${doc.id}: ${currentRegion ?? '-'} / ${currentCurrency ?? '-'} -> ${region} / ${currency}`);
    } else {
      unchanged += 1;
      console.log(`✓ ${doc.id}: already normalized (${region}, ${currency})`);
    }
  } else {
    const snapshot = await db.collection('users').get();

    for (const doc of snapshot.docs) {
      if (limit && total >= limit) break;

      const data = doc.data() || {};
      total += 1;

      const region = inferRegion(data);
      const currency = expectedCurrency(region);
      const countryCode = expectedCountryCode(region);

      const currentRegion = data.region as string | undefined;
      const currentCurrency = (data.currency as string | undefined)?.toUpperCase();
      const currentCountryCode = (data.countryCode as string | undefined)?.toUpperCase();

      const needsUpdate =
        currentRegion !== region ||
        currentCurrency !== currency ||
        currentCountryCode !== countryCode;

      if (!needsUpdate) {
        unchanged += 1;
        continue;
      }

      if (!doc.id) {
        skipped += 1;
        continue;
      }

      changed += 1;
      updates.push({
        ref: doc.ref,
        data: {
          region,
          currency,
          countryCode,
          updatedAt: new Date(),
        },
      });

      console.log(`↺ ${doc.id}: ${currentRegion ?? '-'} / ${currentCurrency ?? '-'} -> ${region} / ${currency}`);
    }
  }

  const result: ScanResult = { total, changed, unchanged, skipped };

  if (!apply) {
    console.log('\nDRY RUN ONLY (no writes). Use --apply to persist changes.');
    console.log(result);
    return;
  }

  if (updates.length === 0) {
    console.log('\nNo updates needed.');
    console.log(result);
    return;
  }

  let batch = db.batch();
  let batchOps = 0;
  let committed = 0;

  for (const update of updates) {
    batch.update(update.ref, update.data);
    batchOps += 1;

    if (batchOps === 400) {
      await batch.commit();
      committed += batchOps;
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
    committed += batchOps;
  }

  console.log(`\n✅ Applied ${committed} updates.`);
  console.log(result);
}

run()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
