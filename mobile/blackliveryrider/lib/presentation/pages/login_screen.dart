import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/biometric_service.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_input_field.dart';
import '../widgets/social_login_buttons.dart';
import '../widgets/auth_tab_switcher.dart';
import '../widgets/map_preview.dart';
import 'signup_screen.dart';
import 'reset_password_screen.dart';
import 'otp_verification_screen.dart';
import 'two_factor_screen.dart';
import 'home_screen.dart';
import '../../core/providers/region_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  int _selectedTab = 0; // 0 = Phone Number, 1 = Email Address
  String _selectedRegion = 'NG'; // 'NG' or 'US'
  final BiometricService _biometricService = BiometricService();
  bool _canUseBiometric = false;

  String get _countryCode => _selectedRegion == 'NG' ? '+234' : '+1';
  String get _countryFlag => _selectedRegion == 'NG' ? '🇳🇬' : '🇺🇸';
  String get _phoneHint =>
      _selectedRegion == 'NG' ? '801 234 5678' : '415 555 1234';

  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    try {
      final region = Provider.of<RegionProvider>(context, listen: false);
      _selectedRegion = region.isChicago ? 'US' : 'NG';
    } catch (_) {
      _selectedRegion = 'NG';
    }
    _checkBiometric();
  }

  Future<void> _checkBiometric() async {
    final enabled = await _biometricService.isBiometricEnabled();
    final hasCreds = await _biometricService.hasStoredCredentials();
    final supported = await _biometricService.isDeviceSupported();

    if (mounted) {
      setState(() {
        _canUseBiometric = enabled && hasCreds && supported;
      });
    }
  }

  Future<void> _attemptBiometricLogin() async {
    final authenticated = await _biometricService.authenticate();
    if (!authenticated) return;

    final creds = await _biometricService.getCredentials();
    if (creds != null) {
      _emailController.text = creds['email'] ?? '';
      _passwordController.text = creds['password'] ?? '';
      _selectedTab = 1; // Switch to email tab
      await _onContinue();
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _onContinue() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    debugPrint('=== LOGIN _onContinue called, tab: $_selectedTab ===');

    try {
      if (_selectedTab == 0) {
        // Phone login - navigate to OTP
        final phone = _phoneController.text.trim();
        debugPrint('Phone login, phone: $phone');
        if (phone.isNotEmpty) {
          await authProvider.startPhoneVerification('$_countryCode$phone');
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
          debugPrint('Phone is empty!');
        }
      } else {
        // Email login - handle authentication
        final email = _emailController.text.trim();
        final password = _passwordController.text;
        debugPrint(
          '=== Email login: email=$email, password length=${password.length} ===',
        );

        if (email.isNotEmpty && password.isNotEmpty) {
          debugPrint('=== Calling authProvider.login... ===');
          await authProvider.login(email, password);
          debugPrint(
            '=== Login returned successfully, user: ${authProvider.user?.fullName} ===',
          );

          // Save credentials if biometric enabled
          final bioEnabled = await _biometricService.isBiometricEnabled();
          if (bioEnabled) {
            await _biometricService.saveCredentials(email, password);
            // Refresh state to show button next time
            _checkBiometric();
          }

          if (mounted) {
            final user = authProvider.user;
            if (user?.twoFactorEnabled == true) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const TwoFactorScreen(),
                ),
              );
            } else {
              debugPrint('=== Navigating to HomeScreen... ===');
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (context) => const HomeScreen()),
                (route) => false,
              );
            }
          }
        } else {
          debugPrint('=== Email or password is empty! ===');
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enter email and password')),
          );
        }
      }
    } catch (e, stackTrace) {
      debugPrint('=== LOGIN ERROR: $e ===');
      debugPrint('=== STACK TRACE: $stackTrace ===');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login failed: ${e.toString()}')),
        );
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
                Text('Login', style: AppTextStyles.heading2),

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

                const SizedBox(height: 24),

                if (_selectedTab == 0) ...[
                  _buildRegionSelector(),
                  const SizedBox(height: 16),
                ],

                // Form Fields
                if (_selectedTab == 0) ...[
                  // Phone Number Tab
                  CustomInputField.phone(
                    controller: _phoneController,
                    hintText: _phoneHint,
                    countryCode: _countryCode,
                    countryFlag: _countryFlag,
                  ),
                ] else ...[
                  // Email Address Tab
                  CustomInputField.email(
                    controller: _emailController,
                    hintText: 'Email Address',
                  ),
                  const SizedBox(height: 16),
                  CustomInputField.password(
                    controller: _passwordController,
                    hintText: 'Password',
                  ),
                  const SizedBox(height: 12),
                  // Forgot Password
                  Align(
                    alignment: Alignment.centerRight,
                    child: GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const ResetPasswordScreen(),
                          ),
                        );
                      },
                      child: Text(
                        'Forgot password?',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                // Continue Button
                CustomButton.main(text: 'Continue', onTap: _onContinue),

                if (_canUseBiometric && _selectedTab == 1) ...[
                  const SizedBox(height: 16),
                  GestureDetector(
                    onTap: _attemptBiometricLogin,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.yellow90),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.fingerprint,
                            color: AppColors.yellow90,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Login with Biometrics',
                            style: AppTextStyles.body.copyWith(
                              color: AppColors.yellow90,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],

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
                        final user = authProvider.user;
                        if (user?.twoFactorEnabled == true) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const TwoFactorScreen(),
                            ),
                          );
                        } else {
                          Navigator.pushAndRemoveUntil(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const HomeScreen(),
                            ),
                            (route) => false,
                          );
                        }
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
                        final user = authProvider.user;
                        if (user?.twoFactorEnabled == true) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const TwoFactorScreen(),
                            ),
                          );
                        } else {
                          Navigator.pushAndRemoveUntil(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const HomeScreen(),
                            ),
                            (route) => false,
                          );
                        }
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

                // Don't have an account? Sign Up
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Don't have an account? ",
                      style: AppTextStyles.bodySmall,
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const SignUpScreen(),
                          ),
                        );
                      },
                      child: Text(
                        'Sign Up',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

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
                  : AppColors.inputBorder,
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
