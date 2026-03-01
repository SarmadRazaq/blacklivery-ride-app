import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import 'support_chat_screen.dart';

class HelpSupportScreen extends StatelessWidget {
  /// Optional ticket ID from a deep link (e.g. blacklivery://support?ticketId=xyz).
  final String? initialTicketId;

  const HelpSupportScreen({super.key, this.initialTicketId});

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
          'Help & Support',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Chat with us
            _buildMenuItem(
              context,
              icon: Icons.chat_bubble_outline,
              title: 'Chat with us',
              description:
                  'Get help with rides or account related issues, available 24/7',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const SupportChatScreen(),
                  ),
                );
              },
            ),

            const SizedBox(height: 12),

            // Call us
            _buildMenuItem(
              context,
              icon: Icons.phone_outlined,
              title: 'Call us',
              description:
                  'Get help with rides or account related issues, available Monday - Friday, 8am - 5pm',
              onTap: () {
                launchUrl(Uri.parse('tel:+18001234567'));
              },
            ),

            const SizedBox(height: 12),

            // Send us an email
            _buildMenuItem(
              context,
              icon: Icons.email_outlined,
              title: 'Send us an email',
              description:
                  'Get help with rides or account related issues, available 24/7',
              onTap: () {
                launchUrl(Uri.parse('mailto:blackliveryinc@gmail.com?subject=Support%20Request'));
              },
            ),

            const SizedBox(height: 12),

            // FAQ
            _buildMenuItem(
              context,
              icon: Icons.help_outline,
              title: 'FAQ',
              description: 'Get quick help from our frequently asked questions.',
              onTap: () {
                _showFaqBottomSheet(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              color: AppColors.yellow90,
              size: 22,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.body.copyWith(
                      fontWeight: FontWeight.w500,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 12,
                      height: 1.3,
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
      backgroundColor: AppColors.bgSec,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.inputBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Frequently Asked Questions',
                style: AppTextStyles.heading3.copyWith(fontSize: 18),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: [
                    _buildFaqItem(
                      'How do I book a ride?',
                      'Tap on "Where to?" on the home screen, enter your destination, select your ride type, and confirm your booking.',
                    ),
                    _buildFaqItem(
                      'How can I cancel a ride?',
                      'Go to your active ride, tap on the menu, and select "Cancel Ride". Note that cancellation fees may apply.',
                    ),
                    _buildFaqItem(
                      'How do I add a payment method?',
                      'Go to Wallet > Manage Payment Methods > Add payment method.',
                    ),
                    _buildFaqItem(
                      'How do I report a problem?',
                      'Go to My Rides, select the ride, and tap on "Get ride help".',
                    ),
                    _buildFaqItem(
                      'How do loyalty points work?',
                      'Earn 1 point for every ${CurrencyUtils.symbol()}1 spent. Convert 1000 points to ${CurrencyUtils.format(10)} wallet credit.',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFaqItem(String question, String answer) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        iconColor: Colors.white,
        collapsedIconColor: Colors.white,
        title: Text(
          question,
          style: AppTextStyles.body.copyWith(
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
        ),
        children: [
          Text(
            answer,
            style: AppTextStyles.body.copyWith(
              color: AppColors.txtInactive,
              fontSize: 13,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
