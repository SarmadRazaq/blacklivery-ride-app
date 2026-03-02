import 'dart:io';
import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../network/api_client.dart';
import '../../main.dart' show navigatorKey;
import '../../features/ride/driver_map_screen.dart';

/// Top-level handler for background/terminated messages (must be top-level function)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('FCM background message: ${message.messageId}');
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
    final firebase_auth.FirebaseAuth _firebaseAuth =
      firebase_auth.FirebaseAuth.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
    StreamSubscription<firebase_auth.User?>? _authStateSubscription;

  String? _currentToken;

  /// Initialize FCM and local notifications. Call once after Firebase.initializeApp().
  Future<void> initialize() async {
    // Request permission (iOS + Android 13+)
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      debugPrint('FCM: User denied notification permission');
      return;
    }

    // Set up local notification channel for foreground messages
    await _setupLocalNotifications();

    // Register background handler
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle notification taps (background → tap)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Check if app was opened from terminated state via notification
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }

    // Get and register FCM token (don't await to avoid blocking startup)
    _registerToken();

    // Listen for auth state changes — register token when user signs in,
    // but skip if token was already registered to avoid duplicate calls.
    _authStateSubscription ??= _firebaseAuth.authStateChanges().listen((user) {
      if (user != null && _currentToken != null) {
        _registerTokenWithBackend(_currentToken!);
      } else if (user != null) {
        _registerToken();
      }
    });

    // Listen for token refreshes
    _messaging.onTokenRefresh.listen((newToken) {
      _registerTokenWithBackend(newToken);
    });
  }

  Future<void> _setupLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    await _localNotifications.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
      onDidReceiveNotificationResponse: (details) {
        debugPrint('Local notification tapped: ${details.payload}');
        _navigateToRide(details.payload);
      },
    );

    // Create Android notification channels
    if (Platform.isAndroid) {
      final plugin = _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();

      // Ride requests channel (high priority — driver must see these immediately)
      await plugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          'blacklivery_ride_requests',
          'Ride Requests',
          description: 'Incoming ride request notifications',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
        ),
      );

      // General updates channel
      await plugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          'blacklivery_updates',
          'Ride Updates',
          description: 'Trip and earnings updates',
          importance: Importance.high,
        ),
      );
    }
  }

  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('FCM foreground message: ${message.messageId}');

    final notification = message.notification;
    if (notification == null) return;

    // Use high-priority channel for ride offers, standard for others
    final isRideOffer = message.data['type'] == 'ride:offer';
    final channelId = isRideOffer
        ? 'blacklivery_ride_requests'
        : 'blacklivery_updates';
    final channelName = isRideOffer ? 'Ride Requests' : 'Ride Updates';

    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          channelId,
          channelName,
          importance: isRideOffer ? Importance.max : Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          fullScreenIntent: isRideOffer, // Wake screen for ride requests
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: message.data['rideId'],
    );
  }

  void _handleNotificationTap(RemoteMessage message) {
    debugPrint('Notification tapped: ${message.data}');
    final rideId = message.data['rideId'] as String?;
    _navigateToRide(rideId);
  }

  void _navigateToRide(String? rideId) {
    if (rideId == null || rideId.isEmpty) return;
    navigatorKey.currentState?.push(
      MaterialPageRoute(builder: (_) => const DriverMapScreen()),
    );
  }

  Future<void> _registerToken() async {
    try {
      if (Platform.isIOS) {
        final apnsToken = await _messaging.getAPNSToken();
        if (apnsToken == null) {
          debugPrint(
            'FCM: APNs token not yet available, will retry on refresh',
          );
          return;
        }
      }

      final token = await _messaging.getToken();
      if (token != null) {
        _currentToken = token;
        await _registerTokenWithBackend(token);
      }
    } catch (e) {
      debugPrint('FCM: Error getting token: $e');
    }
  }

  Future<void> _registerTokenWithBackend(String token) async {
    final user = _firebaseAuth.currentUser;
    if (user == null) {
      debugPrint('FCM: Skipping token registration (user not authenticated)');
      return;
    }

    try {
      _currentToken = token;
      final api = ApiClient();
      await api.dio.post('/api/v1/auth/fcm-token', data: {'token': token});
      debugPrint('FCM: Token registered with backend');
    } catch (e) {
      debugPrint('FCM: Failed to register token with backend: $e');
    }
  }

  /// Remove token from backend (call on logout)
  Future<void> removeToken() async {
    if (_currentToken == null) return;
    if (_firebaseAuth.currentUser == null) {
      debugPrint('FCM: Skipping token removal (user not authenticated)');
      return;
    }
    try {
      final api = ApiClient();
      await api.dio.delete(
        '/api/v1/auth/fcm-token',
        data: {'token': _currentToken},
      );
      debugPrint('FCM: Token removed from backend');
    } catch (e) {
      debugPrint('FCM: Failed to remove token: $e');
    }
  }

  /// Clear the app badge count and dismiss all delivered notifications.
  /// Call when user opens the app or navigates to the notifications screen.
  Future<void> clearBadge() async {
    await _localNotifications.cancelAll();
    if (Platform.isIOS) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin
          >()
          ?.requestPermissions(badge: true);
    }
  }
}
