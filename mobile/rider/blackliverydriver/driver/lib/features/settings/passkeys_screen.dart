import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/services/biometric_service.dart';
import '../../core/providers/riverpod_providers.dart';

class PasskeysScreen extends ConsumerWidget {
  const PasskeysScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Set Passkeys',
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            const Text(
              'Easily login with your Fingerprint, Face ID or Device Pin',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Passkeys are the recommended method as unlocking your phone',
              style: TextStyle(fontSize: 14, color: Colors.grey[400]),
            ),
            const SizedBox(height: 48),
            _buildFeatureItem(Icons.fingerprint, 'Sign in using biometrics'),
            const SizedBox(height: 24),
            _buildFeatureItem(Icons.sync, 'Sync across your devices'),
            const SizedBox(height: 24),
            _buildFeatureItem(Icons.flash_on, 'Instant and secure'),

            const Spacer(),
            CustomButton(
              text: 'Set up using Device Biometrics', // Clearer text
              onPressed: () => _handleSetup(context, ref),
              backgroundColor: AppColors.white,
              textColor: Colors.black,
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Future<void> _handleSetup(BuildContext context, WidgetRef ref) async {
    final biometricService = BiometricService();
    final available = await biometricService.isAvailable;

    if (!context.mounted) return;

    if (!available) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Biometrics not available on this device'),
        ),
      );
      return;
    }

    // 1. Prompt for Password to verify identity & get credentials to save
    final password = await showDialog<String>(
      context: context,
      builder: (context) => _PasswordPromptDialog(),
    );

    if (password == null || !context.mounted) return;

    // 2. Authenticate with Biometrics to confirm ownership
    final authenticated = await biometricService.authenticate(
      reason: 'Authenticate to enable biometric login',
    );

    if (authenticated && context.mounted) {
      // 3. Save credentials (which also enables the flag)
      final user = ref.read(authRiverpodProvider).user;
      final email = user?.email;
      if (email != null) {
        await biometricService.saveCredentials(email, password);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Passkey enabled! You can now login with biometrics.',
              ),
            ),
          );
          Navigator.pop(context);
        }
      }
    }
  }

  Widget _buildFeatureItem(IconData icon, String text) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFF1E1E1E),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
        const SizedBox(width: 16),
        Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _PasswordPromptDialog extends ConsumerStatefulWidget {
  @override
  ConsumerState<_PasswordPromptDialog> createState() => _PasswordPromptDialogState();
}

class _PasswordPromptDialogState extends ConsumerState<_PasswordPromptDialog> {
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF1E1E1E),
      title: const Text(
        'Verify Password',
        style: TextStyle(color: Colors.white),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Please enter your password to enable biometric login.',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _passwordController,
            obscureText: true,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Password',
              hintStyle: TextStyle(color: Colors.grey[600]),
              errorText: _error,
              filled: true,
              fillColor: AppColors.background,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
        ),
        TextButton(
          onPressed: _isLoading ? null : _verify,
          child: _isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text(
                  'Verify',
                  style: TextStyle(color: AppColors.primary),
                ),
        ),
      ],
    );
  }

  Future<void> _verify() async {
    final password = _passwordController.text;
    if (password.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final isValid = await ref
          .read(authRiverpodProvider)
          .verifyPassword(password);
      if (mounted) {
        if (isValid) {
          Navigator.pop(context, password);
        } else {
          setState(() {
            _error = 'Incorrect password';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Verification failed';
          _isLoading = false;
        });
      }
    }
  }
}
