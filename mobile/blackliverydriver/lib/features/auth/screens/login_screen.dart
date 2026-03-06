import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/riverpod_providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/auth_service.dart';
import '../../ride/driver_map_screen.dart';
import '../../onboarding/vehicle_onboarding_screen.dart';
import '../../onboarding/approval_screen.dart';
import 'forgot_password_screen.dart';
import '../../../core/services/biometric_service.dart';
import 'two_factor_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _isGoogleLoading = false;
  bool _isAppleLoading = false;
  bool _appleSignInAvailable = false;

  final BiometricService _biometricService = BiometricService();
  final AuthService _authService = AuthService();

  String _cleanError(Object e) {
    final msg = e.toString();
    return msg.startsWith('Exception: ') ? msg.substring(11) : msg;
  }
  bool _canUseBiometric = false;

  /// Navigate based on driver's onboarding/approval status
  void _navigateAfterAuth() {
    final authProvider = ref.read(authRiverpodProvider);
    final user = authProvider.user;
    final status = user?.status;

    if (status == 'suspended' || status == 'deactivated') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Your account is $status. Please contact support.')),
      );
      authProvider.logout();
      return;
    }

    // Check onboarding status from the driverOnboarding field
    final onboardingStatus = user?.driverOnboarding?.status;
    debugPrint('[Nav] onboardingStatus=$onboardingStatus, driverProfile=${user?.driverProfile != null}, status=$status');

    // Approved explicitly, or legacy account with a vehicle already set up
    final isApproved = onboardingStatus == 'approved' ||
        (onboardingStatus == null && user?.driverProfile != null);

    if (isApproved) {
      // Approved — go to map
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const DriverMapScreen()),
      );
      return;
    }

    // Check if waiting for admin approval
    if (onboardingStatus == 'pending_approval' || onboardingStatus == 'under_review') {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const ApprovalScreen()),
      );
      return;
    }

    // Not onboarded yet — send to vehicle info
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => const VehicleOnboardingScreen()),
    );
  }

  @override
  void initState() {
    super.initState();
    _checkBiometric();
    _authService.isAppleSignInAvailable.then((v) {
      if (mounted) setState(() => _appleSignInAvailable = v);
    });
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
      _handleLogin(); // Using existing login logic
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your email')),
      );
      return;
    }

    if (password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your password')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authProvider = ref.read(authRiverpodProvider);
      await authProvider.login(email, password);

      // Save credentials if biometric enabled
      final bioEnabled = await _biometricService.isBiometricEnabled();
      if (bioEnabled) {
        await _biometricService.saveCredentials(email, password);
        _checkBiometric();
      }

      if (mounted) {
        final user = authProvider.user;
        if (user?.twoFactorEnabled == true) {
          // Assuming User model has this field
          Navigator.of(context).push(
            MaterialPageRoute(builder: (context) => const TwoFactorScreen()),
          );
        } else {
          _navigateAfterAuth();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_cleanError(e))),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _handleGoogleSignIn() async {
    setState(() => _isGoogleLoading = true);

    try {
      await ref.read(authRiverpodProvider).googleSignIn();
      if (mounted) {
        final user = ref.read(authRiverpodProvider).user;
        if (user?.twoFactorEnabled == true) {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (context) => const TwoFactorScreen()),
          );
        } else {
          _navigateAfterAuth();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Google sign-in failed: ${_cleanError(e)}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGoogleLoading = false);
      }
    }
  }

  void _handleAppleSignIn() async {
    setState(() => _isAppleLoading = true);
    try {
      await ref.read(authRiverpodProvider).signInWithApple();
      if (mounted) {
        final user = ref.read(authRiverpodProvider).user;
        if (user?.twoFactorEnabled == true) {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (context) => const TwoFactorScreen()),
          );
        } else {
          _navigateAfterAuth();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Apple sign-in failed: ${_cleanError(e)}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isAppleLoading = false);
      }
    }
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscure = false,
    Widget? suffixIcon,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscure,
      style: const TextStyle(color: AppColors.white, fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
        prefixIcon: Icon(icon, color: Colors.grey[500], size: 20),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: const Color(0xFF1A1A1A),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey[800]!),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey[800]!),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Colors.red),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
          'Login',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header Text ──
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Welcome Back',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.white,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Sign in to continue driving.',
                      style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                    ),
                  ],
                ),
              ),

              // ── Car Image ──
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Image.asset(
                    'assets/images/screen-4-car.png',
                    height: 140,
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) => const SizedBox(height: 140),
                  ),
                ),
              ),

              // ── Input Fields ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    _buildInputField(
                      controller: _emailController,
                      hint: 'Email Address',
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 14),
                    _buildInputField(
                      controller: _passwordController,
                      hint: 'Password',
                      icon: Icons.lock_outline,
                      obscure: _obscurePassword,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_off
                              : Icons.visibility,
                          color: Colors.grey[600],
                          size: 20,
                        ),
                        onPressed: () => setState(
                          () => _obscurePassword = !_obscurePassword,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  const ForgotPasswordScreen(),
                            ),
                          );
                        },
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: const Size(0, 0),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'Forgot Password?',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ── Login Button ──
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.white,
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.black,
                                ),
                              )
                            : const Text(
                                'Login',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),

                    if (_canUseBiometric) ...[
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: OutlinedButton.icon(
                          onPressed: _attemptBiometricLogin,
                          icon: const Icon(
                            Icons.fingerprint,
                            color: AppColors.primary,
                          ),
                          label: const Text(
                            'Login with Biometrics',
                            style: TextStyle(color: AppColors.primary),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(
                                14,
                              ), // Match border radius
                            ),
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // ── Or Divider ──
                    Row(
                      children: [
                        Expanded(
                          child: Divider(
                            color: Colors.grey[800],
                            thickness: 1,
                          ), // Darker grey
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            'Or',
                            style: TextStyle(
                              color: Colors.grey[500],
                              fontSize: 14,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Divider(color: Colors.grey[800], thickness: 1),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // ── Google Sign-In ──
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: OutlinedButton.icon(
                        onPressed: _isGoogleLoading
                            ? null
                            : _handleGoogleSignIn,
                        icon: _isGoogleLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(
                                Icons.g_mobiledata,
                                size: 28,
                                color: Colors.white,
                              ),
                        label: Text(
                          _isGoogleLoading
                              ? 'Signing in...'
                              : 'Sign in with Google',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: Colors.grey[700]!),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ),

                    if (_appleSignInAvailable) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: OutlinedButton.icon(
                          onPressed: _isAppleLoading
                              ? null
                              : _handleAppleSignIn,
                          icon: _isAppleLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Icon(
                                  Icons.apple,
                                  size: 28,
                                  color: Colors.grey[200],
                                ),
                          label: Text(
                            _isAppleLoading
                                ? 'Signing in...'
                                : 'Sign in with Apple',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: Colors.grey[700]!),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 32), // Bottom padding
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
