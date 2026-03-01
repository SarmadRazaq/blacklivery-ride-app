import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';
import 'app_color_theme.dart';

class AppTextStyles {
  // Static styles (dark-mode)  backward compat
  static TextStyle get heading1 => GoogleFonts.poppins(
        fontSize: 40,
        fontWeight: FontWeight.w700,
        color: Colors.white,
        height: 1.1,
        letterSpacing: -0.5,
      );

  static TextStyle get heading2 => GoogleFonts.poppins(
        fontSize: 24,
        fontWeight: FontWeight.w600,
        color: Colors.white,
        height: 1.2,
        letterSpacing: 0,
      );

  static TextStyle get heading3 => GoogleFonts.poppins(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: Colors.white,
        height: 1.2,
        letterSpacing: 0,
      );

  static TextStyle get body => GoogleFonts.poppins(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: AppColors.txtSec,
        height: 1.3,
        letterSpacing: 1,
      );

  static TextStyle get bodySmall => GoogleFonts.poppins(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: AppColors.txtSec,
        height: 1.4,
        letterSpacing: 0.5,
      );

  static TextStyle get caption => GoogleFonts.poppins(
        fontSize: 10,
        fontWeight: FontWeight.w400,
        color: AppColors.txtInactive,
        height: 1.4,
        letterSpacing: 0.3,
      );

  static TextStyle get inputText => GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: Colors.white,
        height: 1.4,
        letterSpacing: 0.3,
      );

  static TextStyle get inputHint => GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: AppColors.txtInactive,
        height: 1.4,
        letterSpacing: 0.3,
      );

  static TextStyle get tabActive => GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: Colors.white,
        height: 1.2,
        letterSpacing: 0,
      );

  static TextStyle get tabInactive => GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: AppColors.txtInactive,
        height: 1.2,
        letterSpacing: 0,
      );

  static TextStyle get link => GoogleFonts.poppins(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: Colors.white,
        height: 1.4,
        letterSpacing: 0.3,
        decoration: TextDecoration.underline,
      );

  static TextStyle get buttonTxt => GoogleFonts.poppins(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: AppColors.buttonTxtPri,
        height: 1.2,
        letterSpacing: 0,
      );

  static TextStyle get numPad => GoogleFonts.poppins(
        fontSize: 28,
        fontWeight: FontWeight.w500,
        color: Colors.white,
        height: 1.2,
        letterSpacing: 0,
      );

  static TextStyle get otpText => GoogleFonts.poppins(
        fontSize: 24,
        fontWeight: FontWeight.w600,
        color: Colors.white,
        height: 1.2,
        letterSpacing: 8,
      );

  // Context-aware styles  use these in new/refactored screens.
  static TextStyle heading1Of(BuildContext context) =>
      heading1.copyWith(color: AppColorTheme.of(context).txtPri);

  static TextStyle heading2Of(BuildContext context) =>
      heading2.copyWith(color: AppColorTheme.of(context).txtPri);

  static TextStyle heading3Of(BuildContext context) =>
      heading3.copyWith(color: AppColorTheme.of(context).txtPri);

  static TextStyle bodyOf(BuildContext context) =>
      body.copyWith(color: AppColorTheme.of(context).txtSec);

  static TextStyle bodySmallOf(BuildContext context) =>
      bodySmall.copyWith(color: AppColorTheme.of(context).txtSec);

  static TextStyle captionOf(BuildContext context) =>
      caption.copyWith(color: AppColorTheme.of(context).txtInactive);

  static TextStyle inputTextOf(BuildContext context) =>
      inputText.copyWith(color: AppColorTheme.of(context).txtPri);

  static TextStyle inputHintOf(BuildContext context) =>
      inputHint.copyWith(color: AppColorTheme.of(context).txtInactive);
}
