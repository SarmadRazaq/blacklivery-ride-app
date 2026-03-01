import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';

class PromotionService {
  final Dio _dio = ApiClient().dio;

  /// Apply promo code
  /// Endpoint: POST /api/v1/promotions/apply
  Future<Map<String, dynamic>?> applyPromoCode({
    required String code,
    String? rideId,
  }) async {
    try {
      final response = await _dio.post(
        '/api/v1/promotions/apply',
        data: {'code': code, 'rideId': rideId},
      );
      return response.data['data'];
    } catch (e) {
      debugPrint('PromotionService.applyPromoCode error: $e');
      return null;
    }
  }

  /// Get my promotions
  /// Endpoint: GET /api/v1/promotions/mine
  Future<List<dynamic>> getMyPromotions() async {
    try {
      final response = await _dio.get('/api/v1/promotions/mine');
      return response.data['data'] ?? [];
    } catch (e) {
      debugPrint('PromotionService.getMyPromotions error: $e');
      return [];
    }
  }

  /// Get available promotions
  Future<List<dynamic>> getAvailablePromotions() async {
    try {
      final response = await _dio.get('/api/v1/promotions/available');
      return response.data['data'] ?? [];
    } catch (e) {
      debugPrint('PromotionService.getAvailablePromotions error: $e');
      return [];
    }
  }
}
