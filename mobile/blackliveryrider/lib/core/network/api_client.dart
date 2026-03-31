import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../config/env_config.dart';
import '../utils/app_alert.dart';
import 'api_error_message.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late Dio _dio;
  bool _isRefreshing = false;

  /// Max retry attempts for transient failures (5xx, timeout, connection errors)
  static const int _maxRetries = 3;

  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: EnvConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Auth interceptor — attaches Firebase token & handles 401 refresh
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final user = FirebaseAuth.instance.currentUser;
          if (user != null) {
            try {
              final idToken = await user.getIdToken();
              if (idToken != null) {
                options.headers['Authorization'] = 'Bearer $idToken';
              }
            } catch (e) {
              debugPrint('Error getting Firebase ID token: $e');
            }
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          final alreadyRetried = e.requestOptions.extra['_authRetried'] == true;
          if (_isAuthTokenFailure(e) && !_isRefreshing && !alreadyRetried) {
            _isRefreshing = true;

            try {
              final user = FirebaseAuth.instance.currentUser;
              if (user != null) {
                final newToken = await user.getIdToken(true);
                if (newToken != null) {
                  e.requestOptions.extra['_authRetried'] = true;
                  e.requestOptions.headers['Authorization'] =
                      'Bearer $newToken';
                  final response = await _dio.fetch(e.requestOptions);
                  _isRefreshing = false;
                  return handler.resolve(response);
                }
              }
            } catch (refreshError) {
              debugPrint('Error refreshing Firebase token: $refreshError');
            } finally {
              _isRefreshing = false;
            }
          }

          final suppressGlobalError =
              e.requestOptions.extra['suppressGlobalError'] == true;
          if (!suppressGlobalError) {
            AppAlert.showError(apiErrorMessage(e));
          }

          return handler.next(e);
        },
      ),
    );

    // Retry interceptor — retries on 5xx, timeout, and connection errors
    _dio.interceptors.add(_RetryInterceptor(_dio, maxRetries: _maxRetries));
  }

  Dio get dio => _dio;

  bool _isAuthTokenFailure(DioException e) {
    final statusCode = e.response?.statusCode;
    if (statusCode == 401) return true;
    if (statusCode != 403) return false;

    final data = e.response?.data;
    final message = data is Map<String, dynamic>
        ? (data['error'] ?? data['message'] ?? '').toString().toLowerCase()
        : data?.toString().toLowerCase() ?? '';

    return message.contains('unauthorized') ||
        message.contains('invalid token') ||
        message.contains('token');
  }
}

/// Interceptor that retries transient failures with exponential backoff.
///
/// Retries on:
///   - HTTP 5xx server errors
///   - Connection timeout / receive timeout / send timeout
///   - Connection errors (no internet, DNS failure, etc.)
///
/// Does NOT retry:
///   - 4xx client errors (400, 401, 403, 404, etc.)
///   - Request cancellation
///   - Non-idempotent methods (POST) — only GETs, PUTs, DELETEs, PATCHes
class _RetryInterceptor extends Interceptor {
  final Dio _dio;
  final int maxRetries;

  _RetryInterceptor(this._dio, {this.maxRetries = 3});

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final retryCount = err.requestOptions.extra['_retryCount'] as int? ?? 0;

    if (retryCount >= maxRetries || !_shouldRetry(err)) {
      return handler.next(err);
    }

    final nextAttempt = retryCount + 1;
    final delay = Duration(
      milliseconds: 500 * (1 << retryCount),
    ); // 500ms, 1s, 2s
    debugPrint(
      'RetryInterceptor: Attempt $nextAttempt/$maxRetries after ${delay.inMilliseconds}ms for ${err.requestOptions.path}',
    );

    await Future.delayed(delay);

    err.requestOptions.extra['_retryCount'] = nextAttempt;

    try {
      final response = await _dio.fetch(err.requestOptions);
      return handler.resolve(response);
    } on DioException catch (e) {
      return handler.next(e);
    }
  }

  bool _shouldRetry(DioException err) {
    // Don't retry POST (non-idempotent) unless it's safe to do so
    final method = err.requestOptions.method.toUpperCase();
    if (method == 'POST') return false;

    // Never retry 429 — retrying rate-limited requests makes it worse
    final statusCode = err.response?.statusCode;
    if (statusCode == 429) return false;

    // Retry on connection / timeout errors
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.connectionError) {
      return true;
    }

    // Retry on 5xx server errors
    if (statusCode != null && statusCode >= 500) {
      return true;
    }

    return false;
  }
}
