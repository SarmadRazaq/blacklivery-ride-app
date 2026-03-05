import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/auth_service.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_input_field.dart';
import 'login_screen.dart';

class NewPasswordScreen extends StatefulWidget {
  final String? phoneNumber;

  const NewPasswordScreen({super.key, this.phoneNumber});

  @override
  State<NewPasswordScreen> createState() => _NewPasswordScreenState();
}

class _NewPasswordScreenState extends State<NewPasswordScreen> {
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  final AuthService _authService = AuthService();
  bool _isLoading = false;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _onChangePassword() async {
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (password.isEmpty || password.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password must be at least 8 characters'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Validate passwords match
    if (password != confirmPassword) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Passwords do not match'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // The user was authenticated via phone OTP in the previous step,
      // so we can update their password via Firebase
      final user = _authService.currentFirebaseUser;
      if (user != null) {
        await user.updatePassword(password);
      } else {
        throw 'No authenticated session. Please try again.';
      }

      if (!mounted) return;

      // Sign out and navigate to login so user logs in with new password
      await _authService.logout();

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password changed successfully! Please log in.'),
          backgroundColor: AppColors.success,
        ),
      );

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
        (route) => false,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to change password: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
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
                'New password',
                style: AppTextStyles.heading2,
              ),

              const SizedBox(height: 12),

              Text(
                'Create a new password for your account',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.txtSec,
                ),
              ),

              const SizedBox(height: 32),

              // Create Password
              CustomInputField.password(
                controller: _passwordController,
                hintText: 'Create Password',
              ),

              const SizedBox(height: 16),

              // Confirm Password
              CustomInputField.password(
                controller: _confirmPasswordController,
                hintText: 'Confirm Password',
              ),

              const SizedBox(height: 24),

              // Change Password Button
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
                      text: 'Change Password',
                      onTap: _onChangePassword,
                    ),

              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
