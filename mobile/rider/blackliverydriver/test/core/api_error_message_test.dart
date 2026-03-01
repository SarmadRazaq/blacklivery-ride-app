import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:driver/core/network/api_error_message.dart';

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
        final err = _makeDioError(statusCode: 400, data: {'error': 'Email already in use'});
        expect(apiErrorMessage(err), 'Email already in use');
      });

      test('returns "message" field from response body', () {
        final err = _makeDioError(statusCode: 422, data: {'message': 'Invalid ride ID'});
        expect(apiErrorMessage(err), 'Invalid ride ID');
      });

      test('ignores empty/whitespace-only error string', () {
        final err = _makeDioError(statusCode: 500, data: {'error': '  '});
        expect(apiErrorMessage(err), 'Server error. Please try again shortly.');
      });
    });

    group('timeout errors', () {
      test('connectionTimeout', () {
        expect(apiErrorMessage(_makeDioError(type: DioExceptionType.connectionTimeout)),
            'Request timed out. Please try again.');
      });
      test('sendTimeout', () {
        expect(apiErrorMessage(_makeDioError(type: DioExceptionType.sendTimeout)),
            'Request timed out. Please try again.');
      });
      test('receiveTimeout', () {
        expect(apiErrorMessage(_makeDioError(type: DioExceptionType.receiveTimeout)),
            'Request timed out. Please try again.');
      });
    });

    group('network errors', () {
      test('connectionError', () {
        expect(apiErrorMessage(_makeDioError(type: DioExceptionType.connectionError)),
            'Network connection failed. Check your internet and try again.');
      });
      test('badCertificate', () {
        expect(apiErrorMessage(_makeDioError(type: DioExceptionType.badCertificate)),
            'Secure connection failed. Please try again.');
      });
      test('cancel', () {
        expect(apiErrorMessage(_makeDioError(type: DioExceptionType.cancel)),
            'Request cancelled.');
      });
    });

    group('HTTP status codes', () {
      test('401 → sign in again', () {
        expect(apiErrorMessage(_makeDioError(statusCode: 401)), 'Please sign in again.');
      });
      test('403 → access denied', () {
        expect(apiErrorMessage(_makeDioError(statusCode: 403)), 'Access denied for this action.');
      });
      test('404 → not found', () {
        expect(apiErrorMessage(_makeDioError(statusCode: 404)), 'Requested resource was not found.');
      });
      test('500 → server error', () {
        expect(apiErrorMessage(_makeDioError(statusCode: 500)), 'Server error. Please try again shortly.');
      });
      test('502 → server error', () {
        expect(apiErrorMessage(_makeDioError(statusCode: 502)), 'Server error. Please try again shortly.');
      });
    });

    group('fallback', () {
      test('unknown error with no response', () {
        expect(apiErrorMessage(_makeDioError()), 'Something went wrong. Please try again.');
      });
      test('non-map response data falls through', () {
        expect(apiErrorMessage(_makeDioError(statusCode: 403, data: 'plain string')),
            'Access denied for this action.');
      });
    });
  });
}
