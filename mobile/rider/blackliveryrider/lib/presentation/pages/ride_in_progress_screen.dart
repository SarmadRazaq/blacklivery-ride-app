import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import 'package:provider/provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/services/navigation_service.dart';
import '../../core/providers/region_provider.dart';
import '../widgets/custom_button.dart';

import 'ride_completed_screen.dart';
import '../../core/services/payment_service.dart';
import 'payment_webview_screen.dart';

class RideInProgressScreen extends StatefulWidget {
  /// Optional [rideId] injected from a deep link (e.g. blacklivery://ride/abc123).
  /// When provided the screen can use it to re-fetch ride state from the backend.
  final String? rideId;

  const RideInProgressScreen({super.key, this.rideId});

  @override
  State<RideInProgressScreen> createState() => _RideInProgressScreenState();
}

class _RideInProgressScreenState extends State<RideInProgressScreen> {
  int _minutesRemaining = 15;
  Timer? _timer;
  final Completer<GoogleMapController> _mapController = Completer();
  final NavigationService _navigationService = NavigationService();
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  bool _isInitiatingPayment = false;

  // Dark map style
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
    _startTrip();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _setupMap();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    // Dispose GoogleMapController to free native resources
    if (_mapController.isCompleted) {
      _mapController.future.then((c) => c.dispose());
    }
    super.dispose();
  }

  void _startTrip() {
    // Refresh ETA from Directions API every 30 seconds instead of artificial countdown
    _timer = Timer.periodic(const Duration(seconds: 30), (timer) {
      _refreshEta();
    });
  }

  Future<void> _refreshEta() async {
    try {
      final bookingState = Provider.of<BookingState>(context, listen: false);
      final dropoff = bookingState.dropoffLocation;
      final driver = bookingState.assignedDriver;
      if (dropoff == null) return;

      // Use driver's current position if available, otherwise use pickup
      LatLng origin;
      if (driver != null && driver.latitude != 0 && driver.longitude != 0) {
        origin = LatLng(driver.latitude, driver.longitude);
      } else {
        final pickup = bookingState.pickupLocation;
        if (pickup == null) return;
        origin = LatLng(pickup.latitude, pickup.longitude);
      }

      final destination = LatLng(dropoff.latitude, dropoff.longitude);
      final routeData = await _navigationService.getRoute(origin, destination);
      if (routeData['status'] == 'OK' && mounted) {
        final routes = routeData['routes'] as List;
        if (routes.isNotEmpty) {
          final leg = routes[0]['legs'][0];
          final durationSeconds = leg['duration']['value'] as int;
          final etaMinutes = (durationSeconds / 60).ceil();
          setState(() {
            _minutesRemaining = etaMinutes < 1 ? 1 : etaMinutes;
          });
        }
      }
    } catch (e) {
      debugPrint('Failed to refresh ETA: $e');
    }
  }

  Future<void> _setupMap() async {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final pickup = bookingState.pickupLocation;
    final dropoff = bookingState.dropoffLocation;
    final driver = bookingState.assignedDriver;

    if (pickup == null || dropoff == null) return;

    final pickupLatLng = LatLng(pickup.latitude, pickup.longitude);
    final dropoffLatLng = LatLng(dropoff.latitude, dropoff.longitude);

    _markers = {
      Marker(
        markerId: const MarkerId('pickup'),
        position: pickupLatLng,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: InfoWindow(title: 'Pickup', snippet: pickup.address),
      ),
      Marker(
        markerId: const MarkerId('dropoff'),
        position: dropoffLatLng,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: InfoWindow(title: 'Dropoff', snippet: dropoff.address),
      ),
    };

    // Add driver marker if available
    if (driver != null && driver.latitude != 0 && driver.longitude != 0) {
      _markers.add(
        Marker(
          markerId: const MarkerId('driver'),
          position: LatLng(driver.latitude, driver.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
          infoWindow: InfoWindow(title: driver.name),
        ),
      );
    }

    // Start with straight line, then fetch real route
    _polylines = {
      Polyline(
        polylineId: const PolylineId('route'),
        points: [pickupLatLng, dropoffLatLng],
        color: AppColors.yellow90,
        width: 4,
        patterns: [PatternItem.dash(20), PatternItem.gap(10)],
      ),
    };

    setState(() {});

    // Fetch real route polyline from Directions API
    try {
      final routeData = await _navigationService.getRoute(pickupLatLng, dropoffLatLng);
      if (routeData['status'] == 'OK' && mounted) {
        final routes = routeData['routes'] as List;
        if (routes.isNotEmpty) {
          final encodedPolyline = routes[0]['overview_polyline']['points'] as String;
          final decodedPoints = _navigationService.decodePolyline(encodedPolyline);

          // Update ETA from Directions API
          final leg = routes[0]['legs'][0];
          final durationSeconds = leg['duration']['value'] as int;
          final etaMinutes = (durationSeconds / 60).ceil();

          setState(() {
            _minutesRemaining = etaMinutes;
            _polylines = {
              Polyline(
                polylineId: const PolylineId('route'),
                points: decodedPoints,
                color: AppColors.yellow90,
                width: 4,
              ),
            };
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching route: $e');
    }

    // Fit camera to bounds
    _fitMapToBounds(pickupLatLng, dropoffLatLng);
  }

  Future<void> _fitMapToBounds(LatLng pickup, LatLng dropoff) async {
    if (!_mapController.isCompleted) return;
    final controller = await _mapController.future;
    final bounds = LatLngBounds(
      southwest: LatLng(
        pickup.latitude < dropoff.latitude ? pickup.latitude : dropoff.latitude,
        pickup.longitude < dropoff.longitude ? pickup.longitude : dropoff.longitude,
      ),
      northeast: LatLng(
        pickup.latitude > dropoff.latitude ? pickup.latitude : dropoff.latitude,
        pickup.longitude > dropoff.longitude ? pickup.longitude : dropoff.longitude,
      ),
    );
    controller.animateCamera(CameraUpdate.newLatLngBounds(bounds, 60));
  }

  void _shareRide() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final pickup = bookingState.pickupLocation?.name ?? 'Pickup';
    final dropoff = bookingState.dropoffLocation?.name ?? 'Dropoff';
    final driver = bookingState.assignedDriver;

    final shareText = 'I\'m on a BlackLivery ride!\n'
        'From: $pickup\n'
        'To: $dropoff\n'
        '${driver != null ? 'Driver: ${driver.name} • ${driver.licensePlate}\n' : ''}'
        'ETA: $_minutesRemaining min';

    Share.share(shareText);
  }

  void _emergencyCall() {
    // Region-aware emergency number: 112 for Nigeria, 911 for US
    final region = Provider.of<RegionProvider>(context, listen: false);
    final emergencyNumber = region.isNigeria ? '112' : '911';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.bgSec,
        title: Text('Emergency', style: AppTextStyles.heading3),
        content: Text(
          'Do you want to call emergency services?',
          style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: AppTextStyles.body),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              final uri = Uri(scheme: 'tel', path: emergencyNumber);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri);
              }
            },
            child: Text(
              'Call $emergencyNumber',
              style: AppTextStyles.body.copyWith(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _completeRide() async {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final paymentMethod = bookingState.paymentMethod;
    final rideId = bookingState.currentBooking?.id;
    final amount = bookingState.currentBooking?.estimatedPrice ?? 0;

    // Card payment: redirect to payment gateway WebView
    if (paymentMethod == 'card' && rideId != null && amount > 0) {
      setState(() => _isInitiatingPayment = true);
      try {
        final paymentData = await PaymentService().initiatePayment(
          amount: amount,
          rideId: rideId,
          purpose: 'ride',
        );

        if (!mounted) return;
        setState(() => _isInitiatingPayment = false);

        // Backend normalizes all providers to 'authorizationUrl'
        final authUrl = paymentData?['authorizationUrl'] as String? ??
            paymentData?['authorization_url'] as String?;
        final reference = paymentData?['reference'] as String?;

        if (authUrl != null && authUrl.isNotEmpty) {
          await Navigator.push<PaymentWebViewResult>(
            context,
            MaterialPageRoute(
              builder: (_) => PaymentWebViewScreen(
                authorizationUrl: authUrl,
                reference: reference,
                title: 'Pay for Ride',
              ),
            ),
          );
        }
      } catch (e) {
        debugPrint('Payment initiation error: $e');
        if (!mounted) return;
        setState(() => _isInitiatingPayment = false);
      }
    }

    // Wallet payment: instant debit from rider's on-platform balance — no WebView needed
    if (paymentMethod == 'wallet' && rideId != null && amount > 0) {
      setState(() => _isInitiatingPayment = true);
      try {
        await PaymentService().chargeRideWithWallet(
          rideId: rideId,
          amount: amount,
        );
      } catch (e) {
        debugPrint('Wallet charge error: $e');
        if (!mounted) return;
        setState(() => _isInitiatingPayment = false);
        // Show error but still proceed — driver has completed the ride.
        // The backend will retry settlement via webhook / manual reconciliation.
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Wallet payment failed: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
      }
      if (mounted) setState(() => _isInitiatingPayment = false);
    }

    if (!mounted) return;
    // Ride completion is driven by the driver via socket event (ride:completed).
    // The rider app does not call the complete API — backend only allows
    // drivers/admins to transition rides to 'completed'.
    bookingState.updateBookingStatus('completed');
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const RideCompletedScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingState = Provider.of<BookingState>(context);
    final driver = bookingState.assignedDriver;
    final booking = bookingState.currentBooking;

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: SafeArea(
        child: Column(
          children: [
            // Live Google Map showing route
            Expanded(
              flex: 2,
              child: Stack(
                children: [
                  GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: _markers.isNotEmpty
                          ? _markers.first.position
                          : const LatLng(6.5244, 3.3792),
                      zoom: 14,
                    ),
                    onMapCreated: (controller) {
                      if (!_mapController.isCompleted) {
                        _mapController.complete(controller);
                        controller.setMapStyle(_darkMapStyle);
                      }
                    },
                    markers: _markers,
                    polylines: _polylines,
                    myLocationEnabled: true,
                    myLocationButtonEnabled: false,
                    zoomControlsEnabled: false,
                    mapToolbarEnabled: false,
                  ),
                    // Share button
                    Positioned(
                      top: 16,
                      right: 16,
                      child: GestureDetector(
                        onTap: _shareRide,
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppColors.bgPri,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.inputBorder),
                          ),
                          child: const Icon(
                            Icons.share,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                    // Emergency button
                    Positioned(
                      top: 16,
                      left: 16,
                      child: GestureDetector(
                        onTap: _emergencyCall,
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.2),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Colors.red.withOpacity(0.5),
                            ),
                          ),
                          child: const Icon(
                            Icons.emergency,
                            color: Colors.red,
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
            ),

            // Trip info
            Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // ETA bar
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.access_time,
                          color: AppColors.yellow90,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Estimated arrival',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.txtInactive,
                                ),
                              ),
                              Text(
                                '$_minutesRemaining min remaining',
                                style: AppTextStyles.body.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '${booking?.distanceKm.toStringAsFixed(1) ?? '0'} ${Provider.of<RegionProvider>(context, listen: false).isNigeria ? 'km' : 'mi'}',
                          style: AppTextStyles.body.copyWith(
                            color: AppColors.yellow90,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Route summary
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Column(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: AppColors.yellow90,
                                borderRadius: BorderRadius.circular(5),
                              ),
                            ),
                            Container(
                              width: 2,
                              height: 24,
                              color: AppColors.inputBorder,
                            ),
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: Colors.red,
                                borderRadius: BorderRadius.circular(5),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                bookingState.pickupLocation?.name ?? 'Pickup',
                                style: AppTextStyles.body.copyWith(
                                  color: Colors.white,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                bookingState.dropoffLocation?.name ?? 'Dropoff',
                                style: AppTextStyles.body.copyWith(
                                  color: Colors.white,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Driver info
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.yellow90,
                              width: 2,
                            ),
                          ),
                          child: const Icon(Icons.person, color: Colors.white),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                driver?.name ?? 'Driver',
                                style: AppTextStyles.body.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                '${driver?.carModel ?? ''} • ${driver?.licensePlate ?? ''}',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.txtInactive,
                                ),
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: () async {
                            final phone = driver?.phone;
                            if (phone != null && phone.isNotEmpty) {
                              final uri = Uri(scheme: 'tel', path: phone);
                              if (await canLaunchUrl(uri)) {
                                await launchUrl(uri);
                              }
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Driver phone number not available')),
                              );
                            }
                          },
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.bgPri,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.phone,
                              color: Colors.white,
                              size: 18,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Complete ride button
                  _isInitiatingPayment
                      ? const Center(
                          child: CircularProgressIndicator(
                            color: AppColors.yellow90,
                          ),
                        )
                      : CustomButton.main(
                          text: 'Complete Ride',
                          onTap: _completeRide,
                        ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
