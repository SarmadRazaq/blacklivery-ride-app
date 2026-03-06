import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/services/location_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import 'data/services/navigation_service.dart';
import '../chat/chat_screen.dart';
import 'driver_map_screen.dart';
import 'trip_completed_screen.dart';
import 'data/models/ride_model.dart';
import '../../core/widgets/slide_to_action.dart';

enum TripStatus { freeWaiting, paidWaiting, inProgress, completed }

class TripScreen extends ConsumerStatefulWidget {
  final Ride ride;

  const TripScreen({super.key, required this.ride});

  @override
  ConsumerState<TripScreen> createState() => _TripScreenState();
}

class _TripScreenState extends ConsumerState<TripScreen> {
  final Completer<GoogleMapController> _mapController = Completer();
  final NavigationService _navService = NavigationService();
  TripStatus _tripStatus = TripStatus.freeWaiting;
  Timer? _waitingTimer;
  int _waitingSeconds = 0;
  static const int _freeWaitingLimit = 300; // 5 minutes free waiting
  List<LatLng> _tripRouteCoordinates = [];
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};

  // ... (style constants) ...
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

  StreamSubscription<Position>? _positionSubscription;
  final LocationService _locationService = LocationService();

  @override
  void initState() {
    super.initState();
    _loadMapAssets();
    _setupMapData();
    _startWaitingTimer();
    _startLocationUpdates();
  }

  @override
  void dispose() {
    _waitingTimer?.cancel();
    _positionSubscription?.cancel();
    _locationService.stopPositionStream();
    super.dispose();
  }

  // ... (dispose, assets, location updates) ...

  void _setupMapData() {
    final pickupLat = widget.ride.pickupLat;
    final pickupLng = widget.ride.pickupLng;
    final dropoffLat = widget.ride.dropoffLat;
    final dropoffLng = widget.ride.dropoffLng;

    final pickupPosition = LatLng(pickupLat, pickupLng);
    final dropoffPosition = LatLng(dropoffLat, dropoffLng);

    _tripRouteCoordinates = [pickupPosition, dropoffPosition];

    _markers = {
      Marker(
        markerId: const MarkerId('pickup'),
        position: pickupPosition,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: const InfoWindow(title: 'Pickup'),
      ),
      Marker(
        markerId: const MarkerId('dropoff'),
        position: dropoffPosition,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: const InfoWindow(title: 'Drop-off'),
      ),
    };

    _polylines = {
      Polyline(
        polylineId: const PolylineId('trip_route'),
        points: _tripRouteCoordinates,
        color: const Color(0xFFD4AF37),
        width: 4,
      ),
    };

    // Fetch actual route from navigation service
    _fetchRoute(pickupPosition, dropoffPosition);
  }

  Future<void> _fetchRoute(LatLng origin, LatLng destination) async {
    try {
      final routeDetails = await _navService.getRouteWithDetails(
        origin,
        destination,
      );

      if (routeDetails != null && mounted) {
        setState(() {
          _tripRouteCoordinates = routeDetails['polyline'] as List<LatLng>;

          _polylines = {
            Polyline(
              polylineId: const PolylineId('trip_route'),
              points: _tripRouteCoordinates,
              color: const Color(0xFFD4AF37),
              width: 4,
            ),
          };
        });

        _fitMapToRoute();
      }
    } catch (e) {
      debugPrint('Error fetching route: $e');
    }
  }

  Future<void> _fitMapToRoute() async {
    if (_tripRouteCoordinates.isEmpty) return;

    final controller = await _mapController.future;

    double minLat = _tripRouteCoordinates.first.latitude;
    double maxLat = _tripRouteCoordinates.first.latitude;
    double minLng = _tripRouteCoordinates.first.longitude;
    double maxLng = _tripRouteCoordinates.first.longitude;

    for (final point in _tripRouteCoordinates) {
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
        50.0,
      ),
    );
  }

  void _startWaitingTimer() {
    _waitingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _waitingSeconds++;
        if (_waitingSeconds >= _freeWaitingLimit &&
            _tripStatus == TripStatus.freeWaiting) {
          _tripStatus = TripStatus.paidWaiting;
        }
      });
    });
  }

  String _formatTime(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  void _startTrip() async {
    _waitingTimer?.cancel();
    try {
      await ref.read(rideRiverpodProvider).updateStatus('in_progress');
      if (mounted) {
        setState(() {
          _tripStatus = TripStatus.inProgress;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to start trip: $e')));
      }
    }
  }

  void _endTrip() async {
    // Capture navigator before async gap so navigation works even if mounted flips
    final navigator = Navigator.of(context);
    var completed = false;
    try {
      await ref.read(rideRiverpodProvider).updateStatus('completed');
      completed = true;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to complete trip: $e')));
      }
    }
    if (completed) {
      navigator.pushReplacement(
        MaterialPageRoute(
          builder: (_) => TripCompletedScreen(ride: widget.ride),
        ),
      );
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
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text('Failed to cancel ride: $e')),
                    );
                  }
                }

                if (mounted && cancelled) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(
                      builder: (context) => const DriverMapScreen(),
                    ),
                    (route) => false,
                  );
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

  void _launchMaps() async {
    final lat = widget.ride.dropoffLat;
    final lng = widget.ride.dropoffLng;

    if (lat == 0.0 && lng == 0.0) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Destination coordinates not available'),
          ),
        );
      }
      return;
    }

    // Use turn-by-turn navigation URL
    final url = Uri.parse(
      _navService.getGoogleMapsNavigationUrl(lat, lng),
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Could not launch maps')));
      }
    }
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
              target: _tripRouteCoordinates.first,
              zoom: 13.0,
            ),
            onMapCreated: (GoogleMapController controller) {
              _mapController.complete(controller);
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
            (widget.ride.pickupAddress).split(',').last.trim(),
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

          // Status-specific content
          if (_tripStatus == TripStatus.freeWaiting ||
              _tripStatus == TripStatus.paidWaiting)
            _buildWaitingContent()
          else if (_tripStatus == TripStatus.inProgress)
            _buildInProgressContent()
          else if (_tripStatus == TripStatus.completed)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Trip completed! Thank you.',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildWaitingContent() {
    final isFreeWaiting = _tripStatus == TripStatus.freeWaiting;
    final remainingFreeTime = _freeWaitingLimit - _waitingSeconds;

    return Column(
      children: [
        // Waiting Timer
        Text(
          isFreeWaiting ? 'Free waiting' : 'Paid waiting',
          style: TextStyle(
            color: isFreeWaiting ? AppColors.primary : Colors.orange,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _formatTime(_waitingSeconds),
          style: const TextStyle(
            color: AppColors.white,
            fontSize: 48,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Text(
            isFreeWaiting
                ? 'Once the countdown hits 00:00, you\'ll be adding cash for every minute you spend waiting for the ride.'
                : 'You are being paid to wait extra time for this customer. We\'ll contact the rider to let them know you are at the pickup spot.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[400], fontSize: 12),
          ),
        ),
        if (isFreeWaiting && remainingFreeTime > 0) ...[
          const SizedBox(height: 8),
          Text(
            'Free time remaining: ${_formatTime(remainingFreeTime)}',
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
        const SizedBox(height: 20),

        // Rider Info
        _buildRiderInfo(),

        const SizedBox(height: 16),

        // Price Info
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            children: [
              GestureDetector(
                onTap: () async {
                  final phone = widget.ride.rider?.phone;
                  if (phone == null || phone.isEmpty) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Rider phone number not available'),
                        ),
                      );
                    }
                    return;
                  }
                  try {
                    await launchUrl(Uri.parse('tel:$phone'));
                  } catch (_) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Could not launch phone dialer'),
                        ),
                      );
                    }
                  }
                },
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
                      '• ${widget.ride.payment?.gateway ?? 'Cash'}',
                      style: TextStyle(color: Colors.grey[400], fontSize: 14),
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: _launchMaps,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.navigation,
                    color: AppColors.primary,
                    size: 20,
                  ),
                ),
              ),
              const SizedBox(width: 12),
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

        // Start Trip Button
        // Start Trip Slider
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: SlideToAction(
            text: 'Slide to start trip',
            onSlide: () async => _startTrip(),
            outerColor: AppColors.cardBackground,
            innerColor: AppColors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildInProgressContent() {
    return Column(
      children: [
        const Text(
          'Head to drop-off destination:',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Text(
            widget.ride.dropoffAddress,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[400], fontSize: 14),
          ),
        ),
        const SizedBox(height: 20),

        // Rider Info
        _buildRiderInfo(),

        const SizedBox(height: 16),

        // Price Info + Action Buttons (Navigate, Call, Chat)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            children: [
              GestureDetector(
                onTap: () async {
                  final phone = widget.ride.rider?.phone;
                  if (phone == null || phone.isEmpty) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Rider phone number not available')),
                      );
                    }
                    return;
                  }
                  try {
                    await launchUrl(Uri.parse('tel:$phone'));
                  } catch (_) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Could not launch phone dialer')),
                      );
                    }
                  }
                },
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.phone, color: AppColors.primary, size: 20),
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
                      '• ${widget.ride.payment?.gateway ?? 'Cash'}',
                      style: TextStyle(color: Colors.grey[400], fontSize: 14),
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: _launchMaps,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.navigation, color: AppColors.primary, size: 20),
                ),
              ),
              const SizedBox(width: 12),
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
                  child: const Icon(Icons.message, color: AppColors.white, size: 20),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Quiet Mode indicator
        if (widget.ride.rider?.quietMode == true)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.inputBackground,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.volume_off, color: AppColors.primary, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Quiet Mode',
                          style: TextStyle(
                            color: AppColors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          'Rider prefers little to no conversation.',
                          style: TextStyle(color: Colors.grey[400], fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

        const SizedBox(height: 20),

        // End Trip Slider
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: SlideToAction(
            text: 'Slide to finish trip',
            onSlide: () async => _endTrip(),
            outerColor: Colors.red.withValues(alpha: 0.2),
            innerColor: Colors.red,
            sliderButtonIcon: Icons.stop,
          ),
        ),
      ],
    );
  }

  Widget _buildRiderInfo() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: Colors.amber[200],
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(Icons.person, size: 24, color: Colors.brown),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.ride.rider?.name ?? 'Passenger',
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Row(
                  children: [
                    const Icon(Icons.star, color: Colors.amber, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      '${widget.ride.rider?.rating ?? 5.0}',
                      style: const TextStyle(
                        color: AppColors.white,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${widget.ride.pricing.distance.toStringAsFixed(1)} km',
                      style: TextStyle(color: Colors.grey[400], fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.inputBackground,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              widget.ride.pickupAddress.split(' ').take(3).join(' '),
              style: const TextStyle(color: AppColors.white, fontSize: 12),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  void _loadMapAssets() {
    // Load custom marker icons if needed
    // For now we use default markers in _setupMapData
  }

  void _startLocationUpdates() {
    _positionSubscription = _locationService.getPositionStream().listen((
      position,
    ) {
      if (mounted) {
        // Emit location update to backend via socket
        final rideProvider = ref.read(rideRiverpodProvider);
        rideProvider.sendLocationUpdate(
          latitude: position.latitude,
          longitude: position.longitude,
          heading: position.heading,
        );

        // Update driver marker on map
        _updateDriverMarker(LatLng(position.latitude, position.longitude));
      }
    });
  }

  void _updateDriverMarker(LatLng position) async {
    if (!mounted) return;
    setState(() {
      final markers = Set<Marker>.from(_markers);
      markers.removeWhere((m) => m.markerId.value == 'driver');
      markers.add(
        Marker(
          markerId: const MarkerId('driver'),
          position: position,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
          infoWindow: const InfoWindow(title: 'You'),
        ),
      );
      _markers = markers;
    });

    // Animate camera to follow driver
    try {
      final controller = await _mapController.future;
      controller.animateCamera(
        CameraUpdate.newLatLng(position),
      );
    } catch (_) {}
  }
}
