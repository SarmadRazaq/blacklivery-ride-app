import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
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
            child: const Icon(
              Icons.chevron_left,
              color: Colors.white,
            ),
          ),
        ),
        title: Text(
          'Legal',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildLegalItem(
              context,
              Icons.description_outlined,
              'Terms of Service',
              'Read our terms and conditions',
              () => _showLegalDocument(context, 'Terms of Service'),
            ),
            const SizedBox(height: 12),
            _buildLegalItem(
              context,
              Icons.privacy_tip_outlined,
              'Privacy Policy',
              'How we handle your data',
              () => _showLegalDocument(context, 'Privacy Policy'),
            ),
            const SizedBox(height: 12),
            _buildLegalItem(
              context,
              Icons.cookie_outlined,
              'Cookie Policy',
              'Information about cookies',
              () => _showLegalDocument(context, 'Cookie Policy'),
            ),
            const SizedBox(height: 12),
            _buildLegalItem(
              context,
              Icons.gavel_outlined,
              'Community Guidelines',
              'Rules for using our service',
              () => _showLegalDocument(context, 'Community Guidelines'),
            ),
            const SizedBox(height: 12),
            _buildLegalItem(
              context,
              Icons.accessibility_new_outlined,
              'Accessibility',
              'Our commitment to accessibility',
              () => _showLegalDocument(context, 'Accessibility'),
            ),
            const SizedBox(height: 12),
            _buildLegalItem(
              context,
              Icons.info_outline,
              'Open Source Licenses',
              'Third-party software licenses',
              () => _showLegalDocument(context, 'Open Source Licenses'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegalItem(
    BuildContext context,
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap,
  ) {
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
            Icon(
              icon,
              color: AppColors.txtInactive,
              size: 22,
            ),
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
            Icon(
              Icons.chevron_right,
              color: AppColors.txtInactive,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  void _showLegalDocument(BuildContext context, String title) {
    // Launch external URL for Terms and Privacy
    final urlMap = {
      'Terms of Service': 'https://blacklivery.com/terms',
      'Privacy Policy': 'https://blacklivery.com/privacy',
      'Cookie Policy': 'https://blacklivery.com/cookies',
    };
    final url = urlMap[title];
    if (url != null) {
      launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _LegalDocumentScreen(title: title),
      ),
    );
  }
}

class _LegalDocumentScreen extends StatelessWidget {
  final String title;

  const _LegalDocumentScreen({required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
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
            child: const Icon(
              Icons.chevron_left,
              color: Colors.white,
            ),
          ),
        ),
        title: Text(
          title,
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Last updated: January 1, 2026',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.txtInactive,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              '1. Introduction',
              style: AppTextStyles.heading3.copyWith(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              'Welcome to Black Livery. By using our services, you agree to these terms. Please read them carefully.',
              style: AppTextStyles.body.copyWith(
                color: AppColors.txtInactive,
                fontSize: 14,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              '2. Using Our Services',
              style: AppTextStyles.heading3.copyWith(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              'You must follow any policies made available to you within the Services. You may use our Services only as permitted by law. We may suspend or stop providing our Services to you if you do not comply with our terms or policies.',
              style: AppTextStyles.body.copyWith(
                color: AppColors.txtInactive,
                fontSize: 14,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              '3. Your Account',
              style: AppTextStyles.heading3.copyWith(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              'You are responsible for safeguarding the password that you use to access the Services and for any activities or actions under your password. We encourage you to use strong passwords and enable two-factor authentication.',
              style: AppTextStyles.body.copyWith(
                color: AppColors.txtInactive,
                fontSize: 14,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              '4. Privacy',
              style: AppTextStyles.heading3.copyWith(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              'Our Privacy Policy explains how we treat your personal data and protect your privacy when you use our Services. By using our Services, you agree that we can use such data in accordance with our privacy policies.',
              style: AppTextStyles.body.copyWith(
                color: AppColors.txtInactive,
                fontSize: 14,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              '5. Contact Us',
              style: AppTextStyles.heading3.copyWith(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              'If you have any questions about these Terms, please contact us at legal@blacklivery.com.',
              style: AppTextStyles.body.copyWith(
                color: AppColors.txtInactive,
                fontSize: 14,
                height: 1.6,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
