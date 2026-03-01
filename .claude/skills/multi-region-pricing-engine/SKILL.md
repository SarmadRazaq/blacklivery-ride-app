---
name: multi-region-pricing-engine
description: >
  Blacklivery fare calculation and pricing engine. Use before writing ANY code that calculates,
  estimates, displays, or applies fares for rides or deliveries. Covers exact formulas for
  Nigeria (Lagos, Abuja) and Chicago with all vehicle classes, surge multipliers, minimum fares,
  wait time fees, cancellation fees, commission splits, driver bonuses, and delivery pricing.
  Also use when building the admin pricing panel or when debugging incorrect fare amounts.
---

# Blacklivery Pricing Engine

## Architecture: Backend-Only Calculation

Fare calculation lives entirely in the **Node.js backend** (`backend/`). Flutter apps never compute fares — they request estimates from the API and display the result.

**Key backend files:**
- `backend/src/services/pricing/PricingService.ts` — entry point, selects strategy
- `backend/src/services/pricing/strategies/NigeriaPricingStrategy.ts` — Nigeria formula
- `backend/src/services/pricing/strategies/ChicagoPricingStrategy.ts` — Chicago formula
- `backend/src/services/pricing/SurgeService.ts` — OpenWeather + demand multiplier
- `backend/src/services/pricing/PricingConfigService.ts` — admin-configurable values

**From Flutter (fare estimate call):**
```dart
final response = await _dio.post('/api/v1/rides/estimate', data: {
  'pickupLat': pickup.latitude,
  'pickupLng': pickup.longitude,
  'dropoffLat': dropoff.latitude,
  'dropoffLng': dropoff.longitude,
  'vehicleClass': vehicleClass.name, // 'sedan', 'suv', 'xl'
  'region': regionProvider.apiRegionKey, // 'nigeria' or 'chicago'
});
// Returns fareBreakdown: { baseFare, distanceFare, timeFare, surge, total, minimumFare }
```

The Dart `FareCalculator` class below is for **client-side display estimates only** (before the server confirms). Always use the backend-confirmed fare for actual charges.

---

## CRITICAL: Money is Always Integers
```dart
// Nigeria: kobo (₦1 = 100 kobo)
// Chicago: cents ($1 = 100 cents)
// NEVER use double for money calculations
```

## Core Fare Formula (Both Regions)
```
totalFare = baseFare + (distance × ratePerUnit) + (minutes × ratePerMinute)
totalFare = max(totalFare, minimumFare)
totalFare = totalFare × surgeMultiplier
totalFare = round(totalFare)
```

---

## NIGERIA PRICING (NGN — Kobo)

### Lagos
```dart
const lagosBaseFare = {
  VehicleClass.sedan: 150000,  // ₦1,500 in kobo
  VehicleClass.suv:   150000,
  VehicleClass.xl:    150000,
};
// Note: same base, differentiated by km rate
```

### Abuja
```dart
const abujaBaseFare = {
  VehicleClass.sedan: 120000,  // ₦1,200
  VehicleClass.suv:   120000,
  VehicleClass.xl:    120000,
};
```

### Per-KM Rates (kobo per meter, then scale)
```dart
const nigeriaKmRateKobo = {
  VehicleClass.sedan: 25000,  // ₦250/km = 250 kobo/meter × 100
  VehicleClass.suv:   30000,  // ₦300/km
  VehicleClass.xl:    35000,  // ₦350/km
};
// To use: (distanceMeters / 1000) × rateKoboPerKm
```

### Per-Minute Rates (kobo)
```dart
const nigeriaMinuteRateKobo = {
  'lagos': {
    VehicleClass.sedan: 4500,  // ₦45/min
    VehicleClass.suv:   4500,
    VehicleClass.xl:    4500,
  },
  'abuja': {
    VehicleClass.sedan: 3000,  // ₦30/min
    VehicleClass.suv:   3000,
    VehicleClass.xl:    3000,
  },
};
```

### Minimum Fares (kobo)
```dart
const nigeriaMinimumFare = {
  VehicleClass.sedan: 500000,   // ₦5,000
  VehicleClass.suv:   700000,   // ₦7,000
  VehicleClass.xl:    1000000,  // ₦10,000
};
```

### Wait Time (Nigeria)
```dart
const nigeriaWaitTimeFreeMinutes = 3;
const nigeriaWaitTimeRateKoboPerMin = 10000; // ₦100/min

int calculateWaitTimeFee(int elapsedMinutes) {
  final billableMinutes = max(0, elapsedMinutes - nigeriaWaitTimeFreeMinutes);
  return billableMinutes * nigeriaWaitTimeRateKoboPerMin;
}
```

### Cancellation Fees (kobo)
```dart
const nigeriaCancellationFee = {
  VehicleClass.sedan: 150000,  // ₦1,500
  VehicleClass.suv:   200000,  // ₦2,000
  VehicleClass.xl:    250000,  // ₦2,500
};
```

### No-Show Fees (kobo) — charged after 5 min of driver waiting
```dart
const nigeriaNoShowFee = {
  VehicleClass.sedan: 200000,  // ₦2,000
  VehicleClass.suv:   300000,  // ₦3,000
  VehicleClass.xl:    400000,  // ₦4,000
};
const nigeriaNoShowTriggerMinutes = 5;
```

### Nigeria Surge Multipliers
```dart
// Stored as integer × 100 to avoid float (e.g., 1.5x = 150)
const nigeriaSurgeMap = {
  'normal':   100,  // 1.0x
  'low':      120,  // 1.2x
  'medium':   150,  // 1.5x
  'high':     200,  // 2.0x
  'extreme':  300,  // 3.0x
};

int applySurge(int fare, int surgeInt) {
  return (fare * surgeInt / 100).round();
}
```

### Nigeria Surge Trigger Zones
```dart
const nigeriaSurgeZones = [
  'Victoria Island', 'Lekki', 'Ajah', 'Ikeja', 'Wuse', 'Bannex'
];
// driver supply < 60% → trigger surge
// bad weather (OpenWeatherMap) → trigger surge
// admin manual override
```

---

## CHICAGO PRICING (USD — Cents)

### Base Fares (cents)
```dart
const chicagoBaseFare = {
  VehicleClass.businessSedan: 3500,  // $35.00
  VehicleClass.businessSuv:   4500,  // $45.00
  VehicleClass.firstClass:    6000,  // $60.00
};
```

### Per-Mile Rates (cents per mile)
```dart
const chicagoMileRateCents = {
  VehicleClass.businessSedan: 300,   // $3.00/mile
  VehicleClass.businessSuv:   375,   // $3.75/mile
  VehicleClass.firstClass:    450,   // $4.50/mile
};
```

### Per-Minute Rates (cents)
```dart
const chicagoMinuteRateCents = {
  VehicleClass.businessSedan: 50,    // $0.50/min
  VehicleClass.businessSuv:   70,    // $0.70/min
  VehicleClass.firstClass:    90,    // $0.90/min
};
```

### Minimum Fares (cents)
```dart
const chicagoMinimumFare = {
  VehicleClass.businessSedan: 5500,   // $55.00
  VehicleClass.businessSuv:   7500,   // $75.00
  VehicleClass.firstClass:    9500,   // $95.00
};
```

### Fixed Airport Transfer Prices (cents)
```dart
const airportPrices = {
  'ord': {  // O'Hare
    VehicleClass.businessSedan: 9500,   // $95
    VehicleClass.businessSuv:   12500,  // $125
    VehicleClass.firstClass:    15000,  // $150
  },
  'mdw': {  // Midway
    VehicleClass.businessSedan: 8500,   // $85
    VehicleClass.businessSuv:   11000,  // $110
    VehicleClass.firstClass:    13500,  // $135
  },
};
// Airport transfers BYPASS dynamic formula — use fixed prices
```

### Airport Wait Time (Chicago)
```dart
const chicagoAirportWaitTimeFreeMinutes = 60; // 60 min free
const chicagoAirportWaitRateCentsPerMin = 100; // $1.00/min after
```

### Hourly Rates (cents per hour)
```dart
const chicagoHourlyRateCents = {
  VehicleClass.businessSedan: 8000,   // $80/hr
  VehicleClass.businessSuv:   11000,  // $110/hr
  VehicleClass.firstClass:    14000,  // $140/hr
};
const chicagoHourlyMinimumHours = 2; // 2hr minimum booking

int calculateHourlyFare(VehicleClass vehicle, int hours) {
  final billableHours = max(hours, chicagoHourlyMinimumHours);
  return chicagoHourlyRateCents[vehicle]! * billableHours;
}
```

### Chicago Additional Fees (cents)
```dart
const chicagoAdditionalFees = {
  'extraStop':      1500,  // $15
  'childSeat':      1000,  // $10
  'meetAndGreet':   1000,  // $10
  'afterHours':     1000,  // $10 (11pm–5am)
};
```

### Chicago Cancellation Fees (cents)
```dart
// Standard: $25 within 1hr of pickup
const chicagoStandardCancellationFee = 2500;
// Airport: 50% of fare within 2hr of pickup
// Hourly: 1hr equivalent within 3hr of booking
```

### Chicago Surge
```dart
const chicagoSurgeMap = {
  'normal':   100,  // 1.0x
  'low':      110,  // 1.1x
  'moderate': 130,  // 1.3x
  'high':     160,  // 1.6x
  'extreme':  200,  // 2.0x
};
// Triggers: supply < 50%, major events (Lollapalooza, NBA/NFL), heavy snow, manual
```

---

## FARE CALCULATOR (Dart Implementation)
```dart
class FareCalculator {
  static int calculateFare({
    required Region region,
    required String city,         // 'lagos' | 'abuja' | 'chicago'
    required VehicleClass vehicle,
    required double distanceKm,   // or distanceMiles for Chicago
    required int durationMinutes,
    required int surgeInt,        // e.g. 150 = 1.5x
    List<String> extras = const [],
  }) {
    int baseFare, distanceFare, timeFare, minimumFare;

    if (region == Region.nigeria) {
      baseFare = city == 'lagos'
        ? lagosBaseFare[vehicle]!
        : abujaBaseFare[vehicle]!;
      distanceFare = (distanceKm * nigeriaKmRateKobo[vehicle]!).round();
      timeFare = durationMinutes *
        (city == 'lagos' ? nigeriaMinuteRateKobo['lagos']![vehicle]!
                         : nigeriaMinuteRateKobo['abuja']![vehicle]!);
      minimumFare = nigeriaMinimumFare[vehicle]!;
    } else {
      // Chicago: distanceKm is actually miles here
      baseFare = chicagoBaseFare[vehicle]!;
      distanceFare = (distanceKm * chicagoMileRateCents[vehicle]!).round();
      timeFare = durationMinutes * chicagoMinuteRateCents[vehicle]!;
      minimumFare = chicagoMinimumFare[vehicle]!;

      // After-hours fee
      if (extras.contains('afterHours'))
        baseFare += chicagoAdditionalFees['afterHours']!;
      if (extras.contains('extraStop'))
        baseFare += chicagoAdditionalFees['extraStop']!;
      if (extras.contains('childSeat'))
        baseFare += chicagoAdditionalFees['childSeat']!;
    }

    int total = baseFare + distanceFare + timeFare;
    total = max(total, minimumFare);
    total = applySurge(total, surgeInt);
    return total;
  }
}
```

---

## COMMISSION SPLIT
```dart
int calculatePlatformCommission(int fare) => (fare * 0.25).round(); // 25%
int calculateDriverEarnings(int fare) => fare - calculatePlatformCommission(fare); // 75%

// Nigeria only — insurance micro-deduction
const nigeriaInsuranceDeductionKobo = 8000; // ₦80
int calculateNetDriverEarningsNigeria(int fare) {
  return calculateDriverEarnings(fare) - nigeriaInsuranceDeductionKobo;
}

// Optional subscription (Nigeria): ₦30,000/month → 15% commission
int calculateSubscriptionDriverEarnings(int fare) => (fare * 0.85).round();
```

---

## DRIVER BONUSES

### Nigeria Daily/Weekly
```dart
// Evaluate at end of each day via Cloud Function scheduled job
int getNigeriaDailyBonus(int tripsToday) {
  if (tripsToday >= 10) return 700000;  // ₦7,000 in kobo
  if (tripsToday >= 6)  return 300000;  // ₦3,000
  return 0;
}
int getNigeriaWeeklyBonus(int tripsThisWeek) {
  if (tripsThisWeek >= 40) return 1000000; // ₦10,000
  return 0;
}
```

### Chicago Weekly
```dart
const chicagoWeeklyGuaranteeThreshold = 20; // trips
const chicagoWeeklyGuaranteeCents = 120000; // $1,200

// If driver earned < $1,200 after 20+ trips, top up to $1,200
int getChicagoWeeklyTopUp(int tripsThisWeek, int earningsThisWeek) {
  if (tripsThisWeek >= chicagoWeeklyGuaranteeThreshold &&
      earningsThisWeek < chicagoWeeklyGuaranteeCents) {
    return chicagoWeeklyGuaranteeCents - earningsThisWeek;
  }
  return 0;
}
```

---

## DELIVERY PRICING (Nigeria)
```dart
const deliveryBaseFare = {
  'motorbike': 70000,  // ₦700
  'sedan':     100000, // ₦1,000
  'suv':       150000, // ₦1,500
  'van':       300000, // ₦3,000
};
const deliveryKmRateKobo = {
  'motorbike': 12000,  // ₦120/km
  'sedan':     15000,  // ₦150/km
  'suv':       20000,  // ₦200/km
  'van':       25000,  // ₦250/km
};
const deliveryMinimumFare = {
  'motorbike': 150000, // ₦1,500
  'sedan':     250000, // ₦2,500
  'suv':       400000, // ₦4,000
  'van':       700000, // ₦7,000
};

// Service type multipliers (× 100 = integer)
const deliveryServiceMultiplier = {
  'instant':    120, // 1.2x
  'sameDay':    100, // 1.0x
  'scheduled':  90,  // 0.9x
};

const deliveryWaitTimeFreeMinutes = 7;
const deliveryExtraStopFeeKobo = {
  'motorbike': 50000,  // ₦500
  'sedan':     75000,  // ₦750
  'suv':       100000, // ₦1,000
};
const deliveryReturnTripMultiplier = 70; // 70% of original fare
```

---

## Admin Overrides
Pricing values are stored in **Firestore** (server-side, accessed by the backend via Firebase Admin SDK) and managed via the admin panel (`frontend-adminpanel/`). Flutter apps never read Firestore pricing directly.

```dart
// Flutter: load live fare config via backend API
final response = await _dio.get('/api/v1/admin/pricing/$regionKey');
final pricingConfig = PricingConfig.fromJson(response.data['data']);
// Use pricingConfig values instead of hardcoded constants for display
```

Backend Firestore path: `/pricing/{region}` where region = `'nigeria_lagos'` | `'nigeria_abuja'` | `'chicago'`

When fixing a fare bug, check `PricingConfigService.ts` to see if the value is hardcoded or Firestore-loaded, and `NigeriaPricingStrategy.ts` or `ChicagoPricingStrategy.ts` for the formula. The minimum fare check specifically is: `total = max(total, minimumFare)` — applied *before* surge, not after.
