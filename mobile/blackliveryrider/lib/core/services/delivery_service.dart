import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../network/api_client.dart';

class DeliveryService {
  final Dio _dio = ApiClient().dio;
  final Uuid _uuid = const Uuid();

  /// Get delivery quote
  /// Endpoint: POST /api/v1/deliveries/quote
  Future<Map<String, dynamic>?> getDeliveryQuote({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    String? pickupAddress,
    String? dropoffAddress,
    String? vehicleCategory,
  }) async {
    try {
      final response = await _dio.post(
        '/api/v1/deliveries/quote',
        data: {
          'pickupLocation': {
            'lat': pickupLat,
            'lng': pickupLng,
            'address': (pickupAddress != null && pickupAddress.isNotEmpty)
                ? pickupAddress
                : 'Pickup Location',
          },
          'dropoffLocation': {
            'lat': dropoffLat,
            'lng': dropoffLng,
            'address': (dropoffAddress != null && dropoffAddress.isNotEmpty)
                ? dropoffAddress
                : 'Dropoff Location',
          },
          if (vehicleCategory != null) 'vehicleCategory': vehicleCategory,
        },
      );
      return response.data['data'];
    } catch (e) {
      debugPrint('DeliveryService.getDeliveryQuote error: $e');
      return null;
    }
  }

  /// Create delivery
  /// Endpoint: POST /api/v1/deliveries
  Future<Map<String, dynamic>?> createDelivery({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required String recipientName,
    required String recipientPhone,
    String? pickupAddress,
    String? dropoffAddress,
    String? packageDescription,
    double? weight,
    String? notes,
    String? vehicleCategory,
  }) async {
    try {
      final response = await _dio.post(
        '/api/v1/deliveries',
        data: {
          'pickupLocation': {
            'lat': pickupLat,
            'lng': pickupLng,
            'address': (pickupAddress != null && pickupAddress.isNotEmpty)
                ? pickupAddress
                : 'Pickup Location',
          },
          'dropoffLocation': {
            'lat': dropoffLat,
            'lng': dropoffLng,
            'address': (dropoffAddress != null && dropoffAddress.isNotEmpty)
                ? dropoffAddress
                : 'Dropoff Location',
          },
          'recipientName': recipientName,
          'recipientPhone': recipientPhone,
          'packageDetails': {
            'description': packageDescription ?? 'Package',
            if (weight != null) 'weight': weight,
          },
          if (notes != null) 'notes': notes,
          if (vehicleCategory != null) 'vehicleCategory': vehicleCategory,
        },
        options: Options(
          headers: {
            'Idempotency-Key': _uuid.v4(),
          },
        ),
      );
      return response.data['delivery'] ?? response.data['data'];
    } catch (e) {
      debugPrint('DeliveryService.createDelivery error: $e');
      return null;
    }
  }

  /// Get delivery details
  /// Endpoint: GET /api/v1/deliveries/{{deliveryId}}
  Future<Map<String, dynamic>?> getDeliveryDetails(String deliveryId) async {
    try {
      final response = await _dio.get('/api/v1/deliveries/$deliveryId');
      return response.data['data'];
    } catch (e) {
      debugPrint('DeliveryService.getDeliveryDetails error: $e');
      return null;
    }
  }

  /// Get delivery history
  Future<List<dynamic>> getDeliveryHistory({
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final response = await _dio.get(
        '/api/v1/deliveries/history',
        queryParameters: {'page': page, 'limit': limit},
      );
      return response.data['data'] ?? [];
    } catch (e) {
      debugPrint('DeliveryService.getDeliveryHistory error: $e');
      return [];
    }
  }
}
