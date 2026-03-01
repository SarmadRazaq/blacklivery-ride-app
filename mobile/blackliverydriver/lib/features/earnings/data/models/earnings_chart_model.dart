class EarningsChartData {
  final double dailyEarnings;
  final double dailyTarget;
  final int totalRides;
  final double totalFare;
  final double totalTips;

  final List<WeeklyDataPoint> weeklyData;
  final List<MonthlyDataPoint> monthlyData;

  EarningsChartData({
    required this.dailyEarnings,
    required this.dailyTarget,
    required this.totalRides,
    required this.totalFare,
    required this.totalTips,
    required this.weeklyData,
    required this.monthlyData,
  });
}

class WeeklyDataPoint {
  final String day; // Mon, Tue, etc.
  final double amount;

  WeeklyDataPoint(this.day, this.amount);
}

class MonthlyDataPoint {
  final String month; // Jan, Feb, etc.
  final double amount;

  MonthlyDataPoint(this.month, this.amount);
}
