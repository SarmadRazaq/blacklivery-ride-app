import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import 'package:provider/provider.dart';
import '../../core/providers/region_provider.dart';
import '../../core/data/booking_state.dart';
import '../widgets/vehicle_icon.dart';
import '../widgets/custom_button.dart';
import '../widgets/ride_map_view.dart';
import 'confirm_ride_screen.dart';

class ConfirmPickupScreen extends StatefulWidget {
  const ConfirmPickupScreen({super.key});

  @override
  State<ConfirmPickupScreen> createState() => _ConfirmPickupScreenState();
}

class _ConfirmPickupScreenState extends State<ConfirmPickupScreen> {
  // final BookingState _bookingState = BookingState(); // Removed

  @override
  Widget build(BuildContext context) {
    final bookingState = Provider.of<BookingState>(context);
    final rideOption = bookingState.selectedRideOption;
    final distance = bookingState.estimatedDistance;
    final price = rideOption?.calculatePrice(distance) ?? 0;
    final etaMinutes =
      (rideOption?.estimatedMinutes ?? 0) > 0
      ? (rideOption?.estimatedMinutes ?? 0)
      : bookingState.estimatedDuration;

    final pickupLatLng = bookingState.pickupLocation != null
        ? LatLng(bookingState.pickupLocation!.latitude, bookingState.pickupLocation!.longitude)
        : null;
    final dropoffLatLng = bookingState.dropoffLocation != null
        ? LatLng(bookingState.dropoffLocation!.latitude, bookingState.dropoffLocation!.longitude)
        : null;

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: Column(
        children: [
          // Map area
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                // Real Google Map
                RideMapView(
                  pickup: pickupLatLng,
                  dropoff: dropoffLatLng,
                  showRoute: true,
                ),

                // Back button
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.bgPri,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.inputBorder),
                        ),
                        child: const Icon(
                          Icons.chevron_left,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),

                // Edit route button
                Positioned(
                  top: 60,
                  right: 16,
                  child: SafeArea(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.bgPri,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.inputBorder),
                      ),
                      child: Text(
                        'Edit route',
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.white,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),

                // Pickup pin in center
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.bgPri,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Pickup here',
                          style: AppTextStyles.caption.copyWith(
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const Icon(
                        Icons.location_on,
                        color: AppColors.yellow90,
                        size: 40,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Bottom section
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: AppColors.bgPri,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Confirm Pickup', style: AppTextStyles.heading3),

                const SizedBox(height: 16),

                // Pickup location
                _buildLocationRow(
                  color: AppColors.yellow90,
                  title: bookingState.pickupLocation?.name ?? 'Pickup Location',
                  subtitle: bookingState.pickupLocation?.address ?? '',
                ),

                const SizedBox(height: 12),

                // Dropoff location
                _buildLocationRow(
                  color: Colors.red,
                  title:
                      bookingState.dropoffLocation?.name ?? 'Dropoff Location',
                  subtitle: bookingState.dropoffLocation?.address ?? '',
                ),

                const SizedBox(height: 16),

                // Price card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.inputBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.inputBorder),
                  ),
                  child: Row(
                    children: [
                      // Car icon
                      Container(
                        width: 60,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.bgPri,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: VehicleIcon.fromId(
                          rideOption?.id ?? 'sedan',
                          color: AppColors.yellow90,
                          size: 36,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              rideOption?.name ?? 'Ride',
                              style: AppTextStyles.body.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              '${distance.toStringAsFixed(1)} ${Provider.of<RegionProvider>(context, listen: false).isNigeria ? 'km' : 'mi'} • $etaMinutes min',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.txtInactive,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        CurrencyUtils.format(price),
                        style: AppTextStyles.heading3.copyWith(
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                CustomButton.main(
                  text: 'Confirm Pickup Spot',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const ConfirmRideScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationRow({
    required Color color,
    required String title,
    required String subtitle,
  }) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(5),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTextStyles.body.copyWith(
                  color: Colors.white,
                  fontSize: 14,
                ),
              ),
              if (subtitle.isNotEmpty)
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
      ],
    );
  }
}
