import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class PoliciesScreen extends StatelessWidget {
  const PoliciesScreen({super.key});

  Future<void> _openUrl(BuildContext context, String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open link')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Policies'),
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Review our legal and platform policies',
            style: TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: 16),
          ListTile(
            tileColor: const Color(0xFF1E1E1E),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            leading: const Icon(Icons.privacy_tip_outlined, color: Colors.white),
            title: const Text(
              'Privacy Policy',
              style: TextStyle(color: Colors.white),
            ),
            trailing: const Icon(Icons.open_in_new, color: Colors.grey),
            onTap: () => _openUrl(context, 'https://blacklivery.com/privacy'),
          ),
          const SizedBox(height: 12),
          ListTile(
            tileColor: const Color(0xFF1E1E1E),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            leading: const Icon(Icons.article_outlined, color: Colors.white),
            title: const Text(
              'Terms of Service',
              style: TextStyle(color: Colors.white),
            ),
            trailing: const Icon(Icons.open_in_new, color: Colors.grey),
            onTap: () => _openUrl(context, 'https://blacklivery.com/terms'),
          ),
          const SizedBox(height: 12),
          ListTile(
            tileColor: const Color(0xFF1E1E1E),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            leading: const Icon(Icons.people_outline, color: Colors.white),
            title: const Text(
              'Community Guidelines',
              style: TextStyle(color: Colors.white),
            ),
            trailing: const Icon(Icons.open_in_new, color: Colors.grey),
            onTap: () => _openUrl(context, 'https://blacklivery.com/community'),
          ),
        ],
      ),
    );
  }
}
