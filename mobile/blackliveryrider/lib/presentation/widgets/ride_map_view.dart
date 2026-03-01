import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/theme/app_colors.dart';

/// Reusable Google Map widget for ride screens.
/// Shows pickup/dropoff markers and optionally a driver marker.
class RideMapView extends StatefulWidget {
  /// Pickup coordinates
  final LatLng? pickup;

  /// Dropoff coordinates
  final LatLng? dropoff;

  /// Driver location (updated in real-time)
  final LatLng? driverLocation;

  /// Whether to show route polyline between pickup and dropoff
  final bool showRoute;

  /// Optional polyline points for the route
  final List<LatLng>? routePoints;

  /// Map padding
  final EdgeInsets padding;

  const RideMapView({
    super.key,
    this.pickup,
    this.dropoff,
    this.driverLocation,
    this.showRoute = false,
    this.routePoints,
    this.padding = const EdgeInsets.all(60),
  });

  @override
  State<RideMapView> createState() => _RideMapViewState();
}

class _RideMapViewState extends State<RideMapView> {
  final Completer<GoogleMapController> _controller = Completer();

  Set<Marker> get _markers {
    final markers = <Marker>{};

    if (widget.pickup != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('pickup'),
          position: widget.pickup!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
          infoWindow: const InfoWindow(title: 'Pickup'),
        ),
      );
    }

    if (widget.dropoff != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('dropoff'),
          position: widget.dropoff!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: const InfoWindow(title: 'Dropoff'),
        ),
      );
    }

    if (widget.driverLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('driver'),
          position: widget.driverLocation!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueYellow),
          infoWindow: const InfoWindow(title: 'Driver'),
        ),
      );
    }

    return markers;
  }

  Set<Polyline> get _polylines {
    if (!widget.showRoute) return {};

    final points = widget.routePoints ?? [];
    if (points.isEmpty && widget.pickup != null && widget.dropoff != null) {
      // Simple straight line between pickup and dropoff if no route points
      return {
        Polyline(
          polylineId: const PolylineId('route'),
          points: [widget.pickup!, widget.dropoff!],
          color: AppColors.yellow90,
          width: 4,
        ),
      };
    }

    if (points.isNotEmpty) {
      return {
        Polyline(
          polylineId: const PolylineId('route'),
          points: points,
          color: AppColors.yellow90,
          width: 4,
        ),
      };
    }

    return {};
  }

  LatLng get _initialTarget {
    if (widget.driverLocation != null) return widget.driverLocation!;
    if (widget.pickup != null) return widget.pickup!;
    if (widget.dropoff != null) return widget.dropoff!;
    // Default to Chicago
    return const LatLng(41.8781, -87.6298);
  }

  @override
  void didUpdateWidget(covariant RideMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Animate camera when driver location updates
    if (widget.driverLocation != null &&
        widget.driverLocation != oldWidget.driverLocation) {
      _animateToDriver();
    }
  }

  Future<void> _animateToDriver() async {
    if (!_controller.isCompleted) return;
    final controller = await _controller.future;
    controller.animateCamera(
      CameraUpdate.newLatLng(widget.driverLocation!),
    );
  }

  Future<void> _fitBounds() async {
    if (!_controller.isCompleted) return;
    final controller = await _controller.future;

    final allPoints = <LatLng>[];
    if (widget.pickup != null) allPoints.add(widget.pickup!);
    if (widget.dropoff != null) allPoints.add(widget.dropoff!);
    if (widget.driverLocation != null) allPoints.add(widget.driverLocation!);

    if (allPoints.length < 2) return;

    double minLat = allPoints.first.latitude;
    double maxLat = allPoints.first.latitude;
    double minLng = allPoints.first.longitude;
    double maxLng = allPoints.first.longitude;

    for (final p in allPoints) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }

    controller.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat, minLng),
          northeast: LatLng(maxLat, maxLng),
        ),
        60,
      ),
    );
  }

  @override
  void dispose() {
    // Dispose GoogleMapController to free native resources
    if (_controller.isCompleted) {
      _controller.future.then((c) => c.dispose());
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: _initialTarget,
        zoom: 14,
      ),
      markers: _markers,
      polylines: _polylines,
      myLocationEnabled: false,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
      onMapCreated: (GoogleMapController controller) {
        _controller.complete(controller);
        // Fit bounds after creation
        Future.delayed(const Duration(milliseconds: 300), _fitBounds);
      },
      style: _darkMapStyle,
    );
  }
}

// Dark map style to match app theme
const String _darkMapStyle = '''[
  {"elementType":"geometry","stylers":[{"color":"#212121"}]},
  {"elementType":"labels.icon","stylers":[{"visibility":"off"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#212121"}]},
  {"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#757575"}]},
  {"featureType":"poi","elementType":"geometry","stylers":[{"color":"#181818"}]},
  {"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#2c2c2c"}]},
  {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#8a8a8a"}]},
  {"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#373737"}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#3c3c3c"}]},
  {"featureType":"transit","elementType":"geometry","stylers":[{"color":"#2f3948"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#000000"}]}
]''';
