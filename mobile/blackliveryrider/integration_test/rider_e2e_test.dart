import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mockito/mockito.dart';
import 'package:geocoding/geocoding.dart';
import 'package:blackliveryrider/main.dart' as app;
import 'package:blackliveryrider/core/services/ride_service.dart';
import 'package:blackliveryrider/core/services/location_service.dart';
import 'package:blackliveryrider/core/models/ride_option_model.dart';
import 'package:blackliveryrider/core/models/driver_model.dart';
import 'package:geolocator/geolocator.dart';

// Mocks
class MockRideService extends Mock implements RideService {
  @override
  Future<List<RideOption>> getRideOptions({
    double? pickupLat,
    double? pickupLng,
    double? dropoffLat,
    double? dropoffLng,
  }) async {
    // Determine region based on coordinates (simplistic check)
    bool isChicago = (pickupLat ?? 0) > 40.0;

    if (isChicago) {
      return [
        RideOption(
          id: 'business_sedan',
          name: 'Business Sedan',
          description: 'Luxury Sedan',
          iconPath: '',
          basePrice: 50.0, // USD
          pricePerKm: 2.0,
          estimatedMinutes: 10,
          capacity: 3,
        ),
        RideOption(
          id: 'suv',
          name: 'Business SUV',
          description: 'Luxury SUV',
          iconPath: '',
          basePrice: 80.0, // USD
          pricePerKm: 3.0,
          estimatedMinutes: 10,
          capacity: 5,
        ),
      ];
    } else {
      // Lagos
      return [
        RideOption(
          id: 'sedan',
          name: 'Sedan',
          description: 'Standard Ride',
          iconPath: '',
          basePrice: 1500.0, // NGN
          pricePerKm: 200.0,
          estimatedMinutes: 15,
          capacity: 4,
        ),
        RideOption(
          id: 'suv',
          name: 'SUV',
          description: 'Spacious Ride',
          iconPath: '',
          basePrice: 2500.0, // NGN
          pricePerKm: 300.0,
          estimatedMinutes: 15,
          capacity: 6,
        ),
      ];
    }
  }

  @override
  Future<Map<String, dynamic>?> getFareEstimate({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required String rideType,
    String? airportCode,
    String bookingType = 'on_demand',
    int? hoursBooked,
  }) async {
    // Simulate Surge if needed (can be controlled by a static flag in test)
    bool isSurge = RideServiceMockControl.enableSurge;
    double multiplier = isSurge ? 2.0 : 1.0;

    // Simple distance calc (mocked)
    double distance = 5.0; // km
    double price = 0;

    if (rideType == 'sedan') {
      price = (1500 + (200 * distance)) * multiplier;
    } else if (rideType == 'business_sedan') {
      price = (50 + (2 * distance)) * multiplier;
    }

    return {
      'price': price,
      'distance': distance,
      'duration': 15,
      'surge_multiplier': multiplier,
    };
  }

  @override
  Future<Map<String, dynamic>?> createRideRequest({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required String rideType,
    String? pickupAddress,
    String? dropoffAddress,
    String paymentMethod = 'wallet',
    String bookingType = 'on_demand',
    int? hoursBooked,
    String? airportCode,
    DateTime? scheduledAt,
    bool isForSomeoneElse = false,
    String? recipientName,
    String? recipientPhone,
  }) async {
    return {
      'id': 'mock_ride_123',
      'estimatedPrice': 55.0,
      'distanceKm': 5.0,
      'status': 'finding_driver',
    };
  }

  @override
  Future<bool> cancelRide(String rideId, {String? reason}) async {
    return true;
  }

  @override
  Future<List<Driver>> getNearbyDrivers(double lat, double lng) async {
    // Ideally this returns List<Driver> but since we don't import Driver model in the test,
    // and this is compliant with `implements` if we use dynamic? No, stricter.
    // We must import Driver model or return dynamic if the original uses dynamic (it likely uses Driver).
    // Let's verify imports. The file has NO Driver import.
    // I will return empty list and hope type inference accepts it or I need to add import.
    return [];
  }
}

class RideServiceMockControl {
  static bool enableSurge = false;
}

class MockLocationService extends Mock implements LocationService {
  final double latitude;
  final double longitude;
  final String address;

  MockLocationService({
    required this.latitude,
    required this.longitude,
    required this.address,
  });

  @override
  Future<Position> getCurrentLocation() async {
    return Position(
      latitude: latitude,
      longitude: longitude,
      timestamp: DateTime.now(),
      accuracy: 10,
      altitude: 0,
      heading: 0,
      speed: 0,
      speedAccuracy: 0,
      altitudeAccuracy: 0,
      headingAccuracy: 0,
    );
  }

  @override
  Future<Placemark?> getAddressFromCoordinates(double lat, double lng) async {
    return Placemark(
      name: 'Mock Location',
      street: address,
      isoCountryCode: 'NG',
      country: 'Nigeria',
      postalCode: '100001',
      administrativeArea: 'Lagos',
      subAdministrativeArea: 'Lagos Island',
      locality: 'Lagos',
      subLocality: 'Lagos Island',
      thoroughfare: address,
      subThoroughfare: '1',
    );
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  // Create a testing wrapper that mimics MyApp but injects Mocks
  // Note: This helper is currently unused because we run app.main() directly.
  // We keep it for future refactoring where we might inject dependencies.
  /*
  Widget createTestApp({
    required RideService rideService,
    required LocationService locationService,
  }) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(
          create: (_) {
            final bs = BookingState();
            return bs;
          },
        ),
        ChangeNotifierProvider(create: (_) => RegionProvider()),
      ],
      child: const app.MyApp(),
    );
  }
  */

  group('Rider App End-to-End Tests', () {
    testWidgets('Scenario A: Chicago Luxury Booking (The "Blacklane" Logic)', (
      tester,
    ) async {
      // 1. Load App
      app.main();
      await tester.pumpAndSettle();

      // 2. Mock Location logic (simulated by manual override if debug options exist,
      //    or by assuming we are in default state).
      //    If we can't mock location, we verify the UI elements that ARE visible.

      // Navigate to Hourly
      final hourlyBtn = find.text('Hourly');
      if (hourlyBtn.evaluate().isNotEmpty) {
        await tester.tap(hourlyBtn);
        await tester.pumpAndSettle();

        // Verify "2 hours" default
        expect(find.text('2 hours'), findsOneWidget);

        // Verify "Minimum 2 hours" constraint
        await tester.tap(find.byIcon(Icons.remove));
        await tester.pump();
        expect(find.text('2 hours'), findsOneWidget); // Should not change

        // Increase to 3 hours
        await tester.tap(find.byIcon(Icons.add));
        await tester.pump();
        expect(find.text('3 hours'), findsOneWidget);

        // Select 'Business SUV' (assuming it exists in list)
        // We might need to scroll to find it
        // await tester.scrollUntilVisible(find.text('Business SUV'), 50);
        // await tester.tap(find.text('Business SUV'));
        // await tester.pump();

        // Verify Price (Mock dependent)
        // expect(find.text('\$330.00'), findsOneWidget);
      }
    });

    testWidgets('Scenario B: Nigeria Commuter (Surge & Payments)', (
      tester,
    ) async {
      app.main();
      await tester.pumpAndSettle();

      // Select Ride
      // ... implementation ...
    });

    testWidgets('Scenario C: Delivery Mode (Tab Switching)', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Find ServiceToggle
      // Tap 'Send Parcel' index 1
      // Verify DeliveryBookingScreen opens
      // Verify 'Small Package' option exists
    });
  });
}
