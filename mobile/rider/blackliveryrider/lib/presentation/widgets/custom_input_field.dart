import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

enum InputFieldType { text, phone, email, password }

class CustomInputField extends StatefulWidget {
  final TextEditingController controller;
  final String hintText;
  final InputFieldType type;
  final String? countryCode;
  final String? countryFlag;
  final IconData? prefixIcon;

  const CustomInputField({
    super.key,
    required this.controller,
    required this.hintText,
    this.type = InputFieldType.text,
    this.countryCode,
    this.countryFlag,
    this.prefixIcon,
  });

  const CustomInputField.phone({
    super.key,
    required this.controller,
    required this.hintText,
    this.countryCode = '+1',
    this.countryFlag = '🇺🇸',
  })  : type = InputFieldType.phone,
        prefixIcon = null;

  const CustomInputField.email({
    super.key,
    required this.controller,
    required this.hintText,
  })  : type = InputFieldType.email,
        countryCode = null,
        countryFlag = null,
        prefixIcon = Icons.email_outlined;

  const CustomInputField.password({
    super.key,
    required this.controller,
    required this.hintText,
  })  : type = InputFieldType.password,
        countryCode = null,
        countryFlag = null,
        prefixIcon = Icons.lock_outline;

  @override
  State<CustomInputField> createState() => _CustomInputFieldState();
}

class _CustomInputFieldState extends State<CustomInputField> {
  bool _obscureText = true;

  @override
  Widget build(BuildContext context) {
    if (widget.type == InputFieldType.phone) {
      return _buildPhoneField();
    }
    return _buildRegularField();
  }

  Widget _buildPhoneField() {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.inputBorder, width: 1),
      ),
      child: Row(
        children: [
          // Country Code Selector
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Text(
                  widget.countryFlag ?? '🇺🇸',
                  style: const TextStyle(fontSize: 20),
                ),
                const SizedBox(width: 8),
                Text(
                  widget.countryCode ?? '+1',
                  style: AppTextStyles.inputText,
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.keyboard_arrow_down,
                  color: AppColors.txtInactive,
                  size: 20,
                ),
              ],
            ),
          ),
          Container(
            width: 1,
            height: 24,
            color: AppColors.inputBorder,
          ),
          // Phone Number Input
          Expanded(
            child: TextField(
              controller: widget.controller,
              style: AppTextStyles.inputText,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                hintText: widget.hintText,
                hintStyle: AppTextStyles.inputHint,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRegularField() {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.inputBorder, width: 1),
      ),
      child: Row(
        children: [
          // Prefix Icon
          if (widget.prefixIcon != null)
            Padding(
              padding: const EdgeInsets.only(left: 16),
              child: Icon(
                widget.prefixIcon,
                color: AppColors.txtInactive,
                size: 22,
              ),
            ),
          // Input Field
          Expanded(
            child: TextField(
              controller: widget.controller,
              style: AppTextStyles.inputText,
              obscureText: widget.type == InputFieldType.password && _obscureText,
              keyboardType: widget.type == InputFieldType.email
                  ? TextInputType.emailAddress
                  : TextInputType.text,
              decoration: InputDecoration(
                hintText: widget.hintText,
                hintStyle: AppTextStyles.inputHint,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
            ),
          ),
          // Suffix Icon for Password
          if (widget.type == InputFieldType.password)
            GestureDetector(
              onTap: () {
                setState(() {
                  _obscureText = !_obscureText;
                });
              },
              child: Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Icon(
                  _obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  color: AppColors.txtInactive,
                  size: 22,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
