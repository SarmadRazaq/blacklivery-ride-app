import 'dart:async';
import 'dart:io';
import 'package:geolocator/geolocator.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  StreamController<Position>? _streamController;
  StreamSubscription<Position>? _positionSubscription;

  /// Check permissions and get current position
  Future<Position?> getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    // Test if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      // Location services are not enabled don't continue
      // accessing the position and request users of the
      // App to enable the location services.
      return null;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        // Permissions are denied, next time you could try
        // requesting permissions again (this is also where
        // Android's shouldShowRequestPermissionRationale
        // returned true. According to Android guidelines
        // your App should show an explanatory UI now.
        return null;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      // Permissions are denied forever, handle appropriately.
      return null;
    }

    // When we reach here, permissions are granted and we can
    // continue accessing the position of the device.
    return await Geolocator.getCurrentPosition();
  }

  /// Returns a broadcast stream of periodic location updates with background
  /// support. The underlying OS location stream is started on first call and
  /// kept alive as long as there are listeners or until [stopPositionStream]
  /// is explicitly called.
  ///
  /// Always call [stopPositionStream] in the widget's dispose() to release the
  /// OS location stream when location updates are no longer needed.
  Stream<Position> getPositionStream() {
    if (_streamController == null || _streamController!.isClosed) {
      _streamController = StreamController<Position>.broadcast();

      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: _buildLocationSettings(),
      ).listen(
        (position) {
          if (_streamController != null && !_streamController!.isClosed) {
            _streamController!.add(position);
          }
        },
        onError: (Object e, StackTrace st) {
          if (_streamController != null && !_streamController!.isClosed) {
            _streamController!.addError(e, st);
          }
        },
        onDone: () {
          _streamController?.close();
          _streamController = null;
          _positionSubscription = null;
        },
        cancelOnError: false,
      );
    }
    return _streamController!.stream;
  }

  /// Cancels the underlying OS location stream and closes the broadcast
  /// controller. Call this from the screen's dispose() method once location
  /// updates are no longer needed (e.g. ride ended, driver went offline).
  Future<void> stopPositionStream() async {
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    await _streamController?.close();
    _streamController = null;
  }

  LocationSettings _buildLocationSettings() {
    if (Platform.isAndroid) {
      return AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
        forceLocationManager: false,
        intervalDuration: const Duration(seconds: 5),
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'BlackLivery Driver',
          notificationText: 'Tracking your location for active ride',
          notificationIcon: AndroidResource(
            name: 'ic_launcher',
            defType: 'mipmap',
          ),
          enableWakeLock: true,
        ),
      );
    } else if (Platform.isIOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
        activityType: ActivityType.automotiveNavigation,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
        allowBackgroundLocationUpdates: true,
      );
    } else {
      return const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      );
    }
  }

  /// Calculate distance between two points in meters
  double getDistanceBetween(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }
}
