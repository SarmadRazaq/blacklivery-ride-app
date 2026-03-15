import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/services/location_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/widgets/slide_to_action.dart';
import 'data/services/navigation_service.dart';
import 'trip_screen.dart';
import '../chat/chat_screen.dart';
import 'data/models/ride_model.dart';

enum RideStatus {
  accepted,
  navigating,
  arrived,
  freeWaiting,
  paidWaiting,
  inProgress,
}

class RideAcceptedScreen extends ConsumerStatefulWidget {
  final Ride ride;

  const RideAcceptedScreen({super.key, required this.ride});

  @override
  ConsumerState<RideAcceptedScreen> createState() => _RideAcceptedScreenState();
}

class _RideAcceptedScreenState extends ConsumerState<RideAcceptedScreen> {
  final Completer<GoogleMapController> _controller = Completer();
  final NavigationService _navService = NavigationService();
  RideStatus _rideStatus = RideStatus.accepted;
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  // Route coordinates - will be fetched from navigation service
  List<LatLng> _routeCoordinates = [];

  static const String _darkMapStyle = '''
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

  BitmapDescriptor? _driverIcon;

  StreamSubscription<Position>? _positionSubscription;
  final LocationService _locationService = LocationService();

  @override
  void initState() {
    super.initState();
    _loadMapAssets();
    _setupMapData();
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _locationService.stopPositionStream();
    if (_controller.isCompleted) {
      _controller.future.then((c) => c.dispose());
    }
    super.dispose();
  }

  Future<void> _loadMapAssets() async {
    try {
      _driverIcon = await BitmapDescriptor.asset(
        const ImageConfiguration(size: Size(48, 48)),
        'assets/images/car-move.png',
      );
      if (mounted) setState(() {});
    } catch (e) {
      debugPrint('Error loading map assets: $e');
    }
  }

  void _setupMapData() async {
    // Get coordinates from ride data
    final pickupLat = widget.ride.pickupLat;
    final pickupLng = widget.ride.pickupLng;

    // Get current driver location
    Position? currentPosition;
    try {
      currentPosition = await Geolocator.getCurrentPosition();
    } catch (e) {
      debugPrint('Error getting current position: $e');
    }

    final driverLat = currentPosition?.latitude ?? pickupLat - 0.01;
    final driverLng = currentPosition?.longitude ?? pickupLng - 0.01;

    final driverPosition = LatLng(driverLat, driverLng);
    final pickupPosition = LatLng(pickupLat, pickupLng);
    final dropoffPosition = LatLng(widget.ride.dropoffLat, widget.ride.dropoffLng);

    _routeCoordinates = [driverPosition, pickupPosition];

    // Set up markers
    _markers = {
      Marker(
        markerId: const MarkerId('driver'),
        position: driverPosition,
        icon:
            _driverIcon ??
            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        infoWindow: const InfoWindow(title: 'Your Location'),
      ),
      Marker(
        markerId: const MarkerId('pickup'),
        position: pickupPosition,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: const InfoWindow(title: 'Pickup Location'),
      ),
      Marker(
        markerId: const MarkerId('dropoff'),
        position: dropoffPosition,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: const InfoWindow(title: 'Drop-off Location'),
      ),
    };

    // Set up initial route polyline
    _polylines = {
      Polyline(
        polylineId: const PolylineId('route'),
        points: _routeCoordinates,
        color: const Color(0xFFD4AF37), // Gold color like in design
        width: 4,
      ),
    };

    if (mounted) {
      setState(() {});
    }

    // Fetch actual route from navigation service
    _fetchRoute(driverPosition, pickupPosition);
  }

  Future<void> _fetchRoute(LatLng origin, LatLng destination) async {
    try {
      final routeDetails = await _navService.getRouteWithDetails(
        origin,
        destination,
      );

      if (routeDetails != null && mounted) {
        setState(() {
          _routeCoordinates = routeDetails['polyline'] as List<LatLng>;

          _polylines = {
            Polyline(
              polylineId: const PolylineId('route'),
              points: _routeCoordinates,
              color: const Color(0xFFD4AF37),
              width: 4,
            ),
          };
        });

        // Fit map to show the entire route
        _fitMapToRoute();
      }
    } catch (e) {
      debugPrint('Error fetching route: $e');
    }
  }

  Future<void> _fitMapToRoute() async {
    if (_routeCoordinates.isEmpty) return;

    final controller = await _controller.future;

    double minLat = _routeCoordinates.first.latitude;
    double maxLat = _routeCoordinates.first.latitude;
    double minLng = _routeCoordinates.first.longitude;
    double maxLng = _routeCoordinates.first.longitude;

    for (final point in _routeCoordinates) {
      if (point.latitude < minLat) minLat = point.latitude;
      if (point.latitude > maxLat) maxLat = point.latitude;
      if (point.longitude < minLng) minLng = point.longitude;
      if (point.longitude > maxLng) maxLng = point.longitude;
    }

    controller.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat, minLng),
          northeast: LatLng(maxLat, maxLng),
        ),
        50.0, // padding
      ),
    );
  }

  Future<void> _callRider() async {
    final phone = widget.ride.rider?.phone;
    if (phone != null && phone.isNotEmpty) {
      final uri = Uri.parse('tel:$phone');
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    }
  }

  void _cancelRide() {
    String selectedReason = 'Rider not at pickup location';
    final reasons = [
      'Rider not at pickup location',
      'Rider requested cancellation',
      'Safety concern',
      'Vehicle issue',
      'Emergency',
    ];

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppColors.cardBackground,
          title: const Text(
            'Cancel Ride?',
            style: TextStyle(color: AppColors.white),
          ),
          content: RadioGroup<String>(
            groupValue: selectedReason,
            onChanged: (v) {
              if (v != null) setDialogState(() => selectedReason = v);
            },
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Please select a reason:',
                  style: TextStyle(color: AppColors.grey),
                ),
                const SizedBox(height: 8),
                ...reasons.map((r) => RadioListTile<String>(
                      title: Text(r,
                          style: const TextStyle(
                              color: AppColors.white, fontSize: 13)),
                      value: r,
                      activeColor: AppColors.primary,
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                    )),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child:
                  const Text('No', style: TextStyle(color: AppColors.grey)),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(dialogContext); // Close dialog

                var cancelled = false;

                try {
                  await ref
                      .read(rideRiverpodProvider)
                      .updateStatus('cancelled', reason: selectedReason);
                  cancelled = true;

                  if (mounted && cancelled) {
                    Navigator.pop(this.context); // Go back to map
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(this.context).showSnackBar(
                      SnackBar(
                          content: Text('Failed to cancel ride: $e')),
                    );
                  }
                }
              },
              child:
                  const Text('Yes', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      ),
    );
  }

  void _navigateToPickup() async {
    // Open external maps for turn-by-turn navigation to pickup
    final pickupLat = widget.ride.pickupLat;
    final pickupLng = widget.ride.pickupLng;
    final url = Uri.parse(
      _navService.getGoogleMapsNavigationUrl(pickupLat, pickupLng),
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not launch maps')),
        );
      }
    }

    // Also start tracking location to detect arrival
    if (_rideStatus == RideStatus.accepted) {
      setState(() {
        _rideStatus = RideStatus.navigating;
      });
    }

    final positionStream = _locationService.getPositionStream();
    _positionSubscription?.cancel();
    _positionSubscription = positionStream.listen((position) {
      final distance = _locationService.getDistanceBetween(
        position.latitude,
        position.longitude,
        pickupLat,
        pickupLng,
      );

      debugPrint('Distance to pickup: ${distance.toStringAsFixed(2)} meters');

      // Update marker
      _updateDriverMarker(LatLng(position.latitude, position.longitude));

      // Check arrival threshold (e.g. 50 meters)
      if (distance < 50) {
        _positionSubscription?.cancel();
        if (mounted) {
          setState(() {
            _rideStatus = RideStatus.arrived;
          });
        }
      }
    });
  }

  void _updateDriverMarker(LatLng position) {
    if (!mounted) return;
    setState(() {
      final markers = Set<Marker>.from(_markers);
      markers.removeWhere((m) => m.markerId.value == 'driver');
      markers.add(
        Marker(
          markerId: const MarkerId('driver'),
          position: position,
          icon:
              _driverIcon ??
              BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          infoWindow: const InfoWindow(title: 'Your Location'),
          rotation: 0, // Could add heading if available
        ),
      );
      _markers = markers;
    });
  }

  void _arrivedAtPickup() async {
    try {
      await ref.read(rideRiverpodProvider).updateStatus('arrived');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update status: $e')));
      }
    }

    if (!mounted) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => TripScreen(ride: widget.ride)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Map
          GoogleMap(
            style: _darkMapStyle,
            mapType: MapType.normal,
            initialCameraPosition: CameraPosition(
              target: _routeCoordinates.isNotEmpty
                  ? _routeCoordinates.first
                  : LatLng(widget.ride.pickupLat, widget.ride.pickupLng),
              zoom: 13.0,
            ),
            onMapCreated: (GoogleMapController controller) {
              _controller.complete(controller);
            },
            markers: _markers,
            polylines: _polylines,
            myLocationEnabled: false,
            zoomControlsEnabled: false,
            compassEnabled: false,
          ),

          // Top Bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  _buildLocationHeader(),
                  const Spacer(),
                  _buildCancelButton(),
                ],
              ),
            ),
          ),

          // Bottom Sheet
          Positioned(left: 0, right: 0, bottom: 0, child: _buildBottomSheet()),
        ],
      ),
    );
  }

  Widget _buildLocationHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            widget.ride.pickupAddress.split(',').last.trim(),
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCancelButton() {
    return GestureDetector(
      onTap: _cancelRide,
      child: Container(
        width: 44,
        height: 44,
        decoration: const BoxDecoration(
          color: Colors.red,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.close, color: AppColors.white, size: 20),
      ),
    );
  }

  Widget _buildBottomSheet() {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.grey,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),

          // Status Text
          Text(
            _getStatusText(),
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 8),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              _getStatusDescription(),
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[400], fontSize: 12),
            ),
          ),

          const SizedBox(height: 20),

          // Rider Info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.amber[200],
                    shape: BoxShape.circle,
                    image: widget.ride.rider?.image != null && widget.ride.rider!.image!.isNotEmpty
                        ? DecorationImage(
                            image: NetworkImage(widget.ride.rider!.image!),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: widget.ride.rider?.image != null && widget.ride.rider!.image!.isNotEmpty
                      ? null
                      : const Center(
                          child: Icon(Icons.person, size: 30, color: Colors.brown),
                        ),
                ),
                const SizedBox(width: 16),
                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.ride.rider?.name ?? 'Passenger',
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            '${widget.ride.rider?.rating ?? 5.0}',
                            style: const TextStyle(
                              color: AppColors.white,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            '${widget.ride.pricing.distance.toStringAsFixed(1)} km',
                            style: TextStyle(
                              color: Colors.grey[400],
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Location
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.ride.pickupAddress,
                    style: TextStyle(color: Colors.grey[400], fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          // Dropoff address
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.ride.dropoffAddress,
                    style: TextStyle(color: Colors.grey[400], fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Price and Actions
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                GestureDetector(
                  onTap: _callRider,
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.inputBackground,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.phone,
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Text(
                        CurrencyUtils.format(widget.ride.fare),
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '• ${((widget.ride.paymentMethod ?? widget.ride.payment?.gateway ?? 'Cash')[0].toUpperCase() + (widget.ride.paymentMethod ?? widget.ride.payment?.gateway ?? 'Cash').substring(1))}',
                        style: TextStyle(color: Colors.grey[400], fontSize: 14),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () {
                    final rideId = widget.ride.id;
                    if (rideId.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Ride ID not available')),
                      );
                      return;
                    }
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => ChatScreen(
                          rideId: rideId,
                          riderName: widget.ride.rider?.name ?? 'Rider',
                        ),
                      ),
                    );
                  },
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.inputBackground,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.message,
                      color: AppColors.white,
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Action Buttons
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: _rideStatus == RideStatus.arrived
                ? SlideToAction(
                    text: 'Slide to confirm arrival',
                    onSlide: () async => _arrivedAtPickup(),
                    outerColor: AppColors.white,
                    innerColor: Colors.black,
                    textColor: Colors.black,
                    sliderButtonIcon: Icons.chevron_right,
                  )
                : _rideStatus == RideStatus.navigating
                    ? Column(
                        children: [
                          GestureDetector(
                            onTap: _navigateToPickup,
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              decoration: BoxDecoration(
                                color: AppColors.white,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.navigation, color: Colors.black),
                                  SizedBox(width: 8),
                                  Text(
                                    'Open Navigation',
                                    style: TextStyle(
                                      color: Colors.black,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          SlideToAction(
                            text: 'Slide when arrived',
                            onSlide: () async {
                              setState(() {
                                _rideStatus = RideStatus.arrived;
                              });
                              _positionSubscription?.cancel();
                              _arrivedAtPickup();
                            },
                            outerColor: AppColors.inputBackground,
                            innerColor: AppColors.primary,
                            textColor: AppColors.white,
                            sliderButtonIcon: Icons.chevron_right,
                          ),
                        ],
                      )
                    : GestureDetector(
                        onTap: _navigateToPickup,
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.navigation, color: Colors.black),
                              const SizedBox(width: 8),
                              Text(
                                _getButtonText(),
                                style: const TextStyle(
                                  color: Colors.black,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  String _getStatusText() {
    switch (_rideStatus) {
      case RideStatus.accepted:
        return 'Ride Accepted';
      case RideStatus.navigating:
        return 'Navigating...';
      case RideStatus.arrived:
        return 'Arrived';
      default:
        return 'Ride Accepted';
    }
  }

  String _getStatusDescription() {
    switch (_rideStatus) {
      case RideStatus.accepted:
        return 'Head to the pickup location to start the trip, please do not ride the Passenger until they confirm that they\'re ready to go!';
      case RideStatus.navigating:
        return 'Navigate to the pickup location. The rider is waiting for you.';
      case RideStatus.arrived:
        return 'Head to the pickup location to start the trip, please do not ride the Passenger until they confirm that they\'re ready to go!';
      default:
        return '';
    }
  }

  String _getButtonText() {
    switch (_rideStatus) {
      case RideStatus.accepted:
        return 'Navigate to Pickup';
      case RideStatus.navigating:
        return 'Arriving...';
      case RideStatus.arrived:
        return 'Arrived';
      default:
        return 'Navigate';
    }
  }
}
