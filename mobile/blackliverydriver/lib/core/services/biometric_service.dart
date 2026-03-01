import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class BiometricService {
  final LocalAuthentication _auth = LocalAuthentication();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String _biometricEnabledKey = 'biometric_enabled';
  static const String _emailKey = 'biometric_email';
  static const String _passwordKey = 'biometric_password';

  // Check if hardware is available
  Future<bool> get isAvailable async => isDeviceSupported();

  // Alias for legacy calls
  Future<bool> isDeviceSupported() async {
    try {
      final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final bool canAuthenticate =
          canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      return canAuthenticate;
    } on PlatformException catch (_) {
      return false;
    }
  }

  // Check if user has enabled it in settings
  Future<bool> get isEnabled async => isBiometricEnabled();

  // Alias for legacy calls
  Future<bool> isBiometricEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_biometricEnabledKey) ?? false;
  }

  // Toggle setting
  Future<void> setEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_biometricEnabledKey, enabled);
    if (!enabled) {
      // Clear credentials if disabled
      await _storage.delete(key: _emailKey);
      await _storage.delete(key: _passwordKey);
    }
  }

  // Alias
  Future<void> setBiometricEnabled(bool enabled) async => setEnabled(enabled);

  // Authenticate user
  Future<bool> authenticate({
    String reason = 'Please authenticate to proceed',
  }) async {
    try {
      final supported = await isDeviceSupported();
      if (!supported) return false;

      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false,
        ),
      );
    } on PlatformException catch (_) {
      return false;
    }
  }

  // Credential Management for Login Screen
  Future<void> saveCredentials(String email, String password) async {
    await _storage.write(key: _emailKey, value: email);
    await _storage.write(key: _passwordKey, value: password);
    await setEnabled(true);
  }

  Future<Map<String, String>?> getCredentials() async {
    final email = await _storage.read(key: _emailKey);
    final password = await _storage.read(key: _passwordKey);
    if (email != null && password != null) {
      return {'email': email, 'password': password};
    }
    return null;
  }

  Future<bool> hasStoredCredentials() async {
    final creds = await getCredentials();
    return creds != null;
  }
}
