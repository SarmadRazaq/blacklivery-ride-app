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
  bool _isRedeeming = false;

  // Reward types the backend supports with their point costs
  static const List<_RewardOption> _rewardOptions = [
    _RewardOption(
      type: 'ride_discount',
      label: 'Ride Discount',
      description: '10% discount on your next ride',
      icon: Icons.local_offer,
      pointsCost: 100,
    ),
    _RewardOption(
      type: 'priority_pickup',
      label: 'Priority Pickup',
      description: 'Priority driver matching for your next ride',
      icon: Icons.flash_on,
      pointsCost: 50,
    ),
    _RewardOption(
      type: 'vehicle_upgrade',
      label: 'Vehicle Upgrade',
      description: 'Free upgrade to next vehicle category',
      icon: Icons.directions_car,
      pointsCost: 200,
    ),
    _RewardOption(
      type: 'free_ride',
      label: 'Free Ride',
      description: 'A completely free ride (up to standard fare)',
      icon: Icons.card_giftcard,
      pointsCost: 500,
    ),
  ];

  // Tier definitions with colors, icons and benefits
  static const Map<String, _TierInfo> _tierInfo = {
    'bronze': _TierInfo(
      color: Color(0xFFCD7F32),
      icon: Icons.shield,
      benefits: ['1 pt per ${r"$"}1 spent', 'Basic rewards access'],
      nextTier: 'silver',
      nextThreshold: 500,
    ),
    'silver': _TierInfo(
      color: Color(0xFFC0C0C0),
      icon: Icons.shield,
      benefits: ['1 pt per ${r"$"}1 spent', 'Priority support', '5% bonus points'],
      nextTier: 'gold',
      nextThreshold: 2000,
    ),
    'gold': _TierInfo(
      color: Color(0xFFFFD700),
      icon: Icons.shield,
      benefits: ['1 pt per ${r"$"}1 spent', 'Priority support', '10% bonus points', 'Free vehicle upgrades'],
      nextTier: 'platinum',
      nextThreshold: 5000,
    ),
    'platinum': _TierInfo(
      color: Color(0xFFE5E4E2),
      icon: Icons.workspace_premium,
      benefits: ['1 pt per ${r"$"}1 spent', 'VIP support', '20% bonus points', 'Free vehicle upgrades', 'Priority pickup'],
      nextTier: null,
      nextThreshold: null,
    ),
  };

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
                  _buildBalanceCard(),

                  const SizedBox(height: 16),

                  // Tier benefits
                  _buildTierBenefitsSection(),

                  const SizedBox(height: 24),

                  // Redeem rewards section
                  Text(
                    'Redeem Points',
                    style: AppTextStyles.heading3.copyWith(fontSize: 16),
                  ),
                  const SizedBox(height: 12),

                  ..._rewardOptions.map((reward) => _buildRewardOption(reward)),

                  const SizedBox(height: 24),

                  // How it works section
                  _buildHowItWorksSection(),

                  const SizedBox(height: 24),

                  // Points earning history
                  Text(
                    'Points History',
                    style: AppTextStyles.heading3.copyWith(fontSize: 16),
                  ),
                  const SizedBox(height: 16),

                  if (_pointsHistory.isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Center(
                        child: Text(
                          'No activity yet',
                          style: AppTextStyles.body.copyWith(
                            color: AppColors.txtInactive,
                          ),
                        ),
                      ),
                    )
                  else
                    ..._pointsHistory.map((item) => _buildHistoryItem(item)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceCard() {
    final tier = _tierInfo[_tier.toLowerCase()] ?? _tierInfo['bronze']!;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Column(
        children: [
          // Tier badge icon
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: tier.color.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              tier.icon,
              color: tier.color,
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
              color: tier.color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: tier.color.withOpacity(0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(tier.icon, color: tier.color, size: 14),
                const SizedBox(width: 4),
                Text(
                  _tier.toUpperCase(),
                  style: AppTextStyles.body.copyWith(
                    color: tier.color,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTierBenefitsSection() {
    final tier = _tierInfo[_tier.toLowerCase()] ?? _tierInfo['bronze']!;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgSec,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: tier.color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(tier.icon, color: tier.color, size: 18),
              const SizedBox(width: 8),
              Text(
                '${_tier[0].toUpperCase()}${_tier.substring(1)} Benefits',
                style: AppTextStyles.body.copyWith(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: tier.color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...tier.benefits.map((benefit) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              children: [
                Icon(Icons.check_circle, color: tier.color, size: 14),
                const SizedBox(width: 8),
                Text(
                  benefit,
                  style: AppTextStyles.caption.copyWith(
                    color: Colors.white70,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          )),
          if (tier.nextTier != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.inputBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Earn ${tier.nextThreshold} lifetime points to reach ${tier.nextTier!.toUpperCase()}',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.txtInactive,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRewardOption(_RewardOption reward) {
    final canAfford = _pointsBalance >= reward.pointsCost;

    return GestureDetector(
      onTap: canAfford ? () => _confirmRedeem(reward) : () => _showInsufficientPointsMessage(reward),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: canAfford ? AppColors.inputBorder : AppColors.inputBorder.withOpacity(0.4),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: canAfford
                    ? AppColors.yellow90.withOpacity(0.12)
                    : AppColors.inputBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                reward.icon,
                color: canAfford ? AppColors.yellow90 : AppColors.txtInactive,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    reward.label,
                    style: AppTextStyles.body.copyWith(
                      color: canAfford ? Colors.white : Colors.white54,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    reward.description,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: canAfford
                    ? AppColors.yellow90.withOpacity(0.15)
                    : Colors.red.withOpacity(0.08),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${reward.pointsCost} pts',
                style: AppTextStyles.body.copyWith(
                  color: canAfford ? AppColors.yellow90 : Colors.redAccent,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
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
    final isEarning = item.points >= 0;

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
          // Icon based on type
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.bgPri,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isEarning ? Icons.directions_car : Icons.redeem,
              color: isEarning ? AppColors.yellow90 : Colors.orangeAccent,
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
              color: isEarning
                  ? AppColors.success.withOpacity(0.15)
                  : Colors.red.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              isEarning ? '+${item.points}' : '${item.points}',
              style: AppTextStyles.body.copyWith(
                color: isEarning ? AppColors.success : Colors.redAccent,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Redemption handlers ─────────────────────────────────────────────────

  void _showInsufficientPointsMessage(_RewardOption reward) {
    final needed = reward.pointsCost - _pointsBalance;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Not enough points. You need ${reward.pointsCost} pts but have $_pointsBalance. '
          'Earn $needed more to unlock "${reward.label}".',
        ),
        backgroundColor: Colors.red.shade700,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _confirmRedeem(_RewardOption reward) {
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
              'Redeem Reward',
              style: AppTextStyles.heading3,
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.inputBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.inputBorder),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.yellow90.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(reward.icon, color: AppColors.yellow90, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          reward.label,
                          style: AppTextStyles.body.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          reward.description,
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.yellow90.withOpacity(0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Points to deduct',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    '-${reward.pointsCost} pts',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.yellow90,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.inputBorder),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                    ),
                    child: Text(
                      'Cancel',
                      style: AppTextStyles.body.copyWith(color: Colors.white),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isRedeeming
                        ? null
                        : () {
                            Navigator.pop(dialogContext);
                            _executeRedeem(reward);
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
                      'Redeem',
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

  Future<void> _executeRedeem(_RewardOption reward) async {
    setState(() => _isRedeeming = true);
    try {
      final dio = ApiClient().dio;
      await dio.post('/api/v1/loyalty/redeem', data: {
        'rewardType': reward.type,
        'points': reward.pointsCost,
      });
      if (!mounted) return;

      String successMsg;
      switch (reward.type) {
        case 'ride_discount':
          successMsg = '10% discount applied to your next ride!';
          break;
        case 'free_ride':
          successMsg = 'Free ride credit added to your account!';
          break;
        case 'priority_pickup':
          successMsg = 'Priority pickup is now active for your next ride!';
          break;
        case 'vehicle_upgrade':
          successMsg = 'Vehicle upgrade voucher created!';
          break;
        default:
          successMsg = 'Reward redeemed successfully!';
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(successMsg)),
      );
      _fetchLoyaltyData(); // Refresh
    } catch (e) {
      if (!mounted) return;
      final errorMsg = e.toString();
      if (errorMsg.contains('Insufficient points') || errorMsg.contains('insufficient')) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Insufficient points. You need ${reward.pointsCost} pts to redeem "${reward.label}".'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to redeem reward. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isRedeeming = false);
    }
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

class _TierInfo {
  final Color color;
  final IconData icon;
  final List<String> benefits;
  final String? nextTier;
  final int? nextThreshold;

  const _TierInfo({
    required this.color,
    required this.icon,
    required this.benefits,
    required this.nextTier,
    required this.nextThreshold,
  });
}

class _RewardOption {
  final String type;
  final String label;
  final String description;
  final IconData icon;
  final int pointsCost;

  const _RewardOption({
    required this.type,
    required this.label,
    required this.description,
    required this.icon,
    required this.pointsCost,
  });
}
