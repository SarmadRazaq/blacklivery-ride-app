import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

class AppAlert {
  static final messengerKey = GlobalKey<ScaffoldMessengerState>();

  static void showError(String message) {
    if (message.trim().isEmpty) return;

    // Defer to next frame to avoid "deactivated widget's ancestor" errors
    // that occur when Dio interceptors fire during widget tree teardown.
    SchedulerBinding.instance.addPostFrameCallback((_) {
      try {
        final messenger = messengerKey.currentState;
        if (messenger == null || !messenger.mounted) return;

        messenger
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(message),
              backgroundColor: Colors.red.shade700,
              behavior: SnackBarBehavior.floating,
            ),
          );
      } catch (e) {
        // Silently ignore — widget tree may have been torn down between
        // the post-frame callback scheduling and execution.
        debugPrint('AppAlert.showError: suppressed error — $e');
      }
    });
  }
}
