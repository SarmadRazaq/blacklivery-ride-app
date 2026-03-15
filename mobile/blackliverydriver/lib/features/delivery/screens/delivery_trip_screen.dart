import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/riverpod_providers.dart';
import '../../../core/services/location_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../core/widgets/slide_to_action.dart';
import '../../ride/data/services/navigation_service.dart';
import '../../ride/data/models/ride_model.dart';
import '../../chat/chat_screen.dart';
import '../data/models/delivery_model.dart';
import 'delivery_proof_screen.dart';
import 'delivery_completed_screen.dart';

/// In-progress delivery trip screen — drive from pickup to dropoff.
class DeliveryTripScreen extends ConsumerStatefulWidget {
  final Ride ride;
  final DeliveryRequest? deliveryRequest;

  const DeliveryTripScreen({
    super.key,
    required this.ride,
    this.deliveryRequest,
  });

  @override
  ConsumerState<DeliveryTripScreen> createState() => _DeliveryTripScreenState();
}

class _DeliveryTripScreenState extends ConsumerState<DeliveryTripScreen> {
  final Completer<GoogleMapController> _controller = Completer();
  final NavigationService _navService = NavigationService();
  final LocationService _locationService = LocationService();
  final ApiClient _apiClient = ApiClient();

  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  BitmapDescriptor? _driverIcon;
  StreamSubscription<Position>? _positionSubscription;
  bool _isCompleting = false;
  Position? _currentPosition;

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

  @override
  void initState() {
    super.initState();
    _loadMapAssets();
    _setupRoute();
    _startLocationStream();
    _markEnRouteDropoff();
  }

  /// Notify backend that driver is en route to dropoff.
  void _markEnRouteDropoff() async {
    try {
      await ref.read(rideRiverpodProvider).updateStatus('delivery_en_route_dropoff');
    } catch (e) {
      debugPrint('Failed to mark en route to dropoff: $e');
    }
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
      debugPrint('DeliveryTrip: Error loading map assets: $e');
    }
  }

  void _setupRoute() async {
    final dropoffLatLng = LatLng(widget.ride.dropoffLat, widget.ride.dropoffLng);

    Position? currentPosition;
    try {
      currentPosition = await Geolocator.getCurrentPosition();
    } catch (e) {
      debugPrint('Error getting current position: $e');
    }

    final driverLatLng = currentPosition != null
        ? LatLng(currentPosition.latitude, currentPosition.longitude)
        : LatLng(widget.ride.pickupLat, widget.ride.pickupLng);

    // Fetch route from current position → dropoff
    try {
      final routeCoords = await _navService.getRoute(
        driverLatLng,
        dropoffLatLng,
      );
      if (mounted && routeCoords.isNotEmpty) {
        setState(() {
          _polylines = {
            Polyline(
              polylineId: const PolylineId('route'),
              points: routeCoords,
              color: Colors.orange,
              width: 5,
            ),
          };
        });
      }
    } catch (e) {
      debugPrint('Error fetching route: $e');
    }

    if (mounted) {
      setState(() {
        _markers = {
          Marker(
            markerId: const MarkerId('driver'),
            position: driverLatLng,
            icon: _driverIcon ??
                BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
            infoWindow: const InfoWindow(title: 'Your Location'),
          ),
          Marker(
            markerId: const MarkerId('dropoff'),
            position: dropoffLatLng,
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
            infoWindow: InfoWindow(title: 'Dropoff: ${widget.ride.dropoffAddress}'),
          ),
        };
      });

      try {
        final controller = await _controller.future;
        controller.animateCamera(
          CameraUpdate.newLatLngBounds(
            LatLngBounds(
              southwest: LatLng(
                driverLatLng.latitude < dropoffLatLng.latitude
                    ? driverLatLng.latitude
                    : dropoffLatLng.latitude,
                driverLatLng.longitude < dropoffLatLng.longitude
                    ? driverLatLng.longitude
                    : dropoffLatLng.longitude,
              ),
              northeast: LatLng(
                driverLatLng.latitude > dropoffLatLng.latitude
                    ? driverLatLng.latitude
                    : dropoffLatLng.latitude,
                driverLatLng.longitude > dropoffLatLng.longitude
                    ? driverLatLng.longitude
                    : dropoffLatLng.longitude,
              ),
            ),
            80,
          ),
        );
      } catch (_) {}
    }
  }

  void _startLocationStream() {
    _positionSubscription = _locationService.getPositionStream().listen(
      (position) {
        _currentPosition = position;
        _updateDriverMarker(LatLng(position.latitude, position.longitude));
      },
    );
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
          icon: _driverIcon ??
              BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          infoWindow: const InfoWindow(title: 'Your Location'),
        ),
      );
      _markers = markers;
    });
  }

  /// Complete the delivery — check if proof is required first.
  void _completeDelivery() async {
    if (_isCompleting) return;
    setState(() => _isCompleting = true);

    final proofRequired = widget.deliveryRequest?.deliveryDetails.proofRequired ??
        ProofRequirement.none;

    if (proofRequired != ProofRequirement.none) {
      // Navigate to proof-of-delivery screen
      final proofCompleted = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => DeliveryProofScreen(
            ride: widget.ride,
            proofRequired: proofRequired,
          ),
        ),
      );

      if (proofCompleted != true) {
        setState(() => _isCompleting = false);
        return;
      }
    }

    // Mark delivery as delivered
    try {
      await ref.read(rideRiverpodProvider).updateStatus('delivery_delivered');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to complete delivery: $e')),
        );
        setState(() => _isCompleting = false);
      }
      return;
    }

    if (!mounted) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => DeliveryCompletedScreen(
          ride: widget.ride,
          deliveryRequest: widget.deliveryRequest,
        ),
      ),
    );
  }

  void _cancelDelivery() {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.cardBackground,
        title: const Text('Cancel Delivery?', style: TextStyle(color: AppColors.white)),
        content: const Text(
          'The package is already collected. Cancelling now may result in penalties.',
          style: TextStyle(color: AppColors.grey),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Continue Delivery', style: TextStyle(color: AppColors.primary)),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(dialogContext).pop();
              try {
                await ref.read(rideRiverpodProvider).updateStatus('cancelled');
              } catch (_) {}
              if (mounted) {
                Navigator.of(context).popUntil((route) => route.isFirst);
              }
            },
            child: const Text('Cancel Anyway', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  void _openNavigation() async {
    final lat = widget.ride.dropoffLat;
    final lng = widget.ride.dropoffLng;
    final url = Uri.parse('google.navigation:q=$lat,$lng&mode=d');
    final fallback = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    } else {
      await launchUrl(fallback, mode: LaunchMode.externalApplication);
    }
  }

  void _callRecipient() async {
    final phone = widget.deliveryRequest?.deliveryDetails.dropoffContact?.phone;
    if (phone == null || phone.isEmpty) return;
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    final deliveryDetails = widget.deliveryRequest?.deliveryDetails;
    final recipientName = deliveryDetails?.dropoffContact?.name ?? 'Recipient';
    final currency = widget.deliveryRequest?.currency ?? widget.ride.pricing.currency;

    return Scaffold(
      body: Stack(
        children: [
          // Map
          GoogleMap(
            style: _darkMapStyle,
            initialCameraPosition: CameraPosition(
              target: LatLng(widget.ride.dropoffLat, widget.ride.dropoffLng),
              zoom: 14,
            ),
            markers: _markers,
            polylines: _polylines,
            myLocationEnabled: false,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            onMapCreated: (controller) {
              if (!_controller.isCompleted) {
                _controller.complete(controller);
              }
            },
          ),

          // SOS / Cancel
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            child: CircleAvatar(
              backgroundColor: AppColors.cardBackground,
              child: IconButton(
                icon: const Icon(Icons.close, color: AppColors.white),
                onPressed: _cancelDelivery,
              ),
            ),
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: 16,
            child: CircleAvatar(
              backgroundColor: AppColors.error,
              child: IconButton(
                icon: const Icon(Icons.sos, color: AppColors.white, size: 18),
                onPressed: () async {
                  final rideId = widget.ride.id;
                  final pos = _currentPosition;
                  _apiClient.dio.post('/api/v1/rides/$rideId/sos', data: {
                    if (pos != null) 'location': {'lat': pos.latitude, 'lng': pos.longitude},
                  }).then((_) {}, onError: (_) {});

                  final uri = Uri(scheme: 'tel', path: '911');
                  if (await canLaunchUrl(uri)) launchUrl(uri);
                },
              ),
            ),
          ),

          // Bottom panel
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              decoration: const BoxDecoration(
                color: AppColors.cardBackground,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Handle bar
                      Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.darkGrey,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Header
                      Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.orange.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.local_shipping, color: Colors.orange, size: 24),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Delivering Package',
                                  style: TextStyle(
                                    color: AppColors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  widget.ride.dropoffAddress,
                                  style: TextStyle(color: Colors.grey[400], fontSize: 13),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              CurrencyUtils.format(widget.ride.fare, currency: currency),
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),

                      // Recipient and dropoff instructions
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.inputBackground,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.person_pin_circle, color: Colors.orange, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  'Recipient: $recipientName',
                                  style: const TextStyle(
                                    color: AppColors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                            if (deliveryDetails?.dropoffContact?.instructions != null) ...[
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Icon(Icons.info_outline, color: Colors.grey[500], size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      deliveryDetails!.dropoffContact!.instructions!,
                                      style: TextStyle(color: Colors.grey[400], fontSize: 13),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Action buttons row
                      Row(
                        children: [
                          Expanded(
                            child: _tripActionButton(
                              icon: Icons.navigation,
                              label: 'Navigate',
                              color: Colors.orange,
                              onTap: _openNavigation,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _tripActionButton(
                              icon: Icons.call,
                              label: 'Call',
                              color: AppColors.success,
                              onTap: _callRecipient,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _tripActionButton(
                              icon: Icons.chat_bubble,
                              label: 'Chat',
                              color: AppColors.primary,
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ChatScreen(
                                      rideId: widget.ride.id,
                                      riderName: recipientName,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Complete delivery slider
                      SlideToAction(
                        text: _isCompleting
                            ? 'Completing...'
                            : 'Slide to Complete Delivery',
                        outerColor: AppColors.success.withValues(alpha: 0.2),
                        innerColor: AppColors.success,
                        textColor: AppColors.white,
                        onSlide: () async => _completeDelivery(),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tripActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(color: color, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
