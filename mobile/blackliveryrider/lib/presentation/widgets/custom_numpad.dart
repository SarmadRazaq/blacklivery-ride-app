import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class CustomNumpad extends StatelessWidget {
  final Function(String) onKeyPressed;

  const CustomNumpad({super.key, required this.onKeyPressed});

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

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onKeyPressed(key);
      },
      onLongPress: key == 'backspace' ? () => onKeyPressed('clear') : null,
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          color: isSpecialKey ? Colors.transparent : AppColors.inputBg,
          borderRadius: BorderRadius.circular(36),
          border: isSpecialKey
              ? null
              : Border.all(color: AppColors.inputBorder, width: 1),
        ),
        child: Center(child: _buildKeyContent(key)),
      ),
    );
  }

  Widget _buildKeyContent(String key) {
    if (key == 'backspace') {
      return const Icon(Icons.chevron_left, color: Colors.white, size: 32);
    } else if (key == 'check') {
      return const Icon(Icons.check, color: Colors.white, size: 28);
    } else {
      return Text(key, style: AppTextStyles.numPad);
    }
  }
}
