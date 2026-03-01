import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import '../../features/chat/support_chat_screen.dart';

/// Support / Help screen for driver app — ticket list, FAQ, and new ticket form.
class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  static final List<Map<String, dynamic>> _faqItems = [
    {
      'q': 'How do I receive my payout?',
      'a':
          'Payouts are processed weekly to your registered bank account. You can also request an instant payout from the Earnings tab.',
    },
    {
      'q': 'What happens if a rider cancels?',
      'a':
          'If the rider cancels after you\'ve arrived at pickup, you receive a cancellation fee. This is automatically added to your earnings.',
    },
    {
      'q': 'How do incentive bonuses work?',
      'a':
          'Complete trip goals to earn bonuses. In Nigeria, 40 trips/week earns ${CurrencyUtils.format(10000)}. In Chicago, 20+ trips guarantees ${CurrencyUtils.format(1200, currency: 'USD')} minimum.',
    },
    {
      'q': 'How do I update my vehicle info?',
      'a':
          'Go to Profile → Vehicle Info to update your vehicle details. Changes require admin approval.',
    },
    {
      'q': 'My account is under review. How long does it take?',
      'a':
          'Account reviews typically complete within 24 hours. Ensure all documents are uploaded and valid.',
    },
  ];

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
        title: const Text(
          'Help & Support',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _buildSupportOption(
            icon: Icons.chat_bubble_outline,
            title: 'Chat with us',
            subtitle:
                'Get help with rides or account related issues, available 24/7',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SupportChatScreen()),
              );
            },
          ),
          _buildSupportOption(
            icon: Icons.phone_outlined,
            title: 'Call us',
            subtitle:
                'Get help with rides or account related issues, available Monday - Friday, 9am - 8pm',
            onTap: () async {
              final uri = Uri(
                scheme: 'tel',
                path: '1234567890',
              ); // Replace with actual number
              if (await canLaunchUrl(uri)) await launchUrl(uri);
            },
          ),
          _buildSupportOption(
            icon: Icons.email_outlined,
            title: 'Send us an email',
            subtitle:
                'Get help with rides or account related issues, available 24/7',
            onTap: () async {
              final uri = Uri(
                scheme: 'mailto',
                path: 'blackliveryinc@gmail.com',
              );
              if (await canLaunchUrl(uri)) await launchUrl(uri);
            },
          ),
          _buildSupportOption(
            icon: Icons.help_outline,
            title: 'FAQ',
            subtitle: 'Get quick help from our frequently asked questions.',
            onTap: () => _showFaqBottomSheet(context),
          ),
        ],
      ),
    );
  }

  Widget _buildSupportOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 24),
        color: Colors.transparent,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Colors.white, size: 24),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.grey[400],
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showFaqBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.5,
          minChildSize: 0.3,
          maxChildSize: 0.85,
          builder: (context, scrollController) {
            return Container(
              decoration: const BoxDecoration(
                color: Color(0xFF1E1E1E),
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Container(
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(
                              color: Colors.grey[600],
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'FAQ',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      controller: scrollController,
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      itemCount: _faqItems.length,
                      itemBuilder: (context, index) =>
                          _buildFaqTile(_faqItems[index]),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // Reuse existing _buildFaqTile but updated styles if needed
  Widget _buildFaqTile(Map<String, dynamic> faq) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: EdgeInsets.zero,
        title: Text(
          faq['q'],
          style: const TextStyle(color: Colors.white, fontSize: 14),
        ),
        iconColor: AppColors.primary,
        collapsedIconColor: Colors.grey,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(
              faq['a'],
              style: TextStyle(color: Colors.grey[400], fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
