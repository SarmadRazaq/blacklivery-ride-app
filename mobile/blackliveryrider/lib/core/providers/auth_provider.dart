import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'dart:io';
import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../services/socket_service.dart';
import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  AuthService? _authService;
  AuthService get _service => _authService ??= AuthService();
  User? _user;
  bool _isLoading = false;
  bool _initialized = false;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isLoggedIn => _user != null;
  bool get isInitialized => _initialized;

  /// Check if user has an active Firebase session and load their profile
  Future<void> checkAuthState() async {
    _isLoading = true;
    notifyListeners();

    try {
      final firebaseUser = firebase_auth.FirebaseAuth.instance.currentUser;
      if (firebaseUser != null) {
        // User has an active Firebase session - load their profile
        debugPrint('Firebase user found: ${firebaseUser.email}');
        try {
          final profile = await _service.getProfile();
          // Block driver/admin accounts from using the rider app
          if (profile.role != null && profile.role!.isNotEmpty && profile.role != 'rider') {
            debugPrint('Wrong role: ${profile.role} — signing out');
            await firebase_auth.FirebaseAuth.instance.signOut();
            _user = null;
          } else {
            _user = profile;
            debugPrint('Profile loaded: ${_user?.fullName}');
          }
        } catch (e) {
          debugPrint('Failed to load profile: $e');
          if (e is DioException) {
            final status = e.response?.statusCode;
            if (status == 401 || status == 403) {
              debugPrint('Backend rejected token; signing out stale Firebase session');
              await firebase_auth.FirebaseAuth.instance.signOut();
              _user = null;
            }
          }
          // Profile doesn't exist in backend, but Firebase session is valid
          // Could auto-create profile here if needed
        }
      } else {
        debugPrint('No Firebase session found');
        _user = null;
      }
    } catch (e) {
      debugPrint('Error checking auth state: $e');
      _user = null;
    } finally {
      _isLoading = false;
      _initialized = true;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      _user = await _service.login(email, password);
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> register(
    String email,
    String password,
    String name,
    String phone, {
    String? region,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _service.register(email, password, name, phone, region: region);
      // Registration sends OTP - user will be set after OTP verification
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> verifyEmailOtp(String email, [String? otp]) async {
    _isLoading = true;
    notifyListeners();

    try {
      _user = await _service.verifyEmailOtp(email, otp);
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> resendEmailVerification() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _service.resendEmailVerification();
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> startPhoneVerification(String phone, {String? displayName}) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _service.startPhoneVerification(phone, displayName: displayName);
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Verify phone OTP. Returns true if logged in, false if phone verified but no account exists.
  Future<bool> verifyPhone(String phone, String otp) async {
    _isLoading = true;
    notifyListeners();

    try {
      final user = await _service.verifyPhone(phone, otp);
      if (user != null) {
        _user = user;
        return true; // Existing account — logged in
      }
      return false; // Phone verified, no account — needs signup
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Complete phone-based signup after phone was verified but no account existed.
  Future<void> registerWithVerifiedPhone({
    required String email,
    required String password,
    required String fullName,
    required String phoneNumber,
    String? region,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      _user = await _service.registerWithVerifiedPhone(
        email: email,
        password: password,
        fullName: fullName,
        phoneNumber: phoneNumber,
        region: region,
      );
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> googleSignIn() async {
    _isLoading = true;
    notifyListeners();

    try {
      _user = await _service.signInWithGoogle();
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> appleSignIn() async {
    _isLoading = true;
    notifyListeners();

    try {
      _user = await _service.signInWithApple();
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Refresh user profile from backend
  Future<void> refreshProfile() async {
    try {
      _user = await _service.getProfile();
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to refresh profile: $e');
    }
  }

  Future<void> updateProfile({
    String? fullName,
    String? email,
    String? phoneNumber,
    String? profileImage,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      _user = await _service.updateProfile(
        fullName: fullName,
        email: email,
        phoneNumber: phoneNumber,
        profileImage: profileImage,
      );
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> uploadProfileImage(File file) async {
    _isLoading = true;
    notifyListeners();

    try {
      final imageUrl = await _service.uploadProfileImage(file);
      _user = await _service.updateProfile(profileImage: imageUrl);
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    // Disconnect socket to stop receiving real-time events
    try {
      SocketService().disconnect();
    } catch (e) {
      debugPrint('Failed to disconnect socket during logout: $e');
    }

    // Remove FCM token so the user no longer receives push notifications
    try {
      await NotificationService().removeToken();
    } catch (e) {
      debugPrint('Failed to remove FCM token during logout: $e');
    }

    await _service.logout();
    _user = null;
    notifyListeners();
  }
}
