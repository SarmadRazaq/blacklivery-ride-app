import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/services/biometric_service.dart';
import 'create_account_screen.dart';
import '../auth/screens/login_screen.dart';
import '../ride/driver_map_screen.dart';
import '../ride/ride_accepted_screen.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(const Duration(milliseconds: 800)); // Minimum splash time
    if (!mounted) return;

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
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const LoginScreen()),
          );
          return;
        }
      }

      final rideProvider = ref.read(rideRiverpodProvider);

      // 1. Instantly load cached ride for immediate UI recovery (survives OS kill)
      await rideProvider.loadCachedRide();

      // 2. Sync with server in background — updates cache if ride status changed
      rideProvider.checkForActiveRide();

      if (!mounted) return;

      if (rideProvider.currentRide != null) {
        // Jump straight into the active trip screen
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) =>
                RideAcceptedScreen(ride: rideProvider.currentRide!),
          ),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const DriverMapScreen()),
        );
      }
    }
    // If not authenticated, stay on this screen (shows Get Started / Login)
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Center(
            child: FractionallySizedBox(
              widthFactor: 0.5,
              heightFactor: 0.5,
              child: Image.asset(
                'assets/images/screen-2-car.png',
                fit: BoxFit.cover,
              ),
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
