import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:blackliveryrider/core/network/api_error_message.dart';

/// Helper to create a DioException with the given properties.
DioException _makeDioError({
  DioExceptionType type = DioExceptionType.unknown,
  int? statusCode,
  dynamic data,
}) {
  Response? response;
  if (statusCode != null || data != null) {
    response = Response(
      requestOptions: RequestOptions(path: '/test'),
      statusCode: statusCode,
      data: data,
    );
  }
  return DioException(
    requestOptions: RequestOptions(path: '/test'),
    type: type,
    response: response,
  );
}

void main() {
  group('apiErrorMessage', () {
    group('extracts explicit error from response data', () {
      test('returns "error" field from response body', () {
        final err = _makeDioError(
          statusCode: 400,
          data: {'error': 'Email already in use'},
        );
        expect(apiErrorMessage(err), 'Email already in use');
      });

      test('returns "message" field from response body', () {
        final err = _makeDioError(
          statusCode: 422,
          data: {'message': 'Invalid ride ID'},
        );
        expect(apiErrorMessage(err), 'Invalid ride ID');
      });

      test('ignores empty/whitespace-only error string', () {
        final err = _makeDioError(
          statusCode: 500,
          data: {'error': '  '},
        );
        // Should fall through to status code check
        expect(apiErrorMessage(err), 'Server error. Please try again shortly.');
      });
    });

    group('timeout errors', () {
      test('connectionTimeout returns timed out', () {
        final err = _makeDioError(type: DioExceptionType.connectionTimeout);
        expect(apiErrorMessage(err), 'Request timed out. Please try again.');
      });

      test('sendTimeout returns timed out', () {
        final err = _makeDioError(type: DioExceptionType.sendTimeout);
        expect(apiErrorMessage(err), 'Request timed out. Please try again.');
      });

      test('receiveTimeout returns timed out', () {
        final err = _makeDioError(type: DioExceptionType.receiveTimeout);
        expect(apiErrorMessage(err), 'Request timed out. Please try again.');
      });
    });

    group('network errors', () {
      test('connectionError returns network failure message', () {
        final err = _makeDioError(type: DioExceptionType.connectionError);
        expect(
          apiErrorMessage(err),
          'Network connection failed. Check your internet and try again.',
        );
      });

      test('badCertificate returns secure connection message', () {
        final err = _makeDioError(type: DioExceptionType.badCertificate);
        expect(
          apiErrorMessage(err),
          'Secure connection failed. Please try again.',
        );
      });

      test('cancel returns cancelled message', () {
        final err = _makeDioError(type: DioExceptionType.cancel);
        expect(apiErrorMessage(err), 'Request cancelled.');
      });
    });

    group('HTTP status codes', () {
      test('401 returns sign in again', () {
        final err = _makeDioError(statusCode: 401);
        expect(apiErrorMessage(err), 'Please sign in again.');
      });

      test('403 returns access denied', () {
        final err = _makeDioError(statusCode: 403);
        expect(apiErrorMessage(err), 'Access denied for this action.');
      });

      test('404 returns not found', () {
        final err = _makeDioError(statusCode: 404);
        expect(apiErrorMessage(err), 'Requested resource was not found.');
      });

      test('500 returns server error', () {
        final err = _makeDioError(statusCode: 500);
        expect(apiErrorMessage(err), 'Server error. Please try again shortly.');
      });

      test('502 also returns server error', () {
        final err = _makeDioError(statusCode: 502);
        expect(apiErrorMessage(err), 'Server error. Please try again shortly.');
      });
    });

    group('fallback', () {
      test('unknown error with no response returns generic message', () {
        final err = _makeDioError();
        expect(apiErrorMessage(err), 'Something went wrong. Please try again.');
      });

      test('non-map response data falls through to status code check', () {
        final err = _makeDioError(statusCode: 403, data: 'plain string');
        expect(apiErrorMessage(err), 'Access denied for this action.');
      });
    });
  });
}
