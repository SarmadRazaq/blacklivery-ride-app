import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import 'car_display.dart';

class OnboardProgress extends StatelessWidget {
  const OnboardProgress({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 10,
      height: 10,
      decoration: const BoxDecoration(
        color: AppColors.inputBg,
        shape: BoxShape.circle,
      ),
    );
  }
}

class OnboardProgressAll extends StatelessWidget {
  const OnboardProgressAll({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 200,
      height: 18,
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          // Progress Line Container
          SizedBox(
            width: 188,
            height: 2,
            child: Stack(
              children: [
                // Backline
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.inputBg,
                    borderRadius: BorderRadius.circular(100),
                  ),
                ),
                // Frontline (Yellow) - small indicator at start
                Positioned(
                  left: 0,
                  width: 2,
                  height: 2,
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.yellow90,
                      borderRadius: BorderRadius.circular(100),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Dots - positioned at specific locations
          const Positioned(
            left: 6,
            child: OnboardProgress(),
          ),
          const Positioned(
            left: 53,
            child: OnboardProgress(),
          ),
          const Positioned(
            left: 95,
            child: OnboardProgress(),
          ),
          const Positioned(
            left: 137,
            child: OnboardProgress(),
          ),
          const Positioned(
            left: 184,
            child: OnboardProgress(),
          ),

          // Car indicator - positioned at first dot
          const Positioned(
            left: -4, // Centered on first dot (6 + 5 - 15 = -4)
            child: CarDisplay(),
          ),
        ],
      ),
    );
  }
}
