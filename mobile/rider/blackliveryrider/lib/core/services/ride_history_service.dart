import 'package:dio/dio.dart';
import '../network/api_client.dart';
import '../models/ride_history_model.dart';

class RideHistoryService {
  final Dio _dio = ApiClient().dio;

  /// Get scheduled rides
  Future<List<RideHistoryItem>> getScheduledRides() async {
    try {
      final response = await _dio.get('/api/v1/rides/scheduled');
      final List<dynamic> ridesJson = response.data['data'] ?? [];
      return ridesJson.map((json) => RideHistoryItem.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Get ride history (completed/cancelled)
  Future<List<RideHistoryItem>> getRideHistory({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        '/api/v1/rides/history',
        queryParameters: {'page': page, 'limit': limit},
      );
      final List<dynamic> ridesJson = response.data['data'] ?? [];
      return ridesJson.map((json) => RideHistoryItem.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Get ride details by ID
  Future<RideHistoryItem?> getRideDetails(String rideId) async {
    try {
      final response = await _dio.get('/api/v1/rides/$rideId');
      // Backend getRide returns bare object (not wrapped in {data:...})
      final data = response.data is Map<String, dynamic>
          ? (response.data['data'] is Map<String, dynamic>
              ? response.data['data'] as Map<String, dynamic>
              : response.data as Map<String, dynamic>)
          : null;
      if (data == null) return null;
      return RideHistoryItem.fromJson(data);
    } catch (e) {
      return null;
    }
  }

  /// Cancel a scheduled ride
  /// Endpoint: PUT /api/v1/rides/{rideId}/status  (backend has no DELETE route)
  Future<bool> cancelRide(String rideId, {String? reason}) async {
    try {
      await _dio.put(
        '/api/v1/rides/$rideId/status',
        data: {
          'status': 'cancelled',
          'reason': (reason != null && reason.trim().length >= 3)
              ? reason.trim()
              : 'Cancelled by rider',
        },
      );
      return true;
    } catch (e) {
      return false;
    }
  }
}
