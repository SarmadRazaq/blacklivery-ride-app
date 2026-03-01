import 'dart:async';

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
  final PageController _introPageController = PageController();
  int _introPage = 0;
  Timer? _autoSlideTimer;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  @override
  void dispose() {
    _autoSlideTimer?.cancel();
    _introPageController.dispose();
    super.dispose();
  }

  void _scheduleIntroAutoAdvance() {
    _autoSlideTimer?.cancel();
    _autoSlideTimer = Timer(const Duration(milliseconds: 1500), () {
      if (!mounted) return;
      if (_introPage == 0 && _introPageController.hasClients) {
        _introPageController.animateToPage(
          1,
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeInOut,
        );
      }
    });
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
          // If biometric fails or is cancelled, user stays on splash or goes to login?
          // Usually we let them fall back to login or just retry.
          // For security, if they cancel, we might want to log them out or just show login screen.
          // Let's force logout for security if biometric is REQUIRED but failed/cancelled.
          // await authProvider.logout();
          // Navigator.of(context).pushReplacement(
          //   MaterialPageRoute(builder: (context) => const LoginScreen()),
          // );
          // OR just do nothing and let them be stuck? No.
          // Better UX: Go to Login Screen (which requires password).
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
    } else {
      _scheduleIntroAutoAdvance();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          Expanded(
            child: PageView(
              controller: _introPageController,
              physics: const NeverScrollableScrollPhysics(),
              onPageChanged: (index) {
                setState(() => _introPage = index);
                if (index == 0) {
                  _scheduleIntroAutoAdvance();
                } else {
                  _autoSlideTimer?.cancel();
                }
              },
              children: [
                Container(
                  color: AppColors.background,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return Center(
                        child: SizedBox(
                          width: constraints.maxWidth * 0.58,
                          height: (constraints.maxHeight * 0.24).clamp(120.0, 190.0),
                          child: FittedBox(
                            fit: BoxFit.contain,
                            child: Image.asset(
                              'assets/images/screen-1-car.png',
                              filterQuality: FilterQuality.high,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset(
                      'assets/images/screen-2-car.png',
                      fit: BoxFit.cover,
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
              ],
            ),
          ),
        ],
      ),
    );
  }
}
