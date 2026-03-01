import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/biometric_service.dart';
import '../../core/providers/riverpod_providers.dart';
import 'change_password_screen.dart';
import 'passkeys_screen.dart';

class LoginSecurityScreen extends ConsumerStatefulWidget {
  const LoginSecurityScreen({super.key});

  @override
  ConsumerState<LoginSecurityScreen> createState() => _LoginSecurityScreenState();
}

class _LoginSecurityScreenState extends ConsumerState<LoginSecurityScreen> {
  final BiometricService _biometricService = BiometricService();
  bool _faceIdEnabled = false;

  @override
  void initState() {
    super.initState();
    _loadBiometricState();
  }

  Future<void> _loadBiometricState() async {
    final enabled = await _biometricService.isEnabled;
    if (mounted) {
      setState(() => _faceIdEnabled = enabled);
    }
  }

  Future<void> _toggleBiometric(bool value) async {
    if (value) {
      // Check if hardware supported
      final available = await _biometricService.isAvailable;
      if (!available) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Biometrics not available on this device'),
            ),
          );
        }
        return;
      }

      // confirm identity before enabling
      final authenticated = await _biometricService.authenticate(
        reason: 'Authenticate to enable biometric unlock',
      );
      if (!authenticated) return;
    }

    await _biometricService.setEnabled(value);
    if (mounted) {
      setState(() => _faceIdEnabled = value);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Login & Security',
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(24.0),
        children: [
          _buildSectionHeader('Login'),
          _buildSettingsTile(
            title: 'Change Password',
            icon: Icons.lock_outline,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ChangePasswordScreen()),
              );
            },
          ),
          _buildSettingsTile(
            title: 'Set up Passkeys',
            icon: Icons.fingerprint,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PasskeysScreen()),
              );
            },
          ),
          _buildSettingsTile(
            title: 'Link Google',
            icon: Icons.g_mobiledata,
            onTap: () async {
              // Trigger Google Link logic
              final authProvider = ref.read(authRiverpodProvider);
              try {
                await authProvider.linkGoogleAccount();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Google account linked successfully'),
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to link Google: $e')),
                  );
                }
              }
            },
          ),

          const SizedBox(height: 32),
          _buildSectionHeader('Security'),
          _buildSwitchTile(
            title: 'Unlock with Face ID',
            icon: Icons.face,
            value: _faceIdEnabled,
            onChanged: _toggleBiometric,
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16, top: 8),
      child: Text(
        title,
        style: TextStyle(
          color: Colors.grey[400],
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildSettingsTile({
    required String title,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(icon, color: Colors.white, size: 20),
        title: Text(
          title,
          style: const TextStyle(color: Colors.white, fontSize: 14),
        ),
        trailing: const Icon(
          Icons.arrow_forward_ios,
          color: Colors.grey,
          size: 16,
        ),
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(12),
      ),
      child: SwitchListTile(
        secondary: Icon(icon, color: Colors.white, size: 20),
        title: Text(
          title,
          style: const TextStyle(color: Colors.white, fontSize: 14),
        ),
        value: value,
        onChanged: onChanged,
        activeThumbColor: AppColors.primary,
        inactiveThumbColor: Colors.grey,
        inactiveTrackColor: Colors.grey[800],
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
