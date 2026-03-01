import 'package:dio/dio.dart';
import '../network/api_client.dart';
import '../constants/api_constants.dart';
import '../../features/ride/data/models/ride_model.dart';

class RideService {
  final ApiClient _apiClient = ApiClient();

  Future<Ride?> getActiveRide() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.activeRide);
      if (response.data['data'] != null) {
        return Ride.fromJson(response.data['data']);
      }
      return null;
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Accept a ride by updating its status to 'accepted'.
  Future<void> acceptRide(String rideId) async {
    await _apiClient.dio.put(
      ApiConstants.rideStatus.replaceFirst('{rideId}', rideId),
      data: {'status': 'accepted'},
    );
  }

  Future<void> updateRideStatus(String rideId, String status, {String? reason}) async {
    try {
      final data = <String, dynamic>{'status': status};
      // Backend requires reason (min 3 chars) when cancelling
      final effectiveReason = status == 'cancelled'
          ? (reason != null && reason.trim().length >= 3 ? reason.trim() : 'Cancelled by driver')
          : reason;
      if (effectiveReason != null) data['reason'] = effectiveReason;
      await _apiClient.dio.put(
        ApiConstants.rideStatus.replaceFirst('{rideId}', rideId),
        data: data,
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<void> rateRider(String rideId, int rating, String? feedback) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.rateRider.replaceFirst('{rideId}', rideId),
        data: {'rating': rating, 'feedback': ?feedback},
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Ride>> getRideHistory({int page = 1, int limit = 20}) async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.driverRides,
        queryParameters: {'page': page, 'limit': limit},
      );
      final list = response.data['data'] as List? ?? [];
      return list.map((e) => Ride.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<int> getUpcomingRideCount() async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.driverRides,
        queryParameters: {'type': 'upcoming', 'page': 1, 'limit': 1},
      );

      final pagination = response.data['pagination'];
      if (pagination is Map<String, dynamic>) {
        final total = pagination['total'];
        if (total is int) return total;
        if (total is num) return total.toInt();
      }

      final list = response.data['data'];
      if (list is List) return list.length;
      return 0;
    } catch (e) {
      rethrow;
    }
  }
}
