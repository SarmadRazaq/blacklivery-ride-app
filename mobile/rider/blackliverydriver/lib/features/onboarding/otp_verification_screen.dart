import 'dart:async';
import 'package:flutter/material.dart';
import 'package:pinput/pinput.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_button.dart';
import 'emergency_contacts_screen.dart';

class OtpVerificationScreen extends ConsumerStatefulWidget {
  final String phoneNumber;
  final String region;
  final String firstName;
  final String lastName;
  final String? email;
  final String? password;

  const OtpVerificationScreen({
    super.key,
    required this.phoneNumber,
    required this.region,
    required this.firstName,
    required this.lastName,
    this.email,
    this.password,
  });

  @override
  ConsumerState<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends ConsumerState<OtpVerificationScreen> {
  final TextEditingController _otpController = TextEditingController();
  // final AuthService _authService = AuthService(); // Removed

  final bool _isLoading = false;
  int _resendTimer = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startResendTimer();
  }

  // _sendInitialOtp removed as it's handled by previous screen

  void _startResendTimer() {
    setState(() => _resendTimer = 60);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendTimer > 0) {
        setState(() => _resendTimer--);
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otpController.dispose();
    super.dispose();
  }

  void _verifyOtp(String otp) async {
    if (otp.length != 6) return;

    try {
      await ref.read(authRiverpodProvider).verifyOtp(widget.phoneNumber, otp);

      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const EmergencyContactsScreen(),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Verification failed: ${e.toString()}')),
        );
      }
    }
  }

  void _resendOtp() async {
    if (_resendTimer > 0) return;

    try {
      await ref.read(authRiverpodProvider).sendOtp(
        widget.phoneNumber,
        firstName: widget.firstName,
        lastName: widget.lastName,
        email: widget.email,
        region: widget.region,
      );

      _startResendTimer();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('OTP resent successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to resend: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final defaultPinTheme = PinTheme(
      width: 50,
      height: 50,
      textStyle: const TextStyle(
        fontSize: 20,
        color: AppColors.white,
        fontWeight: FontWeight.w600,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A1A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[800]!),
      ),
    );

    final focusedPinTheme = defaultPinTheme.copyDecorationWith(
      border: Border.all(color: AppColors.primary),
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios,
            color: AppColors.white,
            size: 20,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        centerTitle: true,
        title: const Text(
          'Verification',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                const Text(
                  'Enter verification code',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'We have sent a code to ${widget.phoneNumber}',
                  style: TextStyle(fontSize: 14, color: Colors.grey[400]),
                ),

                const SizedBox(height: 32),

                // ── OTP Field ──
                Center(
                  child: Pinput(
                    length: 6,
                    controller: _otpController,
                    defaultPinTheme: defaultPinTheme,
                    focusedPinTheme: focusedPinTheme,
                    onCompleted: _verifyOtp,
                    pinputAutovalidateMode: PinputAutovalidateMode.onSubmit,
                    showCursor: true,
                  ),
                ),

                const SizedBox(height: 32),

                if (_isLoading)
                  const Center(
                    child: CircularProgressIndicator(color: AppColors.white),
                  )
                else
                  CustomButton(
                    text: 'Verify',
                    onPressed: () => _verifyOtp(_otpController.text),
                  ),

                const SizedBox(height: 24),

                // ── Resend ──
                Center(
                  child: TextButton(
                    onPressed: _resendTimer > 0 ? null : _resendOtp,
                    child: Text(
                      _resendTimer > 0
                          ? 'Resend code in ${_resendTimer}s'
                          : 'Resend Code',
                      style: TextStyle(
                        color: _resendTimer > 0
                            ? Colors.grey[600]
                            : AppColors.primary,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // ── Step Dots ──
                _buildStepDots(0), // Still step 1 conceptually/visually
              ],
            ),
          ),
        ),
      ),
    );
  }

  static Widget _buildStepDots(int activeIndex) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(4, (i) {
        final isActive = i == activeIndex;
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: isActive ? 24 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: isActive ? AppColors.white : Colors.grey[700],
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}
