import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'core/providers/auth_provider.dart';
import 'core/providers/region_provider.dart';
import 'core/data/booking_state.dart';
import 'core/services/notification_service.dart';
import 'core/services/connectivity_service.dart';
import 'core/utils/currency_utils.dart';
import 'core/utils/app_alert.dart';
import 'core/providers/theme_provider.dart';
import 'core/router/app_router.dart';
import 'package:go_router/go_router.dart';
import 'core/config/env_config.dart';
import 'core/payment/gateway_factory.dart';

/// Global navigator key kept for legacy usages (e.g. dialogs from services).
/// Navigation should prefer [appRouter] where possible.
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  runZonedGuarded<Future<void>>(
    () async {
      WidgetsFlutterBinding.ensureInitialized();

      // Load .env configuration before anything else
      await EnvConfig.load();

      try {
        await Firebase.initializeApp();
        
        // Pass all uncaught "fatal" errors from the framework to Crashlytics
        FlutterError.onError = (errorDetails) {
          FirebaseCrashlytics.instance.recordFlutterFatalError(errorDetails);
        };
        
        // Pass all uncaught asynchronous errors that aren't handled by the Flutter framework to Crashlytics
        PlatformDispatcher.instance.onError = (error, stack) {
          FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
          return true;
        };
      } catch (e) {
        debugPrint('FATAL: Firebase initialization failed: $e');
        rethrow;
      }

      // App Check: skip in debug/emulator to avoid "attestation failed" noise.
      // In release builds, use Play Integrity / App Attest.
      if (!kDebugMode) {
        try {
          await FirebaseAppCheck.instance.activate(
            androidProvider: AndroidProvider.playIntegrity,
            appleProvider: AppleProvider.appAttestWithDeviceCheckFallback,
          );
        } catch (e) {
          debugPrint('Warning: Firebase App Check init failed: $e');
        }
      }

      // Initialize push notifications
      try {
        await NotificationService().initialize();
      } catch (e) {
        debugPrint('Error: Push notification init failed: $e');
      }

      // Initialize connectivity monitoring
      await ConnectivityService().init();

      // Pre-initialize payment SDKs based on default region.
      // The factory is resilient — failures here don't block app startup.
      final isChicago = EnvConfig.defaultRegion.toLowerCase().contains('chi') ||
          EnvConfig.defaultRegion.toLowerCase() == 'us';
      PaymentGatewayFactory.initializeForRegion(isChicago: isChicago);

      // Fetch live exchange rates (fire-and-forget — falls back to hardcoded).
      CurrencyUtils.syncRates();

      runApp(const MyApp());
    },
    (error, stackTrace) {
      // Catch async errors not handled by try/catch
      debugPrint('Uncaught async error: $error');
      debugPrint('Stack trace: $stackTrace');
      FirebaseCrashlytics.instance.recordError(error, stackTrace, fatal: true);
    },
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Single BookingState instance shared across providers.
    final bookingState = BookingState();

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider.value(value: bookingState),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(
          create: (_) {
            final rp = RegionProvider();
            // Eagerly sync currency + region from the provider's initial value.
            CurrencyUtils.activeCurrency = rp.currency;
            CurrencyUtils.previousCurrency = rp.currency;
            bookingState.rideService.setRegion(rp.apiRegionKey);
            // Keep CurrencyUtils and RideService in sync when region changes.
            rp.addListener(() {
              CurrencyUtils.previousCurrency = CurrencyUtils.activeCurrency;
              CurrencyUtils.activeCurrency = rp.currency;
              bookingState.rideService.setRegion(rp.apiRegionKey);
              // Re-initialize payment SDKs for the new region
              PaymentGatewayFactory.initializeForRegion(
                isChicago: rp.isChicago,
              );
            });
            return rp;
          },
        ),
      ],
      child: const _AppShell(),
    );
  }
}

/// Inner widget that sits *below* MultiProvider so it can safely access all
/// providers via its own BuildContext.
class _AppShell extends StatefulWidget {
  const _AppShell();

  @override
  State<_AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<_AppShell> {
  String? _lastSyncedProfileRegion;
  GoRouter? _router;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initAuth());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Build the GoRouter exactly once, wired to AuthProvider's
    // ChangeNotifier so redirects re-fire on login/logout.
    _router ??= () {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final r = buildAppRouter(auth);
      appRouter = r; // expose globally for notification_service, etc.
      return r;
    }();
  }

  Future<void> _initAuth() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final regionProvider = Provider.of<RegionProvider>(context, listen: false);

    try {
      await auth.checkAuthState().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          debugPrint('MyApp: checkAuthState timed out — showing onboarding');
        },
      );
    } catch (e) {
      debugPrint('MyApp: checkAuthState error: $e');
    }

    _syncRegionFromProfile(auth, regionProvider);

    // Rebuild in case profile region changed something visual.
    if (mounted) setState(() {});
  }

  void _syncRegionFromProfile(AuthProvider auth, RegionProvider regionProvider) {
    final profileRegion = auth.user?.region;
    if (profileRegion == null || profileRegion.isEmpty) return;
    if (_lastSyncedProfileRegion == profileRegion) return;
    _lastSyncedProfileRegion = profileRegion;
    final code = regionProvider.fromBackendCode(profileRegion);
    if (regionProvider.code != code) {
      regionProvider.setRegion(code);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      // Listen to theme changes
      builder: (context, themeProvider, child) {
        return MaterialApp.router(
          title: 'BlackLivery Rider',
          scaffoldMessengerKey: AppAlert.messengerKey,
          debugShowCheckedModeBanner: false,
          theme: themeProvider.lightTheme,
          darkTheme: themeProvider.darkTheme,
          themeMode: themeProvider.themeMode,
          routerConfig: _router!,
        );
      },
    );
  }
}
