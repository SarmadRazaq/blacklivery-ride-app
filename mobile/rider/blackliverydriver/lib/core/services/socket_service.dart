import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import '../constants/api_constants.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  StreamController<Map<String, dynamic>>? _rideRequestController;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 5;
  static const Duration _reconnectBaseDelay = Duration(seconds: 2);
  String? _lastToken;

  // Chat message callback
  Function(Map<String, dynamic>)? _onChatMessage;

  bool get isConnected => _socket?.connected ?? false;

  Stream<Map<String, dynamic>> get rideRequests {
    if (_rideRequestController == null || _rideRequestController!.isClosed) {
      _rideRequestController =
          StreamController<Map<String, dynamic>>.broadcast();
    }
    return _rideRequestController!.stream;
  }

  void initSocket(String token) {
    if (_socket != null && _socket!.connected) return;
    _lastToken = token;

    _socket = io.io(
      ApiConstants.wsUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .disableReconnection() // We handle reconnection ourselves
          .setAuth({'token': token})
          .setExtraHeaders({'Authorization': 'Bearer $token'})
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('SocketService: Connected');
      _reconnectAttempts = 0;

      // Join driver room so backend can send targeted notifications (ride:offer, etc.)
      final user = firebase_auth.FirebaseAuth.instance.currentUser;
      if (user != null) {
        _socket!.emit('join:driver', user.uid);
        debugPrint('SocketService: Joined driver room driver:${user.uid}');
      }
    });

    _socket!.onDisconnect((_) {
      debugPrint('SocketService: Disconnected');
      _attemptReconnect();
    });

    _socket!.onConnectError((data) {
      debugPrint('SocketService: Connect Error: $data');
      final raw = data?.toString().toLowerCase() ?? '';
      final isAuthError =
          raw.contains('expired token') ||
          raw.contains('invalid or expired token') ||
          raw.contains('auth/id-token-expired');
      _attemptReconnect(immediate: isAuthError);
    });

    // Listeners — event names match backend SocketService.ts
    _socket!.on('ride:offer', (data) {
      debugPrint('SocketService: New Ride Offer: $data');
      _safeAddToStream({'type': 'ride_request', 'data': data});
    });

    // Keep legacy events for backward compatibility
    _socket!.on('ride_request', (data) {
      debugPrint('SocketService: ride_request (legacy): $data');
      _safeAddToStream({'type': 'ride_request', 'data': data});
    });

    _socket!.on('ride:cancelled', (data) {
      debugPrint('SocketService: Ride Cancelled: $data');
      _safeAddToStream({'type': 'ride_cancelled', 'data': data});
    });

    // Also listen for ride:completed so driver knows ride is done
    _socket!.on('ride:completed', (data) {
      debugPrint('SocketService: Ride Completed: $data');
      _safeAddToStream({'type': 'ride_completed', 'data': data});
    });

    // Delivery events
    _socket!.on('delivery:offer', (data) {
      debugPrint('SocketService: Delivery Offer: $data');
      _safeAddToStream({'type': 'delivery_request', 'data': data});
    });

    _socket!.on('delivery:update', (data) {
      debugPrint('SocketService: Delivery Update: $data');
      _safeAddToStream({'type': 'delivery_update', 'data': data});
    });

    // Chat events — mirror rider app's event names
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

    _socket!.connect();
  }

  /// Safely add to stream, guarding against closed controller
  void _safeAddToStream(Map<String, dynamic> event) {
    if (_rideRequestController != null && !_rideRequestController!.isClosed) {
      _rideRequestController!.add(event);
    }
  }

  /// Exponential backoff reconnection with fresh Firebase token
  Future<void> _attemptReconnect({bool immediate = false}) async {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('SocketService: Max reconnect attempts reached');
      return;
    }

    _reconnectAttempts++;
    if (!immediate) {
      final delay = _reconnectBaseDelay * (1 << (_reconnectAttempts - 1));
      debugPrint(
        'SocketService: Reconnecting in ${delay.inSeconds}s (attempt $_reconnectAttempts/$_maxReconnectAttempts)',
      );
      await Future.delayed(delay);
    } else {
      debugPrint(
        'SocketService: Reconnecting immediately (attempt $_reconnectAttempts/$_maxReconnectAttempts)',
      );
    }

    // Get fresh Firebase token for reconnection
    String? freshToken;
    try {
      final user = firebase_auth.FirebaseAuth.instance.currentUser;
      if (user != null) {
        freshToken = await user.getIdToken(true);
      }
    } catch (e) {
      debugPrint('SocketService: Failed to refresh token for reconnect: $e');
    }

    if (freshToken == null) {
      // Fall back to last known token if Firebase refresh failed
      freshToken = _lastToken;
      if (freshToken == null) {
        debugPrint('SocketService: No valid token available for reconnect');
        return;
      }
    }

    // Rebuild socket with fresh token
    _socket?.clearListeners();
    _socket?.dispose();
    _socket = null;
    initSocket(freshToken);
  }

  /// Public reconnect — resets attempt counter so callers (e.g.
  /// ConnectivityService) can trigger a fresh reconnection cycle.
  void reconnect() {
    if (_socket?.connected ?? false) return; // Already connected
    _reconnectAttempts = 0;
    _attemptReconnect(immediate: true);
  }

  void disconnect() {
    _reconnectAttempts =
        _maxReconnectAttempts; // Prevent reconnect after intentional disconnect
    _socket?.clearListeners();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _lastToken = null;
  }

  // Emitters

  void emitDriverStatus(bool isOnline) {
    _socket?.emit('driver_status', {'isOnline': isOnline});
  }

  void emitDriverMode(String mode) {
    // mode: 'ride', 'delivery', 'both'
    _socket?.emit('driver_mode', {'mode': mode});
  }

  void emitLocationUpdate(double lat, double lng, {double? heading}) {
    _socket?.emit('location_update', {
      'latitude': lat,
      'longitude': lng,
      'heading': heading ?? 0.0,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  void acceptRide(String rideId) {
    debugPrint('SocketService: Emitting accept_ride for $rideId');
    _socket?.emit('accept_ride', {'rideId': rideId});
  }

  void declineRide(String rideId, {String? reason}) {
    _socket?.emit('decline_ride', {'rideId': rideId, 'reason': reason});
  }

  // ── Chat ──

  /// Register a callback that fires whenever a chat message arrives via socket.
  void listenToChatMessages(Function(Map<String, dynamic>) onMessage) {
    _onChatMessage = onMessage;
  }

  /// Remove the chat message callback and stop listening.
  void stopListeningToChat() {
    _onChatMessage = null;
  }

  /// Emit a chat message through the socket (fire‑and‑forget; API write
  /// still happens via HTTP for persistence).
  void emitChatMessage(String rideId, String text) {
    _socket?.emit('chat:send', {'rideId': rideId, 'message': text});
  }

  void dispose() {
    disconnect();
    _rideRequestController?.close();
    _rideRequestController = null;
  }
}
