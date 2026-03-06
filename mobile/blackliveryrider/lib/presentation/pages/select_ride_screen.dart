import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/services/navigation_service.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/models/ride_option_model.dart';
import 'package:provider/provider.dart';
import '../../core/data/booking_state.dart';
import '../widgets/custom_button.dart';
import 'confirm_pickup_screen.dart';

class SelectRideScreen extends StatefulWidget {
  const SelectRideScreen({super.key});

  @override
  State<SelectRideScreen> createState() => _SelectRideScreenState();
}

class _SelectRideScreenState extends State<SelectRideScreen> {
  int _selectedIndex = 0;
  bool _isLoading = true;
  final Completer<GoogleMapController> _mapController = Completer();
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  final NavigationService _navigationService = NavigationService();

  // Dark map style
  final String _darkMapStyle = '''
  [
    {"elementType": "geometry", "stylers": [{"color": "#212121"}]},
    {"elementType": "labels.icon", "stylers": [{"visibility": "off"}]},
    {"elementType": "labels.text.fill", "stylers": [{"color": "#757575"}]},
    {"elementType": "labels.text.stroke", "stylers": [{"color": "#212121"}]},
    {"featureType": "road", "elementType": "geometry.fill", "stylers": [{"color": "#2c2c2c"}]},
    {"featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#3c3c3c"}]},
    {"featureType": "water", "elementType": "geometry", "stylers": [{"color": "#000000"}]}
  ]
  ''';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchEstimates();
      _setupMapElements();
    });
  }

  Future<void> _fetchEstimates() async {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    await bookingState.getFareEstimate();
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _setupMapElements() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final pickup = bookingState.pickupLocation;
    final dropoff = bookingState.dropoffLocation;

    if (pickup != null && dropoff != null) {
      // Add markers
      _markers = {
        Marker(
          markerId: const MarkerId('pickup'),
          position: LatLng(pickup.latitude, pickup.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueGreen,
          ),
          infoWindow: InfoWindow(title: 'Pickup', snippet: pickup.address),
        ),
        Marker(
          markerId: const MarkerId('dropoff'),
          position: LatLng(dropoff.latitude, dropoff.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: InfoWindow(title: 'Dropoff', snippet: dropoff.address),
        ),
      };

      // Add initial straight-line polyline, then fetch real route
      _polylines = {
        Polyline(
          polylineId: const PolylineId('route'),
          points: [
            LatLng(pickup.latitude, pickup.longitude),
            LatLng(dropoff.latitude, dropoff.longitude),
          ],
          color: AppColors.routeBlue,
          width: 4,
          patterns: [PatternItem.dash(20), PatternItem.gap(10)],
        ),
      };

      setState(() {});

      // Fit camera to show both markers
      _fitMapToBounds(pickup, dropoff);

      // Fetch real road route from Directions API
      _fetchRealRoute(pickup, dropoff);
    }
  }

  Future<void> _fitMapToBounds(pickup, dropoff) async {
    if (!_mapController.isCompleted) return;

    final controller = await _mapController.future;
    final bounds = LatLngBounds(
      southwest: LatLng(
        pickup.latitude < dropoff.latitude ? pickup.latitude : dropoff.latitude,
        pickup.longitude < dropoff.longitude
            ? pickup.longitude
            : dropoff.longitude,
      ),
      northeast: LatLng(
        pickup.latitude > dropoff.latitude ? pickup.latitude : dropoff.latitude,
        pickup.longitude > dropoff.longitude
            ? pickup.longitude
            : dropoff.longitude,
      ),
    );

    controller.animateCamera(CameraUpdate.newLatLngBounds(bounds, 80));
  }

  Future<void> _fetchRealRoute(pickup, dropoff) async {
    try {
      final routeData = await _navigationService.getRoute(
        LatLng(pickup.latitude, pickup.longitude),
        LatLng(dropoff.latitude, dropoff.longitude),
      );

      if (mounted) {
        final encodedPolyline =
            routeData['routes']?[0]?['overview_polyline']?['points'] as String?;

        if (encodedPolyline != null) {
          final routePoints = _navigationService.decodePolyline(
            encodedPolyline,
          );

          setState(() {
            _polylines = {
              Polyline(
                polylineId: const PolylineId('route'),
                points: routePoints,
                color: AppColors.routeBlue,
                width: 4,
              ),
            };
          });
        }
      }
    } catch (e) {
      debugPrint('Failed to fetch route: $e');
      // Keep the straight-line fallback
    }
  }

  @override
  void dispose() {
    // Dispose GoogleMapController to free native resources
    if (_mapController.isCompleted) {
      _mapController.future.then((c) => c.dispose());
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bookingState = Provider.of<BookingState>(context);
    final rideOptions = bookingState.rideOptions;
    final selectedIndex = rideOptions.isEmpty
        ? 0
        : _selectedIndex.clamp(0, rideOptions.length - 1);
    final recommendedIndex = _getRecommendedIndex(rideOptions, bookingState);
    final distance = bookingState.estimatedDistance;
    final pickup = bookingState.pickupLocation;

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: Column(
        children: [
          // Map area with route
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                // Google Map
                pickup != null
                    ? GoogleMap(
                        initialCameraPosition: CameraPosition(
                          target: LatLng(pickup.latitude, pickup.longitude),
                          zoom: 13,
                        ),
                        onMapCreated: (GoogleMapController controller) {
                          _mapController.complete(controller);
                          controller.setMapStyle(_darkMapStyle);
                        },
                        markers: _markers,
                        polylines: _polylines,
                        myLocationEnabled: false,
                        myLocationButtonEnabled: false,
                        zoomControlsEnabled: false,
                        mapToolbarEnabled: false,
                        compassEnabled: false,
                      )
                    : Container(
                        color: AppColors.bgSec,
                        child: const Center(
                          child: Icon(
                            Icons.map,
                            color: AppColors.txtInactive,
                            size: 64,
                          ),
                        ),
                      ),

                // Back button
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildCircleButton(
                          icon: Icons.chevron_left,
                          onTap: () => Navigator.pop(context),
                        ),
                        // Edit route button
                        GestureDetector(
                          onTap: () {
                            // Pop back to WhereToScreen where user can edit pickup/dropoff
                            Navigator.pop(context);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.bgPri,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppColors.inputBorder),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.edit,
                                  color: Colors.white,
                                  size: 14,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Edit route',
                                  style: AppTextStyles.caption.copyWith(
                                    color: Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Bottom section with ride options
          Expanded(
            flex: 2,
            child: Container(
            padding: EdgeInsets.fromLTRB(
              AppSpacing.screenHorizontal,
              AppSpacing.lg,
              AppSpacing.screenHorizontal,
              AppSpacing.screenBottom,
            ),
            decoration: const BoxDecoration(
              color: AppColors.bgPri,
              borderRadius: BorderRadius.vertical(
                top: Radius.circular(AppSpacing.bottomSheetRadius),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Drag handle
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

                const SizedBox(height: AppSpacing.md),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Choose a ride', style: AppTextStyles.heading3),
                    if (distance > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.yellow90.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${distance.toStringAsFixed(1)} km',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.yellow90,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),

                const SizedBox(height: AppSpacing.md),

                // Ride options list — Expanded so it fills remaining space
                if (_isLoading)
                  const Expanded(
                    child: Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(
                          AppColors.yellow90,
                        ),
                      ),
                    ),
                  )
                else if (rideOptions.isEmpty)
                  Expanded(
                    child: Center(
                      child: Text(
                        'No ride options available',
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.txtInactive,
                        ),
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: ListView.builder(
                      padding: EdgeInsets.zero,
                      physics: const BouncingScrollPhysics(),
                      itemCount: rideOptions.length,
                      itemBuilder: (context, index) {
                        final option = rideOptions[index];
                        final price = option.calculatePrice(distance);
                        final isSelected = selectedIndex == index;
                        final etaMinutes = option.estimatedMinutes > 0
                            ? option.estimatedMinutes
                            : ((distance / 30 * 60).toInt() + 5);

                        return GestureDetector(
                          onTap: () {
                            setState(() => _selectedIndex = index);
                            bookingState.selectRideOption(option);
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            curve: Curves.easeOut,
                            child: _buildRideCard(
                              option: option,
                              price: price,
                              isSelected: isSelected,
                              eta: '$etaMinutes min',
                              isRecommended: recommendedIndex == index,
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                const SizedBox(height: AppSpacing.sm),

                // Book button
                CustomButton.gradient(
                  text: rideOptions.isNotEmpty
                      ? 'Ride ${rideOptions[selectedIndex].name}'
                      : 'Select a ride',
                  isDisabled: rideOptions.isEmpty,
                  onTap: rideOptions.isEmpty
                      ? null
                      : () {
                          bookingState.selectRideOption(
                            rideOptions[selectedIndex],
                          );
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const ConfirmPickupScreen(),
                            ),
                          );
                        },
                ),
              ],
            ),
          ),
          ),
        ],
      ),
    );
  }

  Widget _buildCircleButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: AppSpacing.backButtonSize,
        height: AppSpacing.backButtonSize,
        decoration: BoxDecoration(
          color: AppColors.bgPri,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.inputBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(icon, color: Colors.white, size: 24),
      ),
    );
  }

  Widget _buildRideCard({
    required RideOption option,
    required double price,
    required bool isSelected,
    required String eta,
    bool isRecommended = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isSelected
            ? AppColors.yellow90.withOpacity(0.12)
            : AppColors.inputBg,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(
          color: isSelected ? AppColors.yellow90 : AppColors.inputBorder,
          width: isSelected ? 2 : 1,
        ),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: AppColors.yellow90.withOpacity(0.2),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ]
            : [],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      CurrencyUtils.format(price),
                      style: AppTextStyles.heading3.copyWith(
                        color: isSelected ? AppColors.yellow90 : Colors.white,
                        fontSize: 20,
                      ),
                    ),
                    if (option.hasSurge)
                      Container(
                        margin: const EdgeInsets.only(top: 2),
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.orange.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${option.surgeMultiplier.toStringAsFixed(1)}x surge',
                          style: AppTextStyles.caption.copyWith(
                            color: Colors.orange,
                            fontWeight: FontWeight.w600,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    const SizedBox(height: 2),
                    Text(
                      option.name,
                      style: AppTextStyles.bodySmall.copyWith(
                        color: isSelected ? AppColors.yellow90 : AppColors.txtSec,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.bgPri,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.schedule_rounded,
                      color: AppColors.txtInactive,
                      size: 12,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'ETA $eta',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.txtInactive,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          Text(
            option.description,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.txtInactive,
              fontSize: 11,
            ),
          ),

          const SizedBox(height: 10),

          Row(
            children: [
              Icon(
                _vehicleIconFor(option.id),
                color: isSelected ? AppColors.yellow90 : Colors.white,
                size: 18,
              ),
              const SizedBox(width: 6),
              Text(
                option.name,
                style: AppTextStyles.caption.copyWith(
                  color: isSelected ? AppColors.yellow90 : Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 12),
              Row(
                children: [
                  const Icon(
                    Icons.airline_seat_recline_normal_rounded,
                    color: AppColors.txtInactive,
                    size: 14,
                  ),
                  const SizedBox(width: 2),
                  Text(
                    '${option.capacity} seats',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              if (isRecommended && !isSelected)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    'Recommended',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.bgPri,
                      fontWeight: FontWeight.w600,
                      fontSize: 10,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  int _getRecommendedIndex(List<RideOption> options, BookingState bookingState) {
    if (options.isEmpty) return -1;
    final distance = bookingState.estimatedDistance;
    var minIndex = 0;
    var minPrice = options[0].calculatePrice(distance);

    for (var i = 1; i < options.length; i++) {
      final price = options[i].calculatePrice(distance);
      if (price < minPrice) {
        minPrice = price;
        minIndex = i;
      }
    }
    return minIndex;
  }

  IconData _vehicleIconFor(String id) {
    final normalized = id.toLowerCase();
    if (normalized.contains('suv')) return Icons.directions_car_filled_rounded;
    if (normalized.contains('xl') || normalized.contains('van')) {
      return Icons.airport_shuttle_rounded;
    }
    if (normalized.contains('moto') || normalized.contains('bike')) {
      return Icons.two_wheeler_rounded;
    }
    if (normalized.contains('first') ||
        normalized.contains('premium') ||
        normalized.contains('lux')) {
      return Icons.star_rounded;
    }
    return Icons.local_taxi_rounded;
  }
}
