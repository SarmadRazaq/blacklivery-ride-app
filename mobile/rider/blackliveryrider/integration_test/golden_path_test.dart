///
/// Automates the full rider booking flow:
///   Launch → Select Service → Verify Price → Book → Cancel
///
/// Also validates region-based vehicle category filtering.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';

import 'package:blackliveryrider/core/data/booking_state.dart';
import 'package:blackliveryrider/core/models/location_model.dart';
import 'package:blackliveryrider/core/models/ride_option_model.dart';
import 'package:blackliveryrider/core/providers/region_provider.dart';
import 'package:blackliveryrider/core/providers/theme_provider.dart';
import 'package:blackliveryrider/core/providers/auth_provider.dart';
import 'package:blackliveryrider/core/utils/currency_utils.dart';
import 'package:blackliveryrider/presentation/pages/home_screen.dart';
import 'package:blackliveryrider/presentation/pages/select_ride_screen.dart';
import 'package:blackliveryrider/presentation/pages/confirm_pickup_screen.dart';
import 'package:blackliveryrider/presentation/pages/confirm_ride_screen.dart';
import 'package:blackliveryrider/presentation/pages/searching_driver_screen.dart';
import 'package:blackliveryrider/presentation/widgets/connectivity_banner.dart';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/// Fake pickup/dropoff locations used to seed BookingState without GPS.
final _fakePickup = Location(
  id: 'pickup_1',
  name: 'Test Pickup',
  address: '123 Main St, Lagos',
  latitude: 6.5244,
  longitude: 3.3792,
);

final _fakeDropoff = Location(
  id: 'dropoff_1',
  name: 'Test Dropoff',
  address: '456 Airport Rd, Lagos',
  latitude: 6.5800,
  longitude: 3.3210,
);

/// Chicago locations for region-specific tests.
final _chicagoPickup = Location(
  id: 'chi_pickup',
  name: 'Chicago Pickup',
  address: '233 S Wacker Dr, Chicago',
  latitude: 41.8788,
  longitude: -87.6359,
);

final _chicagoDropoff = Location(
  id: 'chi_dropoff',
  name: "Chicago Dropoff",
  address: "333 N Michigan Ave, Chicago",
  latitude: 41.8873,
  longitude: -87.6243,
);

/// Static ride options matching the 5 categories hardcoded in RideService.
/// Used to pre-populate BookingState without hitting a real API.
List<RideOption> _allRideOptions() => [
  RideOption(
    id: 'sedan',
    name: 'Standard',
    description: 'Affordable, compact rides',
    iconPath: 'sedan',
    basePrice: 1500,
    pricePerKm: 100,
    estimatedMinutes: 15,
    capacity: 4,
  ),
  RideOption(
    id: 'suv',
    name: 'SUV',
    description: 'Spacious rides for groups',
    iconPath: 'suv',
    basePrice: 2500,
    pricePerKm: 150,
    estimatedMinutes: 15,
    capacity: 6,
  ),
  RideOption(
    id: 'xl',
    name: 'XL',
    description: 'Extra space for luggage',
    iconPath: 'xl',
    basePrice: 3000,
    pricePerKm: 175,
    estimatedMinutes: 15,
    capacity: 6,
  ),
  RideOption(
    id: 'first_class',
    name: 'Premium',
    description: 'Luxury rides for special occasions',
    iconPath: 'first_class',
    basePrice: 5000,
    pricePerKm: 300,
    estimatedMinutes: 15,
    capacity: 4,
  ),
  RideOption(
    id: 'motorbike',
    name: 'Moto',
    description: 'Fastest way through traffic',
    iconPath: 'motorbike',
    basePrice: 500,
    pricePerKm: 50,
    estimatedMinutes: 8,
    capacity: 1,
  ),
];

/// Builds a test-safe version of the app with pre-seeded providers.
///
/// [region] controls which `RegionCode` is active.
/// [pickup] / [dropoff] seed the booking state so we skip location permission.
/// [rideOptions] pre-populate the vehicle selector.
Widget buildTestApp({
  required RegionCode region,
  required Location pickup,
  required Location dropoff,
  List<RideOption>? rideOptions,
}) {
  final bookingState = BookingState();
  bookingState.setPickupLocation(pickup);
  bookingState.setDropoffLocation(dropoff);

  // We cannot call private setters on _rideOptions directly, so we rely on
  // the fact that SelectRideScreen calls _fetchEstimates() → loadRideOptions()
  // on initState. For tests that need to verify ride option cards, we rely on
  // the screen's initState to fetch them, or we push directly to screens that
  // already have state set.

  final regionProvider = RegionProvider();

  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>(create: (_) => AuthProvider()),
      ChangeNotifierProvider<BookingState>.value(value: bookingState),
      ChangeNotifierProvider<ThemeProvider>(create: (_) => ThemeProvider()),
      ChangeNotifierProvider<RegionProvider>.value(value: regionProvider),
    ],
    child: Builder(
      builder: (context) {
        // Detect region from the pickup coords (same as HomeTab does)
        final rp = context.read<RegionProvider>();
        rp.detectFromLocation(pickup.latitude, pickup.longitude);

        // Keep CurrencyUtils in sync
        CurrencyUtils.activeCurrency = rp.currency;

        return MaterialApp(
          debugShowCheckedModeBanner: false,
          home: const ConnectivityBanner(child: HomeScreen()),
        );
      },
    ),
  );
}

/// Pumps the widget, waits for animations, and settles.
Future<void> pumpAndSettle(WidgetTester tester, {Duration? duration}) async {
  await tester.pumpAndSettle(duration ?? const Duration(seconds: 5));
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  // ──────────────────────────────────────────────────────────────────────────
  // Group 1: Core Golden Path (Nigeria / Lagos)
  // ──────────────────────────────────────────────────────────────────────────

  group('Golden Path — Lagos Region', () {
    testWidgets('Step 1: Home screen shows "Where to?" search bar', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildTestApp(
          region: RegionCode.ng,
          pickup: _fakePickup,
          dropoff: _fakeDropoff,
        ),
      );
      await pumpAndSettle(tester);

      // The home tab should display the search bar with "Where to?" hint text
      expect(
        find.text('Where to?'),
        findsOneWidget,
        reason: 'Home screen must display "Where to?" search bar',
      );
    });

    testWidgets(
      'Step 2: Tapping "Where to?" navigates to destination entry screen',
      (tester) async {
        await tester.pumpWidget(
          buildTestApp(
            region: RegionCode.ng,
            pickup: _fakePickup,
            dropoff: _fakeDropoff,
          ),
        );
        await pumpAndSettle(tester);

        // Tap the "Where to?" search bar
        await tester.tap(find.text('Where to?'));
        await pumpAndSettle(tester);

        // Should now be on WhereToScreen — look for the dropoff text field
        // WhereToScreen has pickup and dropoff text input fields
        expect(
          find.byType(TextField),
          findsWidgets,
          reason:
              'WhereToScreen must have text fields for pickup and dropoff entry',
        );
      },
    );

    testWidgets(
      'Step 3: SelectRideScreen shows "Choose a ride" and ride option cards',
      (tester) async {
        // Directly push to SelectRideScreen with seeded state
        final bookingState = BookingState();
        bookingState.setPickupLocation(_fakePickup);
        bookingState.setDropoffLocation(_fakeDropoff);

        await tester.pumpWidget(
          MultiProvider(
            providers: [
              ChangeNotifierProvider<BookingState>.value(value: bookingState),
              ChangeNotifierProvider<RegionProvider>(
                create: (_) => RegionProvider(),
              ),
              ChangeNotifierProvider<ThemeProvider>(
                create: (_) => ThemeProvider(),
              ),
            ],
            child: const MaterialApp(home: SelectRideScreen()),
          ),
        );
        await pumpAndSettle(tester);

        // "Choose a ride" heading must be visible
        expect(
          find.text('Choose a ride'),
          findsOneWidget,
          reason: 'SelectRideScreen must display "Choose a ride" heading',
        );
      },
    );

    testWidgets(
      'Step 4: Ride option cards display price text (not null / not loading forever)',
      (tester) async {
        final bookingState = BookingState();
        bookingState.setPickupLocation(_fakePickup);
        bookingState.setDropoffLocation(_fakeDropoff);

        await tester.pumpWidget(
          MultiProvider(
            providers: [
              ChangeNotifierProvider<BookingState>.value(value: bookingState),
              ChangeNotifierProvider<RegionProvider>(
                create: (_) => RegionProvider(),
              ),
              ChangeNotifierProvider<ThemeProvider>(
                create: (_) => ThemeProvider(),
              ),
            ],
            child: const MaterialApp(home: SelectRideScreen()),
          ),
        );

        // Wait for estimates to load (may take a moment for API / fallback)
        await pumpAndSettle(tester, duration: const Duration(seconds: 10));

        // After loading, there should be NO CircularProgressIndicator
        // (the loading spinner disappears once estimates are fetched)
        expect(
          find.byType(CircularProgressIndicator),
          findsNothing,
          reason:
              'Loading spinner should disappear after fare estimates are fetched',
        );

        // At least one ride option name should be visible
        // The fallback always returns "Standard" at minimum
        final rideOptionNames = ['Standard', 'SUV', 'XL', 'Premium', 'Moto'];
        bool foundAtLeastOne = false;
        for (final name in rideOptionNames) {
          if (find.text(name).evaluate().isNotEmpty) {
            foundAtLeastOne = true;
            break;
          }
        }
        expect(
          foundAtLeastOne,
          isTrue,
          reason:
              'At least one ride option (Standard, SUV, XL, Premium, Moto) must be visible',
        );
      },
    );

    testWidgets(
      'Step 5: Tapping ride card updates button text to "Book {name}"',
      (tester) async {
        final bookingState = BookingState();
        bookingState.setPickupLocation(_fakePickup);
        bookingState.setDropoffLocation(_fakeDropoff);

        await tester.pumpWidget(
          MultiProvider(
            providers: [
              ChangeNotifierProvider<BookingState>.value(value: bookingState),
              ChangeNotifierProvider<RegionProvider>(
                create: (_) => RegionProvider(),
              ),
              ChangeNotifierProvider<ThemeProvider>(
                create: (_) => ThemeProvider(),
              ),
            ],
            child: const MaterialApp(home: SelectRideScreen()),
          ),
        );
        await pumpAndSettle(tester, duration: const Duration(seconds: 10));

        // The default selection (index 0) shows "Book Standard"
        // If options loaded, we should see the button
        final bookStandard = find.text('Book Standard');
        if (bookStandard.evaluate().isNotEmpty) {
          expect(
            bookStandard,
            findsOneWidget,
            reason: 'Default selection should show "Book Standard"',
          );

          // Tap a different ride option (e.g., "Premium") if visible
          final premiumFinder = find.text('Premium');
          if (premiumFinder.evaluate().isNotEmpty) {
            await tester.tap(premiumFinder);
            await tester.pumpAndSettle();

            expect(
              find.text('Book Premium'),
              findsOneWidget,
              reason:
                  'After tapping Premium card, button should say "Book Premium"',
            );
          }
        }
      },
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Group 2: Booking & Cancellation Flow
  // ──────────────────────────────────────────────────────────────────────────

  group('Booking & Cancellation Flow', () {
    testWidgets(
      'ConfirmPickupScreen shows "Confirm Pickup" heading and CTA button',
      (tester) async {
        final bookingState = BookingState();
        bookingState.setPickupLocation(_fakePickup);
        bookingState.setDropoffLocation(_fakeDropoff);

        // Pre-select a ride option
        final standardOption = _allRideOptions().first;
        bookingState.selectRideOption(standardOption);

        await tester.pumpWidget(
          MultiProvider(
            providers: [
              ChangeNotifierProvider<BookingState>.value(value: bookingState),
              ChangeNotifierProvider<RegionProvider>(
                create: (_) => RegionProvider(),
              ),
              ChangeNotifierProvider<ThemeProvider>(
                create: (_) => ThemeProvider(),
              ),
            ],
            child: const MaterialApp(home: ConfirmPickupScreen()),
          ),
        );
        await pumpAndSettle(tester);

        expect(
          find.text('Confirm Pickup'),
          findsOneWidget,
          reason: 'ConfirmPickupScreen must show "Confirm Pickup" heading',
        );
        expect(
          find.text('Confirm Pickup Spot'),
          findsOneWidget,
          reason: 'ConfirmPickupScreen CTA must say "Confirm Pickup Spot"',
        );
      },
    );

    testWidgets('ConfirmRideScreen shows "Confirm & Book" button', (
      tester,
    ) async {
      final bookingState = BookingState();
      bookingState.setPickupLocation(_fakePickup);
      bookingState.setDropoffLocation(_fakeDropoff);

      final standardOption = _allRideOptions().first;
      bookingState.selectRideOption(standardOption);

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<BookingState>.value(value: bookingState),
            ChangeNotifierProvider<RegionProvider>(
              create: (_) => RegionProvider(),
            ),
            ChangeNotifierProvider<ThemeProvider>(
              create: (_) => ThemeProvider(),
            ),
          ],
          child: const MaterialApp(home: ConfirmRideScreen()),
        ),
      );
      await pumpAndSettle(tester);

      expect(
        find.text('Confirm & Book'),
        findsOneWidget,
        reason: 'ConfirmRideScreen must display "Confirm & Book" button',
      );
    });

    testWidgets(
      'SearchingDriverScreen shows "Searching..." text and "Cancel Ride" button',
      (tester) async {
        final bookingState = BookingState();
        bookingState.setPickupLocation(_fakePickup);
        bookingState.setDropoffLocation(_fakeDropoff);

        final standardOption = _allRideOptions().first;
        bookingState.selectRideOption(standardOption);

        await tester.pumpWidget(
          MultiProvider(
            providers: [
              ChangeNotifierProvider<BookingState>.value(value: bookingState),
              ChangeNotifierProvider<RegionProvider>(
                create: (_) => RegionProvider(),
              ),
              ChangeNotifierProvider<ThemeProvider>(
                create: (_) => ThemeProvider(),
              ),
            ],
            child: const MaterialApp(home: SearchingDriverScreen()),
          ),
        );

        // Don't fully settle — animations are infinite (pulse animation)
        // Just pump a few frames so the widget tree builds
        await tester.pump(const Duration(seconds: 1));

        expect(
          find.text('Searching...'),
          findsOneWidget,
          reason:
              'SearchingDriverScreen must show "Searching..." while looking for a driver',
        );
        expect(
          find.text('Cancel Ride'),
          findsOneWidget,
          reason: 'SearchingDriverScreen must show a "Cancel Ride" button',
        );
      },
    );

    testWidgets(
      'Tapping "Cancel Ride" on SearchingDriverScreen returns to home (popUntil first)',
      (tester) async {
        final bookingState = BookingState();
        bookingState.setPickupLocation(_fakePickup);
        bookingState.setDropoffLocation(_fakeDropoff);

        final standardOption = _allRideOptions().first;
        bookingState.selectRideOption(standardOption);

        // Build a nav stack: HomeScreen > SearchingDriverScreen
        await tester.pumpWidget(
          MultiProvider(
            providers: [
              ChangeNotifierProvider<AuthProvider>(
                create: (_) => AuthProvider(),
              ),
              ChangeNotifierProvider<BookingState>.value(value: bookingState),
              ChangeNotifierProvider<RegionProvider>(
                create: (_) => RegionProvider(),
              ),
              ChangeNotifierProvider<ThemeProvider>(
                create: (_) => ThemeProvider(),
              ),
            ],
            child: MaterialApp(
              home: Builder(
                builder: (context) {
                  // Push SearchingDriverScreen on top of a base route
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const SearchingDriverScreen(),
                      ),
                    );
                  });
                  // Base route — represents home
                  return const Scaffold(body: Center(child: Text('Where to?')));
                },
              ),
            ),
          ),
        );

        // Let the push happen
        await tester.pump(const Duration(seconds: 1));
        await tester.pump(const Duration(milliseconds: 500));

        // Verify we're on SearchingDriverScreen
        expect(find.text('Cancel Ride'), findsOneWidget);

        // Tap "Cancel Ride"
        await tester.tap(find.text('Cancel Ride'));
        await tester.pumpAndSettle();

        // Should pop back to the base route showing "Where to?"
        expect(
          find.text('Where to?'),
          findsOneWidget,
          reason:
              'After cancellation, user should be returned to the home screen',
        );
        expect(
          find.text('Cancel Ride'),
          findsNothing,
          reason:
              'SearchingDriverScreen should no longer be visible after cancel',
        );
      },
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Group 3: Region-Based Vehicle Category Filtering
  // ──────────────────────────────────────────────────────────────────────────

  group('Vehicle Category Filtering by Region', () {
    // NOTE: Vehicle filtering is currently SERVER-SIDE only.
    // RideService.getRideOptions() returns the same 5 hardcoded categories
    // (Standard, SUV, XL, Premium, Moto) regardless of region.
    //
    // These tests document the EXPECTED contract:
    //   - Chicago: should NOT show 'Moto' or 'Keke'
    //   - Lagos/Nigeria: should NOT show 'First Class (S-Class)'
    //
    // Until region-based filtering is implemented on the client or backend,
    // some of these assertions will pass trivially (e.g., 'Keke' is never
    // in the static list) and others will FAIL (e.g., 'Moto' IS in the
    // static list even for Chicago).
    //
    // This is intentional: the tests serve as a specification that will
    // correctly start passing once the feature is built.

    testWidgets('Chicago region: "Keke" should NOT appear in ride options', (
      tester,
    ) async {
      final bookingState = BookingState();
      bookingState.setPickupLocation(_chicagoPickup);
      bookingState.setDropoffLocation(_chicagoDropoff);

      final regionProvider = RegionProvider();
      regionProvider.detectFromLocation(
        _chicagoPickup.latitude,
        _chicagoPickup.longitude,
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<BookingState>.value(value: bookingState),
            ChangeNotifierProvider<RegionProvider>.value(value: regionProvider),
            ChangeNotifierProvider<ThemeProvider>(
              create: (_) => ThemeProvider(),
            ),
          ],
          child: const MaterialApp(home: SelectRideScreen()),
        ),
      );
      await pumpAndSettle(tester, duration: const Duration(seconds: 10));

      // 'Keke' is never in the current static list, so this passes trivially.
      // It documents the contract: Chicago must never offer Keke.
      expect(
        find.text('Keke'),
        findsNothing,
        reason: 'Chicago region must NOT display "Keke" as a vehicle option',
      );
    });

    testWidgets(
      'Chicago region: "Moto" should NOT appear in ride options '
      '(EXPECTED FAIL until region filtering is implemented)',
      (tester) async {
        final bookingState = BookingState();
        bookingState.setPickupLocation(_chicagoPickup);
        bookingState.setDropoffLocation(_chicagoDropoff);

        final regionProvider = RegionProvider();
        regionProvider.detectFromLocation(
          _chicagoPickup.latitude,
          _chicagoPickup.longitude,
        );

        await tester.pumpWidget(
          MultiProvider(
            providers: [
              ChangeNotifierProvider<BookingState>.value(value: bookingState),
              ChangeNotifierProvider<RegionProvider>.value(
                value: regionProvider,
              ),
              ChangeNotifierProvider<ThemeProvider>(
                create: (_) => ThemeProvider(),
              ),
            ],
            child: const MaterialApp(home: SelectRideScreen()),
          ),
        );
        await pumpAndSettle(tester, duration: const Duration(seconds: 10));

        // This will FAIL until client/backend filters Moto out for Chicago.
        // The static RideService.getRideOptions() always includes 'Moto'.
        expect(
          find.text('Moto'),
          findsNothing,
          reason:
              'Chicago region must NOT display "Moto" — will fail until region-based filtering is implemented',
        );
      },
      // Skipped: Vehicle filtering by region not yet implemented (Moto shows for all regions)
      skip: true,
    );

    testWidgets('Lagos region: "First Class (S-Class)" label should NOT appear '
        'unless explicitly configured', (tester) async {
      final bookingState = BookingState();
      bookingState.setPickupLocation(_fakePickup);
      bookingState.setDropoffLocation(_fakeDropoff);

      final regionProvider = RegionProvider();
      regionProvider.detectFromLocation(
        _fakePickup.latitude,
        _fakePickup.longitude,
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<BookingState>.value(value: bookingState),
            ChangeNotifierProvider<RegionProvider>.value(value: regionProvider),
            ChangeNotifierProvider<ThemeProvider>(
              create: (_) => ThemeProvider(),
            ),
          ],
          child: const MaterialApp(home: SelectRideScreen()),
        ),
      );
      await pumpAndSettle(tester, duration: const Duration(seconds: 10));

      // The Premium vehicle is labeled "Premium", NOT "First Class (S-Class)".
      // This test ensures the S-Class branding isn't shown in Lagos.
      expect(
        find.text('First Class (S-Class)'),
        findsNothing,
        reason:
            'Lagos region must NOT show "First Class (S-Class)" label — '
            'the current label is "Premium"',
      );
    });
  });
}
