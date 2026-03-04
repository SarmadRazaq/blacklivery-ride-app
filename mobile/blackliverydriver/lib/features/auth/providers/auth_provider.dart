import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import '../data/models/user_model.dart';
import '../data/services/auth_service.dart' as features_auth;
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/notification_service.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/cache_service.dart';
import '../../../../core/services/connectivity_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  final features_auth.AuthService _featuresAuthService =
      features_auth.AuthService();
  final firebase_auth.FirebaseAuth _firebaseAuth =
      firebase_auth.FirebaseAuth.instance;
  User? _user;
  bool _isLoading = false;
  String? _error;
  bool _isOnline = false;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isOnline => _isOnline;
  bool get isAuthenticated =>
      _user != null && _firebaseAuth.currentUser != null;

  Future<void> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _authService.login(email, password);
      // Parse user from profile response
      _user = User.fromJson(data);
      _isOnline = _user?.driverStatus?.isOnline ?? false;
      CacheService().setJson('user_profile', data);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> getProfile() async {
    try {
      if (!ConnectivityService().isOnline) {
        final cached = CacheService().getJson('user_profile');
        if (cached != null) {
          _user = User.fromJson(cached);
          _isOnline = _user?.driverStatus?.isOnline ?? false;
          notifyListeners();
        }
        return;
      }

      final data = await _authService.getProfile();
      _user = User.fromJson(data);
      _isOnline = _user?.driverStatus?.isOnline ?? false;
      CacheService().setJson('user_profile', data);
      notifyListeners();
    } catch (e) {
      debugPrint('Error fetching profile: $e');
    }
  }

  Future<void> updateProfile({
    String? firstName,
    String? lastName,
    String? phoneNumber,
    String? email,
    String? region,
    List<EmergencyContact>? emergencyContacts,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      String? fullName;
      if (firstName != null || lastName != null) {
        final currentFirst = _user?.firstName ?? '';
        final currentLast = _user?.lastName ?? '';
        fullName = '${firstName ?? currentFirst} ${lastName ?? currentLast}'
            .trim();
      }

      final data = await _authService.updateProfile(
        fullName: fullName,
        phoneNumber: phoneNumber,
        email: email,
        region: region,
        emergencyContacts: emergencyContacts
            ?.map((e) => {'name': e.name, 'phoneNumber': e.phoneNumber})
            .toList(),
      );
      _user = User.fromJson(data);
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> toggleOnlineStatus({double? lat, double? lng, double? heading}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final newStatus = !_isOnline;
      await _authService.toggleOnlineStatus(
        newStatus,
        lat: lat,
        lng: lng,
        heading: heading,
      );
      _isOnline = newStatus;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> sendHeartbeat({
    required double lat,
    required double lng,
    double? heading,
  }) async {
    try {
      await _authService.sendHeartbeat(lat: lat, lng: lng, heading: heading);
    } catch (e) {
      debugPrint('Error sending heartbeat: $e');
    }
  }

  /// Check if user is already authenticated (app restart)
  Future<void> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    final firebaseUser = _firebaseAuth.currentUser;

    if (firebaseUser != null) {
      try {
        // Refresh token and set it for API calls
        final idToken = await firebaseUser.getIdToken(true);
        if (idToken != null) {
          ApiClient().setToken(idToken);
        }
        await getProfile();
      } catch (e) {
        debugPrint('Error restoring session: $e');
        // Token expired or invalid — user needs to re-login
        _user = null;
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> googleSignIn() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _authService.signInWithGoogle();
      _user = User.fromJson(data);
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signInWithApple() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _authService.signInWithApple();
      _user = User.fromJson(data);
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> linkGoogleAccount() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.linkGoogleAccount();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> verifyPassword(String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      return await _authService.verifyPassword(password);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    try {
      await NotificationService().removeToken();
    } catch (e) {
      debugPrint('Failed to remove FCM token during logout: $e');
    }

    await _authService.logout();
    await CacheService().clear();
    _user = null;
    _isOnline = false;
    notifyListeners();
  }

  /// Register a new driver account (Firebase email verification)
  Future<void> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String phone,
    String? region,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _featuresAuthService.register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        region: region,
      );
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Verify Firebase email status and complete backend registration
  Future<void> verifyRegistration({
    required String email,
    required String password,
    required String code,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _featuresAuthService.verifyRegistration(
        email: email,
        password: password,
        code: code,
      );
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> resendEmailVerification() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _featuresAuthService.resendEmailVerification();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> sendOtp(
    String phoneNumber, {
    String? firstName,
    String? lastName,
    String? email,
    String? region,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _featuresAuthService.sendOtp(
        phoneNumber,
        firstName: firstName,
        lastName: lastName,
        email: email,
        region: region,
      );
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Verify phone OTP. Returns true if logged in (existing account),
  /// false if phone verified but no account exists (needs signup).
  Future<bool> verifyOtp(String phoneNumber, String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _featuresAuthService.verifyOtp(phoneNumber, code);
      final token = result['token'] as String?;

      if (token != null && token.isNotEmpty) {
        // Account exists — sign in and fetch profile
        await _firebaseAuth.signInWithCustomToken(token);
        await getProfile();
        return true;
      }

      // Phone verified but no account — caller should show signup form
      return false;
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Complete phone-based signup after OTP verification showed no existing account.
  Future<void> registerWithVerifiedPhone({
    required String email,
    required String password,
    required String fullName,
    required String phoneNumber,
    String? region,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _featuresAuthService.registerWithVerifiedPhone(
        email: email,
        password: password,
        fullName: fullName,
        phoneNumber: phoneNumber,
        region: region,
      );
      await getProfile();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
