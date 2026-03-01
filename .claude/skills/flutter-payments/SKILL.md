---
name: flutter-payments
description: >
  Blacklivery payment integration guide. Use before writing any payment-related code:
  Paystack rider charges, Flutterwave payouts, Monnify driver withdrawals, Stripe for Chicago,
  wallet top-up flows, commission deduction logic, refund handling, promo code application,
  or webhook verification. Also use when debugging payment failures or building the earnings
  withdrawal screen. Covers both Nigeria (NGN) and Chicago (USD) payment flows.
---

# Blacklivery Payment Integration

## Payment Gateway by Region & Purpose
| Purpose | Nigeria | Chicago |
|---------|---------|---------|
| Rider charges (card/bank) | Paystack | Stripe |
| Driver payouts | Flutterwave + Monnify | Stripe Connect |
| Wallet top-up | Paystack | Stripe |
| Refunds | Paystack (reverse) | Stripe (refund) |

## CURRENT: How Payments Work in the App

The Flutter apps currently call the **backend REST API** for all payment operations — no native SDK for Paystack or Stripe is installed yet. The backend (`backend/src/services/payment/`) handles provider selection, charge creation, and webhook verification.

```dart
// Current PaymentService in rider app (lib/core/services/payment_service.dart)
Future<Map<String, dynamic>> initiatePayment({
  required String tripId,
  required double amount,
  required String provider, // 'paystack' | 'stripe'
}) async {
  final response = await _apiClient.dio.post('/api/v1/payments/initiate', data: {
    'tripId': tripId,
    'amount': amount,
    'provider': provider,
  });
  return response.data['data'];
  // Returns { authorizationUrl, reference } — open in WebView or browser
}

Future<Map<String, dynamic>> verifyPayment(String reference) async {
  final response = await _apiClient.dio.post('/api/v1/payments/verify', data: {
    'reference': reference,
  });
  return response.data['data'];
}
```

The native SDK patterns below (`flutter_paystack`, `stripe_flutter`) describe the **target in-app checkout** experience for smoother UX.

## Required Packages (planned — not yet in pubspec.yaml)
```yaml
flutter_paystack: ^1.0.5     # Paystack — Nigeria rider payments
stripe_flutter: ^9.0.0       # Stripe — Chicago
dio: ^5.4.0                  # HTTP for Flutterwave/Monnify REST APIs
```

## Currency Rules (CRITICAL)
```dart
// ALWAYS store money as integers to avoid floating point errors
// Nigeria: store in KOBO (100 kobo = ₦1)
// Chicago: store in CENTS (100 cents = $1)

// CORRECT
final fareKobo = 12000 * 100; // ₦12,000 = 1,200,000 kobo
final fareCents = 120 * 100;  // $120 = 12,000 cents

// WRONG — never do this
final fare = 12000.0; // double for money = bugs

// Display formatting
String formatNGN(int kobo) {
  final naira = kobo / 100;
  return NumberFormat.currency(locale: 'en_NG', symbol: '₦').format(naira);
}

String formatUSD(int cents) {
  final dollars = cents / 100;
  return NumberFormat.currency(locale: 'en_US', symbol: '\$').format(dollars);
}
```

## Paystack — Nigeria Rider Payment Flow

### Step 1: Initialize charge on backend (Express REST API — not Cloud Functions)
```typescript
// backend/src/controllers/payment.controller.ts
// POST /api/v1/payments/initiate
// The backend calls Paystack directly using PaystackProvider
const response = await fetch('https://api.paystack.co/transaction/initialize', {
  method: 'POST',
  headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  body: JSON.stringify({
    email: rider.email,
    amount: totalFareKobo,   // in kobo
    reference: generateRef(),
    metadata: { tripId, riderId },
  }),
});
// Returns { authorization_url, access_code, reference }
```

### Step 2: Open Paystack checkout in Flutter
```dart
@injectable
class PaystackService {
  final plugin = PaystackPlugin();

  Future<void> initialize() async {
    await plugin.initialize(publicKey: Env.paystackPublicKey);
  }

  Future<PaymentResult> chargeRider({
    required String email,
    required int amountKobo,
    required String reference,
    required String tripId,
  }) async {
    final charge = Charge()
      ..amount = amountKobo
      ..email = email
      ..reference = reference
      ..putMetaData('tripId', tripId);

    final response = await plugin.checkout(
      context,
      charge: charge,
      method: CheckoutMethod.card,
    );

    if (response.status) {
      // Verify on backend — never trust client-side success alone
      return _verifyOnBackend(reference);
    }
    return PaymentResult.failed(response.message);
  }
}
```

### Step 3: Verify on backend (Express webhook — not Cloud Functions)
```typescript
// backend/src/controllers/payment.controller.ts
// POST /api/v1/payments/webhook/paystack
app.post('/api/v1/payments/webhook/paystack', async (req, res) => {
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
    .update(JSON.stringify(req.body)).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  if (req.body.event === 'charge.success') {
    const { tripId } = req.body.data.metadata;
    await completeTripAndCreditWallet(tripId, req.body.data.amount);
  }
  res.sendStatus(200);
});
```

## Stripe — Chicago Rider Payment Flow

### Step 1: Create PaymentIntent on backend (Express REST API)
```typescript
// backend/src/services/payment/providers/StripeProvider.ts
// Called from POST /api/v1/payments/initiate
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalFareCents,
  currency: 'usd',
  metadata: { tripId, riderId },
  automatic_payment_methods: { enabled: true },
});
return { clientSecret: paymentIntent.client_secret };
```

### Step 2: Confirm payment in Flutter
```dart
@injectable
class StripeService {
  Future<void> initialize() async {
    Stripe.publishableKey = Env.stripePublishableKey;
    await Stripe.instance.applySettings();
  }

  Future<PaymentResult> chargeRider({
    required String clientSecret,
    required BillingDetails billingDetails,
  }) async {
    try {
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'Blacklivery',
          billingDetails: billingDetails,
        ),
      );
      await Stripe.instance.presentPaymentSheet();
      return PaymentResult.success();
    } on StripeException catch (e) {
      return PaymentResult.failed(e.error.message ?? 'Payment failed');
    }
  }
}
```

### Step 3: Stripe webhook (Express handler)
```typescript
// backend/src/controllers/payment.controller.ts
// POST /api/v1/payments/webhook/stripe
const event = stripe.webhooks.constructEvent(
  req.rawBody, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET
);
if (event.type === 'payment_intent.succeeded') {
  const tripId = event.data.object.metadata.tripId;
  await completeTripAndCreditWallet(tripId, event.data.object.amount);
}
```

## Commission Deduction (Cloud Function — runs on trip complete)
```typescript
async function completeTripAndCreditWallet(tripId: string, totalFare: number) {
  const COMMISSION_RATE = 0.25;
  const INSURANCE_DEDUCTION = 8000; // ₦80 in kobo (Nigeria only)

  await db.runTransaction(async (transaction) => {
    const tripRef = db.collection('trips').doc(tripId);
    const trip = (await transaction.get(tripRef)).data()!;
    const driverRef = db.collection('drivers').doc(trip.driverId);

    const commission = Math.round(totalFare * COMMISSION_RATE);
    const insurance = trip.region.startsWith('nigeria') ? INSURANCE_DEDUCTION : 0;
    const driverEarnings = totalFare - commission - insurance;

    transaction.update(tripRef, {
      status: 'completed',
      'fareBreakdown.platformCommission': commission,
      'fareBreakdown.driverEarnings': driverEarnings,
      completedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(driverRef, {
      walletBalance: FieldValue.increment(driverEarnings),
      totalEarned: FieldValue.increment(driverEarnings),
      totalTrips: FieldValue.increment(1),
    });
  });
}
```

## Driver Wallet Withdrawal

### Nigeria — Monnify Bank Transfer
```typescript
// Cloud Function: initiateDriverWithdrawal
async function withdrawNigeria(driverId: string, amountKobo: number, bankAccount: BankAccount) {
  // 1. Verify sufficient balance
  const driver = await db.collection('drivers').doc(driverId).get();
  if (driver.data()!.walletBalance < amountKobo) throw new Error('Insufficient balance');

  // 2. Deduct from wallet immediately (pending state)
  await db.collection('drivers').doc(driverId).update({
    walletBalance: FieldValue.increment(-amountKobo),
    pendingBalance: FieldValue.increment(amountKobo),
  });

  // 3. Initiate Monnify transfer
  const monnifyResponse = await initiateMonnifyTransfer({
    amount: amountKobo / 100, // Convert kobo to naira
    destinationAccountNumber: bankAccount.number,
    destinationBankCode: bankAccount.bankCode,
    narration: `Blacklivery earnings - ${driverId}`,
  });

  // 4. Log withdrawal
  await db.collection('withdrawals').add({
    driverId, amountKobo,
    reference: monnifyResponse.reference,
    status: 'pending', createdAt: FieldValue.serverTimestamp(),
  });
}
```

### Chicago — Stripe Connect Payout
```typescript
async function withdrawChicago(driverId: string, amountCents: number) {
  const driver = await db.collection('drivers').doc(driverId).get();
  const stripeAccountId = driver.data()!.stripeConnectId;

  await stripe.transfers.create({
    amount: amountCents,
    currency: 'usd',
    destination: stripeAccountId,
    description: `Blacklivery earnings payout`,
  });
}
```

## Promo Code Application (before charge)
```dart
Future<int> applyPromoCode(String code, int originalFare) async {
  final promo = await _promoRepository.getPromo(code);
  if (promo == null || !promo.isValid) return originalFare;

  final discount = promo.discountType == DiscountType.percent
    ? (originalFare * promo.discountValue / 100).round()
    : promo.discountValue; // fixed amount

  return max(0, originalFare - discount);
}
```

## Refund Flow
```dart
// Triggered by: rider cancellation after driver accepted, dispute resolution
// Calls backend REST API (not Cloud Functions)
Future<void> processRefund(String tripId, String paymentRef, int amountToRefund) async {
  await _dio.post('/api/v1/payments/refund', data: {
    'tripId': tripId,
    'reference': paymentRef,
    'amount': amountToRefund, // kobo (Nigeria) or cents (Chicago)
  });
  // Backend determines provider from trip region and calls PaystackProvider/StripeProvider
}
```

## Key Rules
1. NEVER trust client-side payment success — always verify via webhook
2. ALL wallet writes use Firestore transactions (runTransaction)
3. Always store amounts as integers (kobo/cents)
4. Deduct wallet balance to "pending" immediately on withdrawal, confirm on webhook
5. Keep all secret keys (Paystack secret, Stripe secret) in Cloud Functions only
6. Flutter app only ever holds PUBLIC keys (Paystack public key, Stripe publishable key)
7. Log every payment event to /auditLog for dispute resolution
8. Test with Paystack test cards: 4084084084084081 | Stripe: 4242424242424242
