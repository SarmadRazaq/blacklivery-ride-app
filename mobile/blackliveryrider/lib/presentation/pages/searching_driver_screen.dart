import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import 'package:provider/provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/services/socket_service.dart';
import '../widgets/ride_map_view.dart';
import 'driver_arriving_screen.dart';

class SearchingDriverScreen extends StatefulWidget {
  const SearchingDriverScreen({super.key});

  @override
  State<SearchingDriverScreen> createState() => _SearchingDriverScreenState();
}

class _SearchingDriverScreenState extends State<SearchingDriverScreen>
    with TickerProviderStateMixin {
  // final BookingState _bookingState = BookingState(); // Removed
  late AnimationController _pulseController;
  late AnimationController _rotationController;
  late Animation<double> _pulseAnimation;
  final bool _isConnecting = false;
  Timer? _searchTimeout;
  final SocketService _socketService = SocketService();
  bool _socketConnected = true;

  static const int _searchTimeoutSeconds = 120;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();

    _rotationController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat();

    _pulseAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(_pulseController);

    // Listen for status changes (e.g. driver assigned)
    final bookingState = Provider.of<BookingState>(context, listen: false);
    bookingState.addListener(_checkBookingStatus);

    // Listen for socket connection changes to show reconnect banner
    _socketConnected = _socketService.isConnected;
    _socketService.addListener(_onSocketStateChanged);

    // Start search timeout timer
    _searchTimeout = Timer(Duration(seconds: _searchTimeoutSeconds), () {
      if (!mounted) return;
      final bs = Provider.of<BookingState>(context, listen: false);
      // Only trigger timeout if still searching
      if (bs.bookingStatus == 'searching_driver' ||
          bs.bookingStatus == 'pending') {
        bs.removeListener(_checkBookingStatus);
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('Search Timed Out'),
            content: const Text(
              'We couldn\'t find a driver nearby. Please try again later or adjust your pickup location.',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  bs.cancelBooking();
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    });
  }

  void _checkBookingStatus() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    if (bookingState.bookingStatus == 'driver_assigned' ||
        bookingState.bookingStatus == 'arriving') {
      // Stop listening to avoid double nav
      bookingState.removeListener(_checkBookingStatus);
      _searchTimeout?.cancel();

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const DriverArrivingScreen()),
        );
      }
    } else if (bookingState.bookingStatus == 'no_driver') {
      bookingState.removeListener(_checkBookingStatus);
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('No Drivers Available'),
            content: const Text(
              'Sorry, no drivers are available near you right now. Please try again later.',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } else if (bookingState.bookingStatus == 'cancelled') {
      bookingState.removeListener(_checkBookingStatus);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Ride was cancelled')));
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    }
  }

  void _onSocketStateChanged() {
    if (!mounted) return;
    final connected = _socketService.isConnected;
    if (connected == _socketConnected) return;
    setState(() => _socketConnected = connected);
  }

  @override
  void dispose() {
    _searchTimeout?.cancel();
    _socketService.removeListener(_onSocketStateChanged);

    // Ensure we remove listener
    final bookingState = Provider.of<BookingState>(context, listen: false);
    try {
      bookingState.removeListener(_checkBookingStatus);
    } catch (e) {
      // Provider might be disposed
    }

    _pulseController.dispose();
    _rotationController.dispose();
    super.dispose();
  }

  // _findDriver is no longer needed as the previous screen (ConfirmRideScreen)
  // initiates the booking (createBooking) and the SocketService updates the status.
  // This screen just visualizes the 'searching_driver' state.

  void _cancelSearch() {
    Provider.of<BookingState>(context, listen: false).cancelBooking();
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final bookingState = Provider.of<BookingState>(context);

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: Column(
        children: [
          // Local reconnection banner (scoped to this screen only)
          if (!_socketConnected)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.red.shade700,
              child: SafeArea(
                bottom: false,
                child: Row(
                  children: const [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(width: 12),
                    Text(
                      'Reconnecting to server...',
                      style: TextStyle(color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
          // Map area with route
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                // Real Google Map centered on pickup
                Builder(
                  builder: (context) {
                    final bookingState = Provider.of<BookingState>(
                      context,
                      listen: false,
                    );
                    final pickupLatLng = bookingState.pickupLocation != null
                        ? LatLng(
                            bookingState.pickupLocation!.latitude,
                            bookingState.pickupLocation!.longitude,
                          )
                        : null;
                    return RideMapView(pickup: pickupLatLng);
                  },
                ),

                // Close button
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: GestureDetector(
                      onTap: _cancelSearch,
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.bgPri,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.inputBorder),
                        ),
                        child: const Icon(Icons.close, color: Colors.white),
                      ),
                    ),
                  ),
                ),

                // Searching/Connecting text
                SafeArea(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Pulsing circle animation — RepaintBoundary prevents
                        // the animation from triggering repaints on parent layers
                        RepaintBoundary(
                          child: AnimatedBuilder(
                          animation: _pulseController,
                          builder: (context, child) {
                            return Stack(
                              alignment: Alignment.center,
                              children: [
                                // Outer pulsing circles
                                for (var i = 0; i < 3; i++)
                                  Transform.scale(
                                    scale:
                                        1.0 +
                                        (_pulseAnimation.value + i * 0.3) %
                                            1.0 *
                                            0.6,
                                    child: Container(
                                      width: 80,
                                      height: 80,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: AppColors.yellow90.withOpacity(
                                            (1 -
                                                    ((_pulseAnimation.value +
                                                            i * 0.3) %
                                                        1.0)) *
                                                0.5,
                                          ),
                                          width: 2,
                                        ),
                                      ),
                                    ),
                                  ),
                                // Center circle
                                Container(
                                  width: 60,
                                  height: 60,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppColors.yellow90,
                                  ),
                                  child: const Icon(
                                    Icons.local_taxi,
                                    color: Colors.black,
                                    size: 30,
                                  ),
                                ),
                              ],
                            );
                          },
                        )), // RepaintBoundary

                        const SizedBox(height: 20),

                        Text(
                          _isConnecting ? 'Connecting...' : 'Searching...',
                          style: AppTextStyles.heading3.copyWith(fontSize: 20),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Bottom section with locations
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: AppColors.bgPri,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Pickup location
                _buildLocationRow(
                  color: AppColors.yellow90,
                  title: bookingState.pickupLocation?.name ?? 'Pickup Location',
                  subtitle: bookingState.pickupLocation?.address ?? '',
                  trailing: _buildTimeChip(bookingState.formattedScheduledTime),
                ),

                // Dotted line
                Padding(
                  padding: const EdgeInsets.only(left: 4.5),
                  child: Column(
                    children: List.generate(
                      3,
                      (index) => Container(
                        width: 1,
                        height: 6,
                        margin: const EdgeInsets.symmetric(vertical: 2),
                        color: AppColors.inputBorder,
                      ),
                    ),
                  ),
                ),

                // Dropoff location
                _buildLocationRow(
                  color: Colors.red,
                  title:
                      bookingState.dropoffLocation?.name ?? 'Dropoff Location',
                  subtitle: bookingState.dropoffLocation?.address ?? '',
                ),

                const SizedBox(height: 24),

                // Cancel button
                GestureDetector(
                  onTap: _cancelSearch,
                  child: Container(
                    width: double.infinity,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.red.withOpacity(0.5)),
                    ),
                    child: Center(
                      child: Text(
                        'Cancel Ride',
                        style: AppTextStyles.body.copyWith(
                          color: Colors.red,
                          fontWeight: FontWeight.w600,
                        ),
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
    required Color color,
    required String title,
    required String subtitle,
    Widget? trailing,
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
        ?trailing,
      ],
    );
  }

  Widget _buildTimeChip(String time) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Text(
        time,
        style: AppTextStyles.caption.copyWith(
          color: Colors.white,
          fontSize: 12,
        ),
      ),
    );
  }
}
