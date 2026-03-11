import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/providers/region_provider.dart';
import '../../core/utils/region_geofence.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import '../../core/theme/app_theme.dart';
import 'ride_request_overlay.dart';
import 'ride_accepted_screen.dart';
import '../history/bookings_screen.dart';
import '../earnings/earnings_screen.dart';
import '../settings/settings_screen.dart';
import '../../core/widgets/slide_to_action.dart';
import '../../core/utils/marker_utils.dart';
import '../../core/widgets/vehicle_icon.dart';
import '../home/heat_map_screen.dart';
import '../home/destination_screen.dart';
import '../home/preferences_screen.dart';
import '../home/incentive_screen.dart';
import '../home/rating_screen.dart';
import '../home/support_screen.dart';
import '../home/notifications_screen.dart';
import '../home/loyalty_points_screen.dart';
import '../home/providers/driver_preferences_provider.dart';
import '../delivery/data/models/delivery_model.dart';
import '../delivery/screens/delivery_request_sheet.dart';
import '../delivery/screens/delivery_pickup_screen.dart';

class DriverMapScreen extends ConsumerStatefulWidget {
  const DriverMapScreen({super.key});

  @override
  ConsumerState<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends ConsumerState<DriverMapScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final Completer<GoogleMapController> _controller = Completer();
  GoogleMapController? _mapController;
  int _currentNavIndex = 0; // Home (map) is default
  Position? _currentPosition;
  Set<Marker> _markers = {};
  bool _showRideOverlay = false;
  bool _showDeliveryOverlay = false;
  RequestType _currentRequestType = RequestType.instant;
  Map<String, dynamic>? _incomingRideData;
  Map<String, dynamic>? _incomingDeliveryData;
  VoidCallback? _rideListenerCallback;
  BitmapDescriptor? _vehicleMarkerIcon;
  Timer? _heartbeatTimer;
  bool _isSendingHeartbeat = false;
  RegionCode? _lastRegionCode;

  // Initial camera position (will be updated with actual location)
  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(41.8781, -87.6298), // Chicago default
    zoom: 14.0,
  );

  // Dark map style
  static const String _darkMapStyle = '''
[
  {
    "elementType": "geometry",
    "stylers": [{"color": "#212121"}]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{"visibility": "off"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#757575"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#212121"}]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{"color": "#757575"}]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#757575"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{"color": "#181818"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#2c2c2c"}]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#8a8a8a"}]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [{"color": "#373737"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{"color": "#3c3c3c"}]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [{"color": "#4e4e4e"}]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#616161"}]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#757575"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#000000"}]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#3d3d3d"}]
  }
]
''';

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _initializeWebSocket();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final isOnline = ref.read(authRiverpodProvider).isOnline;
      if (isOnline) {
        _startHeartbeatLoop();
      }
      // Track initial region and listen for changes
      final regionProvider = ref.read(regionRiverpodProvider);
      _lastRegionCode = regionProvider.code;
      regionProvider.addListener(_onRegionChanged);
    });
  }

  void _initializeWebSocket() async {
    // Initialize WebSocket with Firebase ID token
    final user = firebase_auth.FirebaseAuth.instance.currentUser;
    final token = await user?.getIdToken(true);

    if (token != null && token.isNotEmpty) {
      if (!mounted) return;
      final rideProvider = ref.read(rideRiverpodProvider);
      final prefsProvider = ref.read(driverPreferencesRiverpodProvider);
      final regionProvider = ref.read(regionRiverpodProvider);
      rideProvider.initWebSocket(
        token, 
        prefsProvider: prefsProvider, 
        regionProvider: regionProvider,
      );
      rideProvider.refreshScheduledRidesCount();

      // Emit driver preferences to backend so server knows what to send
      _emitDriverPreferences(prefsProvider);

      // Listen for incoming ride/delivery requests from provider
      _rideListenerCallback = () {
        final rideProvider = ref.read(rideRiverpodProvider);
        final authProvider = ref.read(authRiverpodProvider);

        // Check for delivery request first
        final pendingDelivery = rideProvider.pendingDeliveryRequest;
        if (pendingDelivery != null && authProvider.isOnline) {
          _showIncomingDelivery(pendingDelivery);
          return;
        }

        // Then check for regular ride request
        final pendingRequest = rideProvider.pendingRideRequest;
        if (pendingRequest != null && authProvider.isOnline) {
          _showIncomingRide({
            'id': pendingRequest.id,
            'riderName': pendingRequest.riderName,
            'riderPhone': pendingRequest.riderPhone,
            'riderAvatar': pendingRequest.riderPhotoUrl,
            'pickup_lat': pendingRequest.pickupLat,
            'pickup_lng': pendingRequest.pickupLng,
            'pickup_address': pendingRequest.pickupAddress,
            'dropoff_lat': pendingRequest.dropoffLat,
            'dropoff_lng': pendingRequest.dropoffLng,
            'dropoff_address': pendingRequest.dropoffAddress,
            'fare': pendingRequest.estimatedFare,
            'price': pendingRequest.estimatedFare,
            'distance': '${pendingRequest.distance.toStringAsFixed(1)} km',
            'distanceKm': '${pendingRequest.distance.toStringAsFixed(1)} km',
            'duration': '${pendingRequest.estimatedDuration} min',
            'scheduledAt': pendingRequest.scheduledTime,
            'bookingType': pendingRequest.bookingType,
            'isAirport': pendingRequest.isAirport,
            'paymentMethod': pendingRequest.paymentMethod,
          });
        }
      };
      rideProvider.addListener(_rideListenerCallback!);
    }
  }

  Future<void> _pushAndRefreshLocation(Widget screen) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => screen),
    );

    if (!mounted) return;
    await _getCurrentLocation(recenterMap: true);
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    if (_rideListenerCallback != null) {
      try {
        ref.read(rideRiverpodProvider).removeListener(_rideListenerCallback!);
      } catch (_) {}
    }
    try {
      ref.read(regionRiverpodProvider).removeListener(_onRegionChanged);
    } catch (_) {}
    _mapController?.dispose();
    super.dispose();
  }

  /// Called when RegionProvider notifies — re-center map to new region.
  void _onRegionChanged() {
    final regionProvider = ref.read(regionRiverpodProvider);
    if (regionProvider.code == _lastRegionCode) return;
    _lastRegionCode = regionProvider.code;

    final LatLng regionCenter = regionProvider.isChicago
        ? const LatLng(41.8781, -87.6298)
        : const LatLng(6.5244, 3.3792);

    _animateToPosition(regionCenter);

    // Re-fetch GPS — if it matches the new region, the driver marker reappears
    _getCurrentLocation(recenterMap: true);
  }

  Future<void> _animateToPosition(LatLng target) async {
    if (_mapController != null) {
      await _mapController!.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(target: target, zoom: 14.0),
        ),
      );
      return;
    }
    if (_controller.isCompleted) {
      final controller = await _controller.future;
      await controller.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(target: target, zoom: 14.0),
        ),
      );
    }
  }

  Future<void> _getCurrentLocation({bool recenterMap = false}) async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Location permission is required to show your position',
              ),
            ),
          );
        }
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Location permission permanently denied. Enable it in Settings.',
            ),
          ),
        );
      }
      return;
    }

    try {
      _currentPosition = await Geolocator.getCurrentPosition();

      debugPrint('[DriverMap] GPS: ${_currentPosition!.latitude}, ${_currentPosition!.longitude}');

      // If GPS is outside the selected region, fall back to region center
      final regionProvider = ref.read(regionRiverpodProvider);
      final gpsRegion = RegionGeofence.regionOf(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
      );
      debugPrint('[DriverMap] gpsRegion=$gpsRegion, apiRegionKey=${regionProvider.apiRegionKey}');
      if (gpsRegion != regionProvider.apiRegionKey) {
        // GPS doesn't match selected region (e.g. emulator) — use region default
        final LatLng regionCenter = regionProvider.isChicago
            ? const LatLng(41.8781, -87.6298)
            : const LatLng(6.5244, 3.3792);
        _currentPosition = null;
        _updateMarkers();
        await _animateToPosition(regionCenter);
        return;
      }

      _updateMarkers();

      if (recenterMap || _currentNavIndex == 0) {
        await _animateToCurrentPosition();
      }
    } catch (e) {
      // Keep previously known marker if a fresh location fetch fails.
      _updateMarkers();
    }
  }

  Future<void> _animateToCurrentPosition() async {
    if (_currentPosition == null) return;

    final target = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);

    if (_mapController != null) {
      await _mapController!.animateCamera(CameraUpdate.newLatLng(target));
      return;
    }

    if (_controller.isCompleted) {
      final controller = await _controller.future;
      await controller.animateCamera(CameraUpdate.newLatLng(target));
    }
  }

  void _updateMarkers() async {
    if (!mounted) return;

    final authProvider = ref.read(authRiverpodProvider);
    final vehicleId = authProvider.user?.driverProfile?.vehicleId ?? 'sedan';

    _vehicleMarkerIcon ??= await MarkerUtils.getVehicleMarker(
      vehicleTypeFromId(vehicleId),
      color: AppColors.primary,
      size: 64,
    );

    if (!mounted) return;

    debugPrint('[DriverMap] _updateMarkers: _currentPosition=$_currentPosition, markerIcon=${_vehicleMarkerIcon != null}');

    setState(() {
      final updated = Set<Marker>.from(_markers);

      // Always remove old driver marker first
      updated.removeWhere((marker) => marker.markerId == const MarkerId('driver'));

      // Update driver location marker when available.
      if (_currentPosition != null) {
        updated.add(
          Marker(
            markerId: const MarkerId('driver'),
            position: LatLng(
              _currentPosition!.latitude,
              _currentPosition!.longitude,
            ),
            icon: _vehicleMarkerIcon ?? BitmapDescriptor.defaultMarker,
            rotation: _currentPosition?.heading ?? 0,
            anchor: const Offset(0.5, 0.5),
            infoWindow: const InfoWindow(title: 'Your Location'),
          ),
        );
      } else {
        // GPS doesn't match region or unavailable — place marker at region center
        final regionProvider = ref.read(regionRiverpodProvider);
        final LatLng fallback = regionProvider.isChicago
            ? const LatLng(41.8781, -87.6298)
            : const LatLng(6.5244, 3.3792);
        updated.add(
          Marker(
            markerId: const MarkerId('driver'),
            position: fallback,
            icon: _vehicleMarkerIcon ?? BitmapDescriptor.defaultMarker,
            anchor: const Offset(0.5, 0.5),
            infoWindow: const InfoWindow(title: 'Your Location'),
          ),
        );
      }

      _markers = updated;
    });
  }

  void _toggleOnlineStatus() async {
    final authProvider = ref.read(authRiverpodProvider);
    final rideProvider = ref.read(rideRiverpodProvider);

    // Prevent going offline during an active ride
    if (authProvider.isOnline && rideProvider.currentRide != null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Cannot go offline while a ride is in progress',
            ),
          ),
        );
      }
      return;
    }

    // Use GPS position if available; otherwise fall back to region center
    // so the backend always receives a location and sets the geohash.
    double? lat = _currentPosition?.latitude;
    double? lng = _currentPosition?.longitude;
    double? heading = _currentPosition?.heading;

    if (lat == null || lng == null) {
      final regionProvider = ref.read(regionRiverpodProvider);
      if (regionProvider.isChicago) {
        lat = 41.8781;
        lng = -87.6298;
      } else {
        lat = 6.5244;
        lng = 3.3792;
      }
      heading = 0;
      debugPrint('[DriverMap] No GPS — using region center ($lat, $lng) for availability');
    }

    // Toggle online status via AuthProvider
    await authProvider.toggleOnlineStatus(lat: lat, lng: lng, heading: heading);

    // Show error if toggle failed
    if (authProvider.error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update status: ${authProvider.error}'),
        ),
      );
      return;
    }

    _updateMarkers();

    if (authProvider.isOnline) {
      _startHeartbeatLoop();
      _sendHeartbeat();
    } else {
      _stopHeartbeatLoop();
    }

    // Check for active rides if online
    if (mounted && authProvider.isOnline) {
      await rideProvider.checkForActiveRide();
      if (!mounted) return;

      // Navigate to active ride if exists
      final activeRide = rideProvider.currentRide;
      if (activeRide != null) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => RideAcceptedScreen(ride: activeRide),
          ),
        );
      }
    }
  }

  void _startHeartbeatLoop() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _sendHeartbeat(),
    );
  }

  void _stopHeartbeatLoop() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  Future<void> _sendHeartbeat() async {
    if (!mounted || _isSendingHeartbeat) return;

    final authProvider = ref.read(authRiverpodProvider);
    if (!authProvider.isOnline) return;

    _isSendingHeartbeat = true;
    try {
      final position = await Geolocator.getCurrentPosition();
      if (!mounted) return;

      // Check if GPS is within the selected region; fall back to region center
      // so the backend geohash stays correct for matching.
      final regionProvider = ref.read(regionRiverpodProvider);
      final gpsRegion = RegionGeofence.regionOf(
        position.latitude,
        position.longitude,
      );

      double lat;
      double lng;
      double heading;
      double speed;

      if (gpsRegion == regionProvider.apiRegionKey) {
        // GPS matches region — use real GPS
        _currentPosition = position;
        _updateMarkers();
        lat = position.latitude;
        lng = position.longitude;
        heading = position.heading;
        speed = position.speed;
      } else {
        // GPS doesn't match region (e.g. emulator) — use region center
        if (regionProvider.isChicago) {
          lat = 41.8781;
          lng = -87.6298;
        } else {
          lat = 6.5244;
          lng = 3.3792;
        }
        heading = 0;
        speed = 0;
        debugPrint('[DriverMap] Heartbeat: GPS out of region — using center ($lat, $lng)');
      }

      await authProvider.sendHeartbeat(
        lat: lat,
        lng: lng,
        heading: heading,
      );

      ref.read(rideRiverpodProvider).sendLocationUpdate(
        latitude: lat,
        longitude: lng,
        heading: heading,
        speed: speed,
      );
    } catch (_) {
      // Silent: heartbeat errors should not disrupt the driver UI.
    } finally {
      _isSendingHeartbeat = false;
    }
  }

  /// Emit driver preferences to backend via socket so server knows
  /// which ride types to send (ride, delivery, or both).
  void _emitDriverPreferences(DriverPreferencesProvider prefs) {
    final rideProvider = ref.read(rideRiverpodProvider);
    rideProvider.emitDriverMode(
      acceptRides: prefs.acceptRides,
      acceptDeliveries: prefs.acceptDeliveries,
    );
  }

  void _showIncomingRide(Map<String, dynamic> rideData) {
    setState(() {
      _showRideOverlay = true;
      _showDeliveryOverlay = false;
      _incomingRideData = rideData;
      // Determine request type based on ride data
      _currentRequestType = rideData['scheduledAt'] != null
          ? RequestType.scheduled
          : RequestType.instant;
    });
  }

  void _showIncomingDelivery(DeliveryRequest delivery) {
    setState(() {
      _showDeliveryOverlay = true;
      _showRideOverlay = false;
      _incomingDeliveryData = {
        'id': delivery.id,
        'riderId': delivery.riderId,
        'senderName': delivery.senderName,
        'senderPhone': delivery.senderPhone,
        'pickupLocation': {
          'address': delivery.pickupLocation.address,
          'lat': delivery.pickupLocation.lat,
          'lng': delivery.pickupLocation.lng,
        },
        'dropoffLocation': {
          'address': delivery.dropoffLocation.address,
          'lat': delivery.dropoffLocation.lat,
          'lng': delivery.dropoffLocation.lng,
        },
        'estimatedFare': delivery.estimatedFare,
        'currency': delivery.currency,
        'distance': delivery.distanceKm,
        'distanceKm': delivery.distanceKm,
        'duration': delivery.estimatedDurationMin,
        'vehicleCategory': delivery.vehicleCategory,
        'deliveryDetails': {
          'packageType': delivery.deliveryDetails.packageType.name,
          'packageValue': delivery.deliveryDetails.packageValue,
          'weightKg': delivery.deliveryDetails.weightKg,
          'serviceType': delivery.deliveryDetails.serviceType.apiValue,
          'requiresReturn': delivery.deliveryDetails.requiresReturn,
          'extraStops': delivery.deliveryDetails.extraStops,
          'proofRequired': delivery.deliveryDetails.proofRequired.name,
          'description': delivery.deliveryDetails.description,
          if (delivery.deliveryDetails.dropoffContact != null)
            'dropoffContact': delivery.deliveryDetails.dropoffContact!.toJson(),
          if (delivery.deliveryDetails.pickupContact != null)
            'pickupContact': delivery.deliveryDetails.pickupContact!.toJson(),
        },
      };
    });
  }

  void _openNotifications() {
    _pushAndRefreshLocation(const NotificationsScreen());
  }

  Widget _buildDrawer() {
    return Drawer(
      width: 260,
      backgroundColor: AppColors.cardBackground,
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: AppColors.white, size: 18),
                  ),
                ],
              ),
            ),
            _menuTile(
              title: 'Notifications',
              icon: Icons.notifications_none_rounded,
              onTap: () {
                Navigator.pop(context);
                _openNotifications();
              },
            ),
            _menuTile(
              title: 'Demand Heat Map',
              icon: Icons.blur_circular,
              onTap: () {
                Navigator.pop(context);
                _pushAndRefreshLocation(const HeatMapScreen());
              },
            ),
            _menuTile(
              title: 'Driver Tier & Rewards',
              icon: Icons.emoji_events_outlined,
              onTap: () {
                Navigator.pop(context);
                _pushAndRefreshLocation(const RatingScreen());
              },
            ),
            _menuTile(
              title: 'Incentive Program',
              icon: Icons.local_offer_outlined,
              onTap: () {
                Navigator.pop(context);
                _pushAndRefreshLocation(const IncentiveScreen());
              },
            ),
            _menuTile(
              title: 'Loyalty Points',
              icon: Icons.workspace_premium_outlined,
              onTap: () {
                Navigator.pop(context);
                _pushAndRefreshLocation(const LoyaltyPointsScreen());
              },
            ),
            _menuTile(
              title: 'Support & FAQs',
              icon: Icons.help_outline,
              onTap: () {
                Navigator.pop(context);
                _pushAndRefreshLocation(const SupportScreen());
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _menuTile({
    required String title,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return ListTile(
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14),
      leading: Icon(icon, color: Colors.grey[400], size: 16),
      title: Text(
        title,
        style: TextStyle(color: Colors.grey[100], fontSize: 12, fontWeight: FontWeight.w500),
      ),
      trailing: Icon(Icons.chevron_right, color: Colors.grey[500], size: 16),
      onTap: onTap,
    );
  }

  void _handleBottomNavTap(int index) {
    setState(() {
      _currentNavIndex = index;
    });

    if (index == 0) {
      _getCurrentLocation(recenterMap: true);
    }
  }

  void _acceptRide() async {
    if (_incomingRideData == null) return;

    final rideData = Map<String, dynamic>.from(_incomingRideData!);
    setState(() {
      _showRideOverlay = false;
      _incomingRideData = null;
    });

    try {
      final rideId = rideData['id']?.toString() ?? '';
      final prefsProvider = ref.read(driverPreferencesRiverpodProvider);

      if (rideId.isNotEmpty) {
        await ref.read(rideRiverpodProvider).acceptRide(rideId);

        // Send auto-greeting if enabled
        if (prefsProvider.autoGreeting) {
          final socketService = ref.read(rideRiverpodProvider);
          final greeting = prefsProvider.quietMode
              ? 'Hi! I\'m on my way. I prefer minimal chat during rides. Thank you!'
              : 'Hi! I\'m on my way to pick you up. See you soon!';
          // Emit chat message to rider via socket
          socketService.sendAutoGreeting(rideId, greeting);
        }
      }

      if (!mounted) return;

      if (_currentRequestType == RequestType.scheduled) {
        // Scheduled rides dispatched by cron 5 min before scheduledAt —
        // driver should proceed to pickup just like an instant ride.
        final currentRide = ref.read(rideRiverpodProvider).currentRide;
        if (currentRide != null) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => RideAcceptedScreen(ride: currentRide),
            ),
          );
        } else {
          // Ride accepted but not fetched yet — show confirmation and return
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Scheduled ride accepted! Check your upcoming rides.')),
          );
        }
      } else {
        final currentRide = ref.read(rideRiverpodProvider).currentRide;
        if (currentRide != null) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => RideAcceptedScreen(ride: currentRide),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to accept ride: ${e.toString()}')),
        );
      }
    }
  }

  void _declineRide() {
    ref.read(rideRiverpodProvider).declinePendingRide(reason: 'declined');
    setState(() {
      _showRideOverlay = false;
      _incomingRideData = null;
    });
  }

  void _acceptDelivery() async {
    if (_incomingDeliveryData == null) return;

    setState(() {
      _showDeliveryOverlay = false;
    });

    try {
      final rideProvider = ref.read(rideRiverpodProvider);
      // Parse the delivery request before accepting (it gets cleared)
      final deliveryRequest = DeliveryRequest.fromJson(
        Map<String, dynamic>.from(_incomingDeliveryData!),
      );
      await rideProvider.acceptPendingDelivery();

      if (!mounted) return;

      final currentRide = rideProvider.currentRide;
      if (currentRide != null) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => DeliveryPickupScreen(
              ride: currentRide,
              deliveryRequest: deliveryRequest,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to accept delivery: ${e.toString()}')),
        );
      }
    } finally {
      _incomingDeliveryData = null;
    }
  }

  void _declineDelivery() {
    ref.read(rideRiverpodProvider).declinePendingRide(reason: 'declined');
    setState(() {
      _showDeliveryOverlay = false;
      _incomingDeliveryData = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: _buildDrawer(),
      body: Stack(
        children: [
          // Main Content Area — IndexedStack preserves tab state
          Positioned.fill(
            bottom: 60, // Leave space for bottom nav
            child: IndexedStack(
              index: _currentNavIndex,
              children: [
                _buildHomeBody(),
                const BookingsScreen(),
                const EarningsScreen(),
                const SettingsScreen(),
              ],
            ),
          ),

          // Bottom Navigation
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildBottomNavigation(),
          ),
        ],
      ),
    );
  }

  /// Home tab: map with overlay — welcome bar, Heat Map/Destination/Preferences, stats, Go Online.
  Widget _buildHomeBody() {
    final user = ref.watch(authRiverpodProvider).user;
    final firstName = user?.firstName ?? 'Driver';
    final earnings = ref.watch(earningsRiverpodProvider);
    final rideProvider = ref.watch(rideRiverpodProvider);
    final ridesCount = earnings.earningsData['ridesCount'] ?? 0;
    final scheduledCount = rideProvider.scheduledRidesCount;

    return Stack(
      children: [
        GoogleMap(
          mapType: MapType.normal,
          initialCameraPosition: _initialPosition,
          style: _darkMapStyle,
          onMapCreated: (GoogleMapController controller) {
            _mapController = controller;
            if (!_controller.isCompleted) _controller.complete(controller);
            _updateMarkers();
            _animateToCurrentPosition();
          },
          markers: _markers,
          polylines: ref.watch(rideRiverpodProvider).polylines,
          myLocationEnabled: true,
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
          compassEnabled: false,
        ),
        // Top bar: hamburger, "Welcome back [Name]!", shield
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => _scaffoldKey.currentState?.openDrawer(),
                    icon: const Icon(
                      Icons.menu,
                      color: AppColors.white,
                      size: 24,
                    ),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        'Welcome back $firstName!',
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: _openNotifications,
                    icon: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.cardBackground,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.notifications_none_rounded,
                        color: AppColors.white,
                        size: 22,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        // Recenter button
        Positioned(
          right: 16,
          bottom: 320,
          child: FloatingActionButton.small(
            heroTag: 'recenter',
            backgroundColor: AppColors.cardBackground,
            onPressed: () => _getCurrentLocation(recenterMap: true),
            child: const Icon(
              Icons.my_location,
              color: AppColors.white,
              size: 20,
            ),
          ),
        ),
        // Content overlay below map: solid dark panel with rounded top corners
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
            decoration: const BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Heat Map, Destination, Preferences
                Row(
                  children: [
                    Expanded(
                      child: _buildHomeFeatureButton(
                        icon: Icons.keyboard_double_arrow_up,
                        label: 'Heat Map',
                        onTap: () => _pushAndRefreshLocation(const HeatMapScreen()),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildHomeFeatureButton(
                        icon: Icons.place_outlined,
                        label: 'Destination',
                        onTap: () => _pushAndRefreshLocation(const DestinationScreen()),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildHomeFeatureButton(
                        icon: Icons.tune,
                        label: 'Preferences',
                        onTap: () => _pushAndRefreshLocation(const PreferencesScreen()),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Completed Rides, Scheduled Rides, Mode: Driver
                Row(
                  children: [
                    Expanded(
                      child: _buildHomeStatCard(
                        title: 'Completed\nRides',
                        value: '$ridesCount',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildHomeStatCard(
                        title: 'Scheduled\nRides',
                        value: '$scheduledCount',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: _buildHomeModeCard()),
                  ],
                ),
                const SizedBox(height: 18),
                _buildOnlineButton(),
              ],
            ),
          ),
        ),
        if (_showRideOverlay && _incomingRideData != null)
          Positioned.fill(
            child: Container(
              color: Colors.black.withValues(alpha: 0.5),
              child: Center(
                child: RideRequestOverlay(
                  requestType: _currentRequestType,
                  rideData: _incomingRideData!,
                  onAccept: _acceptRide,
                  onDecline: _declineRide,
                ),
              ),
            ),
          ),
        if (_showDeliveryOverlay && _incomingDeliveryData != null)
          Positioned.fill(
            child: Container(
              color: Colors.black.withValues(alpha: 0.5),
              child: Center(
                child: DeliveryRequestSheet(
                  deliveryData: _incomingDeliveryData!,
                  onAccept: _acceptDelivery,
                  onDecline: _declineDelivery,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildHomeFeatureButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: AppColors.cardBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.06),
            width: 1,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppColors.primary, size: 26),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: Colors.grey[400],
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeStatCard({required String title, required String value}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.06),
          width: 1,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.grey[500],
              fontSize: 10,
              fontWeight: FontWeight.w500,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHomeModeCard() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.06),
          width: 1,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.directions_car_outlined,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Mode:\nDriver',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.grey[500],
              fontSize: 10,
              fontWeight: FontWeight.w500,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOnlineButton() {
    final isOnline = ref.watch(authRiverpodProvider).isOnline;
    final isLoading =
        ref.watch(rideRiverpodProvider).isLoading ||
        ref.watch(authRiverpodProvider).isLoading;

    if (isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.white),
      );
    }

    return SlideToAction(
      text: isOnline ? "You're Online!" : "Go Online",
      onSlide: () async => _toggleOnlineStatus(),
      outerColor: isOnline ? AppColors.white : const Color(0xFF2A2A2A),
      innerColor: isOnline ? AppColors.primary : AppColors.white,
      textColor: isOnline ? Colors.black : AppColors.white,
      sliderButtonIcon: isOnline
          ? Icons.power_settings_new
          : Icons.double_arrow_rounded,
    );
  }

  Widget _buildBottomNavigation() {
    return Container(
      padding: const EdgeInsets.only(top: 10, bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.background,
        border: Border(
          top: BorderSide(
            color: Colors.white.withValues(alpha: 0.06),
            width: 1,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildNavItem(Icons.home_rounded, 'Home', 0),
          _buildNavItem(Icons.list_alt_rounded, 'Rides', 1,
              badgeCount: ref.watch(rideRiverpodProvider).scheduledRidesCount),
          _buildNavItem(Icons.account_balance_wallet_rounded, 'Earnings', 2),
          _buildNavItem(Icons.settings_rounded, 'Settings', 3),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index, {int badgeCount = 0}) {
    final isSelected = _currentNavIndex == index;
    return GestureDetector(
      onTap: () => _handleBottomNavTap(index),
      child: SizedBox(
        width: 64,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Badge(
              isLabelVisible: badgeCount > 0,
              label: Text(
                '$badgeCount',
                style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
              ),
              backgroundColor: AppColors.primary,
              child: Icon(
                icon,
                color: isSelected ? AppColors.white : AppColors.grey,
                size: 22,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? AppColors.white : AppColors.grey,
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
            const SizedBox(height: 4),
            // Active indicator dot
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: isSelected ? 4 : 0,
              height: isSelected ? 4 : 0,
              decoration: BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
