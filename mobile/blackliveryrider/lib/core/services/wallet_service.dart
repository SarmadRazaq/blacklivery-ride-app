import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../network/api_client.dart';
import '../models/wallet_transaction_model.dart';
import '../utils/currency_utils.dart';

class WalletService {
  final Dio _dio = ApiClient().dio;
  final Uuid _uuid = const Uuid();

  /// Get wallet balance
  /// Endpoint: GET /api/v1/payments/wallet/balance?currency=NGN
  Future<double> getBalance({String? currency}) async {
    try {
      final response = await _dio.get(
        '/api/v1/payments/wallet/balance',
        queryParameters: {'currency': currency ?? CurrencyUtils.activeCurrency},
      );
      final data = response.data['data'] ?? response.data;
      if (data is Map) {
        final balance = data['balance'];
        if (balance is num) return balance.toDouble();
      } else if (data is num) {
        return data.toDouble();
      }
      return 0.0;
    } catch (e) {
      debugPrint('WalletService.getBalance error: $e');
      return 0.0;
    }
  }

  /// Get wallet transactions
  Future<List<WalletTransaction>> getTransactions({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        '/api/v1/payments/wallet/transactions',
        queryParameters: {'page': page, 'limit': limit},
      );
      final List<dynamic> transactionsJson = response.data['data'] ?? [];
      return transactionsJson
          .map((json) => WalletTransaction.fromJson(json))
          .toList();
    } catch (e) {
      debugPrint('WalletService.getTransactions error: $e');
      return [];
    }
  }

  /// Add funds to wallet
  /// Endpoint: POST /api/v1/payments/wallet/add
  /// Returns response data which may contain authorization_url for 3DS/redirect flows
  Future<Map<String, dynamic>?> addFunds({
    required double amount,
    required String paymentMethodId,
    String? currency,
  }) async {
    try {
      final response = await _dio.post(
        '/api/v1/payments/wallet/add',
        data: {
          'amount': amount,
          'paymentMethod': paymentMethodId,
          if (currency != null) 'currency': currency,
        },
        options: Options(
          headers: {
            'Idempotency-Key': _uuid.v4(),
          },
        ),
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return data['data'] is Map<String, dynamic>
            ? data['data'] as Map<String, dynamic>
            : data;
      }
      return {'success': true};
    } catch (e) {
      debugPrint('WalletService.addFunds error: $e');
      return null;
    }
  }

  /// Withdraw funds from wallet
  /// Endpoint: POST /api/v1/payments/wallet/withdraw
  Future<bool> withdrawFunds({
    required double amount,
    required String bankAccountId,
    String? currency,
  }) async {
    try {
      final effectiveCurrency = currency ?? CurrencyUtils.activeCurrency;
      await _dio.post(
        '/api/v1/payments/wallet/withdraw',
        data: {
          'amount': amount,
          'currency': effectiveCurrency,
          'bankAccountId': bankAccountId,
        },
        options: Options(
          headers: {
            'Idempotency-Key': _uuid.v4(),
          },
        ),
      );
      return true;
    } catch (e) {
      debugPrint('WalletService.withdrawFunds error: $e');
      return false;
    }
  }
}
