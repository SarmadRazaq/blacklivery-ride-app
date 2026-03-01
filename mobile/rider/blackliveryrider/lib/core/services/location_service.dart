import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
// import 'package:flutter_google_places_hoc081098/flutter_google_places_hoc081098.dart'; // Uncomment when used

class LocationService {
  StreamSubscription<Position>? _positionSubscription;
  final StreamController<Position> _locationController =
      StreamController<Position>.broadcast();

  /// Broadcast stream of position updates — subscribe to track rider location
  Stream<Position> get positionStream => _locationController.stream;

  // Get current device location (Real Data)
  Future<Position> getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    // Test if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationServiceDisabledException();
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw const PermissionDeniedException('Location permissions are denied');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw const PermissionDeniedException(
        'Location permissions are permanently denied, we cannot request permissions.',
      );
    }

    // When we reach here, permissions are granted and we can
    // continue accessing the position of the device.
    return await Geolocator.getCurrentPosition();
  }

  /// Start continuous location tracking (e.g., during an active ride).
  /// Updates every ~5 seconds with high accuracy.
  Future<void> startTracking({
    int distanceFilter = 10,
    LocationAccuracy accuracy = LocationAccuracy.high,
  }) async {
    // Ensure permissions first
    await getCurrentLocation();

    _positionSubscription?.cancel();
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: accuracy,
        distanceFilter: distanceFilter,
      ),
    ).listen(
      (position) {
        _locationController.add(position);
      },
      onError: (error) {
        debugPrint('LocationService: Tracking error: $error');
      },
    );
    debugPrint('LocationService: Tracking started (filter=${distanceFilter}m)');
  }

  /// Stop continuous location tracking.
  void stopTracking() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
    debugPrint('LocationService: Tracking stopped');
  }

  /// Clean up resources
  void dispose() {
    stopTracking();
    _locationController.close();
  }

  // Get address from coordinates (Reverse Geocoding)
  Future<Placemark?> getAddressFromCoordinates(double lat, double lng) async {
    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(lat, lng);
      if (placemarks.isNotEmpty) {
        return placemarks.first;
      }
    } catch (e) {
      debugPrint('LocationService: Error reverse geocoding ($lat, $lng): $e');
    }
    return null;
  }
}
