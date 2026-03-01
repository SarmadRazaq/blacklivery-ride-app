import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/onboarding/splash_screen.dart';
import '../../features/onboarding/vehicle_onboarding_screen.dart';
import '../../features/onboarding/approval_screen.dart';
import '../../features/onboarding/account_setup_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/ride/driver_map_screen.dart';
import '../../features/ride/trip_screen.dart';
import '../../features/ride/data/models/ride_model.dart';
import '../../features/delivery/screens/delivery_trip_screen.dart';
import '../../features/delivery/data/models/delivery_model.dart';
import '../../features/chat/chat_screen.dart';
import '../../features/earnings/earnings_screen.dart';
import '../providers/riverpod_providers.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

final goRouterProvider = Provider<GoRouter>((ref) {
  final authProvider = ref.watch(authRiverpodProvider);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: authProvider,
    redirect: (context, state) {
      final isAuthenticated = authProvider.isAuthenticated;
      final isSplash = state.matchedLocation == '/';
      final isLogin = state.matchedLocation == '/login';

      if (isSplash) {
        return null; // Let splash screen handle its own logic initially
      }

      if (!isAuthenticated && !isLogin) {
        return '/login';
      }

      if (isAuthenticated && isLogin) {
        return '/home';
      }

      // Guard unapproved drivers from accessing the app
      if (isAuthenticated && !isLogin) {
        final status = authProvider.user?.status;
        if (status == 'pending_documents') return '/documents';
        if (status == 'pending_approval' || status == 'under_review') {
          return '/approval';
        }
        if (status == 'suspended' || status == 'deactivated') return '/login';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/map',
        builder: (context, state) => const DriverMapScreen(),
      ),
      GoRoute(
        path: '/earnings',
        builder: (context, state) => const EarningsScreen(),
      ),
      GoRoute(
        path: '/documents',
        builder: (context, state) => const VehicleOnboardingScreen(),
      ),
      GoRoute(
        path: '/approval',
        builder: (context, state) => const ApprovalScreen(),
      ),
      GoRoute(
        path: '/vehicle-info',
        builder: (context, state) => const VehicleOnboardingScreen(),
      ),
      GoRoute(
        path: '/account-setup',
        builder: (context, state) => const AccountSetupScreen(),
      ),
      GoRoute(
        path: '/trip',
        builder: (context, state) {
          final ride = state.extra as Ride?;
          if (ride == null) return const DriverMapScreen();
          return TripScreen(ride: ride);
        },
      ),
      GoRoute(
        path: '/delivery-trip',
        builder: (context, state) {
          final data = state.extra as Map<String, dynamic>?;
          if (data == null) return const DriverMapScreen();
          final ride = data['ride'] as Ride;
          final deliveryRequest = data['deliveryRequest'] as DeliveryRequest?;
          return DeliveryTripScreen(ride: ride, deliveryRequest: deliveryRequest);
        },
      ),
      GoRoute(
        path: '/chat',
        builder: (context, state) {
          final data = state.extra as Map<String, dynamic>?;
          if (data == null) return const DriverMapScreen();
          return ChatScreen(
            rideId: data['rideId'] as String,
            riderName: data['riderName'] as String,
          );
        },
      ),
    ],
  );
});
