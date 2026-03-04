import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/network/api_client.dart';

class LoyaltyRewardsScreen extends StatefulWidget {
  const LoyaltyRewardsScreen({super.key});

  @override
  State<LoyaltyRewardsScreen> createState() => _LoyaltyRewardsScreenState();
}

class _LoyaltyRewardsScreenState extends State<LoyaltyRewardsScreen> {
  List<PointsHistoryItem> _pointsHistory = [];
  int _pointsBalance = 0;
  String _tier = 'bronze';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchLoyaltyData();
  }

  Future<void> _fetchLoyaltyData() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final dio = ApiClient().dio;

      // Backfill loyalty points for any completed rides that were missed
      try {
        await dio.post('/api/v1/loyalty/backfill');
      } catch (e) {
        debugPrint('Loyalty backfill skipped: $e');
      }

      final accountRes = await dio.get('/api/v1/loyalty/account');
      final historyRes = await dio.get('/api/v1/loyalty/history');

      // Backend returns objects directly (no 'data' wrapper)
      final accountRaw = accountRes.data;
      final account = (accountRaw is Map && accountRaw.containsKey('data') && accountRaw['data'] is Map)
          ? accountRaw['data']
          : accountRaw;

      final historyRaw = historyRes.data;
      final List history = (historyRaw is List)
          ? historyRaw
          : (historyRaw is Map && historyRaw['data'] is List)
              ? historyRaw['data']
              : [];

      if (!mounted) return;
      setState(() {
        _pointsBalance = (account is Map ? (account['points'] as num?)?.toInt() : null) ?? 0;
        _tier = (account is Map ? account['tier'] : null) ?? 'bronze';
        _pointsHistory = history.map((item) {
          if (item is Map) {
            return PointsHistoryItem(     
              title: item['description'] ?? 'Ride',
              date: item['date'] ?? item['createdAt'] ?? '',
              points: (item['points'] as num?)?.toInt() ?? 0,
            );
          }
          return PointsHistoryItem(title: 'Activity', date: '', points: 0);
        }).toList();
      });
    } catch (e) {
      debugPrint('Failed to load loyalty data: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

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
          'Loyalty & Rewards',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Points balance card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.inputBorder),
                    ),
                    child: Column(
                      children: [
                        // Points icon
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppColors.yellow90.withOpacity(0.15),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.stars_rounded,
                            color: AppColors.yellow90,
                            size: 32,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          '${_pointsBalance.toStringAsFixed(0)}pts',
                          style: AppTextStyles.heading1.copyWith(
                            fontSize: 36,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Your points balance',
                          style: AppTextStyles.body.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.yellow90.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _tier.toUpperCase(),
                            style: AppTextStyles.body.copyWith(
                              color: AppColors.yellow90,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // How it works section
                  _buildHowItWorksSection(),

                  const SizedBox(height: 24),

                  // Points earning history
                  Text(
                    'Points Earning History',
                    style: AppTextStyles.heading3.copyWith(fontSize: 16),
                  ),
                  const SizedBox(height: 16),

                  ..._pointsHistory.map((item) => _buildHistoryItem(item)),
                ],
              ),
            ),
          ),

          // Convert points button
          Padding(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _showConvertPointsDialog,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.yellow90,
                  foregroundColor: AppColors.bgPri,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                child: Text(
                  'Convert points',
                  style: AppTextStyles.body.copyWith(
                    color: AppColors.bgPri,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHowItWorksSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgSec,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline,
                color: AppColors.yellow90,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'How it Works',
                style: AppTextStyles.body.copyWith(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildHowItWorksItem(
            '1',
            'Earn points',
            'Get 1 point for every ${CurrencyUtils.symbol()}1 spent on rides',
          ),
          const SizedBox(height: 8),
          _buildHowItWorksItem(
            '2',
            'Accumulate',
            'Points never expire as long as your account is active',
          ),
          const SizedBox(height: 8),
          _buildHowItWorksItem(
            '3',
            'Convert',
            'Convert 1000 points to ${CurrencyUtils.symbol()}10 wallet credit',
          ),
        ],
      ),
    );
  }

  Widget _buildHowItWorksItem(String number, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: AppColors.yellow90.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              number,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.yellow90,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTextStyles.body.copyWith(
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                ),
              ),
              Text(
                description,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.txtInactive,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHistoryItem(PointsHistoryItem item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Row(
        children: [
          // Ride icon
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.bgPri,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.directions_car,
              color: AppColors.yellow90,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: AppTextStyles.body.copyWith(
                    color: Colors.white,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  item.date,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.txtInactive,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.success.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '+${item.points}',
              style: AppTextStyles.body.copyWith(
                color: AppColors.success,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showConvertPointsDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSec,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (dialogContext) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.inputBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Convert Points',
              style: AppTextStyles.heading3,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.inputBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.inputBorder),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.stars_rounded,
                    color: AppColors.yellow90,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$_pointsBalance points available',
                          style: AppTextStyles.body.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          'Convert to ${CurrencyUtils.format(_pointsBalance / 100)} wallet credit',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.txtInactive,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                      onPressed: () => Navigator.pop(dialogContext),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppColors.inputBorder),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                    ),
                    child: Text(
                      'Cancel',
                      style: AppTextStyles.body.copyWith(
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      Navigator.pop(dialogContext);
                      try {
                        final dio = ApiClient().dio;
                        await dio.post('/api/v1/loyalty/redeem', data: {
                          'rewardType': 'ride_discount',
                          'points': _pointsBalance,
                        });
                        if (!mounted) return; ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Points converted to wallet credit!')),
                        );
                        _fetchLoyaltyData(); // Refresh
                      } catch (e) {
                        if (!mounted) return; ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Failed to convert points. Try again.')),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.yellow90,
                      foregroundColor: AppColors.bgPri,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                    ),
                    child: Text(
                      'Convert all',
                      style: AppTextStyles.body.copyWith(
                        color: AppColors.bgPri,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class PointsHistoryItem {
  final String title;
  final String date;
  final int points;

  PointsHistoryItem({
    required this.title,
    required this.date,
    required this.points,
  });
}
