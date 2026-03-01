import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb, kReleaseMode;

class ApiConstants {
  /// Pass at build time: flutter build apk --dart-define=API_BASE_URL=https://api.blacklivery.com
  static const String _envBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const int _localDevPort = 5000;

  static String get baseUrl {
    // 1. Compile-time variable takes priority
    if (_envBaseUrl.isNotEmpty) return _envBaseUrl;

    // 2. In release mode, refuse to fall back to localhost
    if (kReleaseMode) {
      throw StateError(
        'API_BASE_URL must be set via --dart-define for production builds',
      );
    }

    // 3. Platform-based fallback for local development
    if (kIsWeb) return 'http://localhost:$_localDevPort';
    if (Platform.isAndroid) return 'http://10.0.2.2:$_localDevPort';
    return 'http://localhost:$_localDevPort'; // iOS simulator
  }

  // WebSocket (same host as API)
  static String get wsUrl => baseUrl;

  // Auth & Onboarding
  static const String login = '/api/v1/auth/login';
  static const String register = '/api/v1/auth/register';
  static const String registerVerify = '/api/v1/auth/register/verify';
  static const String sendOtp = '/api/v1/auth/phone/start';
  static const String verifyOtp = '/api/v1/auth/phone/verify';
  static const String driverOnboarding = '/api/v1/auth/driver/onboarding';
  static const String driverApplication = '/api/v1/driver/application';

  // Vehicle
  static const String vehicles = '/api/v1/vehicles';

  // Documents & Bank
  static const String driverDocuments = '/api/v1/driver/documents';
  static const String driverVerificationDetails =
      '/api/v1/driver/verification-details';
  static const String driverBank = '/api/v1/driver/bank';

  // Availability
  static const String availability = '/api/v1/driver/availability';
  static const String heartbeat = '/api/v1/driver/heartbeat';

  // Rides
  static const String activeRide = '/api/v1/driver/active-ride';
  static const String driverRides = '/api/v1/driver/rides';
  static const String rideStatus = '/api/v1/rides/{rideId}/status';
  static const String rateRider = '/api/v1/rides/{rideId}/rate-rider';

  // Earnings & Payouts
  static const String earnings = '/api/v1/driver/earnings';
  static const String driverNotifications = '/api/v1/driver/notifications';
  static const String driverNotificationsReadAll =
      '/api/v1/driver/notifications/read-all';
  static const String driverNotificationRead =
      '/api/v1/driver/notifications/{id}/read';
  static const String driverLoyalty = '/api/v1/driver/loyalty';
  static const String driverDemandZones = '/api/v1/driver/demand-zones';
  static const String payouts = '/api/v1/payouts';
  static const String payoutRequest = '/api/v1/payouts/request';
  static const String payoutBanks = '/api/v1/payouts/banks';
  static const String validateAccount = '/api/v1/payouts/account/verify';
  static const String stripeLogin = '/api/v1/payouts/stripe/login';
  static const String stripeOnboarding = '/api/v1/payouts/onboarding/stripe';

  // Chat
  static const String chatStatus = '/api/v1/chat/rides/{rideId}/status';
  static const String chatRead = '/api/v1/chat/rides/{rideId}/read';
  static const String chatMessages = '/api/v1/chat/rides/{rideId}/messages';

  // Deliveries
  static const String deliveries = '/api/v1/deliveries';
  static const String deliveryHistory = '/api/v1/deliveries/history';
  static const String deliveryQuote = '/api/v1/deliveries/quote';

  // Google Maps
  /// Pass at build time: --dart-define=GOOGLE_MAPS_API_KEY=...
  static const String googleMapsApiKey = String.fromEnvironment(
    'GOOGLE_MAPS_API_KEY',
  );

  // Profile
  static const String profile = '/api/v1/auth/profile';
}
