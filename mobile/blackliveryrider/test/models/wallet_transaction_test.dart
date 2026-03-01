import 'package:flutter_test/flutter_test.dart';
import 'package:blackliveryrider/core/models/wallet_transaction_model.dart';

void main() {
  group('WalletTransaction.fromJson', () {
    test('parses standard fields with ISO date string', () {
      final tx = WalletTransaction.fromJson({
        'id': 'tx1',
        'description': 'Ride payment',
        'createdAt': '2025-06-01T10:00:00.000Z',
        'amount': 2500.0,
        'type': 'debit',
        'currency': 'NGN',
      });
      expect(tx.id, 'tx1');
      expect(tx.description, 'Ride payment');
      expect(tx.amount, 2500.0);
      expect(tx.type, 'debit');
      expect(tx.currency, 'NGN');
      expect(tx.date.year, 2025);
      expect(tx.date.month, 6);
    });

    test('parses Firestore timestamp format {_seconds, _nanoseconds}', () {
      // 2025-01-15T00:00:00Z  →  1736899200 seconds since epoch
      final tx = WalletTransaction.fromJson({
        'id': 'tx2',
        'description': 'Wallet top-up',
        'createdAt': {'_seconds': 1736899200, '_nanoseconds': 0},
        'amount': 5000,
        'type': 'credit',
      });
      expect(tx.date.year, 2025);
      expect(tx.date.month, 1);
      expect(tx.date.day, 15);
    });

    test('falls back to "date" field when createdAt is missing', () {
      final tx = WalletTransaction.fromJson({
        'id': 'tx3',
        'date': '2025-03-01T08:00:00.000Z',
        'amount': 100,
        'type': 'credit',
      });
      expect(tx.date.year, 2025);
      expect(tx.date.month, 3);
    });

    test('description falls back to narration field', () {
      final tx = WalletTransaction.fromJson({
        'id': 'tx4',
        'narration': 'Payout received',
        'amount': 10000,
        'type': 'credit',
      });
      expect(tx.description, 'Payout received');
    });

    test('defaults type to "debit" when missing', () {
      final tx = WalletTransaction.fromJson({'id': 'tx5'});
      expect(tx.type, 'debit');
    });

    test('defaults currency to "NGN" when missing', () {
      final tx = WalletTransaction.fromJson({'id': 'tx6'});
      expect(tx.currency, 'NGN');
    });

    test('defaults amount to 0.0 when missing', () {
      final tx = WalletTransaction.fromJson({});
      expect(tx.amount, 0.0);
    });

    test('handles amount as int (num cast)', () {
      final tx = WalletTransaction.fromJson({
        'amount': 3000, // int, not double
      });
      expect(tx.amount, 3000.0);
    });

    test('gracefully handles invalid date string', () {
      final tx = WalletTransaction.fromJson({
        'id': 'tx7',
        'createdAt': 'not-a-date',
        'amount': 0,
        'type': 'debit',
      });
      // Should fall back to DateTime.now() — just check it's a valid DateTime
      expect(tx.date, isA<DateTime>());
    });
  });

  group('WalletTransaction.toJson', () {
    test('serializes all fields', () {
      final tx = WalletTransaction(
        id: 'tx1',
        description: 'Ride fare',
        date: DateTime.utc(2025, 6, 1, 10, 0),
        amount: 2500,
        type: 'debit',
        currency: 'NGN',
      );
      final json = tx.toJson();
      expect(json['id'], 'tx1');
      expect(json['description'], 'Ride fare');
      expect(json['amount'], 2500);
      expect(json['type'], 'debit');
      expect(json['currency'], 'NGN');
      expect(json['date'], contains('2025-06-01'));
    });

    test('roundtrip preserves data', () {
      final original = WalletTransaction(
        id: 'tx2',
        description: 'Top-up',
        date: DateTime.utc(2025, 1, 15),
        amount: 5000,
        type: 'credit',
        currency: 'USD',
      );
      final restored = WalletTransaction.fromJson(original.toJson());
      expect(restored.id, 'tx2');
      expect(restored.description, 'Top-up');
      expect(restored.amount, 5000);
      expect(restored.type, 'credit');
      expect(restored.currency, 'USD');
    });
  });
}
