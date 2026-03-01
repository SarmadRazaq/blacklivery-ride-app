import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';

import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/documents_screen.dart';
import '../home/support_screen.dart';
import 'personal_info_screen.dart';
import 'login_security_screen.dart';
import 'earnings_models_screen.dart';
import 'emergency_contacts_screen.dart';
import 'policies_screen.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  void _handleLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text('Log Out', style: TextStyle(color: Colors.white)),
        content: Text(
          'Are you sure you want to log out?',
          style: TextStyle(color: Colors.grey[400]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Log Out', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authRiverpodProvider).logout();
      if (context.mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text(
          'Settings',
          style: TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Group 1
            _buildGroup([
              _buildTile(
                context,
                'Personal info',
                Icons.person,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const PersonalInfoScreen()),
                ),
              ),
              _buildTile(
                context,
                'Change Password',
                Icons.lock,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const LoginSecurityScreen(),
                  ),
                ),
              ),
            ]),
            const SizedBox(height: 24),
            // Group 2
            _buildGroup([
              _buildTile(
                context,
                'Earnings Model',
                Icons.pie_chart, // Or Icons.analytics
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const EarningsModelsScreen(),
                  ),
                ),
              ),
              _buildTile(
                context,
                'Emergency Contacts',
                Icons.favorite,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const EmergencyContactsScreen(),
                  ),
                ),
              ),
              _buildTile(
                context,
                'Document Verification',
                Icons.verified_user_outlined,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const DocumentsScreen(),
                  ),
                ),
              ),
              _buildTile(
                context,
                'Help & Support',
                Icons.help_outline,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SupportScreen()),
                ),
              ),
              _buildTile(
                context,
                'Policies',
                Icons.account_balance,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const PoliciesScreen()),
                ),
              ),
              _buildLogOutTile(context, ref),
            ]),
            const SizedBox(height: 40),
            const Center(
              child: Text(
                'Version 1.0.0',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildGroup(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(24),
      ),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(children: children),
    );
  }

  Widget _buildTile(
    BuildContext context,
    String title,
    IconData icon,
    VoidCallback onTap,
  ) {
    return ListTile(
      leading: Icon(icon, color: Colors.grey[400], size: 22),
      title: Text(
        title,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      trailing: Icon(Icons.chevron_right, color: Colors.grey[600], size: 24),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
    );
  }

  Widget _buildLogOutTile(BuildContext context, WidgetRef ref) {
    return ListTile(
      leading: const Icon(Icons.logout, color: Colors.red, size: 22),
      title: const Text(
        'Log Out',
        style: TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      trailing: Icon(Icons.chevron_right, color: Colors.grey[600], size: 24),
      onTap: () => _handleLogout(context, ref),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
    );
  }
}
