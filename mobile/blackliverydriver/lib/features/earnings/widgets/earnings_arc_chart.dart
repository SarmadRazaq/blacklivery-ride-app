import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';
import '../../../../core/utils/currency_utils.dart';

class EarningsArcChart extends StatelessWidget {
  final double amount;
  final double goal;
  final int totalTrips;
  final int onlineMinutes;
  final double tips;
  final String currency;

  const EarningsArcChart({
    super.key,
    required this.amount,
    required this.goal,
    required this.totalTrips,
    required this.onlineMinutes,
    required this.tips,
    this.currency = 'USD', // Default, should be passed
  });

  @override
  Widget build(BuildContext context) {
    // Calculate percentage, max 1.0
    // Ensure inputs are finite to avoid NaN layout errors
    final safeAmount = amount.isFinite ? amount : 0.0;
    final safeGoal = (goal.isFinite && goal > 0) ? goal : 1.0;

    final percent = (goal > 0) ? (safeAmount / safeGoal).clamp(0.0, 1.0) : 0.0;

    // Format amount
    final formattedAmount = CurrencyUtils.format(
      amount,
      currency: currency,
      decimals: 2,
    );

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            "Today's Earnings",
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 220,
            child: Center(
              child: SizedBox(
                width: 200,
                height: 200,
                child: CircularPercentIndicator(
                  radius: 85.0, // Reduced to fit in 200x200 with stroke
                  lineWidth: 12.0,
                  animation: true,
                  percent: percent,
                  center: Padding(
                    padding: const EdgeInsets.only(bottom: 20),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          "Total (Today)",
                          style: TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          formattedAmount,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 28.0,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  circularStrokeCap: CircularStrokeCap.round,
                  backgroundColor: Colors.grey[800]!,
                  progressColor: const Color(0xFFD4AF37),
                  startAngle: 180,
                  arcType: ArcType.HALF,
                  arcBackgroundColor: Colors.grey[900]!,
                ),
              ),
            ),
          ),
          // Stats Row
          Column(
            mainAxisSize: MainAxisSize.min, // Prevent infinite height expansion
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildStatItem('Total Rides', '$totalTrips'),
                  _buildStatItem(
                    'Total Time',
                    '${(onlineMinutes / 60).toStringAsFixed(1)}h',
                  ),
                  _buildStatItem(
                    'Total Tips',
                    CurrencyUtils.format(tips, currency: currency, decimals: 0),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 300),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Flexible(
                        fit: FlexFit.loose,
                        child: ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.black,
                            minimumSize: const Size(80, 44),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                          ),
                          child: const Text('Set goal'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Flexible(
                        fit: FlexFit.loose,
                        child: OutlinedButton(
                          onPressed: () {},
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            minimumSize: const Size(80, 44),
                            side: const BorderSide(color: Colors.grey),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                          ),
                          child: const Text('View rides'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11)),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ],
    );
  }
}
