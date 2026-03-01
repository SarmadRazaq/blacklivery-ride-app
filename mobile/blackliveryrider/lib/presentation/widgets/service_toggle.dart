import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class ServiceToggle extends StatelessWidget {
  final int selectedIndex;
  final Function(int) onChanged;

  const ServiceToggle({
    super.key,
    required this.selectedIndex,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Row(
        children: [
          _buildToggleItem(
            index: 0,
            icon: Icons.directions_car,
            label: 'Book a ride',
          ),
          _buildToggleItem(
            index: 1,
            icon: Icons.inventory_2_outlined,
            label: 'Send Parcel',
          ),
        ],
      ),
    );
  }

  Widget _buildToggleItem({
    required int index,
    required IconData icon,
    required String label,
  }) {
    final isSelected = selectedIndex == index;

    return Expanded(
      child: GestureDetector(
        onTap: () => onChanged(index),
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? AppColors.bgPri : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: isSelected
                ? Border.all(color: AppColors.inputBorder)
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: isSelected ? Colors.white : Colors.white70,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white70,
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
