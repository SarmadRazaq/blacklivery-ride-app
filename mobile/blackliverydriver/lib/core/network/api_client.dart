import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:uuid/uuid.dart';
import '../constants/api_constants.dart';
import '../utils/app_alert.dart';
import 'api_error_message.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  late Dio _dio;
  String? _authToken;

  /// Max retry attempts for transient failures (5xx, timeout, connection errors)
  static const int _maxRetries = 3;

  factory ApiClient() {
    return _instance;
  }

  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Idempotency interceptor — auto-adds Idempotency-Key for state-changing methods
    const uuid = Uuid();
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final method = options.method.toUpperCase();
          if (['POST', 'PUT', 'PATCH'].contains(method) &&
              options.headers['Idempotency-Key'] == null) {
            options.headers['Idempotency-Key'] = uuid.v4();
          }
          return handler.next(options);
        },
      ),
    );

    // Auth interceptor — attaches Firebase token & handles 401 refresh
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Auto-refresh Firebase token before each request
          final user = firebase_auth.FirebaseAuth.instance.currentUser;
          if (user != null) {
            try {
              final idToken = await user.getIdToken();
              if (idToken != null && idToken.isNotEmpty) {
                _authToken = idToken;
              }
            } catch (e) {
              debugPrint('API: Failed to get Firebase token on request: $e');
              _authToken = null;
              try {
                await firebase_auth.FirebaseAuth.instance.signOut();
              } catch (signOutError) {
                debugPrint('API: Failed to sign out stale Firebase session: $signOutError');
              }
            }
          }
          if (_authToken != null) {
            options.headers['Authorization'] = 'Bearer $_authToken';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            // Try refreshing Firebase token
            final user = firebase_auth.FirebaseAuth.instance.currentUser;
            if (user != null) {
              try {
                final newToken = await user.getIdToken(true);
                if (newToken != null) {
                  _authToken = newToken;
                  // Retry the request with new token
                  e.requestOptions.headers['Authorization'] = 'Bearer $newToken';
                  final response = await _dio.fetch(e.requestOptions);
                  return handler.resolve(response);
                }
              } catch (_) {
                debugPrint('API: Token refresh failed — clearing session');
              }
            }
            clearToken();
          }

          final suppressGlobalError =
              e.requestOptions.extra['suppressGlobalError'] == true;
          if (!suppressGlobalError) {
            AppAlert.showError(apiErrorMessage(e));
          }

          if (e.response != null) {
            debugPrint('API Error: ${e.message}');
            debugPrint('Status: ${e.response?.statusCode}');
            debugPrint('Data: ${e.response?.data}');
          }
          return handler.next(e);
        },
      ),
    );

    // Retry interceptor — retries on 5xx, timeout, and connection errors
    _dio.interceptors.add(_RetryInterceptor(_dio, maxRetries: _maxRetries));
  }

  Dio get dio => _dio;

  void setToken(String token) {
    _authToken = token;
  }

  void clearToken() {
    _authToken = null;
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
    final delay = Duration(milliseconds: 500 * (1 << retryCount)); // 500ms, 1s, 2s
    debugPrint('RetryInterceptor: Attempt $nextAttempt/$maxRetries after ${delay.inMilliseconds}ms for ${err.requestOptions.path}');

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
