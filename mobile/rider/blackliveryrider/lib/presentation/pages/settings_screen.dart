import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/providers/theme_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_color_theme.dart';
import '../../core/theme/app_text_styles.dart';
import 'emergency_contacts_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _pushNotifications = true;
  bool _emailNotifications = true;
  bool _smsNotifications = false;
  bool _unlockWithFaceId = true;
  String _selectedLanguage = 'English';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _pushNotifications = prefs.getBool('pushNotifications') ?? true;
      _emailNotifications = prefs.getBool('emailNotifications') ?? true;
      _smsNotifications = prefs.getBool('smsNotifications') ?? false;
      _unlockWithFaceId = prefs.getBool('unlockWithFaceId') ?? true;
      _selectedLanguage = prefs.getString('language') ?? 'English';
    });
  }

  Future<void> _saveSetting(String key, dynamic value) async {
    final prefs = await SharedPreferences.getInstance();
    if (value is bool) {
      await prefs.setBool(key, value);
    } else if (value is String) {
      await prefs.setString(key, value);
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
            _buildToggleItem(
              icon: Icons.face,
              title: 'Unlock with Face ID',
              value: _unlockWithFaceId,
              onChanged: (value) {
                setState(() => _unlockWithFaceId = value);
                _saveSetting('unlockWithFaceId', value);
              },
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
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Data download request submitted'),
                  ),
                );
              },
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
