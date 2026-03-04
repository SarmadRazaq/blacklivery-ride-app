import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/models/location_model.dart';
import '../../core/services/location_service.dart';
import '../../core/utils/region_geofence.dart';
import '../../core/providers/region_provider.dart';
import '../widgets/custom_button.dart';

class MapPickerScreen extends StatefulWidget {
  final LatLng? initialLocation;
  final String title;

  const MapPickerScreen({
    super.key,
    this.initialLocation,
    this.title = 'Set Location',
  });

  @override
  State<MapPickerScreen> createState() => _MapPickerScreenState();
}

const String _darkMapStyle = '''[
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
]''';

class _MapPickerScreenState extends State<MapPickerScreen> {
  GoogleMapController? _mapController;
  LatLng _selectedLocation = const LatLng(0, 0);
  String _selectedAddress = 'Move pin to select location';
  bool _isLoading = true;
  bool _isLoadingAddress = false;

  @override
  void initState() {
    super.initState();
    _initializeLocation();
  }

  Future<void> _initializeLocation() async {
    if (widget.initialLocation != null) {
      setState(() {
        _selectedLocation = widget.initialLocation!;
        _isLoading = false;
      });
      _getAddressFromLatLng(_selectedLocation);
    } else {
      await _getCurrentLocation();
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      ).timeout(const Duration(seconds: 10));

      if (!mounted) return;

      // If GPS position is outside service area, default to region center
      final gpsLat = position.latitude;
      final gpsLng = position.longitude;
      if (RegionGeofence.isSupported(gpsLat, gpsLng)) {
        setState(() {
          _selectedLocation = LatLng(gpsLat, gpsLng);
          _isLoading = false;
        });
      } else {
        setState(() {
          _selectedLocation = _regionCenter();
          _isLoading = false;
        });
      }

      _getAddressFromLatLng(_selectedLocation);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _selectedLocation = _regionCenter();
        _isLoading = false;
      });
      _getAddressFromLatLng(_selectedLocation);
    }
  }

  /// Returns the center of the user's selected region (Chicago or Lagos).
  LatLng _regionCenter() {
    try {
      final region = Provider.of<RegionProvider>(context, listen: false);
      if (region.isChicago) {
        return const LatLng(41.8781, -87.6298); // Downtown Chicago
      }
    } catch (_) {}
    return const LatLng(6.5244, 3.3792); // Lagos fallback
  }

  final LocationService _locationService = LocationService();

  Future<void> _getAddressFromLatLng(LatLng latLng) async {
    setState(() => _isLoadingAddress = true);

    try {
      final placemark = await _locationService.getAddressFromCoordinates(
        latLng.latitude,
        latLng.longitude,
      );
      if (placemark != null && mounted) {
        final parts = [
          placemark.street,
          placemark.locality,
          placemark.administrativeArea,
          placemark.postalCode,
        ].where((p) => p != null && p.isNotEmpty).toList();
        setState(() {
          _selectedAddress = parts.isNotEmpty
              ? parts.join(', ')
              : '${latLng.latitude.toStringAsFixed(6)}, ${latLng.longitude.toStringAsFixed(6)}';
          _isLoadingAddress = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _selectedAddress =
              '${latLng.latitude.toStringAsFixed(6)}, ${latLng.longitude.toStringAsFixed(6)}';
          _isLoadingAddress = false;
        });
      }
    }
  }

  void _onCameraMove(CameraPosition position) {
    _selectedLocation = position.target;
  }

  void _onCameraIdle() {
    _getAddressFromLatLng(_selectedLocation);
  }

  void _confirmLocation() {
    final location = Location(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: 'Selected Location',
      latitude: _selectedLocation.latitude,
      longitude: _selectedLocation.longitude,
      address: _selectedAddress,
    );
    Navigator.pop(context, location);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.yellow90),
            )
          : Stack(
              children: [
                // Google Map
                GoogleMap(
                  initialCameraPosition: CameraPosition(
                    target: _selectedLocation,
                    zoom: 15,
                  ),
                  onMapCreated: (controller) {
                    _mapController = controller;
                    controller.setMapStyle(_darkMapStyle);
                  },
                  onCameraMove: _onCameraMove,
                  onCameraIdle: _onCameraIdle,
                  myLocationEnabled: true,
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                  mapToolbarEnabled: false,
                ),

                // Center pin
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 40),
                    child: Icon(
                      Icons.location_pin,
                      color: AppColors.yellow90,
                      size: 50,
                    ),
                  ),
                ),

                // Top bar with back button
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.bgPri,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.inputBorder),
                            ),
                            child: const Icon(
                              Icons.chevron_left,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Text(
                          widget.title,
                          style: AppTextStyles.heading3.copyWith(fontSize: 18),
                        ),
                      ],
                    ),
                  ),
                ),

                // My location button
                Positioned(
                  right: 16,
                  bottom: 200,
                  child: GestureDetector(
                    onTap: () async {
                      await _getCurrentLocation();
                      _mapController?.animateCamera(
                        CameraUpdate.newLatLng(_selectedLocation),
                      );
                    },
                    child: Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: AppColors.bgPri,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.inputBorder),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.my_location,
                        color: AppColors.yellow90,
                      ),
                    ),
                  ),
                ),

                // Bottom card with address and confirm button
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.bgPri,
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(24),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 10,
                          offset: const Offset(0, -5),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Selected Location',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.txtInactive,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(
                              Icons.location_on,
                              color: AppColors.yellow90,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _isLoadingAddress
                                  ? const SizedBox(
                                      height: 16,
                                      width: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: AppColors.yellow90,
                                      ),
                                    )
                                  : Text(
                                      _selectedAddress,
                                      style: AppTextStyles.body.copyWith(
                                        color: Colors.white,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        CustomButton.main(
                          text: 'Confirm Location',
                          onTap: _confirmLocation,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
}
