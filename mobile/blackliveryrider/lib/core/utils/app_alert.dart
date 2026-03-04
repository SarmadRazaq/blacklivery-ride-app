import 'package:flutter/material.dart';

class AppAlert {
  static final messengerKey = GlobalKey<ScaffoldMessengerState>();

  static void showError(String message) {
    final messenger = messengerKey.currentState;
    if (messenger == null || !messenger.mounted || message.trim().isEmpty) return;

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red.shade700,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }
}
