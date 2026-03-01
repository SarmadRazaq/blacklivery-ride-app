import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_spacing.dart';

enum ButtonVariant { main, secondary, gradient, icon, tripleIcon }

class CustomButton extends StatelessWidget {
  final String? text;
  final ButtonVariant variant;
  final VoidCallback? onTap;
  final IconData? icon;
  final bool isLoading;
  final bool isDisabled;
  final double? width;

  const CustomButton.main({
    super.key,
    required this.text,
    this.onTap,
    this.isLoading = false,
    this.isDisabled = false,
    this.width,
  }) : variant = ButtonVariant.main,
       icon = null;

  const CustomButton.secondary({
    super.key,
    required this.text,
    this.onTap,
    this.isLoading = false,
    this.isDisabled = false,
    this.width,
  }) : variant = ButtonVariant.secondary,
       icon = null;

  const CustomButton.gradient({
    super.key,
    required this.text,
    this.onTap,
    this.isLoading = false,
    this.isDisabled = false,
    this.width,
  }) : variant = ButtonVariant.gradient,
       icon = null;

  const CustomButton.icon({super.key, required this.icon, this.onTap})
    : variant = ButtonVariant.icon,
      text = null,
      isLoading = false,
      isDisabled = false,
      width = null;

  const CustomButton.tripleIcon({super.key, required this.icon, this.onTap})
    : variant = ButtonVariant.tripleIcon,
      text = null,
      isLoading = false,
      isDisabled = false,
      width = null;

  @override
  Widget build(BuildContext context) {
    final bool disabled = isDisabled || isLoading;

    if (variant == ButtonVariant.main) {
      return _buildMainButton(disabled);
    } else if (variant == ButtonVariant.secondary) {
      return _buildSecondaryButton(disabled);
    } else if (variant == ButtonVariant.gradient) {
      return _buildGradientButton(disabled);
    } else if (variant == ButtonVariant.tripleIcon) {
      return _buildTripleIconButton();
    } else {
      return _buildIconButton();
    }
  }

  Widget _buildMainButton(bool disabled) {
    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: AppSpacing.buttonHeight,
        width: width ?? double.infinity,
        decoration: BoxDecoration(
          color: disabled ? AppColors.inputBg : AppColors.buttonBgPri,
          borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          boxShadow: disabled
              ? []
              : [
                  BoxShadow(
                    color: AppColors.brand100.withOpacity(0.3),
                    offset: const Offset(0, 8),
                    blurRadius: 24,
                    spreadRadius: -4,
                  ),
                ],
        ),
        child: Center(
          child: isLoading
              ? SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      disabled ? AppColors.txtInactive : AppColors.buttonTxtPri,
                    ),
                  ),
                )
              : Text(
                  text!,
                  style: AppTextStyles.buttonTxt.copyWith(
                    color: disabled
                        ? AppColors.txtInactive
                        : AppColors.buttonTxtPri,
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildSecondaryButton(bool disabled) {
    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: AppSpacing.buttonHeight,
        width: width ?? double.infinity,
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          border: Border.all(
            color: disabled ? AppColors.inputBorder : AppColors.txtPri,
            width: 1.5,
          ),
        ),
        child: Center(
          child: isLoading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.txtPri),
                  ),
                )
              : Text(
                  text!,
                  style: AppTextStyles.buttonTxt.copyWith(
                    color: disabled ? AppColors.txtInactive : AppColors.txtPri,
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildGradientButton(bool disabled) {
    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: AppSpacing.buttonHeight,
        width: width ?? double.infinity,
        decoration: BoxDecoration(
          gradient: disabled
              ? null
              : const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.gradientStart, AppColors.gradientEnd],
                ),
          color: disabled ? AppColors.inputBg : null,
          borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          boxShadow: disabled
              ? []
              : [
                  BoxShadow(
                    color: AppColors.gradientStart.withOpacity(0.4),
                    offset: const Offset(0, 8),
                    blurRadius: 24,
                    spreadRadius: -4,
                  ),
                ],
        ),
        child: Center(
          child: isLoading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.bgPri),
                  ),
                )
              : Text(
                  text!,
                  style: AppTextStyles.buttonTxt.copyWith(
                    color: disabled ? AppColors.txtInactive : AppColors.bgPri,
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildTripleIconButton() {
    return SizedBox(
      width: 50,
      height: 50,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Center(
          child: SizedBox(
            width: 40,
            height: 24,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.centerRight,
              children: [
                Positioned(
                  right: 24,
                  child: Opacity(
                    opacity: 0.1,
                    child: Icon(icon, size: 24, color: AppColors.txtSec),
                  ),
                ),
                Positioned(
                  right: 12,
                  child: Opacity(
                    opacity: 0.3,
                    child: Icon(icon, size: 24, color: AppColors.txtSec),
                  ),
                ),
                Icon(icon, size: 24, color: AppColors.txtSec),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildIconButton() {
    return SizedBox(
      width: 50,
      height: 50,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Center(child: Icon(icon, size: 24, color: AppColors.txtSec)),
      ),
    );
  }
}
