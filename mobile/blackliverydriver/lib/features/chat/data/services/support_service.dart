import '../../../../core/network/api_client.dart';
import '../models/support_ticket_model.dart';

class SupportService {
  final ApiClient _apiClient = ApiClient();

  // GET /api/v1/support
  Future<List<SupportTicket>> getTickets() async {
    try {
      final response = await _apiClient.dio.get('/api/v1/support');

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => SupportTicket.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  // POST /api/v1/support
  Future<SupportTicket> createTicket(String subject, String message) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/v1/support',
        data: {
          'subject': subject,
          'message': message,
          'priority': 'normal', // Default
        },
      );

      if (response.statusCode == 201) {
        return SupportTicket.fromJson(response.data);
      } else {
        throw Exception('Failed to create ticket');
      }
    } catch (e) {
      rethrow;
    }
  }

  // POST /api/v1/support/:id/reply
  Future<void> replyToTicket(String ticketId, String message) async {
    try {
      await _apiClient.dio.post(
        '/api/v1/support/$ticketId/reply',
        data: {'message': message},
      );
    } catch (e) {
      rethrow;
    }
  }
}
