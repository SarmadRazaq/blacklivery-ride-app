import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:dio/dio.dart';
import 'dart:async';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';

class AuthService {
  final ApiClient _apiClient = ApiClient();
  final firebase_auth.FirebaseAuth _firebaseAuth =
      firebase_auth.FirebaseAuth.instance;
  static String? _pendingEmail;

  // Send phone OTP via backend (Twilio Verify)
  Future<void> sendOtp(
    String phoneNumber, {
    String? firstName,
    String? lastName,
    String? email,
    String? region,
  }) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.sendOtp,
        data: {'phoneNumber': phoneNumber},
        options: Options(extra: {'suppressGlobalError': true}),
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Verify phone OTP via backend (Twilio Verify).
  /// Returns a map with 'verified' and optionally 'token' if an account exists.
  Future<Map<String, dynamic>> verifyOtp(String phoneNumber, String code) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.verifyOtp,
        data: {
          'phoneNumber': phoneNumber,
          'code': code,
        },
        options: Options(extra: {'suppressGlobalError': true}),
      );

      final data = response.data is Map<String, dynamic>
          ? response.data as Map<String, dynamic>
          : <String, dynamic>{};

      return {
        'verified': true,
        'token': data['token'],
        'data': data['data'],
      };
    } catch (e) {
      rethrow;
    }
  }

  /// Complete registration using a phone number that was already verified via OTP.
  Future<Map<String, dynamic>> registerWithVerifiedPhone({
    required String email,
    required String password,
    required String fullName,
    required String phoneNumber,
    String? region,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/v1/auth/register-with-phone',
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
          'fullName': fullName,
          'phoneNumber': phoneNumber,
          'role': 'driver',
          if (region != null) 'region': region,
        },
        options: Options(extra: {'suppressGlobalError': true}),
      );

      // Auto-login with custom token if returned
      final token = response.data is Map<String, dynamic>
          ? (response.data as Map<String, dynamic>)['token'] as String?
          : null;

      if (token != null && token.isNotEmpty) {
        await _firebaseAuth.signInWithCustomToken(token);
      } else {
        // Fallback: sign in with email/password
        await _firebaseAuth.signInWithEmailAndPassword(
          email: email.trim().toLowerCase(),
          password: password,
        );
      }

      return response.data is Map<String, dynamic>
          ? response.data as Map<String, dynamic>
          : <String, dynamic>{};
    } catch (e) {
      rethrow;
    }
  }

  // Step 1: Start registration (backend pending signup + email OTP)
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String phone,
    String? region,
  }) async {
    try {
      final fullName = '$firstName $lastName'.trim();

      await _apiClient.dio.post(
        ApiConstants.register,
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
          'fullName': fullName,
          'phoneNumber': phone,
          'role': 'driver',
          'region': region,
        },
        options: Options(extra: {'suppressGlobalError': true}),
      );

      _pendingEmail = email.trim().toLowerCase();

      return {
        'message': 'Verification OTP sent to email',
        'email': email,
      };
    } catch (e) {
      rethrow;
    }
  }

  // Step 2: Verify email OTP, then sign in to Firebase (user is created only after OTP)
  Future<Map<String, dynamic>> verifyRegistration({
    required String email,
    required String password,
    required String code,
  }) async {
    try {
      final normalizedEmail = email.trim().toLowerCase();
      final verifyResponse = await _apiClient.dio.post(
        ApiConstants.registerVerify,
        data: {
          'email': normalizedEmail,
          'otp': code,
          'password': password,
        },
        options: Options(extra: {'suppressGlobalError': true}),
      );

      await _firebaseAuth.signInWithEmailAndPassword(
        email: normalizedEmail,
        password: password,
      );

      _pendingEmail = null;

      return (verifyResponse.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> resendEmailVerification() async {
    final email = _pendingEmail ?? _firebaseAuth.currentUser?.email;
    if (email == null || email.isEmpty) {
      throw Exception('No active Firebase email session. Please register again.');
    }

    await _apiClient.dio.post(
      '/api/v1/auth/register/resend',
      data: {'email': email.trim().toLowerCase()},
      options: Options(extra: {'suppressGlobalError': true}),
    );
  }

  // Submit additional onboarding details
  Future<void> submitOnboarding(Map<String, dynamic> onboardingData) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.driverOnboarding,
        data: onboardingData,
      );
    } catch (e) {
      rethrow;
    }
  }

  // Get application status
  Future<Map<String, dynamic>> getApplicationStatus() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.driverApplication);
      return response.data;
    } catch (e) {
      rethrow;
    }
  }
}
