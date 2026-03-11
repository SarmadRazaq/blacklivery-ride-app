import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';

class ChatService {
  final Dio _dio = ApiClient().dio;

  /// Send chat message
  /// Endpoint: POST /api/v1/chat/rides/{{rideId}}/messages
  Future<Map<String, dynamic>?> sendMessage({
    required String rideId,
    required String message,
  }) async {
    try {
      final response = await _dio.post(
        '/api/v1/chat/rides/$rideId/messages',
        data: {'message': message},
      );
      return response.data['data'];
    } catch (e) {
      debugPrint('ChatService.sendMessage error: $e');
      return null;
    }
  }

  /// Get chat messages for a ride
  Future<List<dynamic>> getMessages(String rideId) async {
    try {
      final response = await _dio.get('/api/v1/chat/rides/$rideId/messages');
      return response.data['messages'] ?? response.data['data'] ?? [];
    } catch (e) {
      debugPrint('ChatService.getMessages error: $e');
      return [];
    }
  }
}
