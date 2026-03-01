import 'package:flutter/services.dart';

/// Centralized haptic feedback helper.
class HapticUtils {
  HapticUtils._();

  /// Light tap — used for button taps, selections.
  static void lightImpact() => HapticFeedback.lightImpact();

  /// Medium impact — used for confirmations, toggles.
  static void mediumImpact() => HapticFeedback.mediumImpact();

  /// Heavy impact — used for ride complete, payment success.
  static void heavyImpact() => HapticFeedback.heavyImpact();

  /// Selection click — used for tab changes, chip selections.
  static void selectionClick() => HapticFeedback.selectionClick();

  /// Vibrate — used for errors or warnings.
  static void vibrate() => HapticFeedback.vibrate();
}
