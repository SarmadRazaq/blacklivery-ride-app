import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'dart:async';
import 'dart:io';
import '../network/api_client.dart';
import '../network/api_error_message.dart';
import '../models/user_model.dart';
import 'firebase_storage_service.dart';

/// Thrown when a user with the wrong role tries to log into this app.
class RoleException implements Exception {
  final String message;
  RoleException(this.message);
  @override
  String toString() => message;
}

class AuthService {
  final firebase_auth.FirebaseAuth _firebaseAuth =
      firebase_auth.FirebaseAuth.instance;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final FirebaseStorageService _firebaseStorageService =
      FirebaseStorageService();

  /// Transient in-memory holder for password during registration flow.
  /// Never persisted to storage.
  static String? _pendingPassword;
  static String? _pendingDisplayName;

  /// Validate the logged-in user has the 'rider' role.
  /// If the account is a driver, sign out immediately and throw.
  User _validateRiderRole(User user) {
    if (user.role != null && user.role!.isNotEmpty && user.role != 'rider') {
      _firebaseAuth.signOut();
      throw RoleException(
        'This account is registered as a ${user.role}. '
        'Please use the ${user.role == "driver" ? "Driver" : user.role!} app instead.',
      );
    }
    return user;
  }

  /// Get current Firebase user
  firebase_auth.User? get currentUser => _firebaseAuth.currentUser;

  /// Get auth headers with fresh Firebase ID token
  Future<Map<String, String>> getAuthHeaders() async {
    final user = _firebaseAuth.currentUser;
    if (user == null) throw Exception('Not logged in');

    final idToken = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $idToken',
    };
  }

  /// Login with email and password using Firebase
  Future<User> login(String email, String password) async {
    try {
      // Sign in with Firebase Client SDK
      debugPrint('=== AuthService.login: Signing in with Firebase... ===');
      final credential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      debugPrint(
        '=== AuthService.login: Firebase sign-in SUCCESS, uid=${credential.user!.uid} ===',
      );

      // Get ID token to verify Firebase auth worked
      debugPrint('=== AuthService.login: Getting ID token... ===');
      final idToken = await credential.user!.getIdToken();
      debugPrint(
        '=== AuthService.login: Got ID token (length=${idToken?.length}) ===',
      );
      assert(
        idToken != null,
        'Firebase ID token should not be null after sign-in',
      );

      // Fetch profile from backend using the Firebase token
      try {
        debugPrint(
          '=== AuthService.login: Fetching profile from backend... ===',
        );
        final user = await getProfile();
        debugPrint(
          '=== AuthService.login: Profile fetched: ${user.fullName} (role=${user.role}) ===',
        );

        // Record login on backend for session tracking and login history
        try {
          final dio = ApiClient().dio;
          await dio.post('/api/v1/auth/login', data: {'email': email});
        } catch (loginRecordError) {
          // Non-critical — don't block login if session recording fails
          debugPrint('=== AuthService.login: Failed to record login session: $loginRecordError ===');
        }

        return _validateRiderRole(user);
      } on RoleException {
        rethrow;
      } catch (profileError) {
        debugPrint(
          '=== AuthService.login: Profile not found ($profileError), creating backend profile... ===',
        );
        return await _createBackendProfile(email, credential.user!);
      }
    } on firebase_auth.FirebaseAuthException catch (e) {
      debugPrint(
        '=== AuthService.login: Firebase Auth ERROR: ${e.code} - ${e.message} ===',
      );
      throw _handleFirebaseError(e);
    } catch (e) {
      debugPrint('=== AuthService.login: UNEXPECTED ERROR: $e ===');
      throw e.toString();
    }
  }

  /// Sign in with Google (native flow)
  Future<User> signInWithGoogle() async {
    try {
      // 1. Trigger native Google Sign-In
      // serverClientId is the Web Client ID from google-services.json (client_type: 3)
      // Required for google_sign_in 6.x to obtain the idToken on Android
      final googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
        serverClientId: '384768177166-79hl5lh708csr19lmfjsodvts70qanrs.apps.googleusercontent.com',
      );
      final googleUser = await googleSignIn.signIn();
      if (googleUser == null) {
        throw 'Google sign-in was cancelled';
      }

      // 2. Get auth credentials from Google
      final googleAuth = await googleUser.authentication;
      final credential = firebase_auth.GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // 3. Sign into Firebase with the Google credential
      final userCredential = await _firebaseAuth.signInWithCredential(
        credential,
      );

      // 4. Get Firebase ID token
      final idToken = await userCredential.user!.getIdToken();
      if (idToken == null) throw 'Failed to get Firebase ID token';

      // 5. Notify backend about Google sign-in (creates user if needed)
      final dio = ApiClient().dio;
      await dio.post(
        '/api/v1/auth/google',
        data: {'idToken': idToken, 'role': 'rider'},
      );

      // 6. Fetch and return user profile
      try {
        final user = await getProfile();
        return _validateRiderRole(user);
      } on RoleException {
        rethrow;
      } catch (_) {
        return await _createBackendProfile(
          userCredential.user!.email ?? googleUser.email,
          userCredential.user!,
        );
      }
    } on firebase_auth.FirebaseAuthException catch (e) {
      throw _handleFirebaseError(e);
    } catch (e) {
      if (e is String) rethrow;
      throw e.toString();
    }
  }

  /// Sign in with Apple (iOS/macOS)
  Future<User> signInWithApple() async {
    try {
      final available = await SignInWithApple.isAvailable();
      if (!available) {
        throw 'Sign in with Apple is not available on this device';
      }

      final appleCredential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      final oauthCredential = firebase_auth.OAuthProvider('apple.com')
          .credential(
            idToken: appleCredential.identityToken,
            accessToken: appleCredential.authorizationCode,
          );

      // Sign into Firebase
      final userCredential = await _firebaseAuth.signInWithCredential(
        oauthCredential,
      );

      // Get Firebase ID token
      final idToken = await userCredential.user!.getIdToken();
      if (idToken == null) throw 'Failed to get Firebase ID token';

      // Notify backend
      final dio = ApiClient().dio;
      await dio.post(
        '/api/v1/auth/google', // Backend treats this endpoint as general OAuth token exchanger
        data: {'idToken': idToken, 'role': 'rider'},
      );

      // Fetch/Create profile
      try {
        final user = await getProfile();
        return _validateRiderRole(user);
      } on RoleException {
        rethrow;
      } catch (_) {
        // Use Apple-info if available, otherwise fallback
        final email = userCredential.user!.email ?? appleCredential.email;
        return await _createBackendProfile(
          email ?? 'apple_user_${userCredential.user!.uid}',
          userCredential.user!,
        );
      }
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) {
        throw 'Apple sign-in was cancelled';
      }
      throw e.message;
    } on firebase_auth.FirebaseAuthException catch (e) {
      throw _handleFirebaseError(e);
    } catch (e) {
      if (e is String) rethrow;
      throw e.toString();
    }
  }

  /// Whether Sign in with Apple is available
  Future<bool> get isAppleSignInAvailable async {
    if (!kIsWeb && !Platform.isIOS && !Platform.isMacOS) return false;
    return SignInWithApple.isAvailable();
  }

  /// Create profile in backend for existing Firebase user
  Future<User> _createBackendProfile(
    String email,
    firebase_auth.User firebaseUser,
  ) async {
    final dio = ApiClient().dio;
    try {
      final response = await dio.post(
        '/api/v1/auth/register-firebase',
        data: {
          'displayName': firebaseUser.displayName ?? email.split('@')[0],
          'phoneNumber': firebaseUser.phoneNumber ?? '',
          'role': 'rider',
        },
      );
      return User.fromJson(response.data['user'] ?? response.data['data']);
    } on DioException catch (e) {
      // If user already exists, try to get their profile
      if (e.response?.statusCode == 409 || e.response?.statusCode == 400) {
        return await getProfile();
      }
      rethrow;
    }
  }

  /// Start backend pending-signup flow and send email OTP.
  Future<void> register(
    String email,
    String password,
    String name,
    String phone, {
    String? region,
  }) async {
    try {
      await ApiClient().dio.post(
        '/api/v1/auth/register',
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
          'fullName': name,
          'phoneNumber': phone,
          'role': 'rider',
          'region': region,
        },
        options: Options(extra: {'suppressGlobalError': true}),
      );

      // Store email temporarily for verification completion
      await _storage.write(key: 'pendingEmail', value: email.trim().toLowerCase());
      // Keep password in memory only for verification completion.
      // Never persisted to storage for security.
      _pendingPassword = password;
      _pendingDisplayName = name;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Verify email OTP after registration.
  Future<User> verifyEmailOtp(String email, [String? otp]) async {
    try {
      final password = _pendingPassword;
      if (password == null || password.isEmpty) {
        throw Exception(
          'Registration session expired. Please sign up again before verification.',
        );
      }

      final code = otp?.trim() ?? '';
      if (code.length != 6) {
        throw Exception('A valid 6-digit OTP is required.');
      }

      await ApiClient().dio.post(
        '/api/v1/auth/register/verify',
        data: {
          'email': email.trim().toLowerCase(),
          'otp': code,
          'password': password,
        },
        options: Options(extra: {'suppressGlobalError': true}),
      );

      final credential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email.trim().toLowerCase(),
        password: password,
      );

      final refreshedUser = credential.user;

      if (refreshedUser == null) {
        throw Exception('Unable to refresh Firebase session');
      }

      // Clear pending credentials immediately
      await _storage.delete(key: 'pendingEmail');
      _pendingPassword = null;
      final pendingName = _pendingDisplayName;
      _pendingDisplayName = null;

      try {
        final user = await getProfile();
        return _validateRiderRole(user);
      } on RoleException {
        rethrow;
      } catch (_) {
        if (pendingName != null && pendingName.isNotEmpty) {
          await refreshedUser.updateDisplayName(pendingName);
        }
        return await _createBackendProfile(email, refreshedUser);
      }
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> resendEmailVerification() async {
    final pendingEmail = await _storage.read(key: 'pendingEmail');
    final email = pendingEmail ?? _firebaseAuth.currentUser?.email;
    if (email == null || email.isEmpty) {
      throw Exception('No active Firebase email session. Please register again.');
    }

    await ApiClient().dio.post(
      '/api/v1/auth/register/resend',
      data: {'email': email.trim().toLowerCase()},
      options: Options(extra: {'suppressGlobalError': true}),
    );
  }

  /// Start phone verification
  Future<void> startPhoneVerification(String phone, {String? displayName}) async {
    try {
      await ApiClient().dio.post(
        '/api/v1/auth/phone/start',
        data: {
          'phoneNumber': phone,
          if (displayName != null) 'displayName': displayName,
        },
        options: Options(extra: {'suppressGlobalError': true}),
      );
    } catch (e) {
      throw e.toString();
    }
  }

  /// Verify phone with OTP.
  /// Returns a [User] if the phone is linked to an existing account.
  /// Returns null if the phone was verified but no account exists (phone-based signup flow).
  Future<User?> verifyPhone(String phone, String otp) async {
    try {
      final response = await ApiClient().dio.post(
        '/api/v1/auth/phone/verify',
        data: {
          'phoneNumber': phone,
          'code': otp,
        },
        options: Options(extra: {'suppressGlobalError': true}),
      );

      final token = response.data is Map<String, dynamic>
          ? response.data['token'] as String?
          : null;

      if (token != null && token.isNotEmpty) {
        await _firebaseAuth.signInWithCustomToken(token);
      }

      try {
        final user = await getProfile();
        return _validateRiderRole(user);
      } on RoleException {
        rethrow;
      } catch (profileError) {
        if (_firebaseAuth.currentUser == null) {
          // Phone verified but no account — signal caller to show signup form
          return null;
        }
        rethrow;
      }
    } on DioException catch (e) {
      throw apiErrorMessage(e);
    } catch (e) {
      // If it's already a clean string, pass it through
      final msg = e.toString();
      if (msg.contains('DioException') || msg.contains('bad response')) {
        throw 'Verification failed. Please check your code and try again.';
      }
      throw msg;
    }
  }

  /// Complete registration using a phone number that was already verified via OTP.
  /// Called after verifyPhone returns null (no existing account).
  Future<User> registerWithVerifiedPhone({
    required String email,
    required String password,
    required String fullName,
    required String phoneNumber,
    String? region,
  }) async {
    try {
      final response = await ApiClient().dio.post(
        '/api/v1/auth/register-with-phone',
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
          'fullName': fullName,
          'phoneNumber': phoneNumber,
          'role': 'rider',
          if (region != null) 'region': region,
        },
        options: Options(extra: {'suppressGlobalError': true}),
      );

      // Auto-login with custom token if returned
      final token = response.data is Map<String, dynamic>
          ? response.data['token'] as String?
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

      return await getProfile();
    } on DioException catch (e) {
      throw apiErrorMessage(e);
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('DioException') || msg.contains('bad response')) {
        throw 'Registration failed. Please try again.';
      }
      throw msg;
    }
  }

  /// Get user profile from backend
  Future<User> getProfile() async {
    final dio = ApiClient().dio;
    try {
      final response = await dio.get('/api/v1/auth/profile');
      // Backend getProfile returns raw data, not wrapped in 'data'
      final data = response.data['data'] ?? response.data;

      if (data == null) {
        throw 'User profile not found. Please register first.';
      }
      return _mergeWithFirebaseAuth(
        User.fromJson(data as Map<String, dynamic>),
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Update user profile
  Future<User> updateProfile({
    String? fullName,
    String? email,
    String? phoneNumber,
    String? profileImage,
  }) async {
    final dio = ApiClient().dio;
    try {
      // Only include non-null fields to avoid overwriting existing data
      // (backend treats null as an intentional clear since JS null !== undefined)
      final data = <String, dynamic>{};
      if (fullName != null) data['fullName'] = fullName;
      if (email != null) data['email'] = email;
      if (phoneNumber != null) data['phoneNumber'] = phoneNumber;
      if (profileImage != null) data['profileImage'] = profileImage;

      final response = await dio.patch(
        '/api/v1/auth/profile',
        data: data,
      );
      final respData = response.data['data'] ?? response.data;
      return _mergeWithFirebaseAuth(
        User.fromJson(respData as Map<String, dynamic>),
      );
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Fill missing email/phone/photo from Firebase Auth when Firestore doc
  /// doesn't have them (e.g. user signed up via Google or phone only).
  User _mergeWithFirebaseAuth(User user) {
    final fbUser = _firebaseAuth.currentUser;
    if (fbUser == null) return user;

    final needsEmail = user.email.isEmpty && (fbUser.email ?? '').isNotEmpty;
    final needsPhone = user.phone.isEmpty && (fbUser.phoneNumber ?? '').isNotEmpty;
    final needsPhoto = (user.profileImage == null || user.profileImage!.isEmpty) &&
        (fbUser.photoURL ?? '').isNotEmpty;

    if (!needsEmail && !needsPhone && !needsPhoto) return user;

    return User(
      id: user.id,
      email: needsEmail ? fbUser.email! : user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: needsPhone ? fbUser.phoneNumber! : user.phone,
      profileImage: needsPhoto ? fbUser.photoURL : user.profileImage,
      region: user.region,
      role: user.role,
      rating: user.rating,
      totalTrips: user.totalTrips,
      driverDetails: user.driverDetails,
      twoFactorEnabled: user.twoFactorEnabled,
    );
  }

  Future<String> uploadProfileImage(File file) async {
    final imageUrl = await _firebaseStorageService.uploadRiderProfileImage(file);
    await _firebaseAuth.currentUser?.updatePhotoURL(imageUrl);
    return imageUrl;
  }

  /// Logout
  Future<void> logout() async {
    try {
      await _firebaseAuth.signOut();
    } catch (e) {
      // Ignore Firebase signout errors
    }

    final dio = ApiClient().dio;
    try {
      await dio.post('/api/v1/auth/logout');
    } catch (e) {
      // Ignore backend logout errors
    } finally {
      await _storage.delete(key: 'accessToken');
      await _storage.delete(key: 'refreshToken');
    }
  }

  /// Password reset request
  Future<void> requestPasswordReset(String email) async {
    try {
      await _firebaseAuth.sendPasswordResetEmail(email: email);
    } on firebase_auth.FirebaseAuthException catch (e) {
      throw _handleFirebaseError(e);
    }
  }

  /// Change password (re-authenticate then update)
  Future<void> changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    try {
      final user = _firebaseAuth.currentUser;
      if (user == null || user.email == null) {
        throw 'No user logged in';
      }

      // Re-authenticate
      final credential = firebase_auth.EmailAuthProvider.credential(
        email: user.email!,
        password: currentPassword,
      );
      await user.reauthenticateWithCredential(credential);

      // Update password
      await user.updatePassword(newPassword);
    } on firebase_auth.FirebaseAuthException catch (e) {
      throw _handleFirebaseError(e);
    }
  }

  /// Get active sessions
  Future<List<Map<String, dynamic>>> getActiveSessions() async {
    final dio = ApiClient().dio;
    try {
      final response = await dio.get('/api/v1/auth/sessions');
      final data = response.data['data'] as List? ?? [];
      return data.map((e) => e as Map<String, dynamic>).toList();
    } catch (e) {
      return [];
    }
  }

  /// Revoke a specific session
  Future<void> revokeSession(String sessionId) async {
    final dio = ApiClient().dio;
    try {
      await dio.delete('/api/v1/auth/sessions/$sessionId');
    } catch (e) {
      rethrow;
    }
  }

  /// Revoke all sessions except current
  Future<void> revokeAllSessions() async {
    final dio = ApiClient().dio;
    try {
      await dio.delete('/api/v1/auth/sessions');
    } catch (e) {
      rethrow;
    }
  }

  /// Get login history
  Future<List<Map<String, dynamic>>> getLoginHistory() async {
    final dio = ApiClient().dio;
    try {
      final response = await dio.get('/api/v1/auth/login-history');
      final data = response.data['data'] as List? ?? [];
      return data.map((e) => e as Map<String, dynamic>).toList();
    } catch (e) {
      return [];
    }
  }

  /// Delete account
  Future<void> deleteAccount(String password) async {
    try {
      final user = _firebaseAuth.currentUser;
      if (user == null || user.email == null) {
        throw 'No user logged in';
      }

      // Re-authenticate before deletion
      final credential = firebase_auth.EmailAuthProvider.credential(
        email: user.email!,
        password: password,
      );
      await user.reauthenticateWithCredential(credential);

      // Delete from backend first
      final dio = ApiClient().dio;
      await dio.delete('/api/v1/auth/account');

      // Delete from Firebase
      await user.delete();

      // Clear local storage
      await _storage.delete(key: 'accessToken');
      await _storage.delete(key: 'refreshToken');
    } on firebase_auth.FirebaseAuthException catch (e) {
      throw _handleFirebaseError(e);
    }
  }

  /// Refresh token
  Future<String?> refreshToken() async {
    try {
      final user = _firebaseAuth.currentUser;
      if (user == null) return null;

      final idToken = await user.getIdToken(true);
      await _storage.write(key: 'accessToken', value: idToken);
      return idToken;
    } catch (e) {
      await _storage.delete(key: 'accessToken');
      return null;
    }
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final user = _firebaseAuth.currentUser;
    if (user != null) {
      return true;
    }
    final token = await _storage.read(key: 'accessToken');
    return token != null;
  }

  /// Get current Firebase user
  firebase_auth.User? get currentFirebaseUser => _firebaseAuth.currentUser;

  String _handleFirebaseError(firebase_auth.FirebaseAuthException e) {
    debugPrint('Firebase Auth Error - code: ${e.code}, message: ${e.message}');
    switch (e.code) {
      case 'user-not-found':
        return 'No user found with this email';
      case 'wrong-password':
        return 'Incorrect password';
      case 'invalid-credential':
      case 'invalid-login-credentials':
      case 'INVALID_LOGIN_CREDENTIALS':
        return 'Invalid email or password. Please check your credentials.';
      case 'email-already-in-use':
        return 'Email is already registered';
      case 'weak-password':
        return 'Password is too weak';
      case 'invalid-email':
        return 'Invalid email address';
      case 'user-disabled':
        return 'This account has been disabled';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later';
      case 'requires-recent-login':
        return 'Please login again to perform this action';
      case 'operation-not-allowed':
        return 'Email/password sign-in is not enabled. Please enable it in Firebase Console.';
      default:
        return e.message ?? 'Authentication error: ${e.code}';
    }
  }

  String _handleError(dynamic e) {
    if (e is DioException) {
      if (e.response != null) {
        final data = e.response!.data;
        if (data is Map<String, dynamic>) {
          if (data.containsKey('message')) return data['message'];
          if (data.containsKey('error')) return data['error'];
        }
      }
      return 'Network error: ${e.message}';
    }
    return e.toString();
  }

  /// Send 2FA OTP
  Future<Map<String, dynamic>> send2faOtp() async {
    final dio = ApiClient().dio;
    try {
      final response = await dio.post('/api/v1/auth/2fa/send');
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Verify 2FA OTP
  Future<bool> verify2faOtp(String code) async {
    final dio = ApiClient().dio;
    try {
      final response = await dio.post(
        '/api/v1/auth/2fa/verify',
        data: {'code': code},
      );
      return response.data['verified'] == true;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Toggle 2FA
  Future<bool> toggle2fa(bool enabled) async {
    final dio = ApiClient().dio;
    try {
      final response = await dio.patch(
        '/api/v1/auth/2fa/toggle',
        data: {'enabled': enabled},
      );
      return response.data['twoFactorEnabled'] == true;
    } catch (e) {
      throw _handleError(e);
    }
  }
}
