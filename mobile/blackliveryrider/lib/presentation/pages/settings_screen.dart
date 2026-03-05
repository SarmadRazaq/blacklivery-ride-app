import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/theme_provider.dart';
import '../../core/network/api_client.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/biometric_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_color_theme.dart';
import '../../core/theme/app_text_styles.dart';
import 'emergency_contacts_screen.dart';
import 'login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final BiometricService _biometricService = BiometricService();
  final AuthService _authService = AuthService();
  bool _pushNotifications = true;
  bool _emailNotifications = true;
  bool _smsNotifications = false;
  bool _unlockWithFaceId = false;
  bool _biometricAvailable = false;
  String _selectedLanguage = 'English';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();

    // Load biometric state from BiometricService (single source of truth)
    final biometricAvailable = await _biometricService.canAuthenticate();
    final biometricEnabled = await _biometricService.isBiometricEnabled();

    setState(() {
      _pushNotifications = prefs.getBool('pushNotifications') ?? true;
      _emailNotifications = prefs.getBool('emailNotifications') ?? true;
      _smsNotifications = prefs.getBool('smsNotifications') ?? false;
      _biometricAvailable = biometricAvailable;
      _unlockWithFaceId = biometricEnabled;
      _selectedLanguage = prefs.getString('language') ?? 'English';
    });

    // Then try to sync from backend
    try {
      final api = ApiClient();
      final response = await api.dio.get('/api/v1/auth/notification-preferences');
      final data = response.data['data'] as Map<String, dynamic>?;
      if (data != null && mounted) {
        setState(() {
          _pushNotifications = data['push'] as bool? ?? _pushNotifications;
          _emailNotifications = data['email'] as bool? ?? _emailNotifications;
          _smsNotifications = data['sms'] as bool? ?? _smsNotifications;
        });
        // Cache backend values locally
        await prefs.setBool('pushNotifications', _pushNotifications);
        await prefs.setBool('emailNotifications', _emailNotifications);
        await prefs.setBool('smsNotifications', _smsNotifications);
      }
    } catch (e) {
      debugPrint('Failed to load notification preferences from backend: $e');
      // Fall back to local SharedPreferences values (already loaded)
    }
  }

  Future<void> _saveSetting(String key, dynamic value) async {
    final prefs = await SharedPreferences.getInstance();
    if (value is bool) {
      await prefs.setBool(key, value);
    } else if (value is String) {
      await prefs.setString(key, value);
    }

    // Sync notification preferences to backend
    if (key == 'pushNotifications' || key == 'emailNotifications' || key == 'smsNotifications') {
      _syncNotificationPreferences();
    }
  }

  Future<void> _syncNotificationPreferences() async {
    try {
      final api = ApiClient();
      await api.dio.patch('/api/v1/auth/notification-preferences', data: {
        'push': _pushNotifications,
        'email': _emailNotifications,
        'sms': _smsNotifications,
      });
    } catch (e) {
      debugPrint('Failed to sync notification preferences to backend: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final ct = AppColorTheme.of(context);
    return Scaffold(
      backgroundColor: ct.bgPri,
      appBar: AppBar(
        backgroundColor: ct.bgPri,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: ct.inputBg,
              shape: BoxShape.circle,
              border: Border.all(color: ct.inputBorder),
            ),
            child: Icon(Icons.chevron_left, color: ct.txtPri),
          ),
        ),
        title: Text(
          'Settings',
          style: AppTextStyles.heading3Of(context).copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Security section - Face ID and Emergency Contacts
            if (_biometricAvailable)
              _buildToggleItem(
                icon: Icons.face,
                title: 'Unlock with Face ID',
                value: _unlockWithFaceId,
                onChanged: _toggleBiometric,
              ),

            const SizedBox(height: 12),

            _buildMenuItem(
              icon: Icons.contact_emergency_outlined,
              title: 'Emergency Contacts',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const EmergencyContactsScreen(),
                  ),
                );
              },
            ),

            const SizedBox(height: 24),

            // Notifications section
            Text(
              'Notifications',
              style: AppTextStyles.captionOf(context).copyWith(fontSize: 12),
            ),
            const SizedBox(height: 12),

            _buildToggleItem(
              icon: Icons.notifications_outlined,
              title: 'Push Notifications',
              value: _pushNotifications,
              onChanged: (value) {
                setState(() => _pushNotifications = value);
                _saveSetting('pushNotifications', value);
              },
            ),

            const SizedBox(height: 12),

            _buildToggleItem(
              icon: Icons.email_outlined,
              title: 'Email Notifications',
              value: _emailNotifications,
              onChanged: (value) {
                setState(() => _emailNotifications = value);
                _saveSetting('emailNotifications', value);
              },
            ),

            const SizedBox(height: 12),

            _buildToggleItem(
              icon: Icons.sms_outlined,
              title: 'SMS Notifications',
              value: _smsNotifications,
              onChanged: (value) {
                setState(() => _smsNotifications = value);
                _saveSetting('smsNotifications', value);
              },
            ),

            const SizedBox(height: 24),

            // Appearance section
            Text(
              'Appearance',
              style: AppTextStyles.captionOf(context).copyWith(fontSize: 12),
            ),
            const SizedBox(height: 12),

            Consumer<ThemeProvider>(
              builder: (context, themeProvider, child) {
                return _buildToggleItem(
                  icon: Icons.dark_mode_outlined,
                  title: 'Dark Mode',
                  value: themeProvider.isDarkMode,
                  onChanged: (value) {
                    themeProvider.toggleTheme(value);
                  },
                );
              },
            ),

            const SizedBox(height: 24),

            // Language section
            Text(
              'Language',
              style: AppTextStyles.captionOf(context).copyWith(fontSize: 12),
            ),
            const SizedBox(height: 12),

            _buildLanguageSelector(),

            const SizedBox(height: 24),

            // Data & Privacy section
            Text(
              'Data & Privacy',
              style: AppTextStyles.captionOf(context).copyWith(fontSize: 12),
            ),
            const SizedBox(height: 12),

            _buildMenuItem(
              icon: Icons.download_outlined,
              title: 'Download My Data',
              onTap: _requestDataExport,
            ),

            const SizedBox(height: 12),

            _buildMenuItem(
              icon: Icons.delete_sweep_outlined,
              title: 'Clear Cache',
              onTap: () {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(const SnackBar(content: Text('Cache cleared')));
              },
            ),

            const SizedBox(height: 24),

            // Danger zone
            Text(
              'Account',
              style: AppTextStyles.captionOf(context).copyWith(fontSize: 12),
            ),
            const SizedBox(height: 12),

            _buildDangerMenuItem(
              icon: Icons.delete_forever_outlined,
              title: 'Delete Account',
              onTap: _showDeleteAccountDialog,
            ),
          ],
        ),
      ),
    );
  }

  /// Toggle biometric unlock using BiometricService (single source of truth).
  Future<void> _toggleBiometric(bool value) async {
    try {
      if (value) {
        // Prompt biometric auth before enabling
        final success = await _biometricService.authenticate(
          reason: 'Verify your identity to enable biometric unlock',
        );
        if (!success) return;
      }
      await _biometricService.setBiometricEnabled(value);
      if (mounted) {
        setState(() => _unlockWithFaceId = value);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to toggle biometrics: $e')),
        );
      }
    }
  }

  /// Request data export from the backend.
  Future<void> _requestDataExport() async {
    try {
      final api = ApiClient();
      await api.dio.post('/api/v1/auth/data-export');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Data export requested. You\'ll receive an email when ready.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to request data export: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Show delete account confirmation dialog with password entry.
  void _showDeleteAccountDialog() {
    final ct = AppColorTheme.of(context);
    final passwordController = TextEditingController();
    final parentContext = context;

    showDialog(
      context: context,
      builder: (dialogContext) {
        bool isDeleting = false;
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              backgroundColor: ct.bgSec,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: Text(
                'Delete Account?',
                style: AppTextStyles.heading3Of(context).copyWith(
                  color: Colors.red,
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'This action cannot be undone. All your data will be permanently deleted.',
                    style: AppTextStyles.bodyOf(context).copyWith(
                      color: ct.txtInactive,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Enter your password to confirm:',
                    style: AppTextStyles.captionOf(context).copyWith(
                      color: ct.txtInactive,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    style: AppTextStyles.bodyOf(context),
                    decoration: InputDecoration(
                      hintText: 'Password',
                      hintStyle: AppTextStyles.bodyOf(context).copyWith(
                        color: ct.txtInactive,
                      ),
                      filled: true,
                      fillColor: ct.inputBg,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isDeleting
                      ? null
                      : () => Navigator.pop(dialogContext),
                  child: Text('Cancel',
                      style: AppTextStyles.bodyOf(context)),
                ),
                TextButton(
                  onPressed: isDeleting
                      ? null
                      : () async {
                          if (passwordController.text.isEmpty) {
                            ScaffoldMessenger.of(parentContext).showSnackBar(
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
                              try {
                                await Provider.of<AuthProvider>(
                                  parentContext,
                                  listen: false,
                                ).logout();
                              } catch (_) {}
                              if (mounted) {
                                Navigator.pushAndRemoveUntil(
                                  parentContext,
                                  MaterialPageRoute(
                                    builder: (_) => const LoginScreen(),
                                  ),
                                  (route) => false,
                                );
                              }
                            }
                          } catch (e) {
                            setDialogState(() => isDeleting = false);
                            if (mounted) {
                              ScaffoldMessenger.of(parentContext).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    'Failed to delete account: $e',
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
                          style: AppTextStyles.bodyOf(context).copyWith(
                            color: Colors.red,
                          ),
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildDangerMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    final ct = AppColorTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: ct.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.red.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.red, size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: AppTextStyles.bodyOf(context).copyWith(
                  fontSize: 14,
                  color: Colors.red,
                ),
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.red.withOpacity(0.5), size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildToggleItem({
    required IconData icon,
    required String title,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final ct = AppColorTheme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ct.inputBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: ct.inputBorder),
      ),
      child: Row(
        children: [
          Icon(icon, color: ct.txtInactive, size: 22),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              title,
              style: AppTextStyles.bodyOf(context).copyWith(fontSize: 14),
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.yellow90,
            activeTrackColor: AppColors.yellow90.withOpacity(0.3),
            inactiveThumbColor: ct.txtInactive,
            inactiveTrackColor: ct.inputBorder,
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageSelector() {
    final ct = AppColorTheme.of(context);
    return GestureDetector(
      onTap: _showLanguageSheet,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: ct.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: ct.inputBorder),
        ),
        child: Row(
          children: [
            Icon(Icons.language, color: ct.txtInactive, size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                'Language',
                style: AppTextStyles.bodyOf(context).copyWith(fontSize: 14),
              ),
            ),
            Text(
              _selectedLanguage,
              style: AppTextStyles.bodySmallOf(context).copyWith(fontSize: 14),
            ),
            const SizedBox(width: 8),
            Icon(Icons.chevron_right, color: ct.txtInactive, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    final ct = AppColorTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: ct.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: ct.inputBorder),
        ),
        child: Row(
          children: [
            Icon(icon, color: ct.txtInactive, size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: AppTextStyles.bodyOf(context).copyWith(fontSize: 14),
              ),
            ),
            Icon(Icons.chevron_right, color: ct.txtInactive, size: 20),
          ],
        ),
      ),
    );
  }

  void _showLanguageSheet() {
    final ct = AppColorTheme.of(context);
    final languages = ['English', 'Spanish', 'French', 'German', 'Chinese'];

    showModalBottomSheet(
      context: context,
      backgroundColor: ct.bgSec,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        final sheetCt = AppColorTheme.of(context);
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: sheetCt.inputBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              Text('Select Language', style: AppTextStyles.heading3Of(context)),
              const SizedBox(height: 24),
              ...languages.map(
                (lang) => ListTile(
                  title: Text(
                    lang,
                    style: AppTextStyles.bodyOf(context).copyWith(
                      color: _selectedLanguage == lang
                          ? AppColors.yellow90
                          : sheetCt.txtPri,
                    ),
                  ),
                  trailing: _selectedLanguage == lang
                      ? Icon(Icons.check, color: AppColors.yellow90)
                      : null,
                  onTap: () {
                    setState(() {
                      _selectedLanguage = lang;
                    });
                    _saveSetting('language', lang);
                    Navigator.pop(context);
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
