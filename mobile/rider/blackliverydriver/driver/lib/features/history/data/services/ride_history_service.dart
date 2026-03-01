import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../ride/data/models/ride_model.dart';

class RideHistoryService {
  final ApiClient _apiClient = ApiClient();

  Future<List<Ride>> getRideHistory({
    int page = 1,
    int limit = 20,
    String? type,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.driverRides,
        queryParameters: {'page': page, 'limit': limit, 'type': type},
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['data'] ?? [];
        return data.map((json) => Ride.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load ride history');
      }
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Network error occurred');
    } catch (e) {
      throw Exception('An unexpected error occurred');
    }
  }
}
