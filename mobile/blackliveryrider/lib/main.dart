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
import 'core/config/env_config.dart';

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

      try {
        await FirebaseAppCheck.instance.activate(
          androidProvider: kDebugMode
              ? AndroidProvider.debug
              : AndroidProvider.playIntegrity,
          appleProvider: kDebugMode
              ? AppleProvider.debug
              : AppleProvider.appAttestWithDeviceCheckFallback,
        );

        if (kDebugMode) {
          await FirebaseAppCheck.instance.getToken(true);
          debugPrint('Firebase App Check initialized (debug mode)');
        }
      } catch (e) {
        debugPrint('Warning: Firebase App Check init failed: $e');
      }

      // Initialize push notifications
      try {
        await NotificationService().initialize();
      } catch (e) {
        debugPrint('Error: Push notification init failed: $e');
      }

      // Initialize connectivity monitoring
      await ConnectivityService().init();

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

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  String? _lastSyncedProfileRegion;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initAuth());
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

    // Notify GoRouter to re-evaluate redirect now that auth state is known.
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
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => BookingState()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(
          create: (_) {
            final rp = RegionProvider();
            final bookingState = BookingState();
            bookingState.rideService.setRegion(rp.apiRegionKey);
            // Keep CurrencyUtils in sync with the active region
            rp.addListener(() {
              CurrencyUtils.activeCurrency = rp.currency;
              bookingState.rideService.setRegion(rp.apiRegionKey);
            });
            return rp;
          },
        ),
      ],
      child: Consumer<ThemeProvider>(
        // Listen to theme changes
        builder: (context, themeProvider, child) {
          return MaterialApp.router(
            title: 'BlackLivery Rider',
            scaffoldMessengerKey: AppAlert.messengerKey,
            debugShowCheckedModeBanner: false,
            theme: themeProvider.lightTheme,
            darkTheme: themeProvider.darkTheme,
            themeMode: themeProvider.themeMode,
            routerConfig: appRouter,
          );
        },
      ),
    );
  }
}
