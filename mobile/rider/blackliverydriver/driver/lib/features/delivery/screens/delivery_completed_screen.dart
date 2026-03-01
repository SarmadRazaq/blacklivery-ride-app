import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/currency_utils.dart';
import '../../ride/data/models/ride_model.dart';
import '../../ride/driver_map_screen.dart';
import '../data/models/delivery_model.dart';

/// Summary screen shown after a delivery is completed successfully.
class DeliveryCompletedScreen extends StatelessWidget {
  final Ride ride;
  final DeliveryRequest? deliveryRequest;

  const DeliveryCompletedScreen({
    super.key,
    required this.ride,
    this.deliveryRequest,
  });

  @override
  Widget build(BuildContext context) {
    final currency = deliveryRequest?.currency ?? ride.pricing.currency;
    final deliveryDetails = deliveryRequest?.deliveryDetails;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(flex: 1),

              // Success animation circle
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle,
                  color: AppColors.success,
                  size: 64,
                ),
              ),

              const SizedBox(height: 24),

              const Text(
                'Delivery Complete!',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 8),

              Text(
                'Package successfully delivered',
                style: TextStyle(color: Colors.grey[400], fontSize: 15),
              ),

              const SizedBox(height: 32),

              // Earnings card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.cardBackground,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Text(
                      'You earned',
                      style: TextStyle(color: Colors.grey[400], fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      CurrencyUtils.format(ride.fare, currency: currency),
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Divider(color: AppColors.darkGrey),
                    const SizedBox(height: 12),

                    // Trip details
                    _detailRow(
                      'Package',
                      deliveryDetails?.packageType.label ?? 'Package',
                      Icons.inventory_2,
                    ),
                    const SizedBox(height: 8),
                    _detailRow(
                      'Distance',
                      '${ride.pricing.distance.toStringAsFixed(1)} km',
                      Icons.straighten,
                    ),
                    const SizedBox(height: 8),
                    _detailRow(
                      'Pickup',
                      ride.pickupAddress,
                      Icons.trip_origin,
                    ),
                    const SizedBox(height: 8),
                    _detailRow(
                      'Dropoff',
                      ride.dropoffAddress,
                      Icons.location_on,
                    ),
                    if (ride.pricing.tips > 0) ...[
                      const SizedBox(height: 8),
                      _detailRow(
                        'Tip',
                        CurrencyUtils.format(ride.pricing.tips, currency: currency),
                        Icons.volunteer_activism,
                        valueColor: AppColors.success,
                      ),
                    ],
                  ],
                ),
              ),

              const Spacer(flex: 2),

              // Done button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const DriverMapScreen()),
                      (route) => false,
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Done',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value, IconData icon, {Color? valueColor}) {
    return Row(
      children: [
        Icon(icon, color: AppColors.grey, size: 18),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(color: AppColors.grey, fontSize: 13),
        ),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            style: TextStyle(
              color: valueColor ?? AppColors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }
}
