import 'package:flutter/material.dart';
import 'app_color_theme.dart';

/// Static dark-mode color constants.
/// These remain unchanged for backward compatibility with existing screens.
///
/// For new screens, prefer using [AppColorTheme.of(context)] which returns
/// the correct tokens for the active theme (dark or light).
class AppColors {
  // Background colors
  static const Color bgPri = Color(0xFF181818);
  static const Color bgSec = Color(0xFF101010);
  static const Color bgTertiary = Color(0xFF1E1E1E);

  // Text colors
  static const Color txtPri = Color(0xFFFFFFFF);
  static const Color txtSec = Color(0xFFCBCBCB);
  static const Color txtInactive = Color(0xFF7C7C7C);

  // Input colors
  static const Color inputBg = Color(0xFF222222);
  static const Color inputBorder = Color(0xFF333333);
  static const Color inputFocusBorder = Color(0xFFD2BF9F);

  // Brand colors
  static const Color yellow90 = Color(0xFFD2BF9F);
  static const Color brand100 = Color(0xFF101010);
  static const Color brand20 = Color(0xFFE3E6ED);

  // Button colors
  static const Color buttonBgPri = Color(0xFFFAFAFB);
  static const Color buttonTxtPri = Color(0xFF101010);

  // Status colors
  static const Color success = Color(0xFF4CAF50);
  static const Color error = Color(0xFFE53935);
  static const Color warning = Color(0xFFFFA726);
  static const Color info = Color(0xFF42A5F5);

  // Route / map colors
  static const Color routeBlue = Color(0xFF4285F4);

  // Gradient colors
  static const Color gradientStart = Color(0xFFD2BF9F);
  static const Color gradientEnd = Color(0xFFB8A080);

  // Divider and overlay
  static const Color divider = Color(0xFF2A2A2A);
  static const Color overlay = Color(0x80000000);
  static const Color shimmerBase = Color(0xFF2A2A2A);
  static const Color shimmerHighlight = Color(0xFF3A3A3A);

  // ── Context-aware helpers ─────────────────────────────────────────────
  // Use these in new/refactored widgets instead of the static constants above.

  /// Returns [AppColorTheme.of(context)] — shorthand for theme-aware colors.
  static AppColorTheme theme(BuildContext context) => AppColorTheme.of(context);
}
