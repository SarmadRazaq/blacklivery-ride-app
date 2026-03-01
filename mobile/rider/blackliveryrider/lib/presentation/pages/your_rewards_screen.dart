import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/currency_utils.dart';

class ReferralReward {
  final String name;
  final DateTime date;
  final String amount;

  ReferralReward({
    required this.name,
    required this.date,
    required this.amount,
  });
}

class YourRewardsScreen extends StatefulWidget {
  const YourRewardsScreen({super.key});

  @override
  State<YourRewardsScreen> createState() => _YourRewardsScreenState();
}

class _YourRewardsScreenState extends State<YourRewardsScreen> {
  List<ReferralReward> _rewards = [];
  double _totalCredits = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchReferralData();
  }

  Future<void> _fetchReferralData() async {
    try {
      final dio = ApiClient().dio;
      final response = await dio.get('/api/v1/promotions/mine');
      final data = response.data['data'] ?? [];

      double total = 0;
      final List<ReferralReward> rewards = [];
      for (final item in data) {
        if (item['type'] == 'referral') {
          final amount = (item['amount'] as num?)?.toDouble() ?? 0;
          total += amount;
          rewards.add(ReferralReward(
            name: item['referredName'] ?? item['description'] ?? 'Referral',
            date: item['createdAt'] != null
                ? DateTime.tryParse(item['createdAt']) ?? DateTime.now()
                : DateTime.now(),
            amount: CurrencyUtils.format(amount),
          ));
        }
      }

      if (mounted) {
        setState(() {
          _rewards = rewards;
          _totalCredits = total;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final rewards = _rewards;

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
          'Your rewards',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Total Credits Earned Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 32),
              decoration: BoxDecoration(
                color: AppColors.inputBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.inputBorder),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 8,
                        height: 1,
                        color: AppColors.txtInactive,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Total credits earned',
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.txtInactive,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        width: 8,
                        height: 1,
                        color: AppColors.txtInactive,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _isLoading ? '...' : CurrencyUtils.format(_totalCredits),
                    style: AppTextStyles.heading1.copyWith(
                      fontSize: 48,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'For every successful referral, you receive ${CurrencyUtils.format(500)}\ncredits toward your next ride.',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 11,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Referral History Header
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 40,
                  height: 1,
                  color: AppColors.inputBorder,
                ),
                const SizedBox(width: 12),
                Text(
                  'Referral History',
                  style: AppTextStyles.body.copyWith(
                    color: AppColors.txtInactive,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 40,
                  height: 1,
                  color: AppColors.inputBorder,
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Referral History List
            Expanded(
              child: ListView.separated(
                itemCount: rewards.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final reward = rewards[index];
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.inputBorder),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                reward.name,
                                style: AppTextStyles.body.copyWith(
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'You earned on Oct ${reward.date.day}, ${reward.date.year}',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.yellow90,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          reward.amount,
                          style: AppTextStyles.body.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 20),

            // Redeem Credits Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Credits redeemed to wallet!'),
                    ),
                  );
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
                  'Redeem credits to wallet',
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
}
