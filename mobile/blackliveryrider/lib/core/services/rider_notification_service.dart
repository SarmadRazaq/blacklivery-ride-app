import 'package:dio/dio.dart';
import '../network/api_client.dart';

class RiderNotification {
  final String id;
  final String title;
  final String body;
  final String type;
  final bool read;
  final DateTime createdAt;
  final Map<String, dynamic>? data;

  RiderNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.read,
    required this.createdAt,
    this.data,
  });

  factory RiderNotification.fromJson(Map<String, dynamic> json) {
    DateTime parsedDate = DateTime.now();
    final raw = json['createdAt'];
    if (raw is String) {
      parsedDate = DateTime.tryParse(raw) ?? DateTime.now();
    } else if (raw is Map && raw['_seconds'] != null) {
      parsedDate = DateTime.fromMillisecondsSinceEpoch(
        (raw['_seconds'] as int) * 1000,
      );
    }

    return RiderNotification(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      body: json['body'] ?? json['message'] ?? '',
      type: json['type'] ?? 'general',
      read: json['read'] == true,
      createdAt: parsedDate,
      data: json['data'] as Map<String, dynamic>?,
    );
  }
}

class RiderNotificationService {
  final Dio _dio = ApiClient().dio;

  Future<List<RiderNotification>> getNotifications({int limit = 30}) async {
    try {
      final response = await _dio.get(
        '/api/v1/auth/notifications',
        queryParameters: {'limit': limit},
      );
      final List<dynamic> raw = response.data['data'] ?? [];
      return raw
          .map((e) => RiderNotification.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<bool> markAllRead() async {
    try {
      await _dio.patch('/api/v1/auth/notifications/read-all');
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> markRead(String id) async {
    try {
      await _dio.patch('/api/v1/auth/notifications/$id/read');
      return true;
    } catch (e) {
      return false;
    }
  }
}
