import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/services/biometric_service.dart';
import '../../features/auth/data/models/user_model.dart';
import 'create_account_screen.dart';
import '../auth/screens/login_screen.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  bool _isNavigating = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    if (_isNavigating) return;
    await Future.delayed(const Duration(milliseconds: 800)); // Minimum splash time
    if (!mounted || _isNavigating) return;

    final authProvider = ref.read(authRiverpodProvider);
    // Check if user is logged in
    await authProvider.checkAuthStatus();

    if (!mounted) return;

    if (authProvider.isAuthenticated) {
      // Check for Biometrics
      final biometricService = BiometricService();
      final isBiometricEnabled = await biometricService.isEnabled;

      if (isBiometricEnabled) {
        final authenticated = await biometricService.authenticate(
          reason: 'Please authenticate to access BlackLivery',
        );
        if (!authenticated) {
          if (!mounted || _isNavigating) return;
          _isNavigating = true;
          context.go('/login');
          return;
        }
      }

      // Check onboarding status before going to main app
      final user = authProvider.user;
      final onboardingStatus = user?.driverOnboarding?.status;
      debugPrint('[Splash] onboardingStatus=$onboardingStatus, driverProfile=${user?.driverProfile != null}');

      // Approved explicitly, or legacy account with a vehicle already set up
      final isApproved = onboardingStatus == 'approved' ||
          (onboardingStatus == null && user?.driverProfile != null);

      if (!isApproved) {
        if (!mounted || _isNavigating) return;
        _isNavigating = true;
        if (onboardingStatus == 'pending_approval' ||
            onboardingStatus == 'under_review' ||
            onboardingStatus == 'pending_review') {
          context.go('/approval');
        } else {
          // Resume from the furthest incomplete onboarding step
          final route = _resolveOnboardingRoute(user);
          context.go(route);
        }
        return;
      }

      final rideProvider = ref.read(rideRiverpodProvider);

      // 1. Instantly load cached ride for immediate UI recovery (survives OS kill)
      await rideProvider.loadCachedRide();

      // 2. Sync with server in background — updates cache if ride status changed
      rideProvider.checkForActiveRide();

      if (!mounted) return;

      // Ensure location permission before entering the map
      await _ensureLocationPermission();
      if (!mounted || _isNavigating) return;

      _isNavigating = true;
      if (rideProvider.currentRide != null) {
        context.go('/trip', extra: rideProvider.currentRide!);
      } else {
        context.go('/map');
      }
    }
    // If not authenticated, stay on this screen (shows Get Started / Login)
  }

  /// Keep requesting location permission via the native OS dialog until
  /// the user grants it.  If permanently denied, opens App Settings and
  /// waits for the user to return.
  Future<void> _ensureLocationPermission() async {
    while (mounted) {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        return; // granted
      }

      if (permission == LocationPermission.deniedForever) {
        // OS won't show the dialog again — open settings
        await Geolocator.openAppSettings();
        // Wait for user to come back from settings
        await Future.delayed(const Duration(seconds: 1));
        continue;
      }

      // Show native permission dialog
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        return; // granted
      }

      // Denied — brief pause then re-request
      await Future.delayed(const Duration(milliseconds: 500));
    }
  }

  /// Determine which onboarding route the driver should resume from.
  String _resolveOnboardingRoute(User? user) {
    if (user?.driverProfile?.vehicleId == null) return '/documents';
    if (user!.emergencyContacts.isEmpty) return '/emergency-contacts';
    final status = user.driverOnboarding?.status;
    if (status == null || status == 'pending_documents' || status == 'rejected') {
      return '/verification';
    }
    return '/documents';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: Image.asset(
              'assets/images/screen-2-car.png',
              fit: BoxFit.cover,
            ),
          ),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.18),
                  Colors.black.withValues(alpha: 0.45),
                ],
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
              child: Column(
                children: [
                  const Spacer(),
                  CustomButton(
                    text: 'Get Started',
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) =>
                              const CreateAccountScreen(),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const LoginScreen(),
                        ),
                      );
                    },
                    child: const Text(
                      'Already have an account? Login',
                      style: TextStyle(
                        color: AppColors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
