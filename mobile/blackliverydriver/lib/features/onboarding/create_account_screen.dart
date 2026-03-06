import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/region_provider.dart';
import 'email_verification_screen.dart';
import '../../features/auth/screens/login_screen.dart';

class CreateAccountScreen extends ConsumerStatefulWidget {
  final String? prefilledName;
  final String? prefilledEmail;
  final String? prefilledPhone;
  final String? prefilledRegion;

  const CreateAccountScreen({
    super.key,
    this.prefilledName,
    this.prefilledEmail,
    this.prefilledPhone,
    this.prefilledRegion,
  });

  @override
  ConsumerState<CreateAccountScreen> createState() => _CreateAccountScreenState();
}

class _CreateAccountScreenState extends ConsumerState<CreateAccountScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  String _selectedRegion = 'NG';
  bool _obscurePassword = true;

  String get _countryCode => _selectedRegion == 'NG' ? '+234' : '+1';

  @override
  void initState() {
    super.initState();
    if (widget.prefilledName != null) {
      _fullNameController.text = widget.prefilledName!;
    }
    if (widget.prefilledEmail != null) {
      _emailController.text = widget.prefilledEmail!;
    }
    if (widget.prefilledRegion != null) {
      _selectedRegion = widget.prefilledRegion!;
    }
    if (widget.prefilledPhone != null) {
      final phone = widget.prefilledPhone!;
      if (phone.startsWith('+234')) {
        _phoneController.text = phone.substring(4);
      } else if (phone.startsWith('+1')) {
        _phoneController.text = phone.substring(2);
      } else {
        _phoneController.text = phone;
      }
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleRegistration() async {
    if (!_formKey.currentState!.validate()) return;

    final nameParts = _fullNameController.text.trim().split(' ');
    final firstName = nameParts.first;
    final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

    try {
      // 1. Start registration (sends OTP)
      await ref.read(authRiverpodProvider).register(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        firstName: firstName,
        lastName: lastName,
        phone: '$_countryCode${_phoneController.text.trim()}',
        region: _selectedRegion,
      );

      if (mounted) {
        final regionProvider = ref.read(regionRiverpodProvider);
        regionProvider.setRegion(
          _selectedRegion == 'NG' ? RegionCode.ng : RegionCode.usChi,
        );
      }

      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => EmailVerificationScreen(
              email: _emailController.text.trim(),
              password: _passwordController.text,
              firstName: firstName,
              lastName: lastName,
              phoneNumber: '$_countryCode${_phoneController.text.trim()}',
              region: _selectedRegion,
            ),
          ),
        );
      }
    } on DioException catch (e) {
      if (!mounted) return;

      final statusCode = e.response?.statusCode;
      final data = e.response?.data;
      final serverMessage = data is Map<String, dynamic>
          ? data['error']?.toString() ?? data['message']?.toString()
          : null;

      if (statusCode == 409) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Email already registered. Please login.'),
            action: SnackBarAction(
              label: 'Login',
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              },
            ),
          ),
        );
        return;
      }

      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Network error. Check connection.',
            ),
          ),
        );
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            serverMessage == null || serverMessage.isEmpty
                ? 'Registration failed. Please try again.'
                : serverMessage,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Registration failed: ${e.toString()}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authRiverpodProvider);
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
          'Create Account',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
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
                        'Enter your details',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.white,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Complete your profile to start driving with confidence.',
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
                      width: 320,
                      height: 140,
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) => const SizedBox(height: 140),
                    ),
                  ),
                ),

                // ── Region Selector ──
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    children: [
                      _buildRegionChip('NG', '\ud83c\uddf3\ud83c\uddec', 'Nigeria'),
                      const SizedBox(width: 12),
                      _buildRegionChip('US', '\ud83c\uddfa\ud83c\uddf8', 'Chicago, US'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ── Input Fields ──
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: [
                      _buildInputField(
                        controller: _fullNameController,
                        hint: 'Full Name',
                        icon: Icons.person_outline,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Name is required';
                          }
                          if (v.trim().length < 2) return 'Name too short';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      _buildInputField(
                        controller: _emailController,
                        hint: 'Email Address',
                        icon: Icons.email_outlined,
                        keyboardType: TextInputType.emailAddress,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Email is required';
                          }
                          if (!RegExp(
                            r'^[^@]+@[^@]+\.[^@]+$',
                          ).hasMatch(v.trim())) {
                            return 'Invalid email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      _buildInputField(
                        controller: _phoneController,
                        hint: _selectedRegion == 'NG' ? '801 234 5678' : '415 555 1234',
                        icon: Icons.phone_outlined,
                        keyboardType: TextInputType.phone,
                        prefix: _countryCode,
                        formatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(
                            _selectedRegion == 'NG' ? 11 : 10,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      _buildInputField(
                        controller: _passwordController,
                        hint: 'Password',
                        icon: Icons.lock_outline,
                        onChanged: (_) => setState(() {}),
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
                        validator: (v) {
                          if (v == null || v.isEmpty) {
                            return 'Password is required';
                          }
                          if (v.length < 8) return 'At least 8 characters';
                          return null;
                        },
                      ),
                      if (_passwordController.text.isNotEmpty &&
                          _passwordController.text.length < 8)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'Use at least 8 characters for your password.',
                              style: TextStyle(
                                color: Colors.orange[300],
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // ── Step Dots ──
                _buildStepDots(0),

                const SizedBox(height: 20),

                // ── Save & Continue Button ──
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: auth.isLoading
                          ? null
                          : _handleRegistration,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.white,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                      child: auth.isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.black,
                              ),
                            )
                          : const Text(
                              'Save & Continue',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
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
          final regionProvider = ref.read(regionRiverpodProvider);
          regionProvider.setRegion(
            code == 'NG' ? RegionCode.ng : RegionCode.usChi,
          );
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.15)
                : const Color(0xFF1A1A1A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected
                  ? AppColors.primary.withValues(alpha: 0.6)
                  : Colors.grey[800]!,
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
                style: TextStyle(
                  color: isSelected ? AppColors.primary : Colors.grey[500],
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

  Widget _buildInputField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    List<TextInputFormatter>? formatters,
    bool obscure = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
    ValueChanged<String>? onChanged,
    String? prefix,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscure,
      inputFormatters: formatters,
      validator: validator,
      onChanged: onChanged,
      style: const TextStyle(color: AppColors.white, fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
        prefixIcon: prefix != null
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(width: 14),
                  Icon(icon, color: Colors.grey[500], size: 20),
                  const SizedBox(width: 8),
                  Text(
                    prefix,
                    style: const TextStyle(color: AppColors.white, fontSize: 15),
                  ),
                  const SizedBox(width: 4),
                ],
              )
            : Icon(icon, color: Colors.grey[500], size: 20),
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

  static Widget _buildStepDots(int activeIndex) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(4, (i) {
        final isActive = i == activeIndex;
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: isActive ? 24 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: isActive ? AppColors.white : Colors.grey[700],
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}
