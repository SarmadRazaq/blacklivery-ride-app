import 'package:uuid/uuid.dart';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/currency_utils.dart';
import '../models/earnings_dashboard.dart';

class EarningsService {
  final ApiClient _apiClient = ApiClient();
  final Uuid _uuid = const Uuid();

  Future<EarningsDashboard> getEarningsDashboard() async {
    try {
      final response = await _apiClient.dio.get(
        '/api/v1/driver/earnings/dashboard',
      );
      return EarningsDashboard.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to load earnings dashboard: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getBanks() async {
    try {
      final response = await _apiClient.dio.get('/api/v1/payouts/banks');
      return List<Map<String, dynamic>>.from(response.data);
    } catch (e) {
      // Return empty list or throw, depending on preference.
      // Existing UI handles errors.
      throw Exception('Failed to load banks: $e');
    }
  }

  Future<void> requestPayout(
    double amount, {
    String? accountNumber,
    String? bankCode,
    String? currency,
  }) async {
    try {
      final idempotencyKey = _uuid.v4();
      await _apiClient.dio.post(
        '/api/v1/payouts/request',
        data: {
          'amount': amount,
          'accountNumber': accountNumber,
          'bankCode': bankCode,
          'currency': currency ?? CurrencyUtils.activeCurrency,
        },
        options: Options(
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        ),
      );
    } catch (e) {
      throw Exception('Failed to request payout: $e');
    }
  }

  Future<String> verifyAccount(String accountNumber, String bankCode) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/v1/payouts/account/verify',
        data: {'accountNumber': accountNumber, 'bankCode': bankCode},
      );
      return response.data['accountName'] ?? '';
    } catch (e) {
      throw Exception('Failed to verify account: $e');
    }
  }

  Future<void> updateBankDetails(Map<String, dynamic> details) async {
    try {
      await _apiClient.dio.post('/api/v1/driver/bank', data: details);
    } catch (e) {
      throw Exception('Failed to update bank details: $e');
    }
  }

  Future<String> fetchStripeDashboardUrl() async {
    try {
      final response = await _apiClient.dio.post(
        '/api/v1/payouts/onboarding/stripe',
      );
      return response.data['url'] ?? '';
    } catch (e) {
      throw Exception('Failed to get Stripe URL: $e');
    }
  }

  Future<List<dynamic>> getPayoutHistory() async {
    try {
      final response = await _apiClient.dio.get('/api/v1/driver/payouts');
      return response.data['payouts'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> getRatingDistribution() async {
    try {
      final response = await _apiClient.dio.get('/api/v1/driver/ratings');
      return response.data;
    } catch (e) {
      throw Exception('Failed to load ratings: $e');
    }
  }
}
