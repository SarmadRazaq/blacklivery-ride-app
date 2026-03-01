import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
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

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  void _onResetPassword() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const NewPasswordScreen(),
      ),
    );
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

              // Title
              Text(
                'Reset password',
                style: AppTextStyles.heading2,
              ),

              const SizedBox(height: 32),

              // Verification Code Input
              CustomInputField(
                controller: _codeController,
                hintText: 'Verification code',
              ),

              const SizedBox(height: 24),

              // Reset Password Button
              CustomButton.main(
                text: 'Reset Password',
                onTap: _onResetPassword,
              ),

              const SizedBox(height: 24),

              // Info text
              RichText(
                textAlign: TextAlign.center,
                text: TextSpan(
                  style: AppTextStyles.caption,
                  children: [
                    const TextSpan(
                      text: 'We will send you a verification code to\nyour registered phone number.',
                    ),
                  ],
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
