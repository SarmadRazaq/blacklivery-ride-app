import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';

class SupportService {
  final Dio _dio = ApiClient().dio;

  /// Create support ticket
  /// Endpoint: POST /api/v1/support
  Future<Map<String, dynamic>?> createTicket({
    required String subject,
    required String message,
    String? rideId,
    String? category,
  }) async {
    try {
      final response = await _dio.post(
        '/api/v1/support',
        data: {
          'subject': subject,
          'message': message,
          'rideId': rideId,
          'category': category,
        },
      );
      return response.data['data'];
    } catch (e) {
      debugPrint('SupportService.createTicket error: $e');
      return null;
    }
  }

  /// Get my support tickets
  /// Endpoint: GET /api/v1/support
  Future<List<dynamic>> getMyTickets() async {
    try {
      final response = await _dio.get('/api/v1/support');
      final rawData = response.data;
      if (rawData is Map) {
        return (rawData['data'] as List?) ?? [];
      }
      if (rawData is List) return rawData;
      return [];
    } catch (e) {
      debugPrint('SupportService.getMyTickets error: $e');
      return [];
    }
  }

  /// Reply to support ticket
  /// Endpoint: POST /api/v1/support/{{ticketId}}/reply
  Future<bool> replyToTicket({
    required String ticketId,
    required String message,
  }) async {
    try {
      await _dio.post(
        '/api/v1/support/$ticketId/reply',
        data: {'message': message},
      );
      return true;
    } catch (e) {
      debugPrint('SupportService.replyToTicket error: $e');
      return false;
    }
  }

  /// Get ticket details
  Future<Map<String, dynamic>?> getTicketDetails(String ticketId) async {
    try {
      final response = await _dio.get('/api/v1/support/$ticketId');
      return response.data['data'];
    } catch (e) {
      debugPrint('SupportService.getTicketDetails error: $e');
      return null;
    }
  }
}
