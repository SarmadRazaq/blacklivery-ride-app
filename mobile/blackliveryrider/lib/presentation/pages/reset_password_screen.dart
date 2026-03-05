import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/auth_service.dart';
import '../../core/providers/region_provider.dart';
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
  bool _isLoading = false;
  final AuthService _authService = AuthService();

  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();

  String get _countryCode {
    try {
      final region = Provider.of<RegionProvider>(context, listen: false);
      return region.isChicago ? '+1' : '+234';
    } catch (_) {
      return '+234';
    }
  }

  String get _countryFlag {
    try {
      final region = Provider.of<RegionProvider>(context, listen: false);
      return region.isChicago ? '🇺🇸' : '🇳🇬';
    } catch (_) {
      return '🇳🇬';
    }
  }

  String get _phoneHint {
    try {
      final region = Provider.of<RegionProvider>(context, listen: false);
      return region.isChicago ? '415 555 1234' : '801 234 5678';
    } catch (_) {
      return '801 234 5678';
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _onSendCode() async {
    if (_isLoading) return;

    if (_selectedTab == 0) {
      // Phone - send verification code via backend
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

      setState(() => _isLoading = true);
      try {
        final fullPhone = '$_countryCode$phoneText';
        await _authService.startPhoneVerification(fullPhone);
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ResetPasswordVerificationScreen(
                phoneNumber: fullPhone,
              ),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to send code: ${e.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    } else {
      // Email - send Firebase password reset link
      final emailText = _emailController.text.trim();
      if (emailText.isEmpty || !emailText.contains('@')) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter a valid email address'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      setState(() => _isLoading = true);
      try {
        await _authService.requestPasswordReset(emailText);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Password reset link sent to your email. Check your inbox.'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to send reset link: ${e.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
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
                // Phone Number Tab — uses region-aware country code
                CustomInputField.phone(
                  controller: _phoneController,
                  hintText: _phoneHint,
                  countryCode: _countryCode,
                  countryFlag: _countryFlag,
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'We will send a verification code to this number',
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
