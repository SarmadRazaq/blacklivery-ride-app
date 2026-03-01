import 'package:flutter_test/flutter_test.dart';
import 'package:blackliveryrider/core/utils/currency_utils.dart';

void main() {
  setUp(() {
    // Reset to default before each test
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
    test('formats with default currency (NGN) and 0 decimals', () {
      expect(CurrencyUtils.format(1500), '₦1,500');
    });

    test('formats with specified currency', () {
      expect(CurrencyUtils.format(2500, currency: 'USD'), '\$2,500');
    });

    test('formats with decimals', () {
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
