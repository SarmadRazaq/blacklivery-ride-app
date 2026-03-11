import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import 'package:provider/provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/services/socket_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/navigation_service.dart';
import '../widgets/vehicle_icon.dart';
import '../widgets/ride_map_view.dart';
import 'driving_to_destination_screen.dart';
import 'ride_chat_screen.dart';

class DriverArrivingScreen extends StatefulWidget {
  const DriverArrivingScreen({super.key});

  @override
  State<DriverArrivingScreen> createState() => _DriverArrivingScreenState();
}

class _DriverArrivingScreenState extends State<DriverArrivingScreen> {
  LatLng? _driverLatLng;
  int? _etaMinutes;
  bool _hasNavigatedToTrip = false;
  final SocketService _socketService = SocketService();
  final LocationService _locationService = LocationService();
  final NavigationService _navigationService = NavigationService();
  StreamSubscription? _locationSub;
  List<LatLng> _routePoints = [];
  DateTime? _lastRouteFetch;
  Timer? _waitTimer;
  int _waitSeconds = 0;

  @override
  void initState() {
    super.initState();
    _listenToDriverLocation();
    _startRiderLocationTracking();
    _startWaitTimerIfArrived();
  }

  void _startWaitTimerIfArrived() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    if (bookingState.driverArrivedAt != null) {
      _waitSeconds = DateTime.now().difference(bookingState.driverArrivedAt!).inSeconds;
    }
    // Listen for status changes to start timer when driver arrives
    bookingState.addListener(_onBookingChanged);
  }

  void _onBookingChanged() {
    if (!mounted) return;
    final bookingState = Provider.of<BookingState>(context, listen: false);
    if (bookingState.driverArrivedAt != null && _waitTimer == null) {
      _waitSeconds = DateTime.now().difference(bookingState.driverArrivedAt!).inSeconds;
      _waitTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => _waitSeconds++);
      });
    }
  }

  /// Emit rider location so the driver can track approach to pickup point.
  void _startRiderLocationTracking() {
    final rideId =
        Provider.of<BookingState>(context, listen: false).rideId;
    _locationService.startTracking(distanceFilter: 15);
    _locationSub = _locationService.positionStream.listen((position) {
      _socketService.emitRiderLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        rideId: rideId,
      );
    });
  }

  void _listenToDriverLocation() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final rideId = bookingState.rideId;
    if (rideId != null) {
      _socketService.listenToDriverLocation((data) {
        if (mounted) {
          final lat = (data['lat'] as num?)?.toDouble() ?? (data['latitude'] as num?)?.toDouble();
          final lng = (data['lng'] as num?)?.toDouble() ?? (data['longitude'] as num?)?.toDouble();
          final eta = (data['eta'] as num?)?.toInt();
          if (lat != null && lng != null) {
            setState(() {
              _driverLatLng = LatLng(lat, lng);
              if (eta != null) _etaMinutes = eta;
            });
            _fetchDriverToPickupRoute();
          }
        }
      });
    }
  }

  /// Fetch route polyline from driver to pickup (throttled to every 15s).
  Future<void> _fetchDriverToPickupRoute() async {
    if (_driverLatLng == null) return;
    final now = DateTime.now();
    if (_lastRouteFetch != null &&
        now.difference(_lastRouteFetch!).inSeconds < 15) {
      return;
    }
    _lastRouteFetch = now;

    final bookingState = Provider.of<BookingState>(context, listen: false);
    final pickup = bookingState.pickupLocation;
    if (pickup == null) return;

    final pickupLatLng = LatLng(pickup.latitude, pickup.longitude);
    try {
      final routeData =
          await _navigationService.getRoute(_driverLatLng!, pickupLatLng);
      if (routeData['status'] == 'OK' && mounted) {
        final routes = routeData['routes'] as List;
        if (routes.isNotEmpty) {
          final encoded =
              routes[0]['overview_polyline']['points'] as String;
          final points = _navigationService.decodePolyline(encoded);
          setState(() => _routePoints = points);
        }
      }
    } catch (e) {
      debugPrint('Failed to fetch driver→pickup route: $e');
    }
  }

  @override
  void dispose() {
    _waitTimer?.cancel();
    try {
      Provider.of<BookingState>(context, listen: false).removeListener(_onBookingChanged);
    } catch (_) {}
    _locationSub?.cancel();
    _locationService.stopTracking();
    _socketService.stopListeningToRideUpdates();
    super.dispose();
  }

  void _callDriver() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final phone = bookingState.assignedDriver?.phone;
    if (phone != null && phone.isNotEmpty) {
      launchUrl(Uri.parse('tel:$phone'));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Driver phone number not available')),
      );
    }
  }

  void _messageDriver() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final rideId = bookingState.rideId;
    final driverName = bookingState.assignedDriver?.name ?? 'Driver';
    if (rideId != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) =>
              RideChatScreen(rideId: rideId, driverName: driverName),
        ),
      );
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Chat not available')));
    }
  }

  void _openSafety() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSec,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Container(
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
            ListTile(
              leading: const Icon(Icons.emergency, color: Colors.red),
              title: Text(
                'Emergency Services',
                style: AppTextStyles.body.copyWith(color: Colors.white),
              ),
              subtitle: Text(
                'Call 911 / 112',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.txtInactive,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                launchUrl(Uri.parse('tel:911'));
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.share_location,
                color: AppColors.yellow90,
              ),
              title: Text(
                'Share Live Location',
                style: AppTextStyles.body.copyWith(color: Colors.white),
              ),
              onTap: () {
                Navigator.pop(context);
                _shareRideInfo();
              },
            ),
          ],
        ),
      ),
    );
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

  void _cancelRide() {
    final reasonController = TextEditingController();
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final createdAt = bookingState.currentBooking?.scheduledTime;
    final gracePeriod = const Duration(minutes: 2);
    final isWithinGrace = createdAt != null &&
        DateTime.now().difference(createdAt) <= gracePeriod;

    String? reasonError;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppColors.bgSec,
          title: Text('Cancel Ride?', style: AppTextStyles.heading3),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isWithinGrace
                    ? 'You are within the 2-minute grace period. No cancellation fee will be charged.'
                    : 'Cancellation fees may apply since the grace period has passed.',
                style: AppTextStyles.body.copyWith(
                  color: isWithinGrace ? Colors.green : Colors.orange,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.bgPri,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: reasonError != null ? Colors.red : AppColors.inputBorder,
                  ),
                ),
                child: TextField(
                  controller: reasonController,
                  maxLines: 3,
                  maxLength: 300,
                  style: AppTextStyles.body.copyWith(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Reason for cancellation (required)',
                    hintStyle: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 13,
                    ),
                    border: InputBorder.none,
                    counterStyle: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
              ),
              if (reasonError != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    reasonError!,
                    style: const TextStyle(color: Colors.red, fontSize: 12),
                  ),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('No', style: AppTextStyles.body),
            ),
            TextButton(
              onPressed: () {
                final reason = reasonController.text.trim();
                if (reason.isEmpty) {
                  setDialogState(() {
                    reasonError = 'Please provide a reason';
                  });
                  return;
                }
                Navigator.pop(context);
                Provider.of<BookingState>(context, listen: false).cancelBooking(
                  reason: reason,
                );
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
              child: Text(
                'Yes, Cancel',
                style: AppTextStyles.body.copyWith(color: Colors.red),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Removed _startRide (Driver controls this)

  String _formatWaitSubtitle() {
    final mins = _waitSeconds ~/ 60;
    final secs = _waitSeconds % 60;
    final timeStr = '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
    // Free waiting: 5 min for standard, 3 min for NG delivery
    const freeMinutes = 5;
    if (mins < freeMinutes) {
      return 'Waiting $timeStr (free for ${freeMinutes - mins} min)';
    }
    return 'Paid waiting $timeStr';
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

    // Reactive State
    final isArrived =
        bookingState.bookingStatus == 'arriving' ||
        bookingState.currentBooking?.status == 'arrived';
    final isInProgress =
        bookingState.bookingStatus == 'in_progress' ||
        bookingState.currentBooking?.status == 'in_progress';

    // Auto-navigation should likely be handled by a wrapper or listener,
    // but for now, we can check here.
    if (isInProgress && !_hasNavigatedToTrip) {
      _hasNavigatedToTrip = true;
      // Schedule navigation to prevent build cycle errors
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const DrivingToDestinationScreen(),
          ),
        );
      });
    }

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: Column(
        children: [
          // Map area
          Expanded(
            flex: 2,
            child: Stack(
              children: [
                // Real Google Map with driver location and route
                RideMapView(
                  pickup: pickupLatLng,
                  driverLocation: _driverLatLng,
                  showRoute: _routePoints.isNotEmpty,
                  routePoints: _routePoints,
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
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isArrived
                                ? 'Driver has arrived!'
                                : 'Driver is on the way',
                            style: AppTextStyles.heading3.copyWith(
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isArrived
                                ? _formatWaitSubtitle()
                                : _etaMinutes != null
                                    ? '$_etaMinutes min away'
                                    : 'Arriving soon...',
                            style: AppTextStyles.caption.copyWith(
                              color: isArrived
                                  ? AppColors.yellow90
                                  : AppColors.txtInactive,
                              fontSize: isArrived ? 16 : 14,
                              fontWeight: isArrived
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Price
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.inputBg,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        CurrencyUtils.format(price),
                        style: AppTextStyles.heading3.copyWith(fontSize: 18),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Pickup and Dropoff locations
                _buildLocationRow(
                  icon: Icons.radio_button_checked,
                  iconColor: AppColors.yellow90,
                  title:
                      bookingState.pickupLocation?.name ??
                      'Cottage Grove Ave Chicago',
                  address:
                      bookingState.pickupLocation?.address ?? '#60653-1480',
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
                ),

                const SizedBox(height: 16),

                // Driver card with full details
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
                                    // ... check indentation
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

                // Action buttons row
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: _shareRideInfo,
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: AppColors.inputBg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.inputBorder),
                          ),
                          child: Center(
                            child: Text(
                              'Share ride info',
                              style: AppTextStyles.caption.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GestureDetector(
                        onTap: _cancelRide,
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.red.withOpacity(0.5),
                            ),
                          ),
                          child: Center(
                            child: Text(
                              'Cancel ride',
                              style: AppTextStyles.caption.copyWith(
                                color: Colors.red,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Call, Chat, Safety buttons
                Row(
                  children: [
                    _buildActionButton(
                      icon: Icons.phone,
                      label: 'Call',
                      onTap: _callDriver,
                    ),
                    const SizedBox(width: 12),
                    _buildActionButton(
                      icon: Icons.chat_bubble_outline,
                      label: 'Chat',
                      onTap: _messageDriver,
                    ),
                    const SizedBox(width: 12),
                    _buildActionButton(
                      icon: Icons.shield_outlined,
                      label: 'Safety',
                      onTap: _openSafety,
                    ),
                  ],
                ),

                // Removed Start Ride button as Driver controls it
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: AppColors.inputBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.inputBorder),
          ),
          child: Column(
            children: [
              Icon(icon, color: Colors.white, size: 24),
              const SizedBox(height: 4),
              Text(
                label,
                style: AppTextStyles.caption.copyWith(color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLocationRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String address,
    bool isAdd = false,
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
