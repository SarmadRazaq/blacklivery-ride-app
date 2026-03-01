import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/models/ride_history_model.dart';
import '../widgets/vehicle_icon.dart';
import '../widgets/ride_map_view.dart';
import 'support_chat_screen.dart';

class RideDetailsScreen extends StatelessWidget {
  final RideHistoryItem ride;

  const RideDetailsScreen({super.key, required this.ride});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
        backgroundColor: AppColors.bgPri,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.inputBg,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.inputBorder),
            ),
            child: const Icon(Icons.chevron_left, color: Colors.white),
          ),
        ),
        title: Text(
          'Ride details',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Map preview with route
            SizedBox(
              height: 180,
              width: double.infinity,
              child: RideMapView(
                pickup: ride.pickupLat != null && ride.pickupLng != null
                    ? LatLng(ride.pickupLat!, ride.pickupLng!)
                    : null,
                dropoff: ride.dropoffLat != null && ride.dropoffLng != null
                    ? LatLng(ride.dropoffLat!, ride.dropoffLng!)
                    : null,
                showRoute: true,
              ),
            ),

            // Driver info section
            Container(
              padding: const EdgeInsets.all(20),
              color: AppColors.bgSec,
              child: Row(
                children: [
                  // Driver photo
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.yellow90, width: 2),
                      color: AppColors.inputBg,
                    ),
                    child: ClipOval(
                      child: ride.driver?.photoUrl.isNotEmpty == true
                          ? Image.network(
                              ride.driver!.photoUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => const Icon(
                                Icons.person,
                                color: Colors.white,
                                size: 30,
                              ),
                            )
                          : const Icon(
                              Icons.person,
                              color: Colors.white,
                              size: 30,
                            ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              ride.driver?.name ?? 'Driver',
                              style: AppTextStyles.body.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Row(
                              children: List.generate(
                                5,
                                (index) => Icon(
                                  Icons.star,
                                  color:
                                      index < (ride.driver?.rating.floor() ?? 4)
                                      ? AppColors.yellow90
                                      : AppColors.inputBorder,
                                  size: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.inputBg,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'Good trip',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.txtInactive,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Car image
            Container(
              height: 160,
              width: double.infinity,
              color: AppColors.bgSec,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 200,
                    height: 100,
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: VehicleIcon.fromId(
                      ride.rideType,
                      color: AppColors.yellow90,
                      size: 60,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Route info
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Row(
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: AppColors.yellow90,
                            borderRadius: BorderRadius.circular(5),
                          ),
                        ),
                        Container(
                          width: 2,
                          height: 30,
                          color: AppColors.inputBorder,
                        ),
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(5),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            ride.pickupAddress,
                            style: AppTextStyles.body.copyWith(
                              color: Colors.white,
                              fontSize: 13,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 20),
                          Text(
                            ride.dropoffAddress,
                            style: AppTextStyles.body.copyWith(
                              color: Colors.white,
                              fontSize: 13,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Date and price
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.calendar_today,
                          color: AppColors.yellow90,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _formatDate(ride.date),
                          style: AppTextStyles.body.copyWith(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      CurrencyUtils.format(ride.price),
                      style: AppTextStyles.body.copyWith(
                        color: AppColors.yellow90,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Help section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.help_outline,
                        color: AppColors.yellow90,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Help',
                        style: AppTextStyles.heading3.copyWith(fontSize: 16),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildHelpOption(
                    title: 'Find lost item',
                    subtitle: 'We can help you get in touch with your driver',
                    onTap: () => _openSupportChat(
                      context,
                      'Lost item on ride ${ride.id}',
                    ),
                  ),
                  _buildHelpOption(
                    title: 'Report safety issue',
                    subtitle: 'Let us know if you have a safety related issue',
                    onTap: () => _openSupportChat(
                      context,
                      'Safety issue on ride ${ride.id}',
                    ),
                  ),
                  _buildHelpOption(
                    title: 'Leave a feedback for the driver',
                    subtitle: 'For issues that aren\'t safety related',
                    onTap: () => _openSupportChat(
                      context,
                      'Driver feedback for ride ${ride.id}',
                    ),
                  ),
                  _buildHelpOption(
                    title: 'Get ride help',
                    subtitle: 'Need help for something else? Find it here',
                    onTap: () =>
                        _openSupportChat(context, 'Help with ride ${ride.id}'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // View receipt button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: GestureDetector(
                onTap: () => _showReceiptDialog(context),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.inputBorder),
                  ),
                  child: Center(
                    child: Text(
                      'View receipt',
                      style: AppTextStyles.body.copyWith(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildHelpOption({
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: const BoxDecoration(
          border: Border(
            bottom: BorderSide(color: AppColors.inputBorder, width: 0.5),
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: AppColors.txtInactive, size: 20),
          ],
        ),
      ),
    );
  }

  void _showReceiptDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSec,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.inputBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: Text(
                  'Trip Receipt',
                  style: AppTextStyles.heading3.copyWith(fontSize: 18),
                ),
              ),
              const SizedBox(height: 20),
              _receiptRow('Trip ID', ride.id.length > 12 ? '${ride.id.substring(0, 12)}...' : ride.id),
              _receiptRow('Date', _formatDate(ride.date)),
              _receiptRow('Ride Type', ride.rideType),
              const Divider(color: AppColors.inputBorder, height: 24),
              Text(
                'From',
                style: AppTextStyles.caption.copyWith(color: AppColors.txtInactive, fontSize: 11),
              ),
              const SizedBox(height: 4),
              Text(
                ride.pickupAddress,
                style: AppTextStyles.body.copyWith(color: Colors.white, fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Text(
                'To',
                style: AppTextStyles.caption.copyWith(color: AppColors.txtInactive, fontSize: 11),
              ),
              const SizedBox(height: 4),
              Text(
                ride.dropoffAddress,
                style: AppTextStyles.body.copyWith(color: Colors.white, fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const Divider(color: AppColors.inputBorder, height: 24),
              if (ride.paymentMethod != null)
                _receiptRow('Payment', ride.paymentMethod!),
              if (ride.driver != null)
                _receiptRow('Driver', ride.driver!.name),
              const Divider(color: AppColors.inputBorder, height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Total Fare',
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    CurrencyUtils.format(ride.price),
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.yellow90,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Widget _receiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTextStyles.body.copyWith(
              color: AppColors.txtInactive,
              fontSize: 13,
            ),
          ),
          Text(
            value,
            style: AppTextStyles.body.copyWith(
              color: Colors.white,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  void _openSupportChat(BuildContext context, String topic) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const SupportChatScreen()),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[date.month - 1]} ${date.day} - ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}
