/// Currency formatting utility for the BlackLivery app.
/// Active currency is set at runtime by RegionProvider.
class CurrencyUtils {
  static const String defaultCurrency = 'NGN';
  static const String defaultSymbol = '₦';

  /// Runtime-overridable active currency. Set by RegionProvider on region change.
  static String _activeCurrency = defaultCurrency;
  static String get activeCurrency => _activeCurrency;
  static set activeCurrency(String c) => _activeCurrency = c;

  static const Map<String, String> _symbols = {
    'NGN': '₦',
    'USD': '\$',
    'GBP': '£',
    'EUR': '€',
    'GHS': 'GH₵',
    'KES': 'KSh',
    'ZAR': 'R',
  };

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
