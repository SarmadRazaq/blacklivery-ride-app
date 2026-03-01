import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/chat_model.dart';

class ChatService {
  final ApiClient _apiClient = ApiClient();

  // Helper to fetch messages
  Future<List<ChatMessage>> getMessages(
    String rideId,
    String currentDriverId,
  ) async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.chatMessages.replaceAll('{rideId}', rideId),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['data'] ?? [];
        return data
            .map((json) => ChatMessage.fromJson(json, currentDriverId))
            .toList();
      } else {
        throw Exception('Failed to load messages');
      }
    } catch (e) {
      throw Exception('Error loading messages: $e');
    }
  }

  Future<ChatMessage> sendMessage(
    String rideId,
    String text,
    String currentDriverId,
  ) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.chatMessages.replaceAll('{rideId}', rideId),
        data: {'message': text},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return ChatMessage.fromJson(response.data['data'], currentDriverId);
      } else {
        throw Exception('Failed to send message');
      }
    } catch (e) {
      throw Exception('Error sending message: $e');
    }
  }

  Future<void> markAsRead(String rideId) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.chatRead.replaceAll('{rideId}', rideId),
      );
    } catch (e) {
      // Ignore errors for read receipts
    }
  }
}
