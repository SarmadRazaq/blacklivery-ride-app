import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class RecentLocationCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? distance;
  final VoidCallback? onTap;
  final bool showClock;

  const RecentLocationCard({
    super.key,
    required this.title,
    required this.subtitle,
    this.distance,
    this.onTap,
    this.showClock = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Row(
          children: [
            // Location Icon
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.bgPri,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.location_on_outlined,
                color: AppColors.yellow90,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            // Location Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            // Distance or Clock
            if (showClock)
              const Icon(
                Icons.access_time,
                color: AppColors.txtInactive,
                size: 18,
              )
            else if (distance != null)
              Text(
                distance!,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.txtInactive,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
