import 'package:dio/dio.dart';

String apiErrorMessage(DioException error) {
  final data = error.response?.data;
  if (data is Map<String, dynamic>) {
    final explicit = data['error'] ?? data['message'];
    if (explicit is String && explicit.trim().isNotEmpty) {
      return explicit;
    }
  }

  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return 'Request timed out. Please try again.';
    case DioExceptionType.connectionError:
      return 'Network connection failed. Check your internet and try again.';
    case DioExceptionType.badCertificate:
      return 'Secure connection failed. Please try again.';
    case DioExceptionType.cancel:
      return 'Request cancelled.';
    default:
      break;
  }

  final statusCode = error.response?.statusCode;
  if (statusCode == 401) return 'Please sign in again.';
  if (statusCode == 403) return 'Access denied for this action.';
  if (statusCode == 404) return 'Requested resource was not found.';
  if (statusCode != null && statusCode >= 500) {
    return 'Server error. Please try again shortly.';
  }

  return 'Something went wrong. Please try again.';
}
