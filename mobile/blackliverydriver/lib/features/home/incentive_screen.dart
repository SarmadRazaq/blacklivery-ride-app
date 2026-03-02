import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../earnings/providers/earnings_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/providers/region_provider.dart';

/// Incentive tracking screen — shows daily/weekly progress,
/// bonus tiers, peak hour tracker.
class IncentiveScreen extends StatefulWidget {
  const IncentiveScreen({super.key});

  @override
  State<IncentiveScreen> createState() => _IncentiveScreenState();
}

class _IncentiveScreenState extends State<IncentiveScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EarningsProvider>().loadEarningsData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: Colors.white, size: 28),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Incentives & Bonuses',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: Consumer<EarningsProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final data = provider.earningsData;
          final weeklyTrips = (data['ridesCount'] as num?)?.toInt() ?? 0;
          final peakTrips = (data['peakTrips'] as num?)?.toInt() ?? 0;
          final totalEarnings = provider.totalEarnings;
          final isChicago = context.watch<RegionProvider>().isChicago;

          return RefreshIndicator(
            onRefresh: () => provider.loadEarningsData(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!isChicago) ...[
                    // Nigeria weekly trip goal
                    _buildProgressCard(
                      title: 'Weekly Trip Goal',
                      current: weeklyTrips,
                      target: 40,
                      reward: '${CurrencyUtils.format(10000)} Bonus',
                      icon: Icons.directions_car,
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (isChicago) ...[
                    // Chicago weekly guarantee
                    _buildProgressCard(
                      title: 'Weekly Guarantee',
                      current: weeklyTrips,
                      target: 20,
                      reward: '${CurrencyUtils.format(1200, currency: 'USD')} Minimum',
                      icon: Icons.verified,
                      subtitle: 'Earn at least ${CurrencyUtils.format(1200, currency: 'USD')} for 20+ trips',
                    ),
                    const SizedBox(height: 16),
                  ],

                  const SizedBox(height: 24),

                  // Peak bonus section
                  const Text(
                    'Peak Hour Bonuses',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),

                  _buildBonusTier(
                    tier: '1–4 peak trips',
                    bonus: CurrencyUtils.format(300),
                    isActive: peakTrips >= 1 && peakTrips < 5,
                    isCompleted: peakTrips >= 5,
                  ),
                  _buildBonusTier(
                    tier: '5–7 peak trips',
                    bonus: CurrencyUtils.format(400),
                    isActive: peakTrips >= 5 && peakTrips < 8,
                    isCompleted: peakTrips >= 8,
                  ),
                  _buildBonusTier(
                    tier: '8+ peak trips',
                    bonus: CurrencyUtils.format(500),
                    isActive: peakTrips >= 8,
                    isCompleted: false,
                  ),

                  const SizedBox(height: 24),

                  // Daily Earnings Summary
                  const Text(
                    'This Week',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),

                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.cardBackground,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        _buildSummaryRow(
                          'Total Trips',
                          '$weeklyTrips',
                        ),
                        const Divider(color: AppColors.darkGrey, height: 24),
                        _buildSummaryRow(
                          'Total Earnings',
                          CurrencyUtils.formatExact(totalEarnings),
                        ),
                        const Divider(color: AppColors.darkGrey, height: 24),
                        _buildSummaryRow(
                          'Peak Trips',
                          '$peakTrips',
                        ),
                        const Divider(color: AppColors.darkGrey, height: 24),
                        _buildSummaryRow(
                          'Avg per Trip',
                          weeklyTrips > 0
                              ? CurrencyUtils.formatExact(
                                  totalEarnings / weeklyTrips)
                              : '—',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // How it works
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.info_outline,
                                color: AppColors.primary, size: 18),
                            const SizedBox(width: 8),
                            const Text(
                              'How Incentives Work',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (!isChicago)
                          _buildInfoLine(
                              '• Complete 40 trips/week → ${CurrencyUtils.format(10000)} bonus'),
                        if (isChicago)
                          _buildInfoLine(
                              '• Complete 20+ trips/week → ${CurrencyUtils.format(1200, currency: 'USD')} minimum guarantee'),
                        _buildInfoLine(
                            '• Peak hours earn extra ${CurrencyUtils.format(isChicago ? 5 : 300, currency: isChicago ? 'USD' : 'NGN')}–${CurrencyUtils.format(isChicago ? 8 : 500, currency: isChicago ? 'USD' : 'NGN')} per trip'),
                        _buildInfoLine(
                            '• Bonuses are paid weekly on Mondays'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProgressCard({
    required String title,
    required int current,
    required int target,
    required String reward,
    required IconData icon,
    String? subtitle,
  }) {
    final progress = (current / target).clamp(0.0, 1.0);
    final isCompleted = current >= target;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isCompleted
            ? AppColors.primary.withValues(alpha: 0.15)
            : AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: isCompleted
            ? Border.all(color: AppColors.primary.withValues(alpha: 0.5))
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isCompleted
                      ? AppColors.primary.withValues(alpha: 0.2)
                      : AppColors.inputBackground,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: AppColors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                    if (subtitle != null)
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: Colors.grey[400],
                          fontSize: 11,
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isCompleted
                      ? AppColors.primary.withValues(alpha: 0.2)
                      : AppColors.inputBackground,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  reward,
                  style: TextStyle(
                    color: isCompleted ? AppColors.primary : AppColors.grey,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: AppColors.inputBackground,
              valueColor: AlwaysStoppedAnimation(
                isCompleted ? AppColors.primary : AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$current / $target trips',
                style: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 12,
                ),
              ),
              if (isCompleted)
                const Row(
                  children: [
                    Icon(Icons.check_circle, color: AppColors.primary, size: 14),
                    SizedBox(width: 4),
                    Text(
                      'Completed!',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                )
              else
                Text(
                  '${target - current} trips remaining',
                  style: TextStyle(
                    color: Colors.grey[400],
                    fontSize: 12,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBonusTier({
    required String tier,
    required String bonus,
    required bool isActive,
    required bool isCompleted,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isActive
            ? AppColors.primary.withValues(alpha: 0.15)
            : AppColors.cardBackground,
        borderRadius: BorderRadius.circular(12),
        border: isActive
            ? Border.all(color: AppColors.primary.withValues(alpha: 0.5))
            : null,
      ),
      child: Row(
        children: [
          Icon(
            isCompleted
                ? Icons.check_circle
                : isActive
                    ? Icons.radio_button_checked
                    : Icons.radio_button_off,
            color: isCompleted || isActive ? AppColors.primary : AppColors.grey,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              tier,
              style: TextStyle(
                color:
                    isActive || isCompleted ? AppColors.white : AppColors.grey,
                fontSize: 14,
              ),
            ),
          ),
          Text(
            '$bonus / trip',
            style: TextStyle(
              color: isActive ? AppColors.primary : AppColors.grey,
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.grey[400], fontSize: 14),
        ),
        Text(
          value,
          style: const TextStyle(
            color: AppColors.white,
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoLine(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: TextStyle(
          color: Colors.grey[300],
          fontSize: 12,
          height: 1.4,
        ),
      ),
    );
  }
}
