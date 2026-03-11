import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import 'package:provider/provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/services/socket_service.dart';
import 'package:share_plus/share_plus.dart';
import '../widgets/vehicle_icon.dart';
import '../widgets/ride_map_view.dart';
import 'ride_completed_screen.dart';

class ArrivingDestinationScreen extends StatefulWidget {
  const ArrivingDestinationScreen({super.key});

  @override
  State<ArrivingDestinationScreen> createState() =>
      _ArrivingDestinationScreenState();
}

class _ArrivingDestinationScreenState extends State<ArrivingDestinationScreen> {
  bool _quietModeEnabled = true;
  LatLng? _driverLatLng;
  final SocketService _socketService = SocketService();

  @override
  void initState() {
    super.initState();
    // Re-register socket listeners since previous screen's dispose() removed them
    final bookingState = Provider.of<BookingState>(context, listen: false);
    bookingState.reRegisterSocketListeners();
    _listenForCompletion();
    _listenToDriverLocation();
    // Check if status is already 'completed' (e.g. navigated here because status changed)
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkCompleted());
  }

  @override
  void dispose() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    try {
      bookingState.removeListener(_checkCompleted);
    } catch (_) {}
    _socketService.stopListeningToRideUpdates();
    super.dispose();
  }

  void _listenForCompletion() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    bookingState.addListener(_checkCompleted);
  }

  void _checkCompleted() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    if (bookingState.bookingStatus == 'completed' ||
        bookingState.currentBooking?.status == 'completed') {
      bookingState.removeListener(_checkCompleted);
      if (mounted) _completeRide();
    }
  }

  void _listenToDriverLocation() {
    _socketService.listenToDriverLocation((data) {
      if (!mounted) return;
      final lat = (data['latitude'] as num?)?.toDouble();
      final lng = (data['longitude'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        setState(() => _driverLatLng = LatLng(lat, lng));
      }
    });
  }

  void _shareRideInfo() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final pickup = bookingState.pickupLocation?.name ?? 'Unknown';
    final dropoff = bookingState.dropoffLocation?.name ?? 'Unknown';
    final driver = bookingState.assignedDriver?.name ?? 'Unknown';
    final dropoffLat = bookingState.dropoffLocation?.latitude;
    final dropoffLng = bookingState.dropoffLocation?.longitude;
    final mapsLink = dropoffLat != null && dropoffLng != null
        ? '\nhttps://maps.google.com/?q=$dropoffLat,$dropoffLng'
        : '';
    Share.share(
      'I\'m on a BlackLivery ride from $pickup to $dropoff with driver $driver. Track my trip!$mapsLink',
    );
  }

  void _openSafety() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSec,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => _buildSafetySheet(),
    );
  }

  Widget _buildSafetySheet() {
    return Container(
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
          const SizedBox(height: 24),
          Text('Safety Tools', style: AppTextStyles.heading3),
          const SizedBox(height: 20),
          _buildSafetyOption(
            icon: Icons.emergency,
            title: 'Emergency Services',
            subtitle: 'Call 911',
            color: Colors.red,
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Calling emergency services...')),
              );
            },
          ),
          const SizedBox(height: 16),
          _buildSafetyOption(
            icon: Icons.share_location,
            title: 'Share Live Location',
            subtitle: 'Share your trip with trusted contacts',
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(const SnackBar(content: Text('Location shared!')));
            },
          ),
          const SizedBox(height: 16),
          _buildSafetyOption(
            icon: Icons.report_problem_outlined,
            title: 'Report an Issue',
            subtitle: 'Report a problem with this trip',
            onTap: () {
              Navigator.pop(context);
            },
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSafetyOption({
    required IconData icon,
    required String title,
    required String subtitle,
    Color? color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: (color ?? AppColors.yellow90).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color ?? AppColors.yellow90, size: 22),
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
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 12,
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

  void _completeRide() {
    Provider.of<BookingState>(
      context,
      listen: false,
    ).updateBookingStatus('completed');
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const RideCompletedScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingState = Provider.of<BookingState>(context);
    final driver = bookingState.assignedDriver;
    final rideOption = bookingState.selectedRideOption;
    final distance = bookingState.estimatedDistance;
    final price = rideOption?.calculatePrice(distance) ?? 0;
    final paymentMethod = bookingState.paymentMethod.trim();
    final paymentLabel = paymentMethod.isEmpty
      ? 'Wallet'
      : paymentMethod[0].toUpperCase() + paymentMethod.substring(1);

    final pickupLatLng = bookingState.pickupLocation != null
        ? LatLng(
            bookingState.pickupLocation!.latitude,
            bookingState.pickupLocation!.longitude,
          )
        : null;
    final dropoffLatLng = bookingState.dropoffLocation != null
        ? LatLng(
            bookingState.dropoffLocation!.latitude,
            bookingState.dropoffLocation!.longitude,
          )
        : null;

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: Column(
        children: [
          // Map area with route showing destination approach
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                RideMapView(
                  pickup: pickupLatLng,
                  dropoff: dropoffLatLng,
                  driverLocation: _driverLatLng,
                  showRoute: true,
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
                // Status header with reminder
                Text(
                  'Arriving destination...',
                  style: AppTextStyles.heading3.copyWith(fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  '...remember not to leave anything behind',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.txtInactive,
                    fontSize: 12,
                  ),
                ),

                const SizedBox(height: 20),

                // Driver info card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.inputBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.inputBorder),
                  ),
                  child: Row(
                    children: [
                      // Driver photo
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.yellow90,
                            width: 2,
                          ),
                          color: AppColors.bgPri,
                        ),
                        child: ClipOval(
                          child: driver?.photoUrl != null
                              ? Image.network(
                                  driver!.photoUrl,
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
                                  driver?.name ?? 'Seth Ervah',
                                  style: AppTextStyles.body.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.star,
                                      color: AppColors.yellow90,
                                      size: 14,
                                    ),
                                    const SizedBox(width: 2),
                                    Text(
                                      '${driver?.rating ?? 4.9}',
                                      style: AppTextStyles.caption.copyWith(
                                        color: Colors.white,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.bgPri,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    rideOption?.name ?? 'Executive SUV',
                                    style: AppTextStyles.caption.copyWith(
                                      color: AppColors.txtInactive,
                                      fontSize: 10,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  driver?.carModel ?? 'Lincoln Navigator',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.txtInactive,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                Text(
                                  'Plate number:',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.txtInactive,
                                    fontSize: 10,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  driver?.licensePlate ?? 'XXX 34 BLV',
                                  style: AppTextStyles.caption.copyWith(
                                    color: Colors.white,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                Text(
                                  'Color:',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.txtInactive,
                                    fontSize: 10,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  driver?.carColor ?? 'Black',
                                  style: AppTextStyles.caption.copyWith(
                                    color: Colors.white,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      // Car image placeholder
                      Container(
                        width: 80,
                        height: 50,
                        decoration: BoxDecoration(
                          color: AppColors.bgPri,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: VehicleIcon.fromId(
                          rideOption?.id ?? 'sedan',
                          color: AppColors.yellow90,
                          size: 38,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // Price and Payment info
                Container(
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
                          const Icon(
                            Icons.attach_money,
                            color: AppColors.yellow90,
                            size: 20,
                          ),
                          Text(
                            CurrencyUtils.format(price),
                            style: AppTextStyles.body.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Text(
                            paymentLabel,
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.txtInactive,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Container(
                            width: 20,
                            height: 14,
                            decoration: BoxDecoration(
                              color: Colors.blue,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Quiet Mode toggle
                Container(
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
                      Text(
                        'Quiet Mode',
                        style: AppTextStyles.body.copyWith(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                      ),
                      Switch(
                        value: _quietModeEnabled,
                        onChanged: (value) {
                          setState(() => _quietModeEnabled = value);
                          // Notify driver via socket
                          final rideId = Provider.of<BookingState>(
                            context,
                            listen: false,
                          ).rideId;
                          if (rideId != null) {
                            _socketService.emitQuietMode(
                              rideId: rideId,
                              enabled: value,
                            );
                          }
                        },
                        activeThumbColor: AppColors.success,
                        activeTrackColor: AppColors.success.withOpacity(0.3),
                        inactiveThumbColor: Colors.grey,
                        inactiveTrackColor: Colors.grey.withOpacity(0.3),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Share ride info button
                GestureDetector(
                  onTap: _shareRideInfo,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: AppColors.yellow90,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        'Share ride info',
                        style: AppTextStyles.body.copyWith(
                          color: Colors.black,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // Safety button
                Center(
                  child: GestureDetector(
                    onTap: _openSafety,
                    child: Text(
                      'Safety',
                      style: AppTextStyles.body.copyWith(
                        color: AppColors.txtInactive,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
