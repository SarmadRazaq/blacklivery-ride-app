import '../services/exchange_rate_service.dart';

/// Currency formatting utility for the BlackLivery app.
/// Active currency is set at runtime by RegionProvider.
///
/// Exchange rates are fetched from the internet on app startup via
/// [syncRates]. If the network call fails, hardcoded fallback rates are used.
class CurrencyUtils {
  static const String defaultCurrency = 'NGN';
  static const String defaultSymbol = '₦';

  /// Runtime-overridable active currency. Set by RegionProvider on region change.
  static String _activeCurrency = defaultCurrency;
  static String get activeCurrency => _activeCurrency;
  static set activeCurrency(String c) => _activeCurrency = c;

  /// Tracks the previous currency so we know when a region switch happened.
  static String _previousCurrency = defaultCurrency;
  static String get previousCurrency => _previousCurrency;
  static set previousCurrency(String c) => _previousCurrency = c;

  static const Map<String, String> _symbols = {
    'NGN': '₦',
    'USD': '\$',
    'GBP': '£',
    'EUR': '€',
    'GHS': 'GH₵',
    'KES': 'KSh',
    'ZAR': 'R',
  };

  /// Hardcoded fallback rates used when the network is unavailable.
  static const Map<String, double> _fallbackRates = {
    'USD': 1.0,
    'NGN': 1600.0,
    'GBP': 0.79,
    'EUR': 0.92,
    'GHS': 15.5,
    'KES': 129.0,
    'ZAR': 18.1,
  };

  /// Live exchange rates relative to USD, populated by [syncRates].
  /// Falls back to [_fallbackRates] when not yet loaded.
  static Map<String, double> _liveRates = {};

  /// Whether live rates have been loaded at least once.
  static bool get hasLiveRates => _liveRates.isNotEmpty;

  /// The effective rate map — live rates if available, otherwise fallbacks.
  static Map<String, double> get _ratesPerUSD =>
      _liveRates.isNotEmpty ? _liveRates : _fallbackRates;

  /// Fetch live exchange rates from the internet and cache locally.
  /// Call this once at app startup (fire-and-forget is fine).
  /// Returns `true` if fresh rates were loaded.
  static Future<bool> syncRates({bool forceRefresh = false}) async {
    try {
      final rates = await ExchangeRateService().getRates(
        forceRefresh: forceRefresh,
      );
      if (rates != null && rates.isNotEmpty) {
        _liveRates = rates;
        return true;
      }
    } catch (_) {
      // Silently fall back to hardcoded rates
    }
    return false;
  }

  /// Convert an amount from one currency to another using live rates
  /// (with hardcoded fallback when offline).
  static double convert(double amount, String fromCurrency, String toCurrency) {
    if (fromCurrency == toCurrency) return amount;
    final rates = _ratesPerUSD;
    final fromRate = rates[fromCurrency.toUpperCase()] ?? 1.0;
    final toRate = rates[toCurrency.toUpperCase()] ?? 1.0;
    // amount → USD → target
    final usd = amount / fromRate;
    return usd * toRate;
  }

  /// Get the symbol for a currency code.
  /// If no currency is given, uses the runtime [activeCurrency].
  static String symbol([String? currency]) {
    final c = currency ?? _activeCurrency;
    return _symbols[c.toUpperCase()] ?? c;
  }

  /// Format an amount with currency symbol (e.g., ₦1,500).
  /// Uses [activeCurrency] when no [currency] is provided.
  static String format(double amount, {String? currency, int decimals = 0}) {
    final sym = symbol(currency ?? _activeCurrency);
    final formatted = _formatNumber(amount, decimals);
    return '$sym$formatted';
  }

  /// Format with explicit decimal places (e.g., ₦1,500.00)
  static String formatExact(double amount, {String? currency}) {
    return format(amount, currency: currency ?? _activeCurrency, decimals: 2);
  }

  static String _formatNumber(double value, int decimals) {
    final parts = value.toStringAsFixed(decimals).split('.');
    final intPart = parts[0];
    final buffer = StringBuffer();
    
    int count = 0;
    for (int i = intPart.length - 1; i >= 0; i--) {
      if (count > 0 && count % 3 == 0 && intPart[i] != '-') {
        buffer.write(',');
      }
      buffer.write(intPart[i]);
      count++;
    }
    
    final formatted = buffer.toString().split('').reversed.join();
    if (parts.length > 1) {
      return '$formatted.${parts[1]}';
    }
    return formatted;
  }
}
