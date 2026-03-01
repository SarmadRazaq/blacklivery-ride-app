import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../network/api_client.dart';
import '../router/app_router.dart';

/// Top-level handler for background/terminated messages (must be top-level function)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('FCM background message: ${message.messageId}');
  // The notification payload is automatically shown by the OS on Android/iOS
  // when the app is in background/terminated. No manual handling needed here
  // unless you want to update local data.
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

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

    // Handle notification taps (when app is in background and user taps)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Check if app was opened from a terminated state via notification
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }

    // Get and register FCM token
    await _registerToken();

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
      requestAlertPermission: false, // Already requested above
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

    // Create Android notification channel
    if (Platform.isAndroid) {
      const channel = AndroidNotificationChannel(
        'blacklivery_rides',
        'Ride Updates',
        description: 'Notifications for ride status updates',
        importance: Importance.high,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(channel);
    }
  }

  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('FCM foreground message: ${message.messageId}');

    final notification = message.notification;
    if (notification == null) return;

    // Show local notification for foreground messages
    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'blacklivery_rides',
          'Ride Updates',
          channelDescription: 'Notifications for ride status updates',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: DarwinNotificationDetails(
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
    // Navigate using GoRouter so the deep-link URL is reflected in the route stack.
    appRouter.go('/ride/$rideId');
  }

  Future<void> _registerToken() async {
    try {
      // Get APNs token first on iOS (required before getting FCM token)
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
    // Clear all delivered local notifications
    await _localNotifications.cancelAll();
    // Reset iOS badge count to 0
    if (Platform.isIOS) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin
          >()
          ?.requestPermissions(badge: true);
    }
    // On Android, cancelling all notifications removes badge (via launcher)
  }
}
