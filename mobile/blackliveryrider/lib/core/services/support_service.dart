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
      final data = <String, dynamic>{
        'subject': subject,
        'message': message,
        if (rideId != null) 'rideId': rideId,
        if (category != null) 'category': category,
      };
      final response = await _dio.post('/api/v1/support', data: data);
      // Backend returns ticket directly (no 'data' wrapper)
      final raw = response.data;
      if (raw is Map<String, dynamic>) {
        return raw['data'] is Map<String, dynamic> ? raw['data'] : raw;
      }
      return null;
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
      final raw = response.data;
      if (raw is Map<String, dynamic>) {
        return raw['data'] is Map<String, dynamic> ? raw['data'] : raw;
      }
      return null;
    } catch (e) {
      debugPrint('SupportService.getTicketDetails error: $e');
      return null;
    }
  }

  /// Close a support ticket
  /// Endpoint: POST /api/v1/support/:ticketId/close
  Future<bool> closeTicket(String ticketId) async {
    try {
      await _dio.post('/api/v1/support/$ticketId/close');
      return true;
    } catch (e) {
      debugPrint('SupportService.closeTicket error: $e');
      return false;
    }
  }
}
