import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/currency_utils.dart';
import '../data/models/earnings_dashboard.dart';

class MonthlyInteractiveChart extends StatelessWidget {
  final PeriodStats stats;
  final String currency;

  const MonthlyInteractiveChart({
    super.key,
    required this.stats,
    this.currency = 'USD',
  });

  @override
  Widget build(BuildContext context) {
    if (stats.breakdown.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(
          child: Text(
            'No data available',
            style: TextStyle(color: Colors.grey),
          ),
        ),
      );
    }

    final safeBreakdown = stats.breakdown
        .map(
          (e) => DailyBreakdown(
            day: e.day,
            date: e.date,
            amount: e.amount.isFinite ? e.amount : 0.0,
          ),
        )
        .toList();

    double maxY = safeBreakdown
        .map((e) => e.amount)
        .reduce((a, b) => a > b ? a : b);
    if (maxY == 0) maxY = 100;
    maxY = maxY * 1.2;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text(
                "This Month's Earnings", // Design Label (actually Yearly view)
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                CurrencyUtils.format(
                  stats.amount,
                  currency: currency,
                  decimals: 2,
                ), // Total for Year
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 28,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildStat('Total Trips', '${stats.trips}'),
                  const SizedBox(width: 16),
                  _buildStat(
                    'Total Value',
                    CurrencyUtils.format(
                      stats.amount,
                      currency: currency,
                      decimals: 0,
                    ),
                  ), // Abbreviated?
                  const SizedBox(width: 16),
                  _buildStat(
                    'Total Tips',
                    CurrencyUtils.format(
                      stats.tips,
                      currency: currency,
                      decimals: 0,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 200,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: maxY,
                barTouchData: BarTouchData(
                  enabled: true,
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      final index = group.x.toInt();
                      if (index < 0 || index >= stats.breakdown.length) {
                        return null;
                      }
                      final item = stats.breakdown[index];
                      return BarTooltipItem(
                        '${item.day}\n',
                        const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                        children: <TextSpan>[
                          TextSpan(
                            text: CurrencyUtils.format(
                              rod.toY,
                              currency: currency,
                              decimals: 2,
                            ),
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w500,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      );
                    },
                    tooltipBgColor: const Color(0xFF2A2A2A),
                  ),
                ),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      interval: 1,
                      getTitlesWidget: (value, meta) {
                        if (value.toInt() >= 0 &&
                            value.toInt() < safeBreakdown.length) {
                          // Show every month or every other?
                          // Design shows Jan, Feb, Mar... so every month.
                          final dayLabel = safeBreakdown[value.toInt()].day;
                          final safeLabel = dayLabel.length >= 3
                              ? dayLabel.substring(0, 3)
                              : dayLabel;
                          return Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Text(
                              safeLabel,
                              style: const TextStyle(
                                color: Colors.grey,
                                fontSize: 10,
                              ),
                            ),
                          );
                        }
                        return const SizedBox();
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  rightTitles: AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                ),
                gridData: FlGridData(show: false),
                borderData: FlBorderData(show: false),
                barGroups: safeBreakdown.asMap().entries.map((entry) {
                  final index = entry.key;
                  final item = entry.value;
                  return BarChartGroupData(
                    x: index,
                    barRods: [
                      BarChartRodData(
                        toY: item.amount,
                        color: Colors.grey[400],
                        width: 8, // Thinner bars for monthly
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStat(String label, String value) {
    return Row(
      children: [
        Text(
          '$label: ',
          style: const TextStyle(color: Colors.grey, fontSize: 11),
        ),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
