import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../network/api_client.dart';

class PaymentService {
  final Dio _dio = ApiClient().dio;
  final Uuid _uuid = const Uuid();

  dynamic _extractData(dynamic raw) {
    if (raw is Map<String, dynamic> && raw.containsKey('data')) {
      return raw['data'];
    }
    return raw;
  }

  /// Get payment methods
  /// Endpoint: GET /api/v1/payments/methods
  Future<List<dynamic>> getPaymentMethods() async {
    try {
      final response = await _dio.get('/api/v1/payments/methods');
      final data = _extractData(response.data);
      return data is List ? data : [];
    } catch (e) {
      debugPrint('PaymentService.getPaymentMethods error: $e');
      return [];
    }
  }

  /// Get payment history
  /// Endpoint: GET /api/v1/payments/history?page=1&limit=20
  Future<List<dynamic>> getPaymentHistory({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        '/api/v1/payments/history',
        queryParameters: {'page': page, 'limit': limit},
      );
      final data = _extractData(response.data);
      return data is List ? data : [];
    } catch (e) {
      debugPrint('PaymentService.getPaymentHistory error: $e');
      return [];
    }
  }

  /// Add payment method
  /// Endpoint: POST /api/v1/payments/methods
  Future<Map<String, dynamic>?> addPaymentMethod(
    Map<String, dynamic> paymentData,
  ) async {
    try {
      final response = await _dio.post(
        '/api/v1/payments/methods',
        data: paymentData,
        options: Options(
          headers: {
            'Idempotency-Key': _uuid.v4(),
          },
        ),
      );
      final data = _extractData(response.data);
      return data is Map<String, dynamic> ? data : response.data;
    } catch (e) {
      debugPrint('PaymentService.addPaymentMethod error: $e');
      return null;
    }
  }

  /// Delete payment method
  /// Endpoint: DELETE /api/v1/payments/methods/{{paymentMethodId}}
  Future<bool> deletePaymentMethod(String paymentMethodId) async {
    try {
      await _dio.delete('/api/v1/payments/methods/$paymentMethodId');
      return true;
    } catch (e) {
      debugPrint('PaymentService.deletePaymentMethod error: $e');
      return false;
    }
  }

  /// Initiate payment
  /// Endpoint: POST /api/v1/payments/initiate
  Future<Map<String, dynamic>?> initiatePayment({
    required double amount,
    required String rideId,
    String? currency,
    String? purpose,
    String? gateway,
  }) async {
    try {
      final payload = <String, dynamic>{
        'amount': amount,
        'rideId': rideId,
      };
      if (currency != null && currency.isNotEmpty) {
        payload['currency'] = currency;
      }
      if (purpose != null && purpose.isNotEmpty) {
        payload['purpose'] = purpose;
      }
      if (gateway != null && gateway.isNotEmpty) {
        payload['gateway'] = gateway;
      }

      final response = await _dio.post(
        '/api/v1/payments/initiate',
        data: payload,
        options: Options(
          headers: {
            'Idempotency-Key': _uuid.v4(),
          },
        ),
      );
      final data = _extractData(response.data);
      return data is Map<String, dynamic>
          ? data
          : (response.data is Map<String, dynamic>
                ? response.data as Map<String, dynamic>
                : null);
    } catch (e) {
      debugPrint('PaymentService.initiatePayment error: $e');
      return null;
    }
  }

  /// Verify payment
  /// Endpoint: POST /api/v1/payments/verify
  /// Returns the full verification response data, or null on error.
  Future<Map<String, dynamic>?> verifyPayment({required String reference}) async {
    try {
      final response = await _dio.post(
        '/api/v1/payments/verify',
        data: {'reference': reference},
        options: Options(
          headers: {
            'Idempotency-Key': _uuid.v4(),
          },
        ),
      );
      final data = _extractData(response.data);
      return data is Map<String, dynamic> ? data : response.data;
    } catch (e) {
      debugPrint('PaymentService.verifyPayment error: $e');
      return null;
    }
  }

  /// Charge the rider's wallet for a ride (paymentMethod = 'wallet').
  /// Unlike [initiatePayment], this is a direct debit — no WebView redirect needed.
  /// Returns `{ success: true, reference: '...' }` on success.
  /// Endpoint: POST /api/v1/payments/wallet/charge-ride
  Future<Map<String, dynamic>?> chargeRideWithWallet({
    required String rideId,
    required double amount,
    String? currency,
  }) async {
    try {
      final payload = <String, dynamic>{
        'rideId': rideId,
        'amount': amount,
        if (currency != null && currency.isNotEmpty) 'currency': currency,
      };
      final response = await _dio.post(
        '/api/v1/payments/wallet/charge-ride',
        data: payload,
        options: Options(
          headers: {'Idempotency-Key': _uuid.v4()},
        ),
      );
      return response.data is Map<String, dynamic>
          ? response.data as Map<String, dynamic>
          : null;
    } catch (e) {
      debugPrint('PaymentService.chargeRideWithWallet error: $e');
      rethrow; // Let caller decide whether to surface the error
    }
  }

  /// Get transaction details
  /// Endpoint: GET /api/v1/payments/transactions/{{transactionId}}
  Future<Map<String, dynamic>?> getTransactionDetails(
    String transactionId,
  ) async {
    try {
      final response = await _dio.get(
        '/api/v1/payments/transactions/$transactionId',
      );
      final data = _extractData(response.data);
      return data is Map<String, dynamic> ? data : null;
    } catch (e) {
      debugPrint('PaymentService.getTransactionDetails error: $e');
      return null;
    }
  }
}
