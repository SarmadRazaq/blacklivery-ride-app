import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import 'providers/earnings_provider.dart';
import '../../core/utils/currency_utils.dart';
import 'payout_screen.dart';
import 'payout_history_screen.dart';
import 'data/models/earnings_chart_model.dart';
import 'widgets/daily_earnings_gauge.dart';
import 'widgets/weekly_bar_chart.dart';
import 'widgets/monthly_bar_chart.dart';
import 'data/models/earnings_dashboard.dart';
import '../history/ride_history_screen.dart';
import 'transaction_history_screen.dart';

class EarningsScreen extends ConsumerStatefulWidget {
  const EarningsScreen({super.key});

  @override
  ConsumerState<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends ConsumerState<EarningsScreen> {
  int _retryCount = 0;
  static const int _maxRetries = 3;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(earningsRiverpodProvider).fetchDashboard();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = ref.watch(earningsRiverpodProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF121212), // AppColors.background
      body: Builder(
        builder: (context) {
          if (provider.isLoading && provider.dashboard == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null && provider.dashboard == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Error loading earnings',
                    style: TextStyle(color: Colors.red),
                  ),
                  const SizedBox(height: 8),
                  if (_retryCount < _maxRetries)
                    ElevatedButton(
                      onPressed: () {
                        setState(() => _retryCount++);
                        provider.fetchDashboard();
                      },
                      child: Text('Retry ($_retryCount/$_maxRetries)'),
                    )
                  else
                    const Text(
                      'Please check your connection and restart the app.',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                ],
              ),
            );
          }

          if (provider.dashboard == null) {
            return const Center(
              child: Text(
                'No earnings data available',
                style: TextStyle(color: Colors.white),
              ),
            );
          }

          final dashboard = provider.dashboard!;

          // Helper to safely get double values
          double safeValue(num? value) {
            try {
              if (value == null) return 0.0;
              final doubleVal = value.toDouble();
              return (doubleVal.isNaN || doubleVal.isInfinite)
                  ? 0.0
                  : doubleVal;
            } catch (e) {
              debugPrint('Error in safeValue: $e');
              return 0.0;
            }
          }

          final dailyEarningsData = EarningsChartData(
            dailyEarnings: safeValue(dashboard.today.amount),
            dailyTarget: dashboard.today.goal > 0
                ? safeValue(dashboard.today.goal)
                : 15000.0,
            totalRides: dashboard.today.trips,
            totalFare: safeValue(
              dashboard.today.amount,
            ), // Using amount as total fare
            totalTips: safeValue(dashboard.today.tips),
            weeklyData: dashboard.week.breakdown
                .map((e) => WeeklyDataPoint(e.day, safeValue(e.amount)))
                .toList(),
            monthlyData: dashboard.month.breakdown
                .map((e) => MonthlyDataPoint(e.day, safeValue(e.amount)))
                .toList(),
          );

          // Note: Monthly breakdown in dashboard might be Day-wise for the month period?
          // The chart expects MonthlyDataPoint(month, amount).
          // If backend returns daily breakdown for 'month' period, we might need to aggregate or use as is if 'day' is actually 'Jan', 'Feb' etc.
          // Looking at MockData, MonthlyDataPoint takes 'Jan', 'Feb'.
          // The Dashboard model has 'day' field.
          // If the backend sends 'Jan', 'Feb' in the 'day' field for monthly stats, it works.
          // If not, we might need to conform. For now assuming backend sends correct labels.

          return RefreshIndicator(
            onRefresh: () async {
              setState(() => _retryCount = 0);
              await provider.fetchDashboard();
            },
            color: const Color(0xFFCDFF00),
            child: CustomScrollView(
            slivers: [
              // 1. App Bar
              const SliverAppBar(
                title: Text(
                  "Earnings",
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                backgroundColor: Color(0xFF121212),
                pinned: true,
                centerTitle: true,
                automaticallyImplyLeading: false,
              ),

              // 2. Dashboard Content
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min, // Important!
                    children: [
                      // --- Cached data banner ---
                      if (provider.isShowingCachedData)
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.orange.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.cloud_off, color: Colors.orange, size: 16),
                              SizedBox(width: 8),
                              Text(
                                'Showing cached data',
                                style: TextStyle(color: Colors.orange, fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      // --- TOP GAUGE ---
                      DailyEarningsGauge(
                        data: dailyEarningsData,
                        onSetGoal: () => _showSetGoalDialog(
                          context,
                          provider,
                          safeValue(dashboard.today.goal),
                        ),
                        onViewRides: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const RideHistoryScreen(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // --- WEEKLY CHART ---
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E1E1E),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  "This Week's Earnings",
                                  style: TextStyle(
                                    color: Colors.grey,
                                    fontSize: 13,
                                  ),
                                ),
                                Text(
                                  CurrencyUtils.format(
                                    safeValue(dashboard.week.amount),
                                    currency: provider.currency,
                                  ),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            WeeklyBarChart(data: dailyEarningsData.weeklyData),
                            const SizedBox(height: 16),
                            const Divider(color: Color(0xFF2C2C2C), height: 1),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                _buildStatChip(
                                  'Total Rides',
                                  dashboard.week.trips.toString(),
                                ),
                                Container(
                                  height: 28,
                                  width: 1,
                                  color: const Color(0xFF2C2C2C),
                                ),
                                _buildStatChip(
                                  'Total Fare',
                                  CurrencyUtils.compact(
                                    safeValue(dashboard.week.amount),
                                    currency: provider.currency,
                                  ),
                                ),
                                Container(
                                  height: 28,
                                  width: 1,
                                  color: const Color(0xFF2C2C2C),
                                ),
                                _buildStatChip(
                                  'Total Tips',
                                  CurrencyUtils.compact(
                                    safeValue(dashboard.week.tips),
                                    currency: provider.currency,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // --- MONTHLY CHART ---
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E1E1E),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  "This Year's Earnings",
                                  style: TextStyle(
                                    color: Colors.grey,
                                    fontSize: 13,
                                  ),
                                ),
                                Text(
                                  CurrencyUtils.format(
                                    safeValue(dashboard.month.amount),
                                    currency: provider.currency,
                                  ),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            MonthlyBarChart(
                              data: dailyEarningsData.monthlyData,
                            ),
                            const SizedBox(height: 16),
                            const Divider(color: Color(0xFF2C2C2C), height: 1),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                _buildStatChip(
                                  'Total Rides',
                                  dashboard.month.trips.toString(),
                                ),
                                Container(
                                  height: 28,
                                  width: 1,
                                  color: const Color(0xFF2C2C2C),
                                ),
                                _buildStatChip(
                                  'Total Fare',
                                  CurrencyUtils.compact(
                                    safeValue(dashboard.month.amount),
                                    currency: provider.currency,
                                  ),
                                ),
                                Container(
                                  height: 28,
                                  width: 1,
                                  color: const Color(0xFF2C2C2C),
                                ),
                                _buildStatChip(
                                  'Total Tips',
                                  CurrencyUtils.compact(
                                    safeValue(dashboard.month.tips),
                                    currency: provider.currency,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Payment Methods Section
                      const Center(
                        child: Text(
                          'Payment Methods',
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Payment Split Bar
                      _buildPaymentSplitBar(
                        context,
                        dashboard,
                        provider.currency,
                      ),

                      const SizedBox(height: 32),

                      // Payouts Section
                      const Center(
                        child: Text(
                          'Payouts',
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Payout Cards
                      if (dashboard.payouts.lastPayout != null)
                        _buildPayoutCard(
                          'Last Payout',
                          dashboard.payouts.lastPayout!,
                          provider.currency,
                        ),

                      if (dashboard.payouts.lastPayout != null)
                        const SizedBox(height: 12),

                      if (dashboard.payouts.nextPayout != null)
                        _buildPayoutCard(
                          'Next Payout',
                          dashboard.payouts.nextPayout!,
                          provider.currency,
                        ),

                      const SizedBox(height: 32),

                      // Buttons
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            provider.loadPayoutHistory();
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const PayoutHistoryScreen(),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE0E0FF),
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 20),
                          ),
                          child: const Text(
                            'View Payout History',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      Center(
                        child: TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const PayoutScreen(),
                              ),
                            );
                          },
                          child: const Text(
                            'Request Payout / Update Bank',
                            style: TextStyle(color: Colors.grey),
                          ),
                        ),
                      ),

                      const SizedBox(height: 8),

                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () {
                            provider.loadTransactionHistory();
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    const TransactionHistoryScreen(),
                              ),
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Color(0xFF2C2C2C)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: const Text(
                            'View Transaction History',
                            style: TextStyle(fontSize: 15),
                          ),
                        ),
                      ),

                      // Extra padding for scrolling
                      const SizedBox(height: 50),
                    ],
                  ),
                ),
              ),
            ],
          ),
          );
        },
      ),
    );
  }

  void _showSetGoalDialog(
    BuildContext context,
    EarningsProvider provider,
    double currentGoal,
  ) {
    final controller = TextEditingController(
      text: currentGoal > 0 ? currentGoal.toStringAsFixed(0) : '',
    );

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Set Daily Goal',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: Colors.white, fontSize: 18),
          decoration: InputDecoration(
            hintText: 'e.g. 15000',
            hintStyle: TextStyle(color: Colors.grey[600]),
            prefixText: CurrencyUtils.symbol(provider.currency),
            prefixStyle: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
            enabledBorder: const UnderlineInputBorder(
              borderSide: BorderSide(color: Color(0xFF2C2C2C)),
            ),
            focusedBorder: const UnderlineInputBorder(
              borderSide: BorderSide(color: Color(0xFFD4AF37)),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () {
              final value = double.tryParse(controller.text.trim());
              if (value != null && value > 0) {
                provider.setDailyGoal(value);
              }
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFD4AF37),
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            child: const Text(
              'Save',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatChip(String label, String value) {
    return Column(
      mainAxisSize: MainAxisSize.min,
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

  Widget _buildPayoutCard(String title, PayoutInfo payout, String currency) {
    // Fixed PayoutTransaction to PayoutInfo
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '$title • ',
            style: const TextStyle(color: Colors.white, fontSize: 14),
          ),
          Text(
            CurrencyUtils.format(payout.amount, currency: currency),
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          Text(
            ' • ${CurrencyUtils.formatDate(payout.date)}',
            style: const TextStyle(color: Colors.white, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentSplitBar(
    BuildContext context,
    EarningsDashboard dashboard,
    String currency,
  ) {
    final double inApp = dashboard.payouts.inApp > 0
        ? dashboard.payouts.inApp
        : 0.0;
    final double cash = dashboard.payouts.cash > 0
        ? dashboard.payouts.cash
        : 0.0;
    final double total = inApp + cash;

    final String inAppPercent = total > 0
        ? ((inApp / total) * 100).toStringAsFixed(0)
        : '0';
    final String cashPercent = total > 0
        ? ((cash / total) * 100).toStringAsFixed(0)
        : '0';

    // Ensure flex values are at least 1 if the amount > 0, to avoid Expanded(flex: 0)
    int inAppFlex = 0;
    int cashFlex = 0;

    if (total > 0) {
      inAppFlex = ((inApp / total) * 100).round();
      cashFlex = ((cash / total) * 100).round();

      // Fix potential 0 flex if amount is very small but non-zero
      if (inApp > 0 && inAppFlex == 0) inAppFlex = 1;
      if (cash > 0 && cashFlex == 0) cashFlex = 1;

      // If rounding caused both to be 0 (extremely unlikely if total > 0), force 1
      if (inAppFlex == 0 && cashFlex == 0) {
        if (inApp >= cash)
          inAppFlex = 1;
        else
          cashFlex = 1;
      }
    } else {
      // If total is 0, give equal space (or just show empty state correctly)
      inAppFlex = 1;
      cashFlex = 1;
    }

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '$inAppPercent%',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '$cashPercent%',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          height: 80,
          width: double.infinity,
          clipBehavior: Clip.hardEdge,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(40),
            color: const Color(0xFF1E1E1E),
          ),
          child: Row(
            children: [
              if (inAppFlex > 0)
                Expanded(
                  flex: inAppFlex,
                  child: Container(
                    color: const Color(0xFF4A4A4A),
                    alignment: Alignment.center,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'In-app • ',
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 12,
                          ),
                        ),
                        Flexible(
                          child: Text(
                            CurrencyUtils.format(inApp, currency: currency),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              if (cashFlex > 0)
                Expanded(
                  flex: cashFlex,
                  child: Container(
                    color: const Color(0xFF1E1E1E),
                    alignment: Alignment.center,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Cash • ',
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 12,
                          ),
                        ),
                        Flexible(
                          child: Text(
                            CurrencyUtils.format(cash, currency: currency),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
