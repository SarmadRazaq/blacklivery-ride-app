import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/auth_service.dart';
import '../services/ride_service.dart';
import '../network/api_client.dart';
import '../utils/app_alert.dart';

class SocketService extends ChangeNotifier {
  // Singleton pattern — ensures all providers share the same socket connection
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  bool _disposed = false;

  @override
  void notifyListeners() {
    if (!_disposed) {
      super.notifyListeners();
    }
  }

  IO.Socket? _socket;
  final AuthService _authService = AuthService();
  bool _isConnected = false;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 10;
  static const Duration _reconnectBaseDelay = Duration(seconds: 2);
  static const Duration _reconnectMaxDelay = Duration(seconds: 30);

  // Driver location tracking
  Function(Map<String, dynamic>)? _onDriverLocationUpdate;
  // Chat message callback (set when chat screen is open)
  Function(Map<String, dynamic>)? _onChatMessage;
  // Global chat notification enabled when no chat screen is active
  final bool _globalChatNotificationEnabled = true;
  // Active ride tracking for reconnect sync
  String? _activeRideId;
  Function(Map<String, dynamic>)? _onRideUpdate;

  bool get isConnected => _isConnected;
  int get reconnectAttempts => _reconnectAttempts;
  bool get isReconnecting => _reconnectAttempts > 0 && !_isConnected;

  // Initialize and connect socket
  Future<void> initSocket() async {
    if (_socket != null && _socket!.connected) return;

    // Clean up old disconnected socket to prevent leaked listeners
    if (_socket != null) {
      _socket!.clearListeners();
      _socket!.dispose();
      _socket = null;
    }

    // Reset reconnect counter when initSocket is called directly (new booking)
    _reconnectAttempts = 0;

    final token = await _authService.refreshToken(); // Get valid token
    if (token == null) {
      debugPrint('SocketService: No token found. Cannot connect.');
      return;
    }

    // Use baseUrl from ApiClient to ensure consistency (Android/Web/iOS)
    final String baseUrl = ApiClient().dio.options.baseUrl;

    debugPrint('SocketService: Connecting to $baseUrl');

    _socket = IO.io(
      baseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect() // We manage connection manually
          .disableReconnection() // We handle reconnection ourselves
          .setAuth({'token': token})
          .setExtraHeaders({'Authorization': 'Bearer $token'})
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('SocketService: Connected');
      _isConnected = true;
      final wasReconnecting = _reconnectAttempts > 0;
      _reconnectAttempts = 0; // Reset on successful connection

      // Join rider room so backend can send targeted notifications
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (uid != null) {
        _socket!.emit('join:rider', uid);
        debugPrint('SocketService: Joined rider room rider:$uid');
      }

      // Register global chat listener for overlay notifications
      _registerGlobalChatListener();

      // On reconnect, fetch current ride state to replay missed events
      if (wasReconnecting && _activeRideId != null && _onRideUpdate != null) {
        _syncRideStateOnReconnect();
      }

      notifyListeners();
    });

    _socket!.onDisconnect((_) {
      debugPrint('SocketService: Disconnected');
      _isConnected = false;
      notifyListeners();
      _attemptReconnect();
    });

    _socket!.onError((data) => debugPrint('SocketService Error: $data'));
    _socket!.onConnectError((data) {
      debugPrint('SocketService Connect Error: $data');
      _isConnected = false;
      notifyListeners();
      _attemptReconnect();
    });

    _socket!.connect();
  }

  /// Exponential backoff reconnection
  Future<void> _attemptReconnect() async {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('SocketService: Max reconnect attempts reached ($_maxReconnectAttempts)');
      return;
    }

    _reconnectAttempts++;
    final uncapped = _reconnectBaseDelay * (1 << (_reconnectAttempts - 1));
    final delay = uncapped > _reconnectMaxDelay ? _reconnectMaxDelay : uncapped;
    debugPrint('SocketService: Reconnecting in ${delay.inSeconds}s (attempt $_reconnectAttempts/$_maxReconnectAttempts)');

    await Future.delayed(delay);

    // Re-fetch token in case it expired
    final token = await _authService.refreshToken();
    if (token == null) {
      debugPrint('SocketService: Cannot reconnect - no valid token');
      return;
    }

    // Rebuild socket with fresh token
    _socket?.clearListeners();
    _socket?.dispose();
    _socket = null;
    await initSocket();
  }

  // Bind ride events
  void listenToRideUpdates(
    String rideId,
    Function(Map<String, dynamic>) onUpdate,
  ) {
    if (_socket == null) return;

    _activeRideId = rideId;
    _onRideUpdate = onUpdate;

    debugPrint(
      'SocketService: Listening to ride:update and specific ride events for $rideId',
    );

    // Generic update
    _socket!.on('ride:update', (data) {
      if (data['id'] == rideId) {
        debugPrint('SocketService: Received ride:update: $data');
        onUpdate(data);
      }
    });

    // Specific events matching SocketService.ts
    // 'ride:accepted'
    _socket!.on('ride:accepted', (data) {
      if (data['rideId'] == rideId) {
        debugPrint('SocketService: ride:accepted');
        onUpdate({'status': 'accepted', ...data});
      }
    });

    // 'ride:driver_arrived'
    _socket!.on('ride:driver_arrived', (data) {
      if (data['rideId'] == rideId) {
        debugPrint('SocketService: ride:driver_arrived');
        onUpdate({'status': 'arrived', ...data});
      }
    });

    // 'ride:started'
    _socket!.on('ride:started', (data) {
      if (data['rideId'] == rideId) {
        debugPrint('SocketService: ride:started');
        onUpdate({'status': 'in_progress', ...data});
      }
    });

    // 'ride:completed'
    _socket!.on('ride:completed', (data) {
      if (data['rideId'] == rideId) {
        debugPrint('SocketService: ride:completed');
        onUpdate({'status': 'completed', ...data});
      }
    });

    // 'ride:cancelled'
    _socket!.on('ride:cancelled', (data) {
      if (data['rideId'] == rideId) {
        debugPrint('SocketService: ride:cancelled');
        onUpdate({
          'status': 'cancelled',
          ...data,
        }); // BookingState should handle the status transition
      }
    });

    // 'ride:no_driver' — no driver found after all matching attempts
    _socket!.on('ride:no_driver', (data) {
      if (data['rideId'] == rideId) {
        debugPrint('SocketService: ride:no_driver');
        onUpdate({'status': 'no_driver', ...data});
      }
    });
  }

  /// Stop listening to ride-specific events (call when ride ends or screen disposes)
  void stopListeningToRideUpdates() {
    _socket?.off('ride:update');
    _socket?.off('ride:accepted');
    _socket?.off('ride:driver_arrived');
    _socket?.off('ride:started');
    _socket?.off('ride:completed');
    _socket?.off('ride:cancelled');
    _socket?.off('ride:no_driver');
    _socket?.off('driver:location');
    _onDriverLocationUpdate = null;
    _activeRideId = null;
    _onRideUpdate = null;
    debugPrint('SocketService: Stopped listening to ride updates');
  }

  /// Listen for real-time driver location updates
  void listenToDriverLocation(Function(Map<String, dynamic>) onUpdate) {
    if (_socket == null) return;
    _onDriverLocationUpdate = onUpdate;
    _socket!.on('driver:location', (data) {
      debugPrint('SocketService: driver:location update received');
      _onDriverLocationUpdate?.call(Map<String, dynamic>.from(data));
    });
  }

  /// Emit rider's current location to the backend.
  /// Called during active rides so the driver (and admin) can track the rider.
  void emitRiderLocation({
    required double latitude,
    required double longitude,
    String? rideId,
  }) {
    if (_socket == null || !_isConnected) return;
    _socket!.emit('rider_location', {
      'latitude': latitude,
      'longitude': longitude,
      if (rideId != null) 'rideId': rideId,
    });
  }

  /// Notify the driver that quiet mode has been toggled.
  void emitQuietMode({required String rideId, required bool enabled}) {
    if (_socket == null || !_isConnected) return;
    _socket!.emit('ride:quiet_mode', {
      'rideId': rideId,
      'quietMode': enabled,
    });
    debugPrint('SocketService: Emitted quiet_mode=$enabled for ride $rideId');
  }

  /// Register global chat listener — shows overlay notification when
  /// no chat screen is actively listening.
  void _registerGlobalChatListener() {
    if (_socket == null) return;

    void handleGlobalChat(dynamic data) {
      // Only show global notification when chat screen is not open
      if (_onChatMessage != null || !_globalChatNotificationEnabled) return;
      final msg = Map<String, dynamic>.from(data);
      final sender = msg['senderName'] ?? msg['sender'] ?? 'Driver';
      final text = msg['message'] ?? msg['text'] ?? 'New message';
      debugPrint('SocketService: Global chat notification from $sender');
      final messenger = AppAlert.messengerKey.currentState;
      if (messenger != null && messenger.mounted) {
        messenger
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.chat_bubble, color: Colors.white, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$sender',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          '$text',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              backgroundColor: const Color(0xFF2C2C2C),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 4),
              margin: const EdgeInsets.only(top: 8, left: 12, right: 12, bottom: 8),
            ),
          );
      }
    }

    _socket!.on('chat:message', handleGlobalChat);
    _socket!.on('chat:new_message', handleGlobalChat);
    _socket!.on('ride:chat', handleGlobalChat);
  }

  /// Listen for incoming chat messages via socket
  void listenToChatMessages(Function(Map<String, dynamic>) onMessage) {
    if (_socket == null) return;
    _onChatMessage = onMessage;
    // Re-register so the screen callback takes priority
    _socket!.off('chat:message');
    _socket!.off('chat:new_message');
    _socket!.off('ride:chat');
    _socket!.on('chat:message', (data) {
      debugPrint('SocketService: chat:message received');
      _onChatMessage?.call(Map<String, dynamic>.from(data));
    });
    _socket!.on('chat:new_message', (data) {
      debugPrint('SocketService: chat:new_message received');
      _onChatMessage?.call(Map<String, dynamic>.from(data));
    });
    _socket!.on('ride:chat', (data) {
      debugPrint('SocketService: ride:chat received');
      _onChatMessage?.call(Map<String, dynamic>.from(data));
    });
  }

  /// Stop listening for chat messages — re-enable global notification
  void stopListeningToChat() {
    _onChatMessage = null;
    _socket?.off('chat:message');
    _socket?.off('chat:new_message');
    _socket?.off('ride:chat');
    // Re-register global listener
    _registerGlobalChatListener();
  }

  /// Fetch current ride state from REST API after reconnect to replay missed events.
  Future<void> _syncRideStateOnReconnect() async {
    final rideId = _activeRideId;
    final callback = _onRideUpdate;
    if (rideId == null || callback == null) return;

    debugPrint('SocketService: Syncing ride state after reconnect for $rideId');
    try {
      final rideService = RideService();
      final details = await rideService.getRideDetails(rideId);
      if (details != null) {
        debugPrint('SocketService: Replayed ride state: ${details['status']}');
        callback(details);
      }
    } catch (e) {
      debugPrint('SocketService: Failed to sync ride state: $e');
    }

    // Re-register ride event listeners
    listenToRideUpdates(rideId, callback);
  }

  void disconnect() {
    _reconnectAttempts = _maxReconnectAttempts; // Prevent reconnect after intentional disconnect
    _onDriverLocationUpdate = null;
    _onChatMessage = null;
    _socket?.clearListeners();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    notifyListeners();
  }

  @override
  void dispose() {
    disconnect();
    _disposed = true;
    super.dispose();
  }
}
