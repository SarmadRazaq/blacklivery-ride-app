import '../config/env_config.dart';

class ApiConstants {
  static String get baseUrl => EnvConfig.apiBaseUrl;

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
  static String get googleMapsApiKey => EnvConfig.googleMapsApiKey;

  // Profile
  static const String profile = '/api/v1/auth/profile';
}
