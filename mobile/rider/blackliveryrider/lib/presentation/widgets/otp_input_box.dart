import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class OtpInputBox extends StatelessWidget {
  final String code;
  final int length;

  const OtpInputBox({super.key, required this.code, this.length = 6});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(length, (index) {
        final hasValue = index < code.length;
        final isActive = index == code.length;

        return Container(
          width: 40,
          height: 48,
          margin: EdgeInsets.only(right: index < length - 1 ? 8 : 0),
          decoration: BoxDecoration(
            color: Colors.transparent,
            border: Border(
              bottom: BorderSide(
                color: isActive
                    ? AppColors.yellow90
                    : hasValue
                    ? Colors.white
                    : AppColors.inputBorder,
                width: 2,
              ),
            ),
          ),
          child: Center(
            child: Text(
              hasValue ? code[index] : '',
              style: AppTextStyles.otpText,
            ),
          ),
        );
      }),
    );
  }
}
