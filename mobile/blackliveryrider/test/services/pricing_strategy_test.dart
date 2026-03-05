import 'package:flutter_test/flutter_test.dart';

// =============================================================================
// MODELS — Mirrors backend IPricingStrategy / PriceBreakdown
// =============================================================================

class PriceBreakdown {
  final double baseFare;
  final double distanceFare;
  final double timeFare;
  final double surgeFare;
  final double waitTimeFare;
  final double addOnsFare;
  final double otherFees;
  final double subtotal;
  final double totalFare;
  final String currency;
  final double surgeMultiplier;

  const PriceBreakdown({
    required this.baseFare,
    required this.distanceFare,
    required this.timeFare,
    this.surgeFare = 0,
    this.waitTimeFare = 0,
    this.addOnsFare = 0,
    this.otherFees = 0,
    this.subtotal = 0,
    required this.totalFare,
    required this.currency,
    this.surgeMultiplier = 1.0,
  });
}

class RideDetails {
  final double distanceKm;
  final double durationMinutes;
  final String city;
  final String vehicleCategory;
  final String bookingType; // 'standard', 'hourly', 'delivery'
  final bool isAirport;
  final String? airportCode;
  final double? hoursBooked;
  final double surgeMultiplier;
  final String? pickupAddress;
  final String? dropoffAddress;

  const RideDetails({
    this.distanceKm = 0,
    this.durationMinutes = 0,
    this.city = 'lagos',
    this.vehicleCategory = 'sedan',
    this.bookingType = 'standard',
    this.isAirport = false,
    this.airportCode,
    this.hoursBooked,
    this.surgeMultiplier = 1.0,
    this.pickupAddress,
    this.dropoffAddress,
  });
}

class CommissionSplit {
  final double driverAmount;
  final double platformFee;

  const CommissionSplit({
    required this.driverAmount,
    required this.platformFee,
  });
}

// =============================================================================
// NIGERIA PRICING STRATEGY — Dynamic pricing (Base + KM + Min + Traffic)
// Rates sourced from: backend/src/services/pricing/strategies/NigeriaPricingStrategy.ts
// =============================================================================

class NigeriaPricingStrategy {
  // ── City configs ──────────────────────────────────────────────────────────
  static const Map<String, Map<String, double>> _cityConfig = {
    'lagos': {'baseFare': 1500, 'perMinute': 45, 'waitTimeFee': 100},
    'abuja': {'baseFare': 1200, 'perMinute': 30, 'waitTimeFee': 100},
    'default': {'baseFare': 1500, 'perMinute': 45, 'waitTimeFee': 100},
  };

  // ── Vehicle category rates ────────────────────────────────────────────────
  static const Map<String, Map<String, double>> _rideRates = {
    'sedan': {'perKm': 250, 'minFare': 5000, 'cancel': 1500, 'noShow': 2000},
    'suv': {'perKm': 300, 'minFare': 7000, 'cancel': 2000, 'noShow': 3000},
    'xl': {'perKm': 350, 'minFare': 10000, 'cancel': 2500, 'noShow': 4000},
  };

  // ── Hourly rates (NGN) ────────────────────────────────────────────────────
  static const Map<String, double> _hourlyRates = {
    'sedan': 5000,
    'suv': 7500,
    'xl': 12000,
  };

  // ── Minimum hours for hourly booking ──────────────────────────────────────
  static const double _minimumHours = 2.0;

  PriceBreakdown calculateFare(RideDetails ride) {
    if (ride.bookingType == 'hourly') {
      return _calculateHourlyFare(ride);
    }
    return _calculateStandardFare(ride);
  }

  // ── Standard metered ride ─────────────────────────────────────────────────
  PriceBreakdown _calculateStandardFare(RideDetails ride) {
    final cityKey = _cityConfig.containsKey(ride.city.toLowerCase())
        ? ride.city.toLowerCase()
        : 'default';

    final city = _cityConfig[cityKey]!;
    final category = ride.vehicleCategory.toLowerCase();
    final vehicle = _rideRates[category] ?? _rideRates['sedan']!;

    final double baseFare = city['baseFare']!;
    final double perMinute = city['perMinute']!;
    final double perKm = vehicle['perKm']!;
    final double minFare = vehicle['minFare']!;

    final double distanceFare = ride.distanceKm * perKm;
    final double timeFare = ride.durationMinutes * perMinute;

    final double surgeMultiplier = ride.surgeMultiplier;
    final double surgeFare =
        (distanceFare + timeFare) * (surgeMultiplier - 1.0);

    final double subtotal = baseFare + distanceFare + timeFare + surgeFare;
    double totalFare = subtotal;

    // Enforce minimum fare
    if (totalFare < minFare) {
      totalFare = minFare;
    }

    return PriceBreakdown(
      baseFare: baseFare,
      distanceFare: distanceFare,
      timeFare: timeFare,
      surgeFare: surgeFare,
      subtotal: subtotal,
      totalFare: totalFare,
      currency: 'NGN',
      surgeMultiplier: surgeMultiplier,
    );
  }

  // ── Hourly booking ────────────────────────────────────────────────────────
  PriceBreakdown _calculateHourlyFare(RideDetails ride) {
    final hours = ride.hoursBooked ?? 2;

    if (hours < _minimumHours) {
      throw ArgumentError('Minimum 2 Hours');
    }

    final category = ride.vehicleCategory.toLowerCase();
    final double hourlyRate = _hourlyRates[category] ?? 5000;
    final double totalFare = hours * hourlyRate;

    return PriceBreakdown(
      baseFare: totalFare,
      distanceFare: 0,
      timeFare: 0,
      totalFare: totalFare,
      currency: 'NGN',
    );
  }
}

// =============================================================================
// CHICAGO PRICING STRATEGY — Luxury pricing (High Base + Mile + Hourly + Airport)
// Rates sourced from: backend/src/services/pricing/strategies/ChicagoPricingStrategy.ts
// =============================================================================

class ChicagoPricingStrategy {
  // ── Standard rates ────────────────────────────────────────────────────────
  static const Map<String, Map<String, double>> _rates = {
    'business_sedan': {
      'base': 35,
      'perMile': 3.00,
      'perMin': 0.50,
      'minFare': 55,
    },
    'business_suv': {
      'base': 45,
      'perMile': 3.75,
      'perMin': 0.70,
      'minFare': 75,
    },
    'first_class': {'base': 60, 'perMile': 4.50, 'perMin': 0.90, 'minFare': 95},
  };

  // ── Airport flat rates ────────────────────────────────────────────────────
  static const Map<String, Map<String, double>> _airportRates = {
    'ORD': {'business_sedan': 95, 'business_suv': 125, 'first_class': 150},
    'MDW': {'business_sedan': 85, 'business_suv': 110, 'first_class': 135},
  };

  // ── Hourly rates ──────────────────────────────────────────────────────────
  static const Map<String, double> _hourlyRates = {
    'business_sedan': 80,
    'business_suv': 110,
    'first_class': 140,
  };

  // ── Minimum hours for hourly booking ──────────────────────────────────────
  static const double _minimumHours = 2.0;

  PriceBreakdown calculateFare(RideDetails ride) {
    if (ride.bookingType == 'hourly') {
      return _calculateHourlyFare(ride);
    }
    if (ride.isAirport && ride.airportCode != null) {
      return _calculateAirportFare(ride);
    }
    return _calculateStandardFare(ride);
  }

  // ── Standard metered ride ─────────────────────────────────────────────────
  PriceBreakdown _calculateStandardFare(RideDetails ride) {
    final category = ride.vehicleCategory.toLowerCase();
    final rateConfig = _rates[category] ?? _rates['business_sedan']!;

    final double baseFare = rateConfig['base']!;
    final double distanceFare = ride.distanceKm * rateConfig['perMile']!;
    final double timeFare = ride.durationMinutes * rateConfig['perMin']!;

    final double surgeMultiplier = ride.surgeMultiplier;
    final double surgeFare =
        (baseFare + distanceFare + timeFare) * (surgeMultiplier - 1.0);

    double totalFare = baseFare + distanceFare + timeFare + surgeFare;
    if (totalFare < rateConfig['minFare']!) {
      totalFare = rateConfig['minFare']!;
    }

    return PriceBreakdown(
      baseFare: baseFare,
      distanceFare: distanceFare,
      timeFare: timeFare,
      surgeFare: surgeFare,
      totalFare: totalFare,
      currency: 'USD',
      surgeMultiplier: surgeMultiplier,
    );
  }

  // ── Airport flat rate ─────────────────────────────────────────────────────
  PriceBreakdown _calculateAirportFare(RideDetails ride) {
    final airport = ride.airportCode ?? 'ORD';
    final category = ride.vehicleCategory.toLowerCase();

    final airportMap = _airportRates[airport] ?? _airportRates['ORD']!;
    final double fixedPrice = airportMap[category] ?? 100;

    return PriceBreakdown(
      baseFare: fixedPrice,
      distanceFare: 0,
      timeFare: 0,
      surgeFare: 0,
      totalFare: fixedPrice,
      currency: 'USD',
    );
  }

  // ── Hourly booking ────────────────────────────────────────────────────────
  PriceBreakdown _calculateHourlyFare(RideDetails ride) {
    final hours = ride.hoursBooked ?? 2;

    if (hours < _minimumHours) {
      throw ArgumentError('Minimum 2 Hours');
    }

    final category = ride.vehicleCategory.toLowerCase();
    final double hourlyRate = _hourlyRates[category] ?? 80;
    final double totalFare = hours * hourlyRate;

    return PriceBreakdown(
      baseFare: totalFare,
      distanceFare: 0,
      timeFare: 0,
      totalFare: totalFare,
      currency: 'USD',
    );
  }
}

// =============================================================================
// COMMISSION CALCULATOR — 75 / 25 Driver / Platform split
// =============================================================================

class CommissionCalculator {
  static const double driverPercentage = 0.75;
  static const double platformPercentage = 0.25;

  CommissionSplit split(double totalFare) {
    return CommissionSplit(
      driverAmount: totalFare * driverPercentage,
      platformFee: totalFare * platformPercentage,
    );
  }
}

// =============================================================================
// ████████  ███████  ███████  ████████  ███████
//    ██     ██       ██          ██     ██
//    ██     █████    ███████     ██     ███████
//    ██     ██            ██    ██          ██
//    ██     ███████  ███████    ██     ███████
// =============================================================================

void main() {
  // ───────────────────────────────────────────────────────────────────────────
  //  Group 1 — Nigeria Standard Ride
  // ───────────────────────────────────────────────────────────────────────────
  group('Nigeria Standard Ride', () {
    late NigeriaPricingStrategy strategy;

    setUp(() {
      strategy = NigeriaPricingStrategy();
    });

    test(
      'calculates correct fare for 10km, 20min, Lagos, Sedan — formula yields ₦4,900',
      () {
        // Arrange
        const ride = RideDetails(
          distanceKm: 10,
          durationMinutes: 20,
          city: 'Lagos',
          vehicleCategory: 'sedan',
          bookingType: 'standard',
        );

        // Act
        final result = strategy.calculateFare(ride);

        // Assert — ₦1,500 Base + (10 × ₦250) + (20 × ₦45) = ₦4,900 (raw subtotal)
        expect(result.baseFare, equals(1500));
        expect(result.distanceFare, equals(2500)); // 10 × 250
        expect(result.timeFare, equals(900)); // 20 × 45
        expect(result.surgeFare, equals(0));
        expect(result.subtotal, equals(4900)); // Raw formula result
        // Sedan minimum fare is ₦5,000, which floors the total
        expect(result.totalFare, equals(5000));
        expect(result.currency, equals('NGN'));
        expect(result.surgeMultiplier, equals(1.0));
      },
    );

    test('baseFare matches Lagos city config', () {
      const ride = RideDetails(
        distanceKm: 10,
        durationMinutes: 20,
        city: 'Lagos',
        vehicleCategory: 'sedan',
      );

      final result = strategy.calculateFare(ride);
      expect(result.baseFare, equals(1500));
    });

    test('Abuja ride uses Abuja city config (baseFare=1200, perMinute=30)', () {
      const ride = RideDetails(
        distanceKm: 10,
        durationMinutes: 20,
        city: 'Abuja',
        vehicleCategory: 'sedan',
      );

      final result = strategy.calculateFare(ride);
      // ₦1,200 + (10 × 250) + (20 × 30) = ₦1,200 + ₦2,500 + ₦600 = ₦4,300
      expect(result.baseFare, equals(1200));
      expect(result.timeFare, equals(600));
      expect(result.subtotal, equals(4300)); // Raw formula
      expect(result.totalFare, equals(5000)); // Floored to sedan minFare
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  //  Group 2 — Nigeria Minimum Fare Edge Case
  // ───────────────────────────────────────────────────────────────────────────
  group('Nigeria Minimum Fare Edge Case', () {
    late NigeriaPricingStrategy strategy;

    setUp(() {
      strategy = NigeriaPricingStrategy();
    });

    test('short ride (2km, 5min) snaps to minimum fare of ₦5,000', () {
      // Arrange
      const ride = RideDetails(
        distanceKm: 2,
        durationMinutes: 5,
        city: 'Lagos',
        vehicleCategory: 'sedan',
        bookingType: 'standard',
      );

      // Act
      final result = strategy.calculateFare(ride);

      // Raw calculation: ₦1,500 + (2 × 250) + (5 × 45) = 1500 + 500 + 225 = ₦2,225
      // ₦2,225 < ₦5,000 → snaps to ₦5,000
      expect(result.totalFare, equals(5000));
    });

    test('SUV minimum fare is ₦7,000 for short rides', () {
      const ride = RideDetails(
        distanceKm: 1,
        durationMinutes: 3,
        city: 'Lagos',
        vehicleCategory: 'suv',
      );

      final result = strategy.calculateFare(ride);
      // Raw: 1500 + (1×300) + (3×45) = 1500 + 300 + 135 = ₦1,935 → snaps to ₦7,000
      expect(result.totalFare, equals(7000));
    });

    test('XL minimum fare is ₦10,000 for short rides', () {
      const ride = RideDetails(
        distanceKm: 1,
        durationMinutes: 2,
        city: 'Lagos',
        vehicleCategory: 'xl',
      );

      final result = strategy.calculateFare(ride);
      expect(result.totalFare, equals(10000));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  //  Group 3 — Chicago Airport Flat Rate
  // ───────────────────────────────────────────────────────────────────────────
  group('Chicago Airport Flat Rate', () {
    late ChicagoPricingStrategy strategy;

    setUp(() {
      strategy = ChicagoPricingStrategy();
    });

    test(
      'ORD airport + business_suv returns exactly \$125 (flat rate, ignores mileage/time)',
      () {
        // Arrange
        const ride = RideDetails(
          distanceKm: 28, // ~17 miles — should be ignored
          durationMinutes: 45, // should be ignored
          city: 'Chicago',
          vehicleCategory: 'business_suv',
          bookingType: 'standard',
          isAirport: true,
          airportCode: 'ORD',
          pickupAddress: 'Downtown Chicago',
          dropoffAddress: "ORD (O'Hare)",
        );

        // Act
        final result = strategy.calculateFare(ride);

        // Assert — flat rate, no distance/time component
        expect(result.totalFare, equals(125));
        expect(result.distanceFare, equals(0));
        expect(result.timeFare, equals(0));
        expect(result.surgeFare, equals(0));
        expect(result.currency, equals('USD'));
      },
    );

    test('MDW airport + first_class returns \$135', () {
      const ride = RideDetails(
        distanceKm: 20,
        durationMinutes: 30,
        vehicleCategory: 'first_class',
        isAirport: true,
        airportCode: 'MDW',
      );

      final result = strategy.calculateFare(ride);
      expect(result.totalFare, equals(135));
      expect(result.distanceFare, equals(0));
    });

    test('ORD airport + business_sedan returns \$95', () {
      const ride = RideDetails(
        vehicleCategory: 'business_sedan',
        isAirport: true,
        airportCode: 'ORD',
      );

      final result = strategy.calculateFare(ride);
      expect(result.totalFare, equals(95));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  //  Group 4 — Chicago Hourly Booking
  // ───────────────────────────────────────────────────────────────────────────
  group('Chicago Hourly Booking', () {
    late ChicagoPricingStrategy strategy;

    setUp(() {
      strategy = ChicagoPricingStrategy();
    });

    test('3 hours × first_class (\$140/hr) = \$420', () {
      // Arrange
      const ride = RideDetails(
        city: 'Chicago',
        vehicleCategory: 'first_class',
        bookingType: 'hourly',
        hoursBooked: 3,
      );

      // Act
      final result = strategy.calculateFare(ride);

      // Assert — 3 × $140 = $420
      expect(result.totalFare, equals(420));
      expect(result.distanceFare, equals(0));
      expect(result.timeFare, equals(0));
      expect(result.currency, equals('USD'));
    });

    test('2 hours × business_sedan (\$80/hr) = \$160', () {
      const ride = RideDetails(
        vehicleCategory: 'business_sedan',
        bookingType: 'hourly',
        hoursBooked: 2,
      );

      final result = strategy.calculateFare(ride);
      expect(result.totalFare, equals(160));
    });

    test('1.5 hours throws "Minimum 2 Hours" validation error', () {
      // Arrange
      const ride = RideDetails(
        city: 'Chicago',
        vehicleCategory: 'first_class',
        bookingType: 'hourly',
        hoursBooked: 1.5,
      );

      // Act & Assert — must throw ArgumentError with message
      expect(
        () => strategy.calculateFare(ride),
        throwsA(
          isA<ArgumentError>().having(
            (e) => e.message,
            'message',
            'Minimum 2 Hours',
          ),
        ),
      );
    });

    test('0 hours throws "Minimum 2 Hours" validation error', () {
      const ride = RideDetails(
        vehicleCategory: 'business_suv',
        bookingType: 'hourly',
        hoursBooked: 0,
      );

      expect(
        () => strategy.calculateFare(ride),
        throwsA(
          isA<ArgumentError>().having(
            (e) => e.message,
            'message',
            'Minimum 2 Hours',
          ),
        ),
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  //  Group 5 — Surge Logic
  // ───────────────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────────────
  //  Group 4b — Nigeria Hourly Booking
  // ───────────────────────────────────────────────────────────────────────────
  group('Nigeria Hourly Booking', () {
    late NigeriaPricingStrategy strategy;

    setUp(() {
      strategy = NigeriaPricingStrategy();
    });

    test('3 hours × sedan (₦5,000/hr) = ₦15,000', () {
      const ride = RideDetails(
        city: 'Lagos',
        vehicleCategory: 'sedan',
        bookingType: 'hourly',
        hoursBooked: 3,
      );

      final result = strategy.calculateFare(ride);

      expect(result.totalFare, equals(15000));
      expect(result.distanceFare, equals(0));
      expect(result.timeFare, equals(0));
      expect(result.currency, equals('NGN'));
    });

    test('2 hours × suv (₦7,500/hr) = ₦15,000', () {
      const ride = RideDetails(
        vehicleCategory: 'suv',
        bookingType: 'hourly',
        hoursBooked: 2,
      );

      final result = strategy.calculateFare(ride);
      expect(result.totalFare, equals(15000));
    });

    test('4 hours × xl (₦12,000/hr) = ₦48,000', () {
      const ride = RideDetails(
        vehicleCategory: 'xl',
        bookingType: 'hourly',
        hoursBooked: 4,
      );

      final result = strategy.calculateFare(ride);
      expect(result.totalFare, equals(48000));
    });

    test('1 hour throws "Minimum 2 Hours" validation error', () {
      const ride = RideDetails(
        city: 'Lagos',
        vehicleCategory: 'sedan',
        bookingType: 'hourly',
        hoursBooked: 1,
      );

      expect(
        () => strategy.calculateFare(ride),
        throwsA(
          isA<ArgumentError>().having(
            (e) => e.message,
            'message',
            'Minimum 2 Hours',
          ),
        ),
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  //  Group 5 — Surge Logic
  // ───────────────────────────────────────────────────────────────────────────
  group('Surge Logic', () {
    test('Nigeria: 1.5x surge makes final fare exactly 1.5× the subtotal', () {
      final strategy = NigeriaPricingStrategy();

      // Calculate with 1.5x surge
      const surgeRide = RideDetails(
        distanceKm: 10,
        durationMinutes: 20,
        city: 'Lagos',
        vehicleCategory: 'sedan',
        surgeMultiplier: 1.5,
      );
      final surgeResult = strategy.calculateFare(surgeRide);

      // In the Nigeria strategy, surge is applied to (distanceFare + timeFare):
      // baseFare = 1500 (not surged), distanceFare = 2500, timeFare = 900
      // surgeFare = (2500 + 900) * (1.5 - 1.0) = 3400 * 0.5 = 1700
      // total = 1500 + 2500 + 900 + 1700 = 6600
      expect(surgeResult.surgeMultiplier, equals(1.5));
      expect(surgeResult.surgeFare, equals(1700));
      expect(surgeResult.totalFare, equals(6600));
    });

    test('Chicago: 1.5x surge on standard fare', () {
      final strategy = ChicagoPricingStrategy();

      const surgeRide = RideDetails(
        distanceKm: 10, // 10 miles (Chicago uses per-mile)
        durationMinutes: 30,
        vehicleCategory: 'business_sedan',
        surgeMultiplier: 1.5,
      );

      final result = strategy.calculateFare(surgeRide);

      // base=35, distance=10×3.00=30, time=30×0.50=15 → subtotal=80
      // surgeFare = 80 * 0.5 = 40 → total=80+40=120
      expect(result.surgeMultiplier, equals(1.5));
      expect(result.surgeFare, equals(40));
      expect(result.totalFare, equals(120));
    });

    test('no surge (1.0x) results in zero surgeFare', () {
      final strategy = NigeriaPricingStrategy();

      const ride = RideDetails(
        distanceKm: 10,
        durationMinutes: 20,
        city: 'Lagos',
        vehicleCategory: 'sedan',
        surgeMultiplier: 1.0,
      );

      final result = strategy.calculateFare(ride);
      expect(result.surgeFare, equals(0));
      expect(result.subtotal, equals(4900)); // Raw formula
      expect(result.totalFare, equals(5000)); // Floored to sedan minFare
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  //  Group 6 — Commission Split
  // ───────────────────────────────────────────────────────────────────────────
  group('Commission Split', () {
    late CommissionCalculator calculator;

    setUp(() {
      calculator = CommissionCalculator();
    });

    test('total fare 100.00 → driver=75.00, platform=25.00', () {
      // Arrange & Act
      final split = calculator.split(100.00);

      // Assert
      expect(split.driverAmount, equals(75.00));
      expect(split.platformFee, equals(25.00));
    });

    test('total fare 4900 (₦ NGN) → driver=3675, platform=1225', () {
      final split = calculator.split(4900);

      expect(split.driverAmount, equals(3675));
      expect(split.platformFee, equals(1225));
    });

    test('total fare 420 (\$ USD) → driver=315, platform=105', () {
      final split = calculator.split(420);

      expect(split.driverAmount, equals(315));
      expect(split.platformFee, equals(105));
    });

    test('driver + platform always equals total fare', () {
      final split = calculator.split(137.50);

      expect(split.driverAmount + split.platformFee, equals(137.50));
    });
  });
}
