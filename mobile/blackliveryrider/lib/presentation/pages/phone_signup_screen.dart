import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/region_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_input_field.dart';
import 'home_screen.dart';

/// Screen shown after phone OTP is verified but no account exists.
/// Collects name, email, password to complete registration with the verified phone pre-linked.
class PhoneSignupScreen extends StatefulWidget {
  final String phoneNumber;

  const PhoneSignupScreen({super.key, required this.phoneNumber});

  @override
  State<PhoneSignupScreen> createState() => _PhoneSignupScreenState();
}

class _PhoneSignupScreenState extends State<PhoneSignupScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

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
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 14,
            height: 1.4,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(
              'OK',
              style: TextStyle(
                color: AppColors.yellow90,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _onSubmit() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (name.isEmpty) {
      _showErrorDialog('Missing Name', 'Please enter your full name.');
      return;
    }
    if (email.isEmpty || !email.contains('@')) {
      _showErrorDialog('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      _showErrorDialog(
        'Weak Password',
        'Password must be at least 8 characters.',
      );
      return;
    }
    if (password != confirmPassword) {
      _showErrorDialog(
        'Password Mismatch',
        'Passwords do not match. Please try again.',
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);

      // Detect region from phone prefix or current RegionProvider
      String? region;
      try {
        final regionProvider =
            Provider.of<RegionProvider>(context, listen: false);
        region = regionProvider.isChicago ? 'US' : 'NG';
      } catch (_) {}

      await authProvider.registerWithVerifiedPhone(
        email: email,
        password: password,
        fullName: name,
        phoneNumber: widget.phoneNumber,
        region: region,
      );

      if (!mounted) return;

      // Navigate to home, clear backstack
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const HomeScreen()),
        (route) => false,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      _showErrorDialog('Registration Failed', e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 24),

                // Back button row
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
                Text('Complete Sign Up', style: AppTextStyles.heading2),

                const SizedBox(height: 12),

                // Subtitle
                Text(
                  'Your phone number has been verified.\nPlease complete your profile to continue.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.txtSec,
                    height: 1.5,
                  ),
                ),

                const SizedBox(height: 8),

                // Verified phone badge
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.yellow90.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.yellow90.withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.phone_android,
                        color: AppColors.yellow90,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        widget.phoneNumber,
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.yellow90,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 18,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 28),

                // Name field
                CustomInputField(
                  controller: _nameController,
                  hintText: 'Full Name',
                  prefixIcon: Icons.person_outline,
                ),

                const SizedBox(height: 16),

                // Email field
                CustomInputField.email(
                  controller: _emailController,
                  hintText: 'Email Address',
                ),

                const SizedBox(height: 16),

                // Password field
                CustomInputField.password(
                  controller: _passwordController,
                  hintText: 'Create a Password',
                ),

                const SizedBox(height: 16),

                // Confirm password field
                CustomInputField.password(
                  controller: _confirmPasswordController,
                  hintText: 'Confirm Password',
                ),

                const SizedBox(height: 32),

                // Submit button
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
                        text: 'Create Account',
                        onTap: _onSubmit,
                      ),

                const SizedBox(height: 24),

                // Terms
                RichText(
                  textAlign: TextAlign.center,
                  text: TextSpan(
                    style: AppTextStyles.caption,
                    children: [
                      const TextSpan(
                        text: 'By signing up you agree to our\n',
                      ),
                      TextSpan(
                        text: 'Terms and conditions',
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.white,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                      const TextSpan(text: ' and '),
                      TextSpan(
                        text: 'Privacy policy',
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.white,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
