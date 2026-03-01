import 'dart:math';
import 'package:flutter/material.dart';
import '../../../../core/utils/currency_utils.dart';
import '../data/models/earnings_chart_model.dart';

class DailyEarningsGauge extends StatelessWidget {
  final EarningsChartData data;
  final VoidCallback? onSetGoal;
  final VoidCallback? onViewRides;

  const DailyEarningsGauge({
    super.key,
    required this.data,
    this.onSetGoal,
    this.onViewRides,
  });

  @override
  Widget build(BuildContext context) {
    final double percent = data.dailyTarget > 0
        ? (data.dailyEarnings / data.dailyTarget).clamp(0.0, 1.0)
        : 0.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text(
          "Today's Earnings",
          style: TextStyle(color: Colors.grey, fontSize: 13),
        ),
        const SizedBox(height: 16),

        // Gauge
        SizedBox(
          height: 180,
          child: CustomPaint(
            painter: _HalfArcGaugePainter(percent: percent),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(top: 60),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Goal: ${CurrencyUtils.format(data.dailyTarget)}',
                      style: const TextStyle(color: Colors.grey, fontSize: 10),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      CurrencyUtils.format(data.dailyEarnings),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '${(percent * 100).toStringAsFixed(0)}% of goal',
                      style: const TextStyle(color: Colors.grey, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),

        const SizedBox(height: 8),

        // Stats row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildStatItem('Total Rides', data.totalRides.toString()),
            Container(height: 28, width: 1, color: Colors.grey[800]),
            _buildStatItem('Total Fare', CurrencyUtils.format(data.totalFare)),
            Container(height: 28, width: 1, color: Colors.grey[800]),
            _buildStatItem('Total Tips', CurrencyUtils.format(data.totalTips)),
          ],
        ),

        const SizedBox(height: 20),

        // Action buttons
        Row(
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: onSetGoal,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'Set goal',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: onViewRides,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2C2C2C),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'View rides',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 10)),
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

class _HalfArcGaugePainter extends CustomPainter {
  final double percent;

  _HalfArcGaugePainter({required this.percent});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.85);
    final radius = size.width * 0.42;
    const strokeWidth = 22.0;

    // Background arc
    final bgPaint = Paint()
      ..color = const Color(0xFF2C2C2C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      pi, // start at left (180°)
      pi, // sweep 180°
      false,
      bgPaint,
    );

    // Progress arc
    if (percent > 0) {
      final progressPaint = Paint()
        ..color = const Color(0xFFD4AF37)
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        pi,
        pi * percent,
        false,
        progressPaint,
      );

      // Draw dot at tip of progress
      final angle = pi + (pi * percent);
      final dotX = center.dx + radius * cos(angle);
      final dotY = center.dy + radius * sin(angle);
      final dotPaint = Paint()..color = Colors.white;
      canvas.drawCircle(Offset(dotX, dotY), 8, dotPaint);
    }
  }

  @override
  bool shouldRepaint(_HalfArcGaugePainter oldDelegate) =>
      oldDelegate.percent != percent;
}
