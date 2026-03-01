import 'dart:async';
import 'package:flutter/material.dart';
import '../data/models/chat_model.dart';
import '../data/services/chat_service.dart';
import '../../../core/services/socket_service.dart';

class ChatProvider with ChangeNotifier {
  final ChatService _chatService = ChatService();
  final SocketService _socketService = SocketService();

  List<ChatMessage> _messages = [];
  bool _isLoading = false;
  String? _error;

  List<ChatMessage> get messages => _messages;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Begin listening for real-time chat messages via WebSocket.
  /// Also performs an initial HTTP fetch to load history.
  void startListening(String rideId, String currentDriverId) {
    // Fetch existing messages via HTTP
    getMessages(rideId, currentDriverId);

    // Register socket listener for new incoming messages
    _socketService.listenToChatMessages((data) {
      _handleIncomingMessage(data, currentDriverId);
    });
  }

  /// Stop listening for chat messages.
  void stopListening() {
    _socketService.stopListeningToChat();
  }

  // Legacy aliases so existing callers don't break
  void startPolling(String rideId, String currentDriverId) =>
      startListening(rideId, currentDriverId);
  void stopPolling() => stopListening();

  void clearMessages() {
    _messages = [];
    notifyListeners();
  }

  /// Handle an incoming socket message and append to the list.
  void _handleIncomingMessage(
    Map<String, dynamic> data,
    String currentDriverId,
  ) {
    try {
      final msg = ChatMessage.fromJson(data, currentDriverId);
      // Avoid duplicates
      if (!_messages.any((m) => m.id == msg.id)) {
        _messages.add(msg);
        _messages.sort((a, b) => a.timestamp.compareTo(b.timestamp));
        notifyListeners();
      }
    } catch (e) {
      debugPrint('ChatProvider: Error parsing socket message: $e');
    }
  }

  Future<void> getMessages(
    String rideId,
    String currentDriverId, {
    bool silent = false,
  }) async {
    if (!silent) {
      _isLoading = true;
      _error = null;
      notifyListeners();
    }

    try {
      final newMessages = await _chatService.getMessages(
        rideId,
        currentDriverId,
      );
      _messages = newMessages;
      _messages.sort((a, b) => a.timestamp.compareTo(b.timestamp));
    } catch (e) {
      if (!silent) _error = e.toString();
    } finally {
      if (!silent) {
        _isLoading = false;
        notifyListeners();
      } else {
        notifyListeners();
      }
    }
  }

  Future<void> sendMessage(
    String rideId,
    String text,
    String currentDriverId,
  ) async {
    try {
      final msg = await _chatService.sendMessage(rideId, text, currentDriverId);
      _messages.add(msg);
      notifyListeners();
    } catch (e) {
      _error = 'Failed to send: $e';
      notifyListeners();
    }
  }

  @override
  void dispose() {
    stopListening();
    super.dispose();
  }
}
