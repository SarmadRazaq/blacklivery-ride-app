import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/providers/auth_provider.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_input_field.dart';
import 'new_password_screen.dart';

class ResetPasswordVerificationScreen extends StatefulWidget {
  final String phoneNumber;

  const ResetPasswordVerificationScreen({
    super.key,
    required this.phoneNumber,
  });

  @override
  State<ResetPasswordVerificationScreen> createState() =>
      _ResetPasswordVerificationScreenState();
}

class _ResetPasswordVerificationScreenState
    extends State<ResetPasswordVerificationScreen> {
  final TextEditingController _codeController = TextEditingController();
  bool _isLoading = false;
  int _resendCountdown = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startResendTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _codeController.dispose();
    super.dispose();
  }

  void _startResendTimer() {
    _timer?.cancel();
    _resendCountdown = 60;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        if (_resendCountdown > 0) {
          _resendCountdown--;
        } else {
          timer.cancel();
        }
      });
    });
  }

  Future<void> _onVerifyCode() async {
    final code = _codeController.text.trim();
    if (code.isEmpty || code.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter the 6-digit verification code'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final loggedIn = await authProvider.verifyPhone(widget.phoneNumber, code);

      if (!mounted) return;

      if (loggedIn) {
        // Verified and logged in — now allow password change
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => NewPasswordScreen(
              phoneNumber: widget.phoneNumber,
            ),
          ),
        );
      } else {
        // Verified but no account — can't reset password for non-existent account
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No account found with this phone number'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Verification failed: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _resendCode() async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.startPhoneVerification(widget.phoneNumber);
      _startResendTimer();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Verification code resent'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to resend code: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 20),

              // Back button
              Align(
                alignment: Alignment.centerLeft,
                child: GestureDetector(
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
              ),

              const SizedBox(height: 12),

              // Title
              Text(
                'Reset password',
                style: AppTextStyles.heading2,
              ),

              const SizedBox(height: 16),

              // Phone badge
              Text(
                'Enter the code sent to ${widget.phoneNumber}',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.txtSec,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 32),

              // Verification Code Input
              CustomInputField(
                controller: _codeController,
                hintText: 'Enter 6-digit code',
                prefixIcon: Icons.lock_outline,
              ),

              const SizedBox(height: 24),

              // Verify Button
              _isLoading
                  ? const SizedBox(
                      height: 48,
                      child: Center(
                        child: CircularProgressIndicator(
                          color: AppColors.yellow90,
                          strokeWidth: 2.5,
                        ),
                      ),
                    )
                  : CustomButton.main(
                      text: 'Verify & Continue',
                      onTap: _onVerifyCode,
                    ),

              const SizedBox(height: 24),

              // Resend timer / button
              _resendCountdown > 0
                  ? Text(
                      'Resend code in ${_resendCountdown}s',
                      style: AppTextStyles.caption,
                    )
                  : GestureDetector(
                      onTap: _resendCode,
                      child: Text(
                        'Resend Code',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.yellow90,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),

              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
