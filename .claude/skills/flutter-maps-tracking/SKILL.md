---
name: flutter-maps-tracking
description: >
  Blacklivery real-time maps and location tracking guide. Use before writing any code
  involving: Google Maps display, driver location broadcasting, rider tracking a driver,
  live trip screen, geolocation queries, ETA calculation, route drawing, surge zone overlays,
  background location services, or the driver going online/offline. This is the most complex
  part of the app — always read this skill before attempting any maps or tracking feature.
---

# Blacklivery Maps & Real-time Tracking

## CURRENT: How Driver Location Reaches the Rider App

Driver location is currently delivered via **Socket.IO**, not Firebase Realtime DB:

```
Driver app → HTTP POST /api/v1/driver/heartbeat (every 30s)
           → WebSocket emit 'location_update' (same 30s timer)
                    ↓
            Backend Socket.IO server
                    ↓
           Broadcasts to rider's socket room
                    ↓
Rider app SocketService receives 'driver:location' event
                    ↓
           BookingState.updateDriverLocation()
                    ↓
           RideInProgressScreen rebuilds marker
```

Listen for driver location in rider app:
```dart
// SocketService in rider app
_socket.on('driver:location', (data) {
  final location = DriverLocation(
    lat: data['latitude'],
    lng: data['longitude'],
    heading: (data['heading'] ?? 0).toDouble(),
  );
  _onDriverLocationUpdate?.call(location);
});
```

The Firebase Realtime DB patterns below describe the **planned architecture** for when RTDB replaces Socket.IO for location (lower latency, offline tolerance).

## Required Packages (currently in pubspec.yaml)
```yaml
google_maps_flutter: ^2.10.0   # rider & driver apps
geolocator: ^10.1.0            # rider; driver uses ^13.0.2
geocoding: ^4.0.0              # reverse geocoding
socket_io_client: ^3.1.4       # real-time location (current)
# firebase_database — add when migrating to RTDB location
```

## API Keys Setup

### Android — AndroidManifest.xml
```xml
<application>
  <meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="${GOOGLE_MAPS_KEY}"/>
</application>
```

### iOS — AppDelegate.swift
```swift
GMSServices.provideAPIKey("YOUR_MAPS_KEY")
```

### Required Google APIs to Enable
- Maps SDK for Android / iOS
- Places API
- Directions API
- Distance Matrix API
- Geocoding API

## Google Maps Widget (Rider Home Screen)
```dart
class RiderMapWidget extends StatefulWidget {
  final DriverLocation? driverLocation;
  final LatLng? destination;

  const RiderMapWidget({super.key, this.driverLocation, this.destination});
}

class _RiderMapWidgetState extends State<RiderMapWidget> {
  GoogleMapController? _controller;
  final Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: const CameraPosition(
        target: LatLng(6.5244, 3.3792), // Lagos default
        zoom: 14,
      ),
      myLocationEnabled: true,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      markers: _markers,
      polylines: _polylines,
      onMapCreated: (controller) => _controller = controller,
    );
  }

  // Call this when driverLocation updates
  void updateDriverMarker(DriverLocation location) {
    setState(() {
      _markers.removeWhere((m) => m.markerId.value == 'driver');
      _markers.add(Marker(
        markerId: const MarkerId('driver'),
        position: LatLng(location.lat, location.lng),
        icon: _driverIcon!, // Custom car icon
        rotation: location.heading,
        flat: true, // Rotates with map
      ));
    });
    // Smooth camera pan
    _controller?.animateCamera(CameraUpdate.newLatLng(
      LatLng(location.lat, location.lng),
    ));
  }

  // Draw route between two points
  Future<void> drawRoute(LatLng origin, LatLng destination) async {
    final points = await DirectionsService.getPolyline(origin, destination);
    setState(() {
      _polylines.add(Polyline(
        polylineId: const PolylineId('route'),
        points: points,
        color: AppColors.primary,
        width: 4,
      ));
    });
  }
}
```

## Real-time Driver Location (Current: Socket.IO stream)

```dart
// In RideInProgressScreen (rider app) — wrap map in listener
@override
void initState() {
  super.initState();
  final socket = SocketService();
  socket.listenToDriverLocation((location) {
    if (mounted) {
      setState(() => _driverLocation = location);
      _updateDriverMarker(location);
    }
  });
}

void _updateDriverMarker(DriverLocation location) {
  final newMarker = Marker(
    markerId: const MarkerId('driver'),
    position: LatLng(location.lat, location.lng),
    icon: _driverIcon!,
    rotation: location.heading,
    flat: true,
  );
  setState(() {
    _markers.removeWhere((m) => m.markerId.value == 'driver');
    _markers.add(newMarker);
  });
  _mapController?.animateCamera(
    CameraUpdate.newLatLng(LatLng(location.lat, location.lng)),
  );
}
```

**Planned RTDB StreamBuilder** (for clean-arch datasource — when RTDB replaces Socket.IO):
```dart
StreamBuilder<DriverLocation>(
  stream: _locationDatasource.watchDriverLocation(trip.driverId),
  builder: (context, snapshot) {
    if (!snapshot.hasData) return const LoadingMap();
    _updateDriverMarker(snapshot.data!);
    return _mapWidget;
  },
)
```

## Driver Location Broadcasting (Current: geolocator + foreground config)

The driver app uses `geolocator` with `ForegroundNotificationConfig` (no `flutter_foreground_task`):

```dart
// Current driver app — LocationService
final locationSettings = AndroidSettings(
  accuracy: LocationAccuracy.high,
  distanceFilter: 10,
  forceLocationManager: false,
  foregroundNotificationConfig: const ForegroundNotificationConfig(
    notificationText: 'Blacklivery Driver is using your location',
    notificationTitle: 'Location Active',
    enableWakeLock: true,
  ),
);
_positionStream = Geolocator.getPositionStream(
  locationSettings: locationSettings,
).listen(_onLocationUpdate);
```

### iOS — Background Modes in Info.plist
```xml
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
</array>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Blacklivery needs your location to show you to riders.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Blacklivery needs your location in the background while you drive.</string>
```

## Geolocation Permissions Handler
```dart
Future<bool> requestLocationPermission() async {
  LocationPermission permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.deniedForever) {
    // Open app settings
    await Geolocator.openAppSettings();
    return false;
  }
  return permission == LocationPermission.always ||
         permission == LocationPermission.whileInUse;
}
```

## ETA Calculation (Distance Matrix API)
```dart
@injectable
class DirectionsService {
  static const _baseUrl = 'https://maps.googleapis.com/maps/api';

  Future<ETAResult> getETA(LatLng origin, LatLng destination) async {
    final response = await _dio.get('$_baseUrl/distancematrix/json', queryParameters: {
      'origins': '${origin.latitude},${origin.longitude}',
      'destinations': '${destination.latitude},${destination.longitude}',
      'key': Env.googleMapsKey,
      'traffic_model': 'best_guess',
      'departure_time': 'now',
    });

    final element = response.data['rows'][0]['elements'][0];
    return ETAResult(
      distanceMeters: element['distance']['value'] as int,
      durationSeconds: element['duration_in_traffic']['value'] as int,
    );
  }

  // Returns decoded LatLng list for polyline drawing
  static Future<List<LatLng>> getPolyline(LatLng origin, LatLng dest) async {
    final response = await Dio().get('$_baseUrl/directions/json', queryParameters: {
      'origin': '${origin.latitude},${origin.longitude}',
      'destination': '${dest.latitude},${dest.longitude}',
      'key': Env.googleMapsKey,
    });
    final encoded = response.data['routes'][0]['overview_polyline']['points'];
    return _decodePolyline(encoded);
  }
}
```

## Google Places Autocomplete (Where To? Search)
```dart
GooglePlaceAutoCompleteTextField(
  textEditingController: _searchController,
  googleAPIKey: Env.googleMapsKey,
  inputDecoration: const InputDecoration(
    hintText: 'Where to?',
  ),
  countries: ['ng', 'us'], // Nigeria + USA only
  isLatLngRequired: true,
  getPlaceDetailWithLatLng: (prediction) {
    final destination = LatLng(
      double.parse(prediction.lat!),
      double.parse(prediction.lng!),
    );
    context.read<BookingBloc>().add(DestinationSelected(
      address: prediction.description!,
      location: destination,
    ));
  },
)
```

## Nearest Driver Query (GeoQuery)
```dart
// Find drivers within radiusKm of pickup point
Future<List<DriverEntity>> getNearestDrivers({
  required LatLng pickup,
  required VehicleClass vehicleClass,
  double radiusKm = 5.0,
}) async {
  // Use geohash bounding box query on Firestore
  // OR query Realtime DB driverLocations and filter client-side
  final snapshot = await _rtdb.ref('driverLocations')
    .orderByChild('isOnline')
    .equalTo(true)
    .get();

  final drivers = <DriverEntity>[];
  for (final child in snapshot.children) {
    final data = Map<String, dynamic>.from(child.value as Map);
    final driverLat = data['lat'] as double;
    final driverLng = data['lng'] as double;
    final distance = Geolocator.distanceBetween(
      pickup.latitude, pickup.longitude, driverLat, driverLng,
    ) / 1000; // Convert to km

    if (distance <= radiusKm && data['vehicleClass'] == vehicleClass.name) {
      drivers.add(DriverEntity(
        id: child.key!,
        distanceKm: distance,
        location: LatLng(driverLat, driverLng),
      ));
    }
  }

  drivers.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
  return drivers.take(5).toList(); // Top 5 nearest
}
```

## Trip State → Map UI Mapping
```dart
// What to show on map per trip state
switch (tripStatus) {
  case TripStatus.matched:
  case TripStatus.enRoute:
    // Show driver moving toward pickup
    // Draw route from driver to pickup
    showDriverMarker = true;
    showRoute = true; // driver → pickup
    break;
  case TripStatus.arrived:
    // Show driver at pickup location, animate pin drop
    showArrivalBanner = true;
    break;
  case TripStatus.inProgress:
    // Show driver moving toward destination
    // Draw route from current to dropoff
    showRoute = true; // driver → dropoff
    break;
  case TripStatus.completed:
    router.push('/trip-summary/${trip.id}');
    break;
}
```

## Custom Map Markers (load once, cache)
```dart
Future<void> loadMarkerIcons() async {
  _driverIcon = await BitmapDescriptor.fromAssetImage(
    const ImageConfiguration(size: Size(48, 48)),
    'assets/icons/car_marker.png',
  );
  _pickupIcon = await BitmapDescriptor.fromAssetImage(
    const ImageConfiguration(size: Size(40, 40)),
    'assets/icons/pickup_marker.png',
  );
}
```

## Key Rules
1. Use Realtime DB (not Firestore) for driver location — much faster & cheaper
2. Load custom marker icons once in initState, cache them
3. Use flat: true on driver marker so it rotates correctly
4. Always request "always" location permission for driver app
5. Android driver app MUST use a foreground service for background location
6. Dispose GoogleMapController in dispose() to prevent memory leaks
7. Limit Places Autocomplete to ['ng', 'us'] to reduce irrelevant results
8. Use distancematrix API with traffic for ETA, not just directions
