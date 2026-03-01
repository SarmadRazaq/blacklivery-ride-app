import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/providers/riverpod_providers.dart';
import '../../../core/services/location_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../core/widgets/slide_to_action.dart';
import '../../ride/data/services/navigation_service.dart';
import '../../ride/data/models/ride_model.dart';
import '../../chat/chat_screen.dart';
import '../data/models/delivery_model.dart';
import 'delivery_trip_screen.dart';

/// Delivery pickup screen — navigate to sender, then collect package.
/// Mirrors RideAcceptedScreen but with delivery-specific UI.
class DeliveryPickupScreen extends ConsumerStatefulWidget {
  final Ride ride;
  final DeliveryRequest? deliveryRequest;

  const DeliveryPickupScreen({
    super.key,
    required this.ride,
    this.deliveryRequest,
  });

  @override
  ConsumerState<DeliveryPickupScreen> createState() => _DeliveryPickupScreenState();
}

enum _PickupPhase { navigating, arrived, collecting }

class _DeliveryPickupScreenState extends ConsumerState<DeliveryPickupScreen> {
  final Completer<GoogleMapController> _controller = Completer();
  final NavigationService _navService = NavigationService();
  final LocationService _locationService = LocationService();

  _PickupPhase _phase = _PickupPhase.navigating;
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  BitmapDescriptor? _driverIcon;
  StreamSubscription<Position>? _positionSubscription;

  // Waiting timer (5 min free, then paid)
  Timer? _waitingTimer;
  int _waitingSeconds = 0;
  static const int _freeWaitingLimit = 300; // 5 minutes

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
    _setupMapData();
    _startLocationStream();
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _locationService.stopPositionStream();
    _waitingTimer?.cancel();
    if (_controller.isCompleted) {
      _controller.future.then((c) => c.dispose());
    }
    super.dispose();
  }

  Future<void> _loadMapAssets() async {
    try {
      _driverIcon = await BitmapDescriptor.asset(
        const ImageConfiguration(size: Size(48, 48)),
        'assets/images/car move.png',
      );
      if (mounted) setState(() {});
    } catch (e) {
      debugPrint('DeliveryPickup: Error loading map assets: $e');
    }
  }

  void _setupMapData() async {
    final pickupLat = widget.ride.pickupLat;
    final pickupLng = widget.ride.pickupLng;

    Position? currentPosition;
    try {
      currentPosition = await Geolocator.getCurrentPosition();
    } catch (e) {
      debugPrint('Error getting current position: $e');
    }

    final driverLatLng = currentPosition != null
        ? LatLng(currentPosition.latitude, currentPosition.longitude)
        : LatLng(pickupLat, pickupLng);
    final pickupLatLng = LatLng(pickupLat, pickupLng);

    // Fetch route from driver → pickup
    try {
      final routeCoords = await _navService.getRoute(
        driverLatLng,
        pickupLatLng,
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
            markerId: const MarkerId('pickup'),
            position: pickupLatLng,
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
            infoWindow: InfoWindow(title: 'Pickup: ${widget.ride.pickupAddress}'),
          ),
        };
      });

      // Animate camera to show both markers
      final controller = await _controller.future;
      controller.animateCamera(
        CameraUpdate.newLatLngBounds(
          LatLngBounds(
            southwest: LatLng(
              driverLatLng.latitude < pickupLatLng.latitude
                  ? driverLatLng.latitude
                  : pickupLatLng.latitude,
              driverLatLng.longitude < pickupLatLng.longitude
                  ? driverLatLng.longitude
                  : pickupLatLng.longitude,
            ),
            northeast: LatLng(
              driverLatLng.latitude > pickupLatLng.latitude
                  ? driverLatLng.latitude
                  : pickupLatLng.latitude,
              driverLatLng.longitude > pickupLatLng.longitude
                  ? driverLatLng.longitude
                  : pickupLatLng.longitude,
            ),
          ),
          80,
        ),
      );
    }
  }

  void _startLocationStream() {
    _positionSubscription = _locationService.getPositionStream().listen(
      (position) {
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

  /// Driver arrived at pickup location.
  void _arrivedAtPickup() async {
    try {
      await ref.read(rideRiverpodProvider).updateStatus('arrived');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update status: $e')),
        );
      }
      return;
    }

    if (!mounted) return;

    setState(() {
      _phase = _PickupPhase.arrived;
    });

    // Start waiting timer
    _waitingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() => _waitingSeconds++);
      }
    });
  }

  /// Package collected — start trip to dropoff.
  void _packageCollected() async {
    _waitingTimer?.cancel();

    try {
      await ref.read(rideRiverpodProvider).updateStatus('in_progress');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start delivery: $e')),
        );
      }
      return;
    }

    if (!mounted) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => DeliveryTripScreen(
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
          'Are you sure you want to cancel this delivery? This may affect your acceptance rate.',
          style: TextStyle(color: AppColors.grey),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('No', style: TextStyle(color: AppColors.grey)),
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
            child: const Text('Yes, Cancel', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  void _openNavigation() async {
    final lat = widget.ride.pickupLat;
    final lng = widget.ride.pickupLng;
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

  void _callSender() async {
    final phone = widget.deliveryRequest?.senderPhone ??
        widget.ride.rider?.phone;
    if (phone == null || phone.isEmpty) return;
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  String _formatWaiting(int seconds) {
    final min = seconds ~/ 60;
    final sec = seconds % 60;
    return '${min.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final deliveryDetails = widget.deliveryRequest?.deliveryDetails;
    final currency = widget.deliveryRequest?.currency ?? widget.ride.pricing.currency;

    return Scaffold(
      body: Stack(
        children: [
          // Map
          GoogleMap(
            style: _darkMapStyle,
            initialCameraPosition: CameraPosition(
              target: LatLng(widget.ride.pickupLat, widget.ride.pickupLng),
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

          // Back / Cancel button
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

                      // Phase indicator
                      _buildPhaseHeader(),

                      const SizedBox(height: 12),

                      // Package info card
                      if (deliveryDetails != null)
                        _buildPackageInfoCard(deliveryDetails, currency),

                      const SizedBox(height: 12),

                      // Sender info & actions
                      _buildSenderActions(),

                      const SizedBox(height: 16),

                      // Action slider
                      _buildActionSlider(),
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

  Widget _buildPhaseHeader() {
    String title;
    String subtitle;
    IconData icon;
    Color color;

    switch (_phase) {
      case _PickupPhase.navigating:
        title = 'Navigate to Pickup';
        subtitle = widget.ride.pickupAddress;
        icon = Icons.navigation;
        color = Colors.orange;
        break;
      case _PickupPhase.arrived:
        title = 'Waiting for Package';
        subtitle = _waitingSeconds >= _freeWaitingLimit
            ? 'Paid waiting: ${_formatWaiting(_waitingSeconds - _freeWaitingLimit)}'
            : 'Free waiting: ${_formatWaiting(_waitingSeconds)} / 5:00';
        icon = Icons.hourglass_bottom;
        color = _waitingSeconds >= _freeWaitingLimit ? AppColors.error : Colors.orange;
        break;
      case _PickupPhase.collecting:
        title = 'Collecting Package';
        subtitle = 'Verify package contents before starting';
        icon = Icons.inventory;
        color = AppColors.primary;
        break;
    }

    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(color: Colors.grey[400], fontSize: 13),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        // Fare badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            CurrencyUtils.format(
              widget.ride.fare,
              currency: widget.deliveryRequest?.currency ?? widget.ride.pricing.currency,
            ),
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPackageInfoCard(DeliveryDetails details, String currency) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.inputBackground,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.inventory_2, color: Colors.orange, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  details.packageType.label,
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Row(
                  children: [
                    if (details.weightKg != null)
                      Text(
                        '${details.weightKg!.toStringAsFixed(1)} kg',
                        style: TextStyle(color: Colors.grey[400], fontSize: 12),
                      ),
                    if (details.weightKg != null && details.description != null)
                      Text(' • ', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                    if (details.description != null)
                      Expanded(
                        child: Text(
                          details.description!,
                          style: TextStyle(color: Colors.grey[400], fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          if (details.proofRequired != ProofRequirement.none)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    details.proofRequired == ProofRequirement.photo
                        ? Icons.camera_alt
                        : details.proofRequired == ProofRequirement.signature
                            ? Icons.draw
                            : Icons.verified,
                    color: AppColors.primary,
                    size: 14,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Proof',
                    style: TextStyle(color: AppColors.primary, fontSize: 11),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSenderActions() {
    final senderName = widget.deliveryRequest?.senderName ?? widget.ride.rider?.name ?? 'Sender';

    return Row(
      children: [
        // Avatar
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.orange[200],
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              senderName.isNotEmpty ? senderName[0].toUpperCase() : 'S',
              style: TextStyle(
                color: Colors.brown[800],
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                senderName,
                style: const TextStyle(color: AppColors.white, fontSize: 14, fontWeight: FontWeight.w600),
              ),
              const Text('Sender', style: TextStyle(color: AppColors.grey, fontSize: 12)),
            ],
          ),
        ),
        // Navigate button
        _actionButton(
          icon: Icons.navigation,
          color: Colors.orange,
          onTap: _openNavigation,
        ),
        const SizedBox(width: 8),
        // Call button
        _actionButton(
          icon: Icons.call,
          color: AppColors.success,
          onTap: _callSender,
        ),
        const SizedBox(width: 8),
        // Chat button
        _actionButton(
          icon: Icons.chat_bubble,
          color: AppColors.primary,
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ChatScreen(
                  rideId: widget.ride.id,
                  riderName: senderName,
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _actionButton({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
    );
  }

  Widget _buildActionSlider() {
    switch (_phase) {
      case _PickupPhase.navigating:
        return SlideToAction(
          text: 'Slide when arrived',
          outerColor: Colors.orange.withValues(alpha: 0.2),
          innerColor: Colors.orange,
          textColor: AppColors.white,
          onSlide: () async => _arrivedAtPickup(),
        );
      case _PickupPhase.arrived:
        return SlideToAction(
          text: 'Slide: Package Collected',
          outerColor: AppColors.primary.withValues(alpha: 0.2),
          innerColor: AppColors.primary,
          textColor: AppColors.white,
          onSlide: () async => _packageCollected(),
        );
      case _PickupPhase.collecting:
        return SlideToAction(
          text: 'Slide to Start Delivery',
          outerColor: AppColors.success.withValues(alpha: 0.2),
          innerColor: AppColors.success,
          textColor: AppColors.white,
          onSlide: () async => _packageCollected(),
        );
    }
  }
}
