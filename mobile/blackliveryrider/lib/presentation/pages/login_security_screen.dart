import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/biometric_service.dart';
import 'change_password_screen.dart';
import 'active_sessions_screen.dart';
import 'login_history_screen.dart';

class LoginSecurityScreen extends StatefulWidget {
  const LoginSecurityScreen({super.key});

  @override
  State<LoginSecurityScreen> createState() => _LoginSecurityScreenState();
}

class _LoginSecurityScreenState extends State<LoginSecurityScreen> {
  bool _biometricEnabled = false;
  bool _twoFactorEnabled = false;
  bool _isLoading = true;
  final AuthService _authService = AuthService();
  final BiometricService _biometricService =
      BiometricService(); // Assuming this service exists and is singleton or instantiable

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final user = await _authService.getProfile();
      final bioEnabled = await _biometricService.isBiometricEnabled();
      if (mounted) {
        setState(() {
          _twoFactorEnabled = user.twoFactorEnabled;
          _biometricEnabled = bioEnabled;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading settings: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleBiometrics(bool value) async {
    try {
      if (value) {
        final success = await _biometricService.authenticate();
        if (!success) return;
      }
      await _biometricService.setBiometricEnabled(value);
      setState(() => _biometricEnabled = value);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to toggle biometrics: $e')),
        );
      }
    }
  }

  Future<void> _toggle2fa(bool value) async {
    try {
      // If enabling, might need to verify phone first? Assuming phone is verified.
      // If disabling, might need OTP?
      final success = await _authService.toggle2fa(value);
      if (success) {
        setState(() => _twoFactorEnabled = value);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to toogle 2FA: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
        title: const Text('Login & Security'), // Simplified for brewity in diff
        // ... (keep existing app bar style)
        backgroundColor: AppColors.bgPri,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.inputBg,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.inputBorder),
            ),
            child: const Icon(Icons.chevron_left, color: Colors.white),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Password section
                  Text(
                    'Password',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildMenuItem(
                    icon: Icons.lock_outline,
                    title: 'Change Password',
                    subtitle: 'Update your password',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ChangePasswordScreen(),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 24),

                  // Security options
                  Text(
                    'Security',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 12),

                  _buildToggleItem(
                    icon: Icons.fingerprint,
                    title: 'Biometric Login',
                    subtitle: 'Use fingerprint or Face ID to login',
                    value: _biometricEnabled,
                    onChanged: _toggleBiometrics,
                  ),

                  const SizedBox(height: 12),

                  _buildToggleItem(
                    icon: Icons.security,
                    title: 'Two-Factor Authentication',
                    subtitle: 'Add an extra layer of security',
                    value: _twoFactorEnabled,
                    onChanged: _toggle2fa,
                  ),

                  const SizedBox(height: 24),

                  // Login activity
                  Text(
                    'Login Activity',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 12),

                  _buildMenuItem(
                    icon: Icons.devices,
                    title: 'Active Sessions',
                    subtitle: 'Manage devices logged in',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ActiveSessionsScreen(),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 12),

                  _buildMenuItem(
                    icon: Icons.history,
                    title: 'Login History',
                    subtitle: 'View recent login activity',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const LoginHistoryScreen(),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 32),

                  // Danger zone
                  Text(
                    'Danger Zone',
                    style: AppTextStyles.body.copyWith(
                      color: Colors.red.withOpacity(0.7),
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 12),

                  GestureDetector(
                    onTap: _showDeleteAccountDialog,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.delete_forever,
                            color: Colors.red,
                            size: 22,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Delete Account',
                                  style: AppTextStyles.body.copyWith(
                                    color: Colors.red,
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  'Permanently delete your account and data',
                                  style: AppTextStyles.caption.copyWith(
                                    color: Colors.red.withOpacity(0.7),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.txtInactive, size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: AppColors.txtInactive, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildToggleItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.txtInactive, size: 22),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.body.copyWith(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
                Text(
                  subtitle,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.txtInactive,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.yellow90,
            activeTrackColor: AppColors.yellow90.withOpacity(0.3),
            inactiveThumbColor: AppColors.txtInactive,
            inactiveTrackColor: AppColors.inputBorder,
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog() {
    final passwordController = TextEditingController();
    bool isDeleting = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppColors.bgSec,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Text(
            'Delete Account?',
            style: AppTextStyles.heading3.copyWith(color: Colors.red),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'This action cannot be undone. All your data will be permanently deleted.',
                style: AppTextStyles.body.copyWith(
                  color: AppColors.txtInactive,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Enter your password to confirm:',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.txtInactive,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: passwordController,
                obscureText: true,
                style: AppTextStyles.body.copyWith(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Password',
                  hintStyle: AppTextStyles.body.copyWith(
                    color: AppColors.txtInactive,
                  ),
                  filled: true,
                  fillColor: AppColors.inputBg,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: AppColors.inputBorder),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: AppColors.inputBorder),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isDeleting ? null : () => Navigator.pop(dialogContext),
              child: Text('Cancel', style: AppTextStyles.body),
            ),
            TextButton(
              onPressed: isDeleting
                  ? null
                  : () async {
                      if (passwordController.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please enter your password'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      setDialogState(() => isDeleting = true);

                      try {
                        await _authService.deleteAccount(
                          passwordController.text,
                        );
                        if (mounted) {
                          Navigator.pop(dialogContext);
                          // Navigate to login screen and clear stack
                          Navigator.of(
                            context,
                          ).pushNamedAndRemoveUntil('/login', (route) => false);
                        }
                      } catch (e) {
                        setDialogState(() => isDeleting = false);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Failed to delete account: ${e.toString()}',
                              ),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      }
                    },
              child: isDeleting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.red,
                      ),
                    )
                  : Text(
                      'Delete',
                      style: AppTextStyles.body.copyWith(color: Colors.red),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
