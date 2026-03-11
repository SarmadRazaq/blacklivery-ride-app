import 'dart:io';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../network/api_client.dart';
import '../constants/api_constants.dart';

class AuthService {
  final ApiClient _apiClient = ApiClient();
  final firebase_auth.FirebaseAuth _firebaseAuth =
      firebase_auth.FirebaseAuth.instance;

  /// Sign in with email/password via Firebase Auth, then fetch backend profile
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      // 1. Authenticate with Firebase to get an ID token
      final credential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      final idToken = await credential.user?.getIdToken();
      if (idToken == null) throw Exception('Failed to get Firebase ID token');

      // 2. Set the token for all future API requests
      _apiClient.setToken(idToken);

      // 3. Fetch profile from backend (uses verifyToken middleware)
      final response = await _apiClient.dio.get('/api/v1/auth/profile');
      return response.data;
    } on firebase_auth.FirebaseAuthException catch (e) {
      throw _handleFirebaseError(e);
    } catch (e) {
      rethrow;
    }
  }

  /// Sign in with Google (native flow)
  Future<Map<String, dynamic>> signInWithGoogle() async {
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
        throw Exception('Google sign-in was cancelled');
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
      if (idToken == null) throw Exception('Failed to get Firebase ID token');

      // 5. Set token for API requests
      _apiClient.setToken(idToken);

      // 6. Notify backend about Google sign-in (creates user if needed)
      await _apiClient.dio.post(
        '/api/v1/auth/google',
        data: {'idToken': idToken, 'role': 'driver'},
      );

      // 7. Fetch and return user profile
      final response = await _apiClient.dio.get('/api/v1/auth/profile');
      return response.data;
    } on firebase_auth.FirebaseAuthException catch (e) {
      throw _handleFirebaseError(e);
    } catch (e) {
      rethrow;
    }
  }

  /// Sign in with Apple (iOS/macOS; optional on Android). Uses same backend flow as Google (Firebase idToken).
  Future<Map<String, dynamic>> signInWithApple() async {
    try {
      final available = await SignInWithApple.isAvailable();
      if (!available) {
        throw Exception('Sign in with Apple is not available on this device');
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

      final userCredential = await _firebaseAuth.signInWithCredential(
        oauthCredential,
      );

      final idToken = await userCredential.user?.getIdToken();
      if (idToken == null) throw Exception('Failed to get Firebase ID token');

      _apiClient.setToken(idToken);

      // Backend accepts Firebase idToken for both Google and Apple (verifyIdToken)
      await _apiClient.dio.post(
        '/api/v1/auth/google',
        data: {'idToken': idToken, 'role': 'driver'},
      );

      final response = await _apiClient.dio.get('/api/v1/auth/profile');
      return response.data;
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) {
        throw Exception('Apple sign-in was cancelled');
      }
      throw Exception(e.message);
    } on firebase_auth.FirebaseAuthException catch (e) {
      throw _handleFirebaseError(e);
    } catch (e) {
      rethrow;
    }
  }

  /// Whether Sign in with Apple is available (e.g. iOS 13+)
  Future<bool> get isAppleSignInAvailable async {
    if (!kIsWeb && !Platform.isIOS && !Platform.isMacOS) return false;
    return SignInWithApple.isAvailable();
  }

  /// Get current user's profile from backend
  Future<Map<String, dynamic>> getProfile() async {
    try {
      // Refresh the ID token before profile fetch
      await _refreshToken();
      final response = await _apiClient.dio.get('/api/v1/auth/profile');
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  /// Update user profile
  Future<Map<String, dynamic>> updateProfile({
    String? fullName,
    String? phoneNumber,
    String? profileImage,
    String? email,
    String? region,
    List<Map<String, String>>? emergencyContacts,
  }) async {
    try {
      final payload = <String, dynamic>{
        'fullName': ?fullName,
        'phoneNumber': ?phoneNumber,
        'profileImage': ?profileImage,
        'email': ?email,
        'region': ?region,
        'emergencyContacts': ?emergencyContacts,
      };

      final response = await _apiClient.dio.patch(
        '/api/v1/auth/profile',
        data: payload,
      );
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  /// Logout from Firebase and backend
  Future<void> logout() async {
    try {
      await _apiClient.dio.post('/api/v1/auth/logout');
    } catch (e) {
      debugPrint('Backend logout error (ignored): $e');
    }
    await _firebaseAuth.signOut();
    _apiClient.clearToken();
  }

  /// Toggle driver online/offline status
  Future<void> toggleOnlineStatus(
    bool isOnline, {
    double? lat,
    double? lng,
    double? heading,
  }) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.availability,
        data: {
          'isOnline': isOnline,
          if (lat != null && lng != null)
            'location': {
              'lat': lat,
              'lng': lng,
              'heading': heading ?? 0,
            },
        },
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Record driver heartbeat to keep online presence fresh on backend
  Future<void> sendHeartbeat({
    required double lat,
    required double lng,
    double? heading,
  }) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.heartbeat,
        data: {
          'location': {
            'lat': lat,
            'lng': lng,
            'heading': heading ?? 0,
          },
        },
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Refresh the Firebase ID token and update ApiClient
  Future<void> _refreshToken() async {
    final user = _firebaseAuth.currentUser;
    if (user != null) {
      final idToken = await user.getIdToken(true);
      if (idToken != null) {
        _apiClient.setToken(idToken);
      }
    }
  }

  /// Check if user is currently signed in
  bool get isSignedIn => _firebaseAuth.currentUser != null;

  /// Get current Firebase user
  firebase_auth.User? get currentUser => _firebaseAuth.currentUser;

  String _handleFirebaseError(firebase_auth.FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Invalid email or password';
      case 'invalid-email':
        return 'Invalid email address';
      case 'user-disabled':
        return 'This account has been disabled';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later';
      case 'network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return e.message ?? 'Authentication failed';
    }
  }
  // 2FA Methods

  /// Send 2FA OTP to user's phone
  Future<Map<String, dynamic>> send2faOtp() async {
    try {
      final response = await _apiClient.dio.post('/api/v1/auth/2fa/send');
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  /// Verify 2FA OTP
  Future<bool> verify2faOtp(String code) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/v1/auth/2fa/verify',
        data: {'code': code},
      );
      return response.data['verified'] == true;
    } catch (e) {
      rethrow;
    }
  }

  /// Toggle 2FA status
  Future<bool> toggle2fa(bool enabled) async {
    try {
      final response = await _apiClient.dio.patch(
        '/api/v1/auth/2fa/toggle',
        data: {'enabled': enabled},
      );
      return response.data['twoFactorEnabled'] == true;
    } catch (e) {
      rethrow;
    }
  }

  /// Link Google Account to existing user
  Future<void> linkGoogleAccount() async {
    try {
      final googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
        serverClientId: '384768177166-79hl5lh708csr19lmfjsodvts70qanrs.apps.googleusercontent.com',
      );
      final googleUser = await googleSignIn.signIn();
      if (googleUser == null) throw Exception('Google sign-in cancelled');

      final googleAuth = await googleUser.authentication;
      final credential = firebase_auth.GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final user = _firebaseAuth.currentUser;
      if (user == null) throw Exception('No user signed in');

      await user.linkWithCredential(credential);

      // Notify backend if needed (optional, depends on backend logic for linking)
      // Usually linking in Firebase is enough for Auth, but if backend tracks providers:
      // await _apiClient.dio.post('/api/v1/auth/link/google', ...);
    } on firebase_auth.FirebaseAuthException catch (e) {
      if (e.code == 'credential-already-in-use') {
        throw Exception(
          'This Google account is already linked to another user.',
        );
      }
      throw _handleFirebaseError(e);
    } catch (e) {
      rethrow;
    }
  }

  /// Change Password
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final user = _firebaseAuth.currentUser;
      if (user == null) throw Exception('No user signed in');

      final email = user.email!;
      final credential = firebase_auth.EmailAuthProvider.credential(
        email: email,
        password: currentPassword,
      );

      // Re-authenticate
      await user.reauthenticateWithCredential(credential);

      // Update password
      await user.updatePassword(newPassword);

      // Optionally notify backend or logout other sessions
    } on firebase_auth.FirebaseAuthException catch (e) {
      throw _handleFirebaseError(e);
    } catch (e) {
      rethrow;
    }
  }

  /// Verify Password (for biometric setup)
  Future<bool> verifyPassword(String password) async {
    try {
      final user = _firebaseAuth.currentUser;
      if (user == null) return false;

      final email = user.email!;
      final credential = firebase_auth.EmailAuthProvider.credential(
        email: email,
        password: password,
      );

      // Attempt to re-authenticate
      await user.reauthenticateWithCredential(credential);
      return true;
    } catch (e) {
      return false;
    }
  }
}
