import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Centralized environment configuration loaded from `.env` via flutter_dotenv.
///
/// Call [EnvConfig.load()] once in `main()` before accessing any property.
class EnvConfig {
  EnvConfig._();

  static bool _loaded = false;
  static const int _localDevPort = 5000;

  /// Load the `.env` asset. Safe to call multiple times — subsequent calls are no-ops.
  static Future<void> load() async {
    if (_loaded) return;
    await dotenv.load(fileName: '.env');
    _loaded = true;
  }

  // ─── API ───────────────────────────────────────────────────────────

  /// Backend base URL.
  /// Falls back to platform-appropriate localhost for development.
  static String get apiBaseUrl {
    final value = dotenv.env['API_BASE_URL'] ?? '';
    if (value.isNotEmpty) return value;

    // Dev-only fallbacks
    if (kIsWeb) return 'http://localhost:$_localDevPort';
    if (Platform.isAndroid) return 'http://10.0.2.2:$_localDevPort';
    return 'http://localhost:$_localDevPort'; // iOS simulator
  }

  // ─── Google Maps ───────────────────────────────────────────────────

  /// Google Maps / Directions API key.
  static String get googleMapsApiKey => dotenv.env['GOOGLE_MAPS_API_KEY'] ?? '';

  // ─── Region ────────────────────────────────────────────────────────

  /// Default region code (e.g. `nigeria`, `chicago`).
  static String get defaultRegion => dotenv.env['DEFAULT_REGION'] ?? 'nigeria';

  // ─── Payment SDKs ──────────────────────────────────────────────────

  /// Stripe publishable key for `flutter_stripe` SDK.
  static String get stripePublishableKey =>
      dotenv.env['STRIPE_PUBLISHABLE_KEY'] ?? '';

  /// Paystack public key for `flutter_paystack_plus` SDK.
  static String get paystackPublicKey =>
      dotenv.env['PAYSTACK_PUBLIC_KEY'] ?? '';

  /// Flutterwave public key for `flutterwave_standard` SDK.
  static String get flutterwavePublicKey =>
      dotenv.env['FLUTTERWAVE_PUBLIC_KEY'] ?? '';

  /// Whether the app is running in production mode.
  static bool get isProduction =>
      const bool.fromEnvironment('dart.vm.product');

  // ─── Password Reset ────────────────────────────────────────────────

  /// Redirect URL appended to Firebase password-reset emails.
  static String get passwordResetRedirectUrl =>
      dotenv.env['PASSWORD_RESET_REDIRECT_URL'] ?? '';
}
