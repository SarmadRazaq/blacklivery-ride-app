import 'package:flutter_test/flutter_test.dart';
import 'package:driver/core/utils/currency_utils.dart';

void main() {
  setUp(() {
    CurrencyUtils.activeCurrency = 'NGN';
  });

  group('CurrencyUtils.symbol', () {
    test('returns ₦ for NGN', () {
      expect(CurrencyUtils.symbol('NGN'), '₦');
    });

    test('returns \$ for USD', () {
      expect(CurrencyUtils.symbol('USD'), '\$');
    });

    test('returns £ for GBP', () {
      expect(CurrencyUtils.symbol('GBP'), '£');
    });

    test('returns € for EUR', () {
      expect(CurrencyUtils.symbol('EUR'), '€');
    });

    test('returns GH₵ for GHS', () {
      expect(CurrencyUtils.symbol('GHS'), 'GH₵');
    });

    test('returns KSh for KES', () {
      expect(CurrencyUtils.symbol('KES'), 'KSh');
    });

    test('returns R for ZAR', () {
      expect(CurrencyUtils.symbol('ZAR'), 'R');
    });

    test('returns the code itself for unknown currency', () {
      expect(CurrencyUtils.symbol('XYZ'), 'XYZ');
    });

    test('is case-insensitive (uppercases input)', () {
      expect(CurrencyUtils.symbol('ngn'), '₦');
    });

    test('uses activeCurrency when no argument given', () {
      CurrencyUtils.activeCurrency = 'USD';
      expect(CurrencyUtils.symbol(), '\$');
    });
  });

  group('CurrencyUtils.format', () {
    test('formats with default NGN and 0 decimals', () {
      expect(CurrencyUtils.format(1500), '₦1,500');
    });

    test('formats with specified currency', () {
      expect(CurrencyUtils.format(2500, currency: 'USD'), '\$2,500');
    });

    test('formats with decimal places', () {
      expect(CurrencyUtils.format(1500.5, decimals: 2), '₦1,500.50');
    });

    test('formats zero correctly', () {
      expect(CurrencyUtils.format(0), '₦0');
    });

    test('formats large numbers with commas', () {
      expect(CurrencyUtils.format(1000000), '₦1,000,000');
    });

    test('formats numbers under 1000 without commas', () {
      expect(CurrencyUtils.format(999), '₦999');
    });

    test('formats negative numbers', () {
      expect(CurrencyUtils.format(-500), '₦-500');
    });

    test('uses activeCurrency when no currency specified', () {
      CurrencyUtils.activeCurrency = 'GBP';
      expect(CurrencyUtils.format(100), '£100');
    });
  });

  group('CurrencyUtils.compact', () {
    test('formats millions with M suffix', () {
      expect(CurrencyUtils.compact(1500000), '₦1.5M');
    });

    test('formats exact million', () {
      expect(CurrencyUtils.compact(1000000), '₦1.0M');
    });

    test('formats thousands with k suffix', () {
      expect(CurrencyUtils.compact(12000), '₦12k');
    });

    test('formats amounts under 1000 without suffix', () {
      expect(CurrencyUtils.compact(500), '₦500');
    });

    test('respects currency parameter', () {
      expect(CurrencyUtils.compact(5000, currency: 'USD'), '\$5k');
    });
  });

  group('CurrencyUtils.formatExact', () {
    test('always shows 2 decimal places', () {
      expect(CurrencyUtils.formatExact(1500), '₦1,500.00');
    });

    test('rounds to 2 decimal places', () {
      expect(CurrencyUtils.formatExact(99.999), '₦100.00');
    });

    test('preserves existing 2 decimal places', () {
      expect(CurrencyUtils.formatExact(42.50), '₦42.50');
    });

    test('respects currency parameter', () {
      expect(CurrencyUtils.formatExact(25, currency: 'USD'), '\$25.00');
    });
  });

  group('CurrencyUtils.formatDate', () {
    test('formats DateTime object', () {
      final result = CurrencyUtils.formatDate(DateTime(2025, 1, 15));
      expect(result, 'Jan 15, 2025');
    });

    test('formats Firestore _seconds timestamp', () {
      // 2025-01-15 00:00:00 UTC = 1736899200 seconds
      final result = CurrencyUtils.formatDate({
        '_seconds': 1736899200,
        '_nanoseconds': 0,
      });
      expect(result, contains('2025'));
    });

    test('formats standard seconds timestamp', () {
      final result = CurrencyUtils.formatDate({
        'seconds': 1736899200,
        'nanoseconds': 0,
      });
      expect(result, contains('2025'));
    });

    test('formats ISO string', () {
      final result = CurrencyUtils.formatDate('2025-06-01T10:00:00.000Z');
      expect(result, 'Jun 1, 2025');
    });

    test('returns empty string for null', () {
      expect(CurrencyUtils.formatDate(null), '');
    });

    test('returns "Invalid Date" for unparseable input', () {
      expect(CurrencyUtils.formatDate('not-a-date'), 'Invalid Date');
    });
  });

  group('CurrencyUtils.activeCurrency', () {
    test('defaults to NGN', () {
      expect(CurrencyUtils.activeCurrency, 'NGN');
    });

    test('can be changed at runtime', () {
      CurrencyUtils.activeCurrency = 'USD';
      expect(CurrencyUtils.activeCurrency, 'USD');
    });

    test('affects format() when no currency param given', () {
      CurrencyUtils.activeCurrency = 'EUR';
      expect(CurrencyUtils.format(50), '€50');
    });
  });
}
