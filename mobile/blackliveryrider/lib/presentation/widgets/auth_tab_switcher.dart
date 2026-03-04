import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class AuthTabSwitcher extends StatelessWidget {
  final int selectedIndex;
  final List<String> tabs;
  final Function(int) onTabChanged;

  const AuthTabSwitcher({
    super.key,
    required this.selectedIndex,
    required this.tabs,
    required this.onTabChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: List.generate(tabs.length, (index) {
          final isSelected = selectedIndex == index;
          return Expanded(
            child: GestureDetector(
              onTap: () => onTabChanged(index),
              child: Container(
                margin: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.bgPri : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    tabs[index],
                    style: isSelected
                        ? AppTextStyles.tabActive
                        : AppTextStyles.tabInactive,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}
