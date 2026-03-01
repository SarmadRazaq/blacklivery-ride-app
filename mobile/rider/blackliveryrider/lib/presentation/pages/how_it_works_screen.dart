import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';

class HowItWorksScreen extends StatelessWidget {
  const HowItWorksScreen({super.key});

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
          'How it works',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    // Step 1
                    _buildStep(
                      number: '1',
                      title: 'Share Your Referral Code or Link',
                      description:
                          'Invite friends by sharing your unique referral link or code.',
                    ),

                    const SizedBox(height: 24),

                    // Step 2
                    _buildStep(
                      number: '2',
                      title: 'Friends Sign Up and Take Their First Ride',
                      description:
                          'When a friend signs up using your code and completes their first ride, you both earn rewards.',
                    ),

                    const SizedBox(height: 24),

                    // Step 3
                    _buildStep(
                      number: '3',
                      title: 'Earn Ride Credits',
                      description:
                          'For every successful referral, you receive ${CurrencyUtils.format(500)} credits toward your next ride. Your friend also receives ${CurrencyUtils.format(500)} as a welcome bonus.',
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Invite Friends Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  // Go back to main refer screen to share
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.yellow90,
                  foregroundColor: AppColors.bgPri,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                child: Text(
                  'Invite friends',
                  style: AppTextStyles.body.copyWith(
                    color: AppColors.bgPri,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep({
    required String number,
    required String title,
    required String description,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: AppColors.yellow90,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              number,
              style: AppTextStyles.body.copyWith(
                color: AppColors.bgPri,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTextStyles.body.copyWith(
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: AppTextStyles.body.copyWith(
                  color: AppColors.txtInactive,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
