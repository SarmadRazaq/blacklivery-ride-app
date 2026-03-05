import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:provider/provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/network/api_error_message.dart';
import '../widgets/custom_numpad.dart';
import '../widgets/otp_input_box.dart';
import 'home_screen.dart';
import 'phone_signup_screen.dart';
import 'two_factor_screen.dart';

class OtpVerificationScreen extends StatefulWidget {
  final String? phoneNumber;
  final String? email;

  const OtpVerificationScreen({super.key, this.phoneNumber, this.email});

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  String _otpCode = '';
  int _remainingSeconds = 59;
  Timer? _timer;
  bool _isVerified = false;
  bool _isLoading = false;
  bool get _isEmailFlow => widget.email != null && widget.phoneNumber == null;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        setState(() {
          _remainingSeconds--;
        });
      } else {
        timer.cancel();
      }
    });
  }

  void _onKeyPressed(String key) {
    if (_isLoading) return; // Ignore input while verifying

    if (key == 'backspace') {
      if (_otpCode.isNotEmpty) {
        setState(() {
          _otpCode = _otpCode.substring(0, _otpCode.length - 1);
        });
      }
    } else if (key == 'clear') {
      // Clear entire OTP field
      setState(() {
        _otpCode = '';
      });
    } else if (key == 'check') {
      if (_otpCode.length < 6) {
        _showErrorDialog('Incomplete Code', 'Please enter all 6 digits before submitting.');
        return;
      }
      _verifyOtp();
    } else if (_otpCode.length < 6) {
      setState(() {
        _otpCode += key;
      });

      // Auto verify when 6 digits entered
      if (_otpCode.length == 6) {
        _verifyOtp();
      }
    }
  }

  /// Show a user-friendly error dialog instead of a raw SnackBar
  void _showErrorDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.inputBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.redAccent, size: 24),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: const TextStyle(color: Colors.white70, fontSize: 14, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK', style: TextStyle(color: AppColors.yellow90, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  /// Extract a clean user-friendly message from any error
  String _cleanErrorMessage(dynamic error) {
    if (error is DioException) {
      return apiErrorMessage(error);
    }
    final msg = error.toString();
    // Strip Dart exception class prefixes
    if (msg.startsWith('Exception: ')) return msg.substring(11);
    if (msg.contains('DioException')) return 'Something went wrong. Please try again.';
    if (msg.contains('No token provided')) return 'Session expired. Please try again.';
    if (msg.length > 120) return 'Verification failed. Please try again.';
    return msg;
  }

  Future<void> _verifyOtp() async {
    if (_otpCode.length < 6 || _isLoading) return;

    setState(() => _isLoading = true);

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    try {
      if (widget.phoneNumber != null) {
        // Phone verification — returns true if logged in, false if needs signup
        final loggedIn = await authProvider.verifyPhone(widget.phoneNumber!, _otpCode);

        if (!mounted) return;

        if (!loggedIn) {
          // Phone verified but no account — navigate to signup form
          setState(() => _isLoading = false);
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => PhoneSignupScreen(
                phoneNumber: widget.phoneNumber!,
              ),
            ),
          );
          return;
        }

        // Check if 2FA is enabled — redirect to 2FA screen instead of home
        final user = authProvider.user;
        if (user?.twoFactorEnabled == true) {
          setState(() => _isLoading = false);
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => TwoFactorScreen(
                phoneNumber: widget.phoneNumber,
              ),
            ),
          );
          return;
        }
      } else if (widget.email != null) {
        // Email verification
        await authProvider.verifyEmailOtp(widget.email!, _otpCode);
      }

      if (!mounted) return;
      setState(() {
        _isVerified = true;
        _isLoading = false;
      });

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const HomeScreen()),
        (route) => false,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _otpCode = ''; // Clear for retry
      });
      _showErrorDialog('Verification Failed', _cleanErrorMessage(e));
    }
  }

  String get _formattedTime {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.chevron_left,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                  ),
                  const Expanded(
                    child: Text(
                      'OTP Verification',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(width: 40), // Balance the back button
                ],
              ),
            ),

            const SizedBox(height: 20),

            // OTP Box
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.inputBorder, width: 1),
                ),
                child: Column(
                  children: [
                    if (!_isVerified) ...[
                      // Instructions
                      RichText(
                        textAlign: TextAlign.center,
                        text: TextSpan(
                          style: AppTextStyles.bodySmall,
                          children: [
                            TextSpan(
                              text: _isEmailFlow
                                  ? 'Enter the 6-digit OTP sent to '
                                  : 'Enter the OTP sent to ',
                            ),
                            TextSpan(
                              text:
                                  widget.phoneNumber ??
                                  widget.email ??
                                  '+234 702 2345 678',
                              style: AppTextStyles.bodySmall.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      // OTP Input Display
                      OtpInputBox(code: _otpCode),

                      const SizedBox(height: 16),

                      // Loading indicator (inline to avoid overflow)
                      if (_isLoading)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 8),
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              color: AppColors.yellow90,
                              strokeWidth: 2.5,
                            ),
                          ),
                        ),

                      // Timer
                      if (!_isLoading)
                        Text(
                          _formattedTime,
                          style: AppTextStyles.body.copyWith(color: Colors.white),
                        ),
                    ] else ...[
                      // Success Message
                      const SizedBox(height: 40),
                      Text(
                        'Changes Saved!',
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.yellow90,
                        ),
                      ),
                      const SizedBox(height: 40),
                    ],
                  ],
                ),
              ),
            ),

            const Spacer(),

            // Number Pad
            CustomNumpad(
              onKeyPressed: _onKeyPressed,
              isCheckEnabled: _otpCode.length == 6,
            ),

            TextButton(
              onPressed: _remainingSeconds > 0
                  ? null
                  : () async {
                      try {
                        if (_isEmailFlow) {
                          await context
                              .read<AuthProvider>()
                              .resendEmailVerification();
                        } else {
                          await context.read<AuthProvider>().startPhoneVerification(
                            widget.phoneNumber!,
                          );
                        }

                        setState(() {
                          _remainingSeconds = 59;
                          _otpCode = '';
                        });
                        _timer?.cancel();
                        _startTimer();
                      } catch (e) {
                        if (!mounted) return;
                        _showErrorDialog('Resend Failed', _cleanErrorMessage(e));
                      }
                    },
              child: Text(
                _remainingSeconds > 0
                    ? _isEmailFlow
                          ? 'Resend email OTP in $_formattedTime'
                          : 'Resend OTP in $_formattedTime'
                    : _isEmailFlow
                    ? 'Resend Email OTP'
                    : 'Resend OTP',
              ),
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
