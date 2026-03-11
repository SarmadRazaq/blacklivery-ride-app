import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'core/theme/app_theme.dart';
import 'core/services/notification_service.dart';
import 'core/services/connectivity_service.dart';
import 'core/services/cache_service.dart';
import 'core/utils/app_alert.dart';
import 'core/providers/region_provider.dart';
import 'package:provider/provider.dart' as provider;
import 'features/auth/providers/auth_provider.dart';
import 'core/widgets/connectivity_banner.dart';
import 'core/providers/riverpod_providers.dart';
import 'core/router/app_router.dart';
import 'core/config/env_config.dart';

/// Global navigator key for notification-based navigation
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
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

      // Initialize cache service
      await CacheService().init();

      SystemChrome.setSystemUIOverlayStyle(
        const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
        ),
      );
      runApp(const ProviderScope(child: BlackLiveryApp()));
    },
    (error, stackTrace) {
      // Catch async errors not handled by try/catch
      debugPrint('Uncaught async error: $error');
      debugPrint('Stack trace: $stackTrace');
      FirebaseCrashlytics.instance.recordError(error, stackTrace, fatal: true);
    },
  );
}

class BlackLiveryApp extends ConsumerWidget {
  const BlackLiveryApp({super.key});

  // Track already-synced backend region to avoid overriding local selection
  static String? _lastSyncedProfileRegion;

  void _syncRegionFromProfile(AuthProvider auth, RegionProvider regionProvider) {
    final profileRegion = auth.user?.region;
    if (profileRegion == null || profileRegion.isEmpty) return;
    if (_lastSyncedProfileRegion == profileRegion) return;
    _lastSyncedProfileRegion = profileRegion;
    final mappedRegion = RegionProvider.fromBackendCode(profileRegion);
    if (mappedRegion != null && mappedRegion != regionProvider.code) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        regionProvider.setRegion(mappedRegion);
      });
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return provider.MultiProvider(
      providers: [
        provider.ChangeNotifierProvider.value(value: ref.watch(authRiverpodProvider)),
        provider.ChangeNotifierProvider.value(value: ref.watch(driverRiverpodProvider)),
        provider.ChangeNotifierProvider.value(value: ref.watch(rideRiverpodProvider)),
        provider.ChangeNotifierProvider.value(value: ref.watch(rideHistoryRiverpodProvider)),
        provider.ChangeNotifierProvider.value(value: ref.watch(chatRiverpodProvider)),
        provider.ChangeNotifierProvider.value(value: ref.watch(earningsRiverpodProvider)),
        provider.ChangeNotifierProvider.value(value: ref.watch(driverPreferencesRiverpodProvider)),
        provider.ChangeNotifierProvider.value(value: ref.watch(regionRiverpodProvider)),
      ],
      child: provider.Consumer2<AuthProvider, RegionProvider>(
        builder: (context, auth, regionProvider, _) {
          // One-time sync: seed region from backend profile only on first load.
          // After that, local user selection takes precedence.
          _syncRegionFromProfile(auth, regionProvider);

          final goRouter = ref.watch(goRouterProvider);

          return MaterialApp.router(
            title: 'BlackLivery Driver',
            scaffoldMessengerKey: AppAlert.messengerKey,
            debugShowCheckedModeBanner: false,
            theme: AppTheme.darkTheme,
            routerConfig: goRouter,
            builder: (context, child) {
              return ConnectivityBanner(child: child ?? const SizedBox.shrink());
            },
          );
        },
      ),
    );
  }
}
