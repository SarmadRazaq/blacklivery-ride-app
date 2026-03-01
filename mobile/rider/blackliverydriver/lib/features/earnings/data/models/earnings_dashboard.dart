class EarningsDashboard {
  final DailyStats today;
  final PeriodStats week;
  final PeriodStats month;
  final PayoutMethodBreakdown payouts;

  EarningsDashboard({
    required this.today,
    required this.week,
    required this.month,
    required this.payouts,
  });

  factory EarningsDashboard.fromJson(Map<String, dynamic> json) {
    return EarningsDashboard(
      today: DailyStats.fromJson(json['today'] ?? {}),
      week: PeriodStats.fromJson(json['week'] ?? {}),
      month: PeriodStats.fromJson(json['month'] ?? {}),
      payouts: PayoutMethodBreakdown.fromJson(json['payouts'] ?? {}),
    );
  }

  EarningsDashboard copyWithGoal(double goal) {
    return EarningsDashboard(
      today: today.copyWith(goal: goal),
      week: week,
      month: month,
      payouts: payouts,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'today': today.toJson(),
      'week': week.toJson(),
      'month': month.toJson(),
      'payouts': payouts.toJson(),
    };
  }
}

class DailyStats {
  final double amount;
  final int trips;
  final double tips;
  final int onlineTime; // in minutes
  final double goal;

  DailyStats({
    required this.amount,
    required this.trips,
    required this.tips,
    required this.onlineTime,
    required this.goal,
  });

  factory DailyStats.fromJson(Map<String, dynamic> json) {
    return DailyStats(
      amount: (json['amount'] ?? 0).toDouble(),
      trips: json['trips'] ?? 0,
      tips: (json['tips'] ?? 0).toDouble(),
      onlineTime: json['onlineTime'] ?? 0,
      goal: (json['goal'] ?? 0).toDouble(),
    );
  }

  DailyStats copyWith({double? goal}) {
    return DailyStats(
      amount: amount,
      trips: trips,
      tips: tips,
      onlineTime: onlineTime,
      goal: goal ?? this.goal,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'amount': amount,
      'trips': trips,
      'tips': tips,
      'onlineTime': onlineTime,
      'goal': goal,
    };
  }
}

class PeriodStats {
  final double amount;
  final int trips;
  final double tips;
  final List<DailyBreakdown> breakdown; // dailyBreakdown or monthlyBreakdown

  PeriodStats({
    required this.amount,
    required this.trips,
    required this.tips,
    required this.breakdown,
  });

  factory PeriodStats.fromJson(Map<String, dynamic> json) {
    return PeriodStats(
      amount: (json['amount'] ?? 0).toDouble(),
      trips: json['trips'] ?? 0,
      tips: (json['tips'] ?? 0).toDouble(),
      breakdown: (json['dailyBreakdown'] ?? json['monthlyBreakdown'] ?? [])
          .map<DailyBreakdown>((e) => DailyBreakdown.fromJson(e))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'amount': amount,
      'trips': trips,
      'tips': tips,
      'breakdown': breakdown.map((e) => e.toJson()).toList(),
    };
  }
}

class DailyBreakdown {
  final String day;
  final int date;
  final double amount;

  DailyBreakdown({required this.day, required this.date, required this.amount});

  factory DailyBreakdown.fromJson(Map<String, dynamic> json) {
    return DailyBreakdown(
      day: json['day'] ?? '',
      date: json['date'] ?? 0,
      amount: (json['amount'] ?? 0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'day': day,
      'date': date,
      'amount': amount,
    };
  }
}

class PayoutMethodBreakdown {
  final double inApp;
  final double cash;
  final PayoutInfo? lastPayout;
  final PayoutInfo? nextPayout;

  PayoutMethodBreakdown({
    required this.inApp,
    required this.cash,
    this.lastPayout,
    this.nextPayout,
  });

  factory PayoutMethodBreakdown.fromJson(Map<String, dynamic> json) {
    return PayoutMethodBreakdown(
      inApp: (json['inApp'] ?? 0).toDouble(),
      cash: (json['cash'] ?? 0).toDouble(),
      lastPayout: json['lastPayout'] != null
          ? PayoutInfo.fromJson(json['lastPayout'])
          : null,
      nextPayout: json['nextPayout'] != null
          ? PayoutInfo.fromJson(json['nextPayout'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'inApp': inApp,
      'cash': cash,
      'lastPayout': lastPayout?.toJson(),
      'nextPayout': nextPayout?.toJson(),
    };
  }
}

class PayoutInfo {
  final double amount;
  final String date;

  PayoutInfo({required this.amount, required this.date});

  factory PayoutInfo.fromJson(Map<String, dynamic> json) {
    return PayoutInfo(
      amount: (json['amount'] ?? 0).toDouble(),
      date: json['date']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'amount': amount,
      'date': date,
    };
  }
}
