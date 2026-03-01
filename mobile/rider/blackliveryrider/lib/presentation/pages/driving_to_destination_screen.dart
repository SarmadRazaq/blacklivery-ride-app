import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import 'package:provider/provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/services/socket_service.dart';
import '../../core/services/location_service.dart';
import '../widgets/vehicle_icon.dart';
import '../widgets/ride_map_view.dart';
import 'arriving_destination_screen.dart';

class DrivingToDestinationScreen extends StatefulWidget {
  const DrivingToDestinationScreen({super.key});

  @override
  State<DrivingToDestinationScreen> createState() =>
      _DrivingToDestinationScreenState();
}

class _DrivingToDestinationScreenState
    extends State<DrivingToDestinationScreen> {
  bool _quietModeEnabled = false;
  int _minutesRemaining = 0;
  LatLng? _driverLatLng;
  final SocketService _socketService = SocketService();
  final LocationService _locationService = LocationService();
  StreamSubscription? _locationSub;

  @override
  void initState() {
    super.initState();
    _initEta();
    _listenToDriverLocation();
    _startRiderLocationTracking();
  }

  @override
  void dispose() {
    _stopRiderLocationTracking();
    _socketService.stopListeningToRideUpdates();
    super.dispose();
  }

  /// Start emitting rider's location to the backend during the ride.
  void _startRiderLocationTracking() {
    final rideId =
        Provider.of<BookingState>(context, listen: false).rideId;
    _locationService.startTracking(distanceFilter: 20);
    _locationSub = _locationService.positionStream.listen((position) {
      _socketService.emitRiderLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        rideId: rideId,
      );
    });
  }

  void _stopRiderLocationTracking() {
    _locationSub?.cancel();
    _locationSub = null;
    _locationService.stopTracking();
  }

  void _initEta() {
    // Use estimated minutes from ride option as initial ETA
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final minutes = bookingState.selectedRideOption?.estimatedMinutes ?? 15;
    setState(() => _minutesRemaining = minutes);
  }

  void _listenToDriverLocation() {
    _socketService.listenToDriverLocation((data) {
      if (!mounted) return;
      final lat = (data['latitude'] as num?)?.toDouble();
      final lng = (data['longitude'] as num?)?.toDouble();
      final eta = (data['eta'] as num?)?.toInt();
      setState(() {
        if (lat != null && lng != null) {
          _driverLatLng = LatLng(lat, lng);
        }
        if (eta != null) {
          _minutesRemaining = eta;
          // Auto-transition when ETA drops to ≤ 1 min
          if (_minutesRemaining <= 1) {
            _navigateToArrivingDestination();
          }
        }
      });
    });

    // Also listen for status changes — navigate when arriving
    final bookingState = Provider.of<BookingState>(context, listen: false);
    bookingState.addListener(_checkStatus);
  }

  void _checkStatus() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final status = bookingState.bookingStatus;
    // Backend emits 'completed' — never 'arriving_destination'.
    // Transition to ArrivingDestinationScreen when completed so it can show
    // the completion flow, or when ETA is very low (≤ 2 min).
    if (status == 'completed') {
      bookingState.removeListener(_checkStatus);
      _navigateToArrivingDestination();
    } else if (status == 'cancelled') {
      bookingState.removeListener(_checkStatus);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Ride was cancelled')));
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    }
  }

  void _navigateToArrivingDestination() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => const ArrivingDestinationScreen(),
      ),
    );
  }

  void _shareRideInfo() {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Share link copied!')));
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

  @override
  Widget build(BuildContext context) {
    final bookingState = Provider.of<BookingState>(context);
    final driver = bookingState.assignedDriver;
    final rideOption = bookingState.selectedRideOption;
    final distance = bookingState.estimatedDistance;
    final price = rideOption?.calculatePrice(distance) ?? 0;

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
          // Map area with route
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
                // Status header
                Text(
                  'Driving to destination',
                  style: AppTextStyles.heading3.copyWith(fontSize: 18),
                ),
                const SizedBox(height: 20),

                // Pickup and destination info
                _buildLocationRow(
                  icon: Icons.radio_button_checked,
                  iconColor: AppColors.yellow90,
                  title:
                      bookingState.pickupLocation?.name ??
                      'Cottage Grove Ave Chicago',
                  address:
                      bookingState.pickupLocation?.address ?? '#60653-1480',
                  isAdd: false,
                ),
                const SizedBox(height: 4),
                Padding(
                  padding: const EdgeInsets.only(left: 11),
                  child: Container(
                    width: 2,
                    height: 20,
                    color: AppColors.inputBorder,
                  ),
                ),
                _buildLocationRow(
                  icon: Icons.add,
                  iconColor: Colors.white,
                  title: 'Add stop',
                  address: '',
                  isAdd: true,
                ),
                const SizedBox(height: 4),
                Padding(
                  padding: const EdgeInsets.only(left: 11),
                  child: Container(
                    width: 2,
                    height: 20,
                    color: AppColors.inputBorder,
                  ),
                ),
                _buildLocationRow(
                  icon: Icons.location_on,
                  iconColor: Colors.red,
                  title:
                      bookingState.dropoffLocation?.name ??
                      'Kruse Rd Mascoutah',
                  address:
                      bookingState.dropoffLocation?.address ?? '#62258-3927',
                  isAdd: false,
                  isDestination: true,
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
                            bookingState.paymentMethod
                                    .substring(0, 1)
                                    .toUpperCase() +
                                bookingState.paymentMethod.substring(1),
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
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                value
                                    ? 'Quiet Mode enabled. Driver won\'t initiate conversation.'
                                    : 'Quiet Mode disabled.',
                              ),
                              duration: const Duration(seconds: 2),
                            ),
                          );
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

  Widget _buildLocationRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String address,
    required bool isAdd,
    bool isDestination = false,
  }) {
    return Row(
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isAdd ? AppColors.inputBg : Colors.transparent,
            border: isAdd ? null : Border.all(color: iconColor, width: 2),
          ),
          child: Icon(icon, color: iconColor, size: isAdd ? 16 : 12),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: AppTextStyles.body.copyWith(
                        color: isAdd ? AppColors.txtInactive : Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  if (!isAdd)
                    Icon(
                      Icons.open_in_new,
                      color: AppColors.txtInactive,
                      size: 16,
                    ),
                ],
              ),
              if (address.isNotEmpty)
                Text(
                  address,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.txtInactive,
                    fontSize: 11,
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
