import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/vehicle_icon.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/widgets/custom_button.dart';
import 'providers/ride_provider.dart';
import 'ride_accepted_screen.dart';

class RideRequestDetailScreen extends StatefulWidget {
  final Map<String, dynamic> rideData;

  const RideRequestDetailScreen({super.key, required this.rideData});

  @override
  State<RideRequestDetailScreen> createState() =>
      _RideRequestDetailScreenState();
}

class _RideRequestDetailScreenState extends State<RideRequestDetailScreen> {
  bool _isAccepting = false;

  String _dateLine() {
    final date = (widget.rideData['scheduledDate'] ?? '').toString().trim();
    final time =
        (widget.rideData['scheduledTime'] ?? widget.rideData['scheduledAt'] ?? '')
            .toString()
            .trim();
    if (date.isEmpty && time.isEmpty) return 'Scheduled Ride';
    if (date.isEmpty) return time;
    if (time.isEmpty) return date;
    return '$date • $time';
  }

  Future<void> _acceptRide() async {
    final rideId =
        widget.rideData['id']?.toString() ?? widget.rideData['_id']?.toString();
    if (rideId == null || rideId.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Ride ID not available')));
      return;
    }

    setState(() => _isAccepting = true);
    try {
      final rideProvider = Provider.of<RideProvider>(context, listen: false);
      await rideProvider.acceptRide(rideId);
      if (!mounted) return;

      final currentRide = rideProvider.currentRide;
      if (currentRide != null) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => RideAcceptedScreen(ride: currentRide),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to accept ride: $e')));
    } finally {
      if (mounted) setState(() => _isAccepting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(color: Colors.black.withValues(alpha: 0.5)),
          ),

          Center(
            child: Container(
              margin: const EdgeInsets.all(24),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              decoration: BoxDecoration(
                color: AppColors.cardBackground,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.35),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.schedule, color: AppColors.primary, size: 20),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Scheduled Request',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.white,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Icon(Icons.close, color: Colors.grey[400]),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _dateLine(),
                    style: TextStyle(
                      color: Colors.grey[400],
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 12),

                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.inputBackground,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                    ),
                    child: Column(
                      children: [
                        _buildLocationItem(
                          iconColor: AppColors.primary,
                          title: widget.rideData['pickup'] ?? 'Pickup location',
                        ),
                        Padding(
                          padding: const EdgeInsets.only(left: 6, top: 6, bottom: 6),
                          child: Container(
                            width: 1.5,
                            height: 14,
                            color: Colors.white.withValues(alpha: 0.2),
                          ),
                        ),
                        _buildLocationItem(
                          iconColor: Colors.red,
                          title: widget.rideData['dropoff'] ?? 'Dropoff location',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          widget.rideData['paymentMethod'] ?? 'Cash',
                          style: const TextStyle(
                            color: AppColors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        CurrencyUtils.format(
                          (widget.rideData['price'] as num?)?.toDouble() ?? 0,
                        ),
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 10),

                  Row(
                    children: [
                      if (widget.rideData['isBusinessClass'] == true)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          margin: const EdgeInsets.only(right: 10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.business_center,
                                color: Colors.grey[300],
                                size: 14,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Business Class',
                                style: TextStyle(
                                  color: Colors.grey[300],
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),

                      Expanded(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          VehicleIcon.fromId(
                            widget.rideData['vehicleType'] ?? 'sedan',
                            size: 18,
                            color: Colors.grey.shade300,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            widget.rideData['vehicleType'] ?? 'Luxury SUV',
                            style: TextStyle(color: Colors.grey[300], fontSize: 12),
                          ),
                        ],
                      ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  Row(
                    children: [
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          width: 46,
                          height: 46,
                          decoration: const BoxDecoration(
                            color: AppColors.error,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close, color: AppColors.white, size: 20),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: CustomButton(
                          text: _isAccepting ? 'Accepting...' : 'Accept Ride',
                          onPressed: _isAccepting ? null : _acceptRide,
                          backgroundColor: AppColors.white,
                          textColor: Colors.black,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationItem({
    required Color iconColor,
    required String title,
  }) {
    return Row(
      children: [
        Icon(Icons.circle, size: 10, color: iconColor),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
