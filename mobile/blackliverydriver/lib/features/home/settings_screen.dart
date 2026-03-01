import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/region_provider.dart';
import '../auth/providers/auth_provider.dart';
import '../onboarding/splash_screen.dart';
import 'support_screen.dart';

import '../../core/services/biometric_service.dart';
import '../../core/services/auth_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  // Persisted notification preferences
  static const _keyRideRequests = 'pref_ride_request_notifications';
  static const _keyPromotions = 'pref_promotion_notifications';
  static const _keyEarnings = 'pref_earnings_notifications';

  bool _rideRequestNotifications = true;
  bool _promotionNotifications = true;
  bool _earningsNotifications = true;

  // Security settings
  bool _biometricEnabled = false;
  bool _twoFactorEnabled = false;
  final BiometricService _biometricService = BiometricService();
  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();
    _loadPreferences();
    _loadSecuritySettings();
  }

  Future<void> _loadSecuritySettings() async {
    try {
      final bioEnabled = await _biometricService.isBiometricEnabled();
      final userProfile = await _authService.getProfile();
      if (mounted) {
        setState(() {
          _biometricEnabled = bioEnabled;
          _twoFactorEnabled =
              userProfile['twoFactorEnabled'] ==
              true; // userProfile is Map<String, dynamic> here
        });
      }
    } catch (e) {
      debugPrint('Error loading security settings: $e');
    }
  }

  Future<void> _toggleBiometrics(bool value) async {
    try {
      if (value) {
        final success = await _biometricService.authenticate();
        if (!success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Authentication failed. Cannot enable biometrics.'),
            ),
          );
          return;
        }
      }
      await _biometricService.setBiometricEnabled(value);
      setState(() => _biometricEnabled = value);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to toggle biometrics: $e')),
      );
    }
  }

  Future<void> _toggle2fa(bool value) async {
    try {
      final success = await _authService.toggle2fa(value);
      if (success) {
        setState(() => _twoFactorEnabled = value);
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to toggle 2FA: $e')));
    }
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _rideRequestNotifications = prefs.getBool(_keyRideRequests) ?? true;
        _promotionNotifications = prefs.getBool(_keyPromotions) ?? true;
        _earningsNotifications = prefs.getBool(_keyEarnings) ?? true;
      });
    }
  }

  Future<void> _saveBool(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
  }

  Future<void> _showRegionPicker() async {
    final regionProvider = context.read<RegionProvider>();

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.cardBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select Region',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'This sets your pricing and wallet currency region.',
                style: TextStyle(color: Colors.grey[400], fontSize: 13),
              ),
              const SizedBox(height: 16),
              ...regionProvider.allRegions.map((region) {
                final isSelected = region.code == regionProvider.code;
                return ListTile(
                  leading: Icon(
                    Icons.public,
                    color: isSelected ? AppColors.primary : Colors.grey,
                  ),
                  title: Text(
                    region.label,
                    style: TextStyle(
                      color: isSelected ? AppColors.primary : AppColors.white,
                      fontWeight: isSelected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                  subtitle: Text(
                    '${region.currency} (${region.symbol})',
                    style: TextStyle(color: Colors.grey[400], fontSize: 12),
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle, color: AppColors.primary)
                      : null,
                  onTap: () async {
                    if (isSelected) {
                      Navigator.pop(context);
                      return;
                    }

                    try {
                      await context.read<AuthProvider>().updateProfile(
                        region: RegionProvider.toBackendCode(region.code),
                      );
                      await regionProvider.setRegion(region.code);
                      if (context.mounted) Navigator.pop(context);
                    } catch (e) {
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Failed to update region: $e')),
                      );
                    }
                  },
                );
              }),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Notifications Section
          _buildSectionHeader('Notifications'),
          _buildToggleTile(
            icon: Icons.notifications_active_outlined,
            title: 'Ride Requests',
            subtitle: 'Get notified for new ride requests',
            value: _rideRequestNotifications,
            onChanged: (val) {
              setState(() => _rideRequestNotifications = val);
              _saveBool(_keyRideRequests, val);
            },
          ),
          _buildToggleTile(
            icon: Icons.local_offer_outlined,
            title: 'Promotions',
            subtitle: 'Updates on bonuses &amp; incentives',
            value: _promotionNotifications,
            onChanged: (val) {
              setState(() => _promotionNotifications = val);
              _saveBool(_keyPromotions, val);
            },
          ),
          _buildToggleTile(
            icon: Icons.account_balance_wallet_outlined,
            title: 'Earnings Alerts',
            subtitle: 'Get notified when earnings update',
            value: _earningsNotifications,
            onChanged: (val) {
              setState(() => _earningsNotifications = val);
              _saveBool(_keyEarnings, val);
            },
          ),

          const SizedBox(height: 24),

          // General Section
          _buildSectionHeader('General'),
          _buildNavTile(
            icon: Icons.help_outline,
            title: 'Help & Support',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SupportScreen()),
            ),
          ),
          _buildNavTile(
            icon: Icons.public,
            title: 'Region',
            subtitle: context.watch<RegionProvider>().current.label,
            onTap: _showRegionPicker,
          ),
          _buildNavTile(
            icon: Icons.privacy_tip_outlined,
            title: 'Privacy Policy',
            onTap: () => _launchUrl('https://blacklivery.com/privacy'),
          ),
          _buildNavTile(
            icon: Icons.article_outlined,
            title: 'Terms of Service',
            onTap: () => _launchUrl('https://blacklivery.com/terms'),
          ),
          _buildNavTile(
            icon: Icons.info_outline,
            title: 'About',
            onTap: () async {
              final info = await PackageInfo.fromPlatform();
              if (!context.mounted) return;
              showAboutDialog(
                context: context,
                applicationName: 'BlackLivery Driver',
                applicationVersion: '${info.version} (${info.buildNumber})',
                applicationLegalese: '© 2025 BlackLivery Inc.',
              );
            },
          ),

          const SizedBox(height: 24),

          // Security Section
          _buildSectionHeader('Security'),
          _buildToggleTile(
            icon: Icons.fingerprint,
            title: 'Biometric Login',
            subtitle: 'Use fingerprint or Face ID to login',
            value: _biometricEnabled,
            onChanged: _toggleBiometrics,
          ),
          _buildToggleTile(
            icon: Icons.security,
            title: 'Two-Factor Authentication',
            subtitle: 'Add an extra layer of security',
            value: _twoFactorEnabled,
            onChanged: _toggle2fa,
          ),
          const SizedBox(height: 24),

          // Account Section
          _buildSectionHeader('Account'),
          _buildNavTile(
            icon: Icons.delete_outline,
            title: 'Delete Account',
            titleColor: Colors.red,
            onTap: _showDeleteAccountDialog,
          ),
          const SizedBox(height: 12),

          // Log Out
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: _logout,
                icon: const Icon(Icons.logout, color: Colors.red),
                label: const Text(
                  'Log Out',
                  style: TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red, width: 1),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 12),
      child: Text(
        title,
        style: TextStyle(
          color: Colors.grey[400],
          fontSize: 13,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildToggleTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(14),
      ),
      child: SwitchListTile(
        secondary: Icon(icon, color: AppColors.primary, size: 22),
        title: Text(
          title,
          style: const TextStyle(color: AppColors.white, fontSize: 15),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(color: Colors.grey[500], fontSize: 12),
        ),
        value: value,
        activeThumbColor: AppColors.primary,
        onChanged: onChanged,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  Widget _buildNavTile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    String? subtitle,
    Color? titleColor,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(14),
      ),
      child: ListTile(
        leading: Icon(icon, color: titleColor ?? AppColors.primary, size: 22),
        title: Text(
          title,
          style: TextStyle(color: titleColor ?? AppColors.white, fontSize: 15),
        ),
        subtitle: subtitle == null
            ? null
            : Text(
                subtitle,
                style: TextStyle(color: Colors.grey[500], fontSize: 12),
              ),
        trailing: Icon(Icons.chevron_right, color: Colors.grey[600], size: 20),
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardBackground,
        title: const Text(
          'Delete Account',
          style: TextStyle(color: AppColors.white),
        ),
        content: Text(
          'This action is permanent and cannot be undone. All your data including ride history, earnings, and documents will be deleted.\n\nPlease contact support to proceed with account deletion.',
          style: TextStyle(color: Colors.grey[400]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SupportScreen()),
              );
            },
            child: const Text(
              'Contact Support',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardBackground,
        title: const Text('Log Out', style: TextStyle(color: AppColors.white)),
        content: Text(
          'Are you sure you want to log out?',
          style: TextStyle(color: Colors.grey[400]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Log Out', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await context.read<AuthProvider>().logout();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const SplashScreen()),
          (route) => false,
        );
      }
    }
  }
}
