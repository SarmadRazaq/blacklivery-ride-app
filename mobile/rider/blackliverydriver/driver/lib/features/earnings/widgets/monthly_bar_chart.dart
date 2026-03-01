import 'package:flutter/material.dart';
import '../data/models/earnings_chart_model.dart';

class MonthlyBarChart extends StatelessWidget {
  final List<MonthlyDataPoint> data;

  const MonthlyBarChart({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const Center(
        child: Text(
          'No monthly data',
          style: TextStyle(color: Colors.grey, fontSize: 13),
        ),
      );
    }

    final maxAmount = data.map((e) => e.amount).reduce((a, b) => a > b ? a : b);

    return LayoutBuilder(
      builder: (context, constraints) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 160,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: data.map((point) {
                  final heightFraction = maxAmount > 0
                      ? (point.amount / maxAmount)
                      : 0.0;
                  final barHeight = (160 * heightFraction).clamp(4.0, 160.0);
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: Container(
                        height: barHeight,
                        decoration: BoxDecoration(
                          color: const Color(0xFFD4AF37),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: data.map((point) {
                return Expanded(
                  child: Text(
                    point.month,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.grey, fontSize: 8),
                  ),
                );
              }).toList(),
            ),
          ],
        );
      },
    );
  }
}
