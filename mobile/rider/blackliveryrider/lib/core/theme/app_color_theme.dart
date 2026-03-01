import 'package:flutter/material.dart';

/// A [ThemeExtension] that provides semantic, brand-aligned color tokens
/// for both dark and light modes. Access via:
///
/// ```dart
/// final colors = Theme.of(context).extension<AppColorTheme>()!;
/// Container(color: colors.bgPri)
/// ```
///
/// New screens and refactored screens should preferably use this class
/// instead of the static [AppColors] constants, which are dark-only.
@immutable
class AppColorTheme extends ThemeExtension<AppColorTheme> {
  const AppColorTheme({
    required this.bgPri,
    required this.bgSec,
    required this.bgTertiary,
    required this.txtPri,
    required this.txtSec,
    required this.txtInactive,
    required this.inputBg,
    required this.inputBorder,
    required this.inputFocusBorder,
    required this.divider,
    required this.cardBg,
    required this.shimmerBase,
    required this.shimmerHighlight,
    required this.brand,
    required this.success,
    required this.error,
    required this.warning,
    required this.info,
  });

  final Color bgPri;
  final Color bgSec;
  final Color bgTertiary;
  final Color txtPri;
  final Color txtSec;
  final Color txtInactive;
  final Color inputBg;
  final Color inputBorder;
  final Color inputFocusBorder;
  final Color divider;
  final Color cardBg;
  final Color shimmerBase;
  final Color shimmerHighlight;
  final Color brand; // Gold / primary accent
  final Color success;
  final Color error;
  final Color warning;
  final Color info;

  // ── Dark theme tokens (matches existing AppColors) ──────────────────────
  static const AppColorTheme dark = AppColorTheme(
    bgPri: Color(0xFF181818),
    bgSec: Color(0xFF101010),
    bgTertiary: Color(0xFF1E1E1E),
    txtPri: Color(0xFFFFFFFF),
    txtSec: Color(0xFFCBCBCB),
    txtInactive: Color(0xFF7C7C7C),
    inputBg: Color(0xFF222222),
    inputBorder: Color(0xFF333333),
    inputFocusBorder: Color(0xFFD2BF9F),
    divider: Color(0xFF2A2A2A),
    cardBg: Color(0xFF222222),
    shimmerBase: Color(0xFF2A2A2A),
    shimmerHighlight: Color(0xFF3A3A3A),
    brand: Color(0xFFD2BF9F),
    success: Color(0xFF4CAF50),
    error: Color(0xFFE53935),
    warning: Color(0xFFFFA726),
    info: Color(0xFF42A5F5),
  );

  // ── Light theme tokens ───────────────────────────────────────────────────
  static const AppColorTheme light = AppColorTheme(
    bgPri: Color(0xFFF8F5F0), // Warm off-white — on-brand with gold accent
    bgSec: Color(0xFFEDEAE5),
    bgTertiary: Color(0xFFFFFFFF),
    txtPri: Color(0xFF1A1A1A),
    txtSec: Color(0xFF3A3A3A),
    txtInactive: Color(0xFF8A8A8A),
    inputBg: Color(0xFFFFFFFF),
    inputBorder: Color(0xFFD0C9BF),
    inputFocusBorder: Color(0xFFB8A080),
    divider: Color(0xFFE0DDD8),
    cardBg: Color(0xFFFFFFFF),
    shimmerBase: Color(0xFFEAE7E2),
    shimmerHighlight: Color(0xFFF5F2EE),
    brand: Color(0xFFB8A080), // Slightly deeper gold for light bg contrast
    success: Color(0xFF388E3C),
    error: Color(0xFFC62828),
    warning: Color(0xFFF57C00),
    info: Color(0xFF1976D2),
  );

  @override
  AppColorTheme copyWith({
    Color? bgPri,
    Color? bgSec,
    Color? bgTertiary,
    Color? txtPri,
    Color? txtSec,
    Color? txtInactive,
    Color? inputBg,
    Color? inputBorder,
    Color? inputFocusBorder,
    Color? divider,
    Color? cardBg,
    Color? shimmerBase,
    Color? shimmerHighlight,
    Color? brand,
    Color? success,
    Color? error,
    Color? warning,
    Color? info,
  }) {
    return AppColorTheme(
      bgPri: bgPri ?? this.bgPri,
      bgSec: bgSec ?? this.bgSec,
      bgTertiary: bgTertiary ?? this.bgTertiary,
      txtPri: txtPri ?? this.txtPri,
      txtSec: txtSec ?? this.txtSec,
      txtInactive: txtInactive ?? this.txtInactive,
      inputBg: inputBg ?? this.inputBg,
      inputBorder: inputBorder ?? this.inputBorder,
      inputFocusBorder: inputFocusBorder ?? this.inputFocusBorder,
      divider: divider ?? this.divider,
      cardBg: cardBg ?? this.cardBg,
      shimmerBase: shimmerBase ?? this.shimmerBase,
      shimmerHighlight: shimmerHighlight ?? this.shimmerHighlight,
      brand: brand ?? this.brand,
      success: success ?? this.success,
      error: error ?? this.error,
      warning: warning ?? this.warning,
      info: info ?? this.info,
    );
  }

  @override
  AppColorTheme lerp(AppColorTheme? other, double t) {
    if (other is! AppColorTheme) return this;
    return AppColorTheme(
      bgPri: Color.lerp(bgPri, other.bgPri, t)!,
      bgSec: Color.lerp(bgSec, other.bgSec, t)!,
      bgTertiary: Color.lerp(bgTertiary, other.bgTertiary, t)!,
      txtPri: Color.lerp(txtPri, other.txtPri, t)!,
      txtSec: Color.lerp(txtSec, other.txtSec, t)!,
      txtInactive: Color.lerp(txtInactive, other.txtInactive, t)!,
      inputBg: Color.lerp(inputBg, other.inputBg, t)!,
      inputBorder: Color.lerp(inputBorder, other.inputBorder, t)!,
      inputFocusBorder: Color.lerp(inputFocusBorder, other.inputFocusBorder, t)!,
      divider: Color.lerp(divider, other.divider, t)!,
      cardBg: Color.lerp(cardBg, other.cardBg, t)!,
      shimmerBase: Color.lerp(shimmerBase, other.shimmerBase, t)!,
      shimmerHighlight: Color.lerp(shimmerHighlight, other.shimmerHighlight, t)!,
      brand: Color.lerp(brand, other.brand, t)!,
      success: Color.lerp(success, other.success, t)!,
      error: Color.lerp(error, other.error, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      info: Color.lerp(info, other.info, t)!,
    );
  }

  /// Convenience accessor — equivalent to `Theme.of(context).extension<AppColorTheme>()!`
  /// but with a fallback to dark tokens if extension is not registered.
  static AppColorTheme of(BuildContext context) {
    return Theme.of(context).extension<AppColorTheme>() ?? dark;
  }
}

/// Extension on [BuildContext] for quick access.
extension AppColorThemeX on BuildContext {
  AppColorTheme get appColors => AppColorTheme.of(this);
}
