import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_input_field.dart';
import '../widgets/auth_tab_switcher.dart';
import 'reset_password_verification_screen.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  int _selectedTab = 0; // 0 = Phone Number, 1 = Email Address

  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _onSendCode() {
    if (_selectedTab == 0) {
      // Phone - send verification code
      final phoneText = _phoneController.text.trim();
      if (phoneText.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter your phone number'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ResetPasswordVerificationScreen(
            phoneNumber: phoneText,
          ),
        ),
      );
    } else {
      // Email - send link
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password reset link sent to your email'),
          backgroundColor: AppColors.success,
        ),
      );
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

              // Title
              Text(
                'Reset password',
                style: AppTextStyles.heading2,
              ),

              const SizedBox(height: 32),

              // Tab Switcher
              AuthTabSwitcher(
                selectedIndex: _selectedTab,
                tabs: const ['Phone Number', 'Email Address'],
                onTabChanged: (index) {
                  setState(() {
                    _selectedTab = index;
                  });
                },
              ),

              const SizedBox(height: 24),

              // Form Fields
              if (_selectedTab == 0) ...[
                // Phone Number Tab
                CustomInputField.phone(
                  controller: _phoneController,
                  hintText: 'Enter your phone number',
                  countryCode: '+1',
                  countryFlag: '🇺🇸',
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Verification link',
                    style: AppTextStyles.caption,
                  ),
                ),
              ] else ...[
                // Email Address Tab
                CustomInputField.email(
                  controller: _emailController,
                  hintText: 'Enter Email Address',
                ),
              ],

              const SizedBox(height: 24),

              // Send Button
              CustomButton.main(
                text: _selectedTab == 0 ? 'Send Code' : 'Send Link',
                onTap: _onSendCode,
              ),

              const SizedBox(height: 24),

              // Info text
              Text(
                _selectedTab == 0
                    ? 'We will send you a verification code to\nyour registered phone number.'
                    : 'We will send you a link to reset your password\nand create a new one.',
                style: AppTextStyles.caption,
                textAlign: TextAlign.center,
              ),

              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
