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

  // Verify phone OTP via backend (Twilio Verify)
  Future<bool> verifyOtp(String phoneNumber, String code) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.verifyOtp,
        data: {
          'phoneNumber': phoneNumber,
          'code': code,
        },
        options: Options(extra: {'suppressGlobalError': true}),
      );

      return true;
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
