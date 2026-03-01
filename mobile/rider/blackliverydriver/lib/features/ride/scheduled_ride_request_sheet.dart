import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import 'ride_accepted_screen.dart';
import 'package:provider/provider.dart';
import 'providers/ride_provider.dart';

class ScheduledRideRequestSheet extends StatelessWidget {
  final Map<String, dynamic> rideData;
  final VoidCallback? onClose;
  final VoidCallback? onAccept;

  const ScheduledRideRequestSheet({
    super.key,
    required this.rideData,
    this.onClose,
    this.onAccept,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with rider avatar and close button
          Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.topCenter,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(
                  top: 40,
                  bottom: 16,
                  left: 16,
                  right: 16,
                ),
                child: Column(
                  children: [
                    // Scheduled Request Badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Scheduled Request',
                        style: TextStyle(
                          color: Colors.orange,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Date & Time
                    Text(
                      '${rideData['scheduledDate'] ?? ''} — ${rideData['scheduledTime'] ?? ''}',
                      style: const TextStyle(
                        color: AppColors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      rideData['vehicleType'] ?? '',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  ],
                ),
              ),
              // Cancel button
              Positioned(
                top: -16,
                right: -8,
                child: GestureDetector(
                  onTap: onClose ?? () => Navigator.pop(context),
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close,
                      color: AppColors.white,
                      size: 18,
                    ),
                  ),
                ),
              ),
              // Rider Avatar
              Positioned(
                top: -30,
                child: Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.amber[200],
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.cardBackground,
                      width: 3,
                    ),
                  ),
                  child: const Center(
                    child: Icon(Icons.person, size: 30, color: Colors.brown),
                  ),
                ),
              ),
            ],
          ),

          // Locations
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.inputBackground,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          rideData['pickup'] ?? '',
                          style: TextStyle(
                            color: Colors.grey[300],
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 3),
                    child: Container(
                      width: 1,
                      height: 12,
                      color: AppColors.grey,
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: Colors.red[400],
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          rideData['dropoff'] ?? '',
                          style: TextStyle(
                            color: Colors.grey[300],
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Payment Info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    rideData['paymentMethod'] ?? 'Cash',
                    style: const TextStyle(
                      color: AppColors.white,
                      fontSize: 14,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    CurrencyUtils.format(
                      (rideData['price'] as num?)?.toDouble() ?? 0,
                    ),
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Rider Info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  rideData['name'] ?? rideData['riderName'] ?? 'Rider',
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.star, color: Colors.amber, size: 14),
                Text(
                  ' ${rideData['rating'] ?? 0.0}',
                  style: const TextStyle(color: AppColors.white, fontSize: 14),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Accept Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GestureDetector(
              onTap: () {
                Navigator.pop(context);
                if (onAccept != null) {
                  onAccept!();
                } else {
                  final rideProvider = Provider.of<RideProvider>(
                    context,
                    listen: false,
                  );
                  final currentRide = rideProvider.currentRide;
                  if (currentRide != null) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) =>
                            RideAcceptedScreen(ride: currentRide),
                      ),
                    );
                  }
                }
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(Icons.chevron_right, color: Colors.black, size: 20),
                    Icon(Icons.chevron_right, color: Colors.black45, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Accept Ride',
                      style: TextStyle(
                        color: Colors.black,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
