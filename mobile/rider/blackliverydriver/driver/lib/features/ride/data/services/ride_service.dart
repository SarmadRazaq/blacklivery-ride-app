import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../models/ride_model.dart';

class RideService {
  final ApiClient _apiClient = ApiClient();

  Future<void> setAvailability(bool isOnline) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.availability,
        data: {'isOnline': isOnline},
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<Ride?> getActiveRide() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.activeRide);
      if (response.data == null || response.data['data'] == null) return null;
      return Ride.fromJson(response.data['data']);
    } catch (e) {
      // 404 might mean no active ride
      return null;
    }
  }

  // Accept is a status update to 'accepted'?
  // Postman says "Driver Accepts Ride" -> PUT /rides/{rideId}/status
  Future<void> updateRideStatus(String rideId, String status, {String? reason}) async {
    try {
      final data = <String, dynamic>{'status': status};
      // Backend requires reason (min 3 chars) when cancelling
      final effectiveReason = status == 'cancelled'
          ? (reason != null && reason.trim().length >= 3 ? reason.trim() : 'Cancelled by driver')
          : reason;
      if (effectiveReason != null) data['reason'] = effectiveReason;
      await _apiClient.dio.put(
        ApiConstants.rideStatus.replaceAll('{rideId}', rideId),
        data: data,
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<void> rateRider(String rideId, int rating, String? feedback) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.rateRider.replaceAll('{rideId}', rideId),
        data: {'rating': rating, 'feedback': feedback},
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Get count of upcoming/scheduled rides
  Future<int> getUpcomingRideCount() async {
    try {
      final response = await _apiClient.dio.get(
        '/api/v1/rides/scheduled',
      );
      final data = response.data;
      if (data is Map && data['data'] is List) {
        return (data['data'] as List).length;
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }
}
