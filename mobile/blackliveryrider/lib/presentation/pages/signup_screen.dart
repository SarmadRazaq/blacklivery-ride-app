import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/region_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_input_field.dart';
import '../widgets/social_login_buttons.dart';
import 'home_screen.dart';
import '../widgets/auth_tab_switcher.dart';
import '../widgets/map_preview.dart';
import 'otp_verification_screen.dart';
import 'login_screen.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  int _selectedTab = 0; // 0 = Phone Number, 1 = Email Address
  String _selectedRegion = 'NG'; // 'NG' or 'US'

  String get _countryCode => _selectedRegion == 'NG' ? '+234' : '+1';
  String get _countryFlag => _selectedRegion == 'NG' ? '🇳🇬' : '🇺🇸';
  String get _phoneHint =>
      _selectedRegion == 'NG' ? '801 234 5678' : '415 555 1234';

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _onContinue() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    debugPrint('Signup _onContinue called, tab: $_selectedTab');

    try {
      if (_selectedTab == 0) {
        // Phone Signup
        final phone = _phoneController.text.trim();
        final name = _nameController.text.trim();
        debugPrint('Phone signup, phone: $phone, name: $name');
        if (phone.isNotEmpty && name.isNotEmpty) {
          await authProvider.startPhoneVerification(
            '$_countryCode$phone',
            displayName: name,
          );

          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) =>
                    OtpVerificationScreen(phoneNumber: '$_countryCode$phone'),
              ),
            );
          }
        } else {
          debugPrint('Phone or name is empty!');
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enter your name and phone number')),
          );
        }
      } else {
        // Email Signup
        final email = _emailController.text.trim();
        final password = _passwordController.text;
        final name = _nameController.text.trim();
        final phone = _phoneController.text.trim();
        debugPrint(
          'Email signup - email: $email, name: $name, password length: ${password.length}',
        );

        if (password != _confirmPasswordController.text) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Passwords do not match')),
            );
          }
          return;
        }
        if (phone.isEmpty || phone.length < 6) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Please enter a valid phone number'),
              ),
            );
          }
          return;
        }
        if (email.isNotEmpty && password.isNotEmpty && name.isNotEmpty) {
          await authProvider.register(
            email,
            password,
            name,
            '$_countryCode$phone',
            region: _selectedRegion,
          );
          debugPrint('Registration successful, navigating to OTP verification');
          // Navigate to OTP verification screen
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => OtpVerificationScreen(email: email),
              ),
            );
          }
        } else {
          debugPrint('Missing required fields!');
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please fill in all required fields')),
          );
        }
      }
    } catch (e) {
      debugPrint('Signup error: $e');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: ${e.toString()}')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 20),

                // Title
                Text('Sign Up', style: AppTextStyles.heading2),

                const SizedBox(height: 20),

                // Map Preview
                const MapPreview(),

                const SizedBox(height: 24),

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

                const SizedBox(height: 20),

                // Region Selector
                _buildRegionSelector(),

                const SizedBox(height: 20),

                // Form Fields
                if (_selectedTab == 0) ...[
                  // Phone Number Tab
                  CustomInputField(
                    controller: _nameController,
                    hintText: 'Full Name',
                    prefixIcon: Icons.person_outline,
                  ),
                  const SizedBox(height: 16),
                  CustomInputField.phone(
                    controller: _phoneController,
                    hintText: _phoneHint,
                    countryCode: _countryCode,
                    countryFlag: _countryFlag,
                  ),
                ] else ...[
                  // Email Address Tab
                  CustomInputField(
                    controller: _nameController,
                    hintText: 'Full Name',
                    prefixIcon: Icons.person_outline,
                  ),
                  const SizedBox(height: 16),
                  CustomInputField.email(
                    controller: _emailController,
                    hintText: 'Email Address',
                  ),
                  const SizedBox(height: 16),
                  CustomInputField.phone(
                    controller: _phoneController,
                    hintText: _phoneHint,
                    countryCode: _countryCode,
                    countryFlag: _countryFlag,
                  ),
                  const SizedBox(height: 16),
                  CustomInputField.password(
                    controller: _passwordController,
                    hintText: 'Create a Password',
                  ),
                  const SizedBox(height: 16),
                  CustomInputField.password(
                    controller: _confirmPasswordController,
                    hintText: 'Confirm Password',
                  ),
                ],

                const SizedBox(height: 16),

                // Already have an account? Login
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Already have an account? ',
                      style: AppTextStyles.bodySmall,
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const LoginScreen(),
                          ),
                        );
                      },
                      child: Text(
                        'Login',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Continue Button
                CustomButton.main(text: 'Continue', onTap: _onContinue),

                const SizedBox(height: 24),

                // Or continue with
                Row(
                  children: [
                    const Expanded(
                      child: Divider(color: AppColors.divider, thickness: 1),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Or continue with',
                        style: AppTextStyles.caption,
                      ),
                    ),
                    const Expanded(
                      child: Divider(color: AppColors.divider, thickness: 1),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Social Login Buttons
                SocialLoginButtons(
                  onGoogleTap: () async {
                    final authProvider = Provider.of<AuthProvider>(
                      context,
                      listen: false,
                    );
                    try {
                      await authProvider.googleSignIn();
                      if (mounted) {
                        Navigator.pushAndRemoveUntil(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const HomeScreen(),
                          ),
                          (route) => false,
                        );
                      }
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Google sign-in failed: ${e.toString()}',
                            ),
                          ),
                        );
                      }
                    }
                  },
                  onAppleTap: () async {
                    final authProvider = Provider.of<AuthProvider>(
                      context,
                      listen: false,
                    );
                    try {
                      await authProvider.appleSignIn();
                      if (mounted) {
                        Navigator.pushAndRemoveUntil(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const HomeScreen(),
                          ),
                          (route) => false,
                        );
                      }
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Apple sign-in failed: ${e.toString()}',
                            ),
                          ),
                        );
                      }
                    }
                  },
                ),

                const SizedBox(height: 20),

                // Terms and Privacy
                RichText(
                  textAlign: TextAlign.center,
                  text: TextSpan(
                    style: AppTextStyles.caption,
                    children: [
                      const TextSpan(text: 'By signing up you agree to our\n'),
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

  Widget _buildRegionSelector() {
    return Row(
      children: [
        _buildRegionChip('NG', '🇳🇬', 'Nigeria'),
        const SizedBox(width: 12),
        _buildRegionChip('US', '🇺🇸', 'Chicago, US'),
      ],
    );
  }

  Widget _buildRegionChip(String code, String flag, String label) {
    final isSelected = _selectedRegion == code;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedRegion = code;
            _phoneController.clear();
          });
          // Also update the RegionProvider
          final regionProvider = context.read<RegionProvider>();
          regionProvider.setRegion(
            code == 'NG' ? RegionCode.ng : RegionCode.usChi,
          );
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.yellow90.withOpacity(0.12)
                : AppColors.inputBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? AppColors.yellow90.withOpacity(0.6)
                  : AppColors.inputBg,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(flag, style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              Text(
                label,
                style: AppTextStyles.bodySmall.copyWith(
                  color: isSelected ? AppColors.yellow90 : AppColors.txtSec,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
