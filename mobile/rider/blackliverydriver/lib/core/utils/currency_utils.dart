/// Currency formatting utility for the BlackLivery driver app.
import 'package:intl/intl.dart';

/// Active currency is set at runtime by RegionProvider.
class CurrencyUtils {
  static const String defaultCurrency = 'NGN';
  static const String defaultSymbol = '₦';

  /// Runtime-overridable active currency. Set by RegionProvider on region change.
  /// Runtime-overridable active currency. Set by RegionProvider on region change.
  static String activeCurrency = defaultCurrency;

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
    final c = currency ?? activeCurrency;
    return _symbols[c.toUpperCase()] ?? c;
  }

  /// Format an amount with currency symbol (e.g., ₦1,500).
  /// Uses [activeCurrency] when no [currency] is provided.
  static String format(double amount, {String? currency, int decimals = 0}) {
    final sym = symbol(currency ?? activeCurrency);
    final formatted = _formatNumber(amount, decimals);
    return '$sym$formatted';
  }

  /// Compact format for chart labels (e.g., ₦12k, ₦1.2M).
  static String compact(double amount, {String? currency}) {
    final sym = symbol(currency ?? activeCurrency);
    if (amount >= 1000000) {
      return '$sym${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '$sym${(amount / 1000).toStringAsFixed(0)}k';
    }
    return '$sym${amount.toStringAsFixed(0)}';
  }

  /// Format with explicit decimal places (e.g., ₦1,500.00)
  static String formatExact(double amount, {String? currency}) {
    return format(amount, currency: currency ?? activeCurrency, decimals: 2);
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

  /// Format a date (String or DateTime) to "MMM d, yyyy" (e.g., Nov 20, 2024).
  static String formatDate(dynamic date) {
    if (date == null) return '';
    try {
      DateTime dt;
      if (date is DateTime) {
        dt = date;
      } else if (date is Map && date.containsKey('_seconds')) {
        // Handle Firestore Timestamp format: {_seconds: 173..., _nanoseconds: ...}
        final int seconds = date['_seconds'] is int
            ? date['_seconds']
            : int.parse(date['_seconds'].toString());
        final int nanoseconds = date.containsKey('_nanoseconds')
            ? (date['_nanoseconds'] is int
                  ? date['_nanoseconds']
                  : int.parse(date['_nanoseconds'].toString()))
            : 0;
        dt = DateTime.fromMillisecondsSinceEpoch(
          seconds * 1000 + (nanoseconds ~/ 1000000),
        );
      } else if (date is Map && date.containsKey('seconds')) {
        // Handle standard Timestamp format: {seconds: 173..., nanoseconds: ...}
        final int seconds = date['seconds'] is int
            ? date['seconds']
            : int.parse(date['seconds'].toString());
        final int nanoseconds = date.containsKey('nanoseconds')
            ? (date['nanoseconds'] is int
                  ? date['nanoseconds']
                  : int.parse(date['nanoseconds'].toString()))
            : 0;
        dt = DateTime.fromMillisecondsSinceEpoch(
          seconds * 1000 + (nanoseconds ~/ 1000000),
        );
      } else {
        dt = DateTime.parse(date.toString());
      }
      return DateFormat('MMM d, yyyy').format(dt);
    } catch (e) {
      // Fallback: print simplified string or just empty if really broken,
      // but return e.toString() for debug is useful if short.
      // For now, let's try to keep it safe.
      return 'Invalid Date';
    }
  }
}
