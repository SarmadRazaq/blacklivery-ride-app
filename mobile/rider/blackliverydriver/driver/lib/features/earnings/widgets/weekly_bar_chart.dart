import 'package:flutter/material.dart';
import '../../../../core/utils/currency_utils.dart';
import '../data/models/earnings_chart_model.dart';

class WeeklyBarChart extends StatelessWidget {
  final List<WeeklyDataPoint> data;

  const WeeklyBarChart({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const Center(
        child: Text(
          'No weekly data',
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
                  const maxBarHeight = 136.0;
                  final barHeight = (maxBarHeight * heightFraction).clamp(
                    4.0,
                    maxBarHeight,
                  );
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if (point.amount > 0)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text(
                                CurrencyUtils.compact(point.amount),
                                style: const TextStyle(
                                  color: Colors.grey,
                                  fontSize: 8,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          Container(
                            height: barHeight,
                            decoration: BoxDecoration(
                              color: const Color(0xFFD4AF37),
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                        ],
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
                    point.day,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.grey, fontSize: 10),
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
