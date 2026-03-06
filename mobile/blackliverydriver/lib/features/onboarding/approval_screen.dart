import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_button.dart';
import 'incoming_rides_mode_screen.dart';

class ApprovalScreen extends ConsumerStatefulWidget {
  const ApprovalScreen({super.key});

  @override
  ConsumerState<ApprovalScreen> createState() => _ApprovalScreenState();
}

class _ApprovalScreenState extends ConsumerState<ApprovalScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _hourglassController;

  @override
  void initState() {
    super.initState();
    _hourglassController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _hourglassController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: RotationTransition(
                  turns: _hourglassController,
                  child: const Icon(
                    Icons.hourglass_empty_rounded,
                    size: 64,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'Application Under Review',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Thanks for signing up! We are currently reviewing your documents and vehicle information. We will notify you once your account is approved.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: AppColors.grey,
                  height: 1.5,
                ),
              ),
              const Spacer(),
              CustomButton(
                text: 'Check Status',
                onPressed: () async {
                  try {
                    final provider = ref.read(authRiverpodProvider);
                    await provider.getProfile();
                    final status = provider.user?.status?.toLowerCase();

                    if (!context.mounted) return;

                    if (status == 'active' || status == 'approved') {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(
                          builder: (context) => const IncomingRidesModeScreen(),
                        ),
                        (route) => false,
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Your account is still pending approval.',
                          ),
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Error checking status. Please try again.',
                          ),
                        ),
                      );
                    }
                  }
                },
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  // Logout or go back logic if needed
                },
                child: const Text(
                  'Sign Out',
                  style: TextStyle(color: AppColors.grey),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
