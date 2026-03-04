import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class CustomNumpad extends StatelessWidget {
  final Function(String) onKeyPressed;
  final bool isCheckEnabled;

  const CustomNumpad({
    super.key,
    required this.onKeyPressed,
    this.isCheckEnabled = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
      child: Column(
        children: [
          _buildRow(['1', '2', '3']),
          const SizedBox(height: 16),
          _buildRow(['4', '5', '6']),
          const SizedBox(height: 16),
          _buildRow(['7', '8', '9']),
          const SizedBox(height: 16),
          _buildRow(['backspace', '0', 'check']),
        ],
      ),
    );
  }

  Widget _buildRow(List<String> keys) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: keys.map((key) => _buildKey(key)).toList(),
    );
  }

  Widget _buildKey(String key) {
    final isSpecialKey = key == 'backspace' || key == 'check';
    final isCheck = key == 'check';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.mediumImpact();
          onKeyPressed(key);
        },
        onLongPress: key == 'backspace' ? () => onKeyPressed('clear') : null,
        borderRadius: BorderRadius.circular(36),
        splashColor: isCheck && isCheckEnabled
            ? AppColors.yellow90.withOpacity(0.3)
            : Colors.white.withOpacity(0.15),
        highlightColor: Colors.white.withOpacity(0.08),
        child: Ink(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: isCheck && isCheckEnabled
                ? AppColors.yellow90
                : isSpecialKey
                    ? Colors.transparent
                    : AppColors.inputBg,
            borderRadius: BorderRadius.circular(36),
            border: isSpecialKey
                ? null
                : Border.all(color: AppColors.inputBorder, width: 1),
          ),
          child: Center(child: _buildKeyContent(key)),
        ),
      ),
    );
  }

  Widget _buildKeyContent(String key) {
    if (key == 'backspace') {
      return const Icon(Icons.chevron_left, color: Colors.white, size: 32);
    } else if (key == 'check') {
      return Icon(
        Icons.check,
        color: isCheckEnabled ? Colors.black : Colors.white54,
        size: 28,
      );
    } else {
      return Text(key, style: AppTextStyles.numPad);
    }
  }
}
