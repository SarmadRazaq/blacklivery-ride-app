import 'package:flutter/material.dart';
import '../data/models/earnings_dashboard.dart';
import '../data/services/earnings_service.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../core/services/cache_service.dart';
import '../../../core/services/connectivity_service.dart';

class EarningsProvider with ChangeNotifier {
  final EarningsService _earningsService = EarningsService();

  EarningsDashboard? _dashboard;
  bool _isLoading = false;
  String? _error;
  bool _isShowingCachedData = false;

  // New properties for Payouts/Ratings
  List<Map<String, dynamic>> _banks = [];
  List<dynamic> _payoutHistory = [];
  List<dynamic> _transactionHistory = [];
  Map<String, dynamic> _ratingData = {};

  EarningsDashboard? get dashboard => _dashboard;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isShowingCachedData => _isShowingCachedData;

  List<Map<String, dynamic>> get banks => _banks;
  List<dynamic> get payoutHistory => _payoutHistory;
  List<dynamic> get transactionHistory => _transactionHistory;
  Map<String, dynamic> get ratingData => _ratingData;

  // Existing alias
  Map<String, dynamic> get earningsData => {
    'totalEarnings': _dashboard?.today.amount ?? 0.0,
    'totalTrips': _dashboard?.today.trips ?? 0,
    'todayEarnings': _dashboard?.today.amount ?? 0.0,
    'todayTrips': _dashboard?.today.trips ?? 0,
    'rating': 5.0, // Default or fetch
    'ridesCount': _dashboard?.month.trips ?? 0,
  };

  // Backward compatibility getters
  double get availableBalance => _dashboard?.payouts.inApp ?? 0.0;
  double get totalEarnings => _dashboard?.today.amount ?? 0.0;
  List<dynamic> get weeklyChartData => [];
  List<dynamic> get monthlyChartData => [];
  String get currency => CurrencyUtils.activeCurrency;

  Future<void> fetchDashboard() async {
    _isLoading = true;
    _error = null;
    _isShowingCachedData = false;
    notifyListeners();

    try {
      if (!ConnectivityService().isOnline) {
        final cached = CacheService().getJson('earnings_dashboard');
        if (cached != null) {
          _dashboard = EarningsDashboard.fromJson(cached);
          _isShowingCachedData = true;
        } else {
          _error = 'No internet connection and no cached data available.';
        }
        return;
      }

      _dashboard = await _earningsService.getEarningsDashboard();
      _isShowingCachedData = false;
      CacheService().setJson('earnings_dashboard', _dashboard!.toJson());
    } catch (e) {
      _error = e.toString();
      debugPrint('Error fetching dashboard: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadEarningsData() => fetchDashboard();

  /// Update the daily earnings goal (persisted to backend).
  Future<void> setDailyGoal(double goal) async {
    if (_dashboard != null) {
      _dashboard = _dashboard!.copyWithGoal(goal);
      notifyListeners();
    }
    try {
      await _earningsService.updateEarningsGoal(goal);
    } catch (e) {
      debugPrint('Error saving earnings goal: $e');
    }
  }

  // --- Payout Methods ---

  Future<void> loadBanks() async {
    try {
      _banks = await _earningsService.getBanks();
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading banks: $e');
    }
  }

  Future<void> requestPayout(
    double amount, {
    String? accountNumber,
    String? bankCode,
    String? currency,
  }) async {
    await _earningsService.requestPayout(
      amount,
      accountNumber: accountNumber,
      bankCode: bankCode,
      currency: currency,
    );
    // Refresh dashboard to update balance
    await fetchDashboard();
  }

  Future<String> verifyAccount(String accountNumber, String bankCode) async {
    return await _earningsService.verifyAccount(accountNumber, bankCode);
  }

  Future<void> updateBankDetails(Map<String, dynamic> details) async {
    await _earningsService.updateBankDetails(details);
    notifyListeners();
  }

  Future<String> fetchStripeDashboardUrl() async {
    return await _earningsService.fetchStripeDashboardUrl();
  }

  // Method to satisfy PayoutHistoryScreen getter access (if it calls a load method? No, it just accesses getter)
  // But we need to load data generally.
  // PayoutHistoryScreen might expect data to be loaded.
  // We can add a loadPayoutHistory method if needed or load it with dashboard.
  // PayoutHistoryScreen code was: `final history = provider.payoutHistory;`
  // It probably calls load somewhere or expects it.

  String? _ratingError;
  String? get ratingError => _ratingError;

  Future<void> loadRatingDistribution() async {
    _ratingError = null;
    try {
      _ratingData = await _earningsService.getRatingDistribution();
      notifyListeners();
    } catch (e) {
      _ratingError = 'Failed to load ratings. Pull down to retry.';
      debugPrint('Error loading rating distribution: $e');
      notifyListeners();
    }
  }

  Future<void> loadPayoutHistory() async {
    _isLoading = true;
    notifyListeners();
    try {
      _payoutHistory = await _earningsService.getPayoutHistory();
    } catch (e) {
      debugPrint('Error loading payout history: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadTransactionHistory() async {
    _isLoading = true;
    notifyListeners();
    try {
      _transactionHistory = await _earningsService.getTransactionHistory();
    } catch (e) {
      debugPrint('Error loading transaction history: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
