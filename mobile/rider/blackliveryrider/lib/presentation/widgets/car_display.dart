import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class CarDisplay extends StatelessWidget {
  const CarDisplay({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 30,
      height: 18,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Beam effect (left)
          Container(
            width: 4,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.txtSec.withOpacity(0.5),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 2),
          // Car icon
          const Icon(
            Icons.directions_car,
            size: 16,
            color: AppColors.buttonBgPri,
          ),
        ],
      ),
    );
  }
}
