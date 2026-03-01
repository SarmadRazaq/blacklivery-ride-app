import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../../presentation/pages/onboarding_screen.dart';
import '../../presentation/pages/home_screen.dart';
import '../../presentation/pages/ride_in_progress_screen.dart';
import '../../presentation/pages/ride_completed_screen.dart';
import '../../presentation/pages/wallet_screen.dart';
import '../../presentation/pages/help_support_screen.dart';
import '../../presentation/pages/login_screen.dart';
import '../../presentation/pages/settings_screen.dart';
import '../../presentation/pages/account_screen.dart';
import '../../presentation/pages/saved_places_screen.dart';
import '../../presentation/widgets/connectivity_banner.dart';

/// Named route constants — use these instead of raw strings.
abstract class AppRoutes {
  static const onboarding = '/onboarding';
  static const login = '/login';
  static const home = '/home';
  static const rideInProgress = '/ride/:rideId';
  static const receipt = '/receipt/:rideId';
  static const wallet = '/wallet';
  static const support = '/support';
  static const settings = '/settings';
  static const account = '/account';
  static const savedPlaces = '/saved-places';
}

/// Global [GoRouter] instance.
///
/// Supports:
/// - Custom URL scheme: `blacklivery://` (e.g. blacklivery://ride/abc123)
/// - Registered HTTPS deep links: `https://blacklivery.com/...`
///
/// Platform configuration:
/// - Android: `<intent-filter>` with `android:scheme="blacklivery"` and
///   `android:scheme="https" android:host="blacklivery.com"` in AndroidManifest.xml
/// - iOS:  `blacklivery` in CFBundleURLSchemes + Associated Domains entitlement
///   (`applinks:blacklivery.com`) in Runner.entitlements
final GoRouter appRouter = GoRouter(
  initialLocation: '/home',
  debugLogDiagnostics: false,
  redirect: _globalRedirect,
  routes: [
    // Root redirect
    GoRoute(
      path: '/',
      redirect: (context, state) => _resolveRoot(context),
    ),

    // Onboarding / landing shown to unauthenticated users
    GoRoute(
      path: AppRoutes.onboarding,
      name: 'onboarding',
      builder: (context, state) =>
          const ConnectivityBanner(child: OnboardingScreen()),
    ),

    // Login
    GoRoute(
      path: AppRoutes.login,
      name: 'login',
      builder: (context, state) => const LoginScreen(),
    ),

    // Main home shell
    GoRoute(
      path: AppRoutes.home,
      name: 'home',
      builder: (context, state) =>
          const ConnectivityBanner(child: HomeScreen()),
    ),

    // Deep-linkable ride in progress screen
    // Deep link examples:
    //   blacklivery://ride/abc123
    //   https://blacklivery.com/ride/abc123
    GoRoute(
      path: AppRoutes.rideInProgress,
      name: 'ride',
      builder: (context, state) {
        final rideId = state.pathParameters['rideId'];
        return RideInProgressScreen(rideId: rideId);
      },
    ),

    // Ride receipt / completed
    GoRoute(
      path: AppRoutes.receipt,
      name: 'receipt',
      builder: (context, state) {
        final rideId = state.pathParameters['rideId'];
        return RideCompletedScreen(rideId: rideId);
      },
    ),

    // Wallet
    GoRoute(
      path: AppRoutes.wallet,
      name: 'wallet',
      builder: (context, state) => const WalletScreen(),
    ),

    // Support (optional ticketId via query param)
    GoRoute(
      path: AppRoutes.support,
      name: 'support',
      builder: (context, state) {
        final ticketId = state.uri.queryParameters['ticketId'];
        return HelpSupportScreen(initialTicketId: ticketId);
      },
    ),

    // Settings
    GoRoute(
      path: AppRoutes.settings,
      name: 'settings',
      builder: (context, state) => const SettingsScreen(),
    ),

    // Account
    GoRoute(
      path: AppRoutes.account,
      name: 'account',
      builder: (context, state) => const AccountScreen(),
    ),

    // Saved places
    GoRoute(
      path: AppRoutes.savedPlaces,
      name: 'savedPlaces',
      builder: (context, state) => const SavedPlacesScreen(),
    ),
  ],
);

/// Redirect unauthenticated users to onboarding; let authenticated users through.
String? _globalRedirect(BuildContext context, GoRouterState state) {
  final auth = Provider.of<AuthProvider>(context, listen: false);
  final publicPaths = {AppRoutes.onboarding, AppRoutes.login};

  final isPublic = publicPaths.any((p) => state.matchedLocation.startsWith(p));

  if (!auth.isLoggedIn && !isPublic) {
    return AppRoutes.onboarding;
  }
  return null;
}

String _resolveRoot(BuildContext context) {
  final auth = Provider.of<AuthProvider>(context, listen: false);
  return auth.isLoggedIn ? AppRoutes.home : AppRoutes.onboarding;
}
