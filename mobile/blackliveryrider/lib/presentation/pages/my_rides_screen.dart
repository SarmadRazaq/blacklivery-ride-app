import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/models/ride_history_model.dart';
import '../../core/models/location_model.dart';
import '../../core/data/booking_state.dart';
import '../../core/services/ride_history_service.dart';
import '../../core/services/ride_service.dart';
import '../widgets/vehicle_icon.dart';
import 'ride_details_screen.dart';
import 'modify_ride_screen.dart';
import 'select_ride_screen.dart';

class MyRidesScreen extends StatefulWidget {
  const MyRidesScreen({super.key});

  @override
  State<MyRidesScreen> createState() => _MyRidesScreenState();
}

class _MyRidesScreenState extends State<MyRidesScreen> {
  int _selectedTabIndex = 0; // 0 = Rides, 1 = Delivery

  final RideHistoryService _rideHistoryService = RideHistoryService();
  List<RideHistoryItem> _scheduledRides = [];
  List<RideHistoryItem> _rideHistory = [];
  bool _isLoading = true;
  int _currentPage = 1;
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _loadRides();
  }

  Future<void> _loadRides() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _rideHistoryService.getScheduledRides(),
        _rideHistoryService.getRideHistory(),
      ]);
      setState(() {
        _scheduledRides = results[0];
        _rideHistory = results[1];
        _isLoading = false;
        _currentPage = 1;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadMoreRides() async {
    if (_isLoadingMore) return;
    setState(() => _isLoadingMore = true);
    try {
      _currentPage++;
      final moreRides = await _rideHistoryService.getRideHistory(page: _currentPage);
      if (mounted) {
        setState(() {
          _rideHistory.addAll(moreRides);
          _isLoadingMore = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingMore = false);
    }
  }

  Future<void> _cancelScheduledRide(RideHistoryItem ride) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.inputBg,
        title: const Text('Cancel Ride', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Are you sure you want to cancel this scheduled ride?',
          style: TextStyle(color: Colors.grey),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('No', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      final success = await RideService().cancelRide(ride.id, reason: 'Cancelled by rider');
      if (success && mounted) {
        setState(() {
          _scheduledRides.removeWhere((r) => r.id == ride.id);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ride cancelled successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to cancel ride: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.yellow90),
            )
          : SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      'My Rides',
                      style: AppTextStyles.heading2.copyWith(fontSize: 28),
                    ),
                  ),

                  // Rides / Delivery toggle
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Container(
                      height: 50,
                      decoration: BoxDecoration(
                        color: AppColors.inputBg,
                        borderRadius: BorderRadius.circular(25),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () =>
                                  setState(() => _selectedTabIndex = 0),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: _selectedTabIndex == 0
                                      ? AppColors.bgPri
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(25),
                                  border: _selectedTabIndex == 0
                                      ? Border.all(color: AppColors.inputBorder)
                                      : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.directions_car,
                                      color: _selectedTabIndex == 0
                                          ? Colors.white
                                          : Colors.white70,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Rides',
                                      style: AppTextStyles.body.copyWith(
                                        color: _selectedTabIndex == 0
                                            ? Colors.white
                                            : Colors.white70,
                                        fontSize: 15,
                                        fontWeight: _selectedTabIndex == 0
                                            ? FontWeight.w600
                                            : FontWeight.w400,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () =>
                                  setState(() => _selectedTabIndex = 1),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: _selectedTabIndex == 1
                                      ? AppColors.bgPri
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(25),
                                  border: _selectedTabIndex == 1
                                      ? Border.all(color: AppColors.inputBorder)
                                      : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.inventory_2_outlined,
                                      color: _selectedTabIndex == 1
                                          ? Colors.white
                                          : Colors.white70,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Delivery',
                                      style: AppTextStyles.body.copyWith(
                                        color: _selectedTabIndex == 1
                                            ? Colors.white
                                            : Colors.white70,
                                        fontSize: 15,
                                        fontWeight: _selectedTabIndex == 1
                                            ? FontWeight.w600
                                            : FontWeight.w400,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Content
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _loadRides,
                      color: AppColors.yellow90,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                          // Scheduled rides section
                          if (_scheduledRides.isNotEmpty) ...[
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                              ),
                              child: Text(
                                'Scheduled rides',
                                style: AppTextStyles.body.copyWith(
                                  color: AppColors.txtInactive,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            ..._scheduledRides.map(
                              (ride) => _buildScheduledRideCard(ride),
                            ),
                            const SizedBox(height: 24),
                          ],

                          // Ride history section
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            child: Text(
                              'Ride History',
                              style: AppTextStyles.body.copyWith(
                                color: AppColors.txtInactive,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          ..._rideHistory.map(
                            (ride) => _buildRideHistoryCard(ride),
                          ),

                          // Load more
                          Padding(
                            padding: const EdgeInsets.all(20),
                            child: Center(
                              child: GestureDetector(
                                onTap: _loadMoreRides,
                                child: Text(
                                  'Load more...',
                                  style: AppTextStyles.body.copyWith(
                                    color: AppColors.txtInactive,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Future<void> _bookAgain(RideHistoryItem ride) async {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    if (ride.pickupLat != null && ride.pickupLng != null &&
        ride.dropoffLat != null && ride.dropoffLng != null) {
      bookingState.setPickupLocation(Location(
        id: 'prev_pickup_${ride.id}',
        name: ride.pickupAddress,
        address: ride.pickupAddress,
        latitude: ride.pickupLat!,
        longitude: ride.pickupLng!,
      ));
      bookingState.setDropoffLocation(Location(
        id: 'prev_dropoff_${ride.id}',
        name: ride.dropoffAddress,
        address: ride.dropoffAddress,
        latitude: ride.dropoffLat!,
        longitude: ride.dropoffLng!,
      ));
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const SelectRideScreen()),
        );
      }
    } else {
      // No coordinates — go back to home so user can re-enter route
      Navigator.popUntil(context, (route) => route.isFirst);
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'pending':    return 'Pending';
      case 'accepted':   return 'Driver Assigned';
      case 'scheduled':  return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed':  return 'Completed';
      case 'cancelled':  return 'Cancelled';
      default:           return 'Scheduled';
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'completed':  return AppColors.success;
      case 'cancelled':  return Colors.red;
      case 'in_progress': return Colors.blue;
      default:           return AppColors.yellow90;
    }
  }

  Widget _buildScheduledRideCard(RideHistoryItem ride) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: _statusColor(ride.status).withOpacity(0.2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              _statusLabel(ride.status),
              style: AppTextStyles.caption.copyWith(
                color: _statusColor(ride.status),
                fontSize: 10,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Locations
          Row(
            children: [
              Column(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: AppColors.yellow90,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  Container(width: 1, height: 20, color: AppColors.inputBorder),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
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
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      ride.dropoffAddress,
                      style: AppTextStyles.body.copyWith(
                        color: Colors.white,
                        fontSize: 13,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Date/time and actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.calendar_today,
                    color: AppColors.yellow90,
                    size: 14,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _formatDate(ride.date),
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    CurrencyUtils.format(ride.price),
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  GestureDetector(
                    onTap: () => _cancelScheduledRide(ride),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.red.withOpacity(0.3)),
                      ),
                      child: Text(
                        'Cancel',
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.red,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => ModifyRideScreen(ride: ride),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.bgPri,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.inputBorder),
                      ),
                      child: Text(
                        'Manage trip',
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ModifyRideScreen(ride: ride),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.yellow90.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Customize',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.yellow90,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRideHistoryCard(RideHistoryItem ride) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => RideDetailsScreen(ride: ride),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Row(
          children: [
            // Car image placeholder
            Container(
              width: 70,
              height: 50,
              decoration: BoxDecoration(
                color: AppColors.bgPri,
                borderRadius: BorderRadius.circular(8),
              ),
              child: VehicleIcon.fromId(
                ride.rideType,
                color: AppColors.yellow90,
                size: 36,
              ),
            ),
            const SizedBox(width: 12),

            // Ride info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ride.dropoffAddress,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  if (ride.driver != null)
                    Row(
                      children: [
                        Icon(
                          Icons.person,
                          color: AppColors.txtInactive,
                          size: 12,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          ride.driver!.name,
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(Icons.star, color: AppColors.yellow90, size: 12),
                        Text(
                          ' ${ride.driver!.rating}',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),

            // Price and book again
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                GestureDetector(
                  onTap: () => _bookAgain(ride),
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.yellow90.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'Book again',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.yellow90,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  CurrencyUtils.format(ride.price, currency: ride.currency),
                  style: AppTextStyles.body.copyWith(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
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
