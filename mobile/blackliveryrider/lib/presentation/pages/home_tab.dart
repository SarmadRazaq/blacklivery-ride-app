import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/models/driver_model.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/region_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../widgets/service_toggle.dart';
import '../widgets/recent_location_card.dart';
import 'where_to_screen.dart';
import 'pickup_time_sheet.dart';
import 'hourly_booking_screen.dart';
import 'airport_booking_screen.dart';
import 'delivery_booking_screen.dart';
import 'account_screen.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  final Completer<GoogleMapController> _mapController = Completer();
  int _selectedServiceIndex = 0; // 0 = Book a ride, 1 = Send Parcel

  // Default location (Lagos, Nigeria)
  static const LatLng _defaultLocation = LatLng(6.5244, 3.3792);
  LatLng _currentLocation = _defaultLocation;
  Set<Marker> _markers = {};

  // Custom Dark Map Style
  static const String _darkMapStyle = '''[
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

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();

    // Listen to changes in booking state to update markers
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final bookingState = Provider.of<BookingState>(context, listen: false);
      bookingState.addListener(_updateMarkersFromState);
    });

    // Initialize booking state (load recent locations, etc.)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final bookingState = Provider.of<BookingState>(context, listen: false);
      bookingState.initialize();
      bookingState.useCurrentLocation(); // Pre-fetch location
    });
  }

  @override
  void dispose() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    bookingState.removeListener(_updateMarkersFromState);
    // Dispose GoogleMapController to free native resources
    if (_mapController.isCompleted) {
      _mapController.future.then((c) => c.dispose());
    }
    super.dispose();
  }

  void _updateMarkersFromState() {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    _updateDriverMarkers(bookingState.nearbyDrivers);
  }

  Future<void> _getCurrentLocation() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
        );

        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
        });

        // Auto-detect region from GPS coordinates
        if (mounted) {
          final regionProvider = context.read<RegionProvider>();
          regionProvider.detectFromLocation(position.latitude, position.longitude);
          // Sync into RideService
          BookingState().rideService.setRegion(regionProvider.apiRegionKey);
        }

        final GoogleMapController controller = await _mapController.future;
        controller.animateCamera(CameraUpdate.newLatLng(_currentLocation));
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
    }
  }

  void _updateDriverMarkers(List<Driver> drivers) {
    Set<Marker> newMarkers = {};

    // User marker
    newMarkers.add(
      Marker(
        markerId: const MarkerId('user'),
        position: _currentLocation,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueYellow),
      ),
    );

    // Driver markers
    for (var driver in drivers) {
      newMarkers.add(
        Marker(
          markerId: MarkerId(driver.id),
          position: LatLng(driver.latitude, driver.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueOrange,
          ),
          rotation: 0, // Could add heading if available
          infoWindow: InfoWindow(
            title: driver.name,
            snippet: '${driver.carModel} • ${driver.rating}★',
          ),
        ),
      );
    }

    setState(() {
      _markers = newMarkers;
    });
  }

  void _onSearchTap() {
    if (_selectedServiceIndex == 1) {
      // Delivery mode
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const DeliveryBookingScreen()),
      ).then((_) {
        // Reset stale booking state when returning from booking flow
        if (mounted) {
          final bs = Provider.of<BookingState>(context, listen: false);
          if (bs.bookingStatus != 'searching_driver' && bs.bookingStatus != 'driver_assigned' && bs.bookingStatus != 'in_progress') {
            bs.resetBookingFlow();
          }
        }
      });
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const WhereToScreen()),
      ).then((_) {
        // Reset stale booking state when returning from booking flow
        if (mounted) {
          final bs = Provider.of<BookingState>(context, listen: false);
          if (bs.bookingStatus != 'searching_driver' && bs.bookingStatus != 'driver_assigned' && bs.bookingStatus != 'in_progress') {
            bs.resetBookingFlow();
          }
        }
      });
    }
  }

  void _showPickupTimeSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => const PickupTimeSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: Stack(
        children: [
          // Google Map
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _currentLocation,
              zoom: 15,
            ),
            onMapCreated: (GoogleMapController controller) {
              _mapController.complete(controller);
              controller.setMapStyle(_darkMapStyle);
            },
            markers: _markers,
            myLocationEnabled: false,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            compassEnabled: false,
          ),

          // Top Bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Menu Button → Account screen
                  _buildCircleButton(
                    icon: Icons.menu,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const AccountScreen(),
                        ),
                      );
                    },
                  ),
                  // Profile Avatar → Account screen
                  GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const AccountScreen(),
                        ),
                      );
                    },
                    child: Builder(
                      builder: (ctx) {
                        final user = ctx.read<AuthProvider>().user;
                        final profileImage = user?.profileImage;
                        return Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.yellow90,
                              width: 2,
                            ),
                          ),
                          child: ClipOval(
                            child: profileImage != null
                                ? Image.network(
                                    profileImage,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.person,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.person,
                                    color: Colors.white,
                                  ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Content
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(
                20,
                20,
                20,
                20,
              ), // Added bottom padding since nav bar is gone
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    AppColors.bgPri.withOpacity(0.8),
                    AppColors.bgPri,
                  ],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Service Toggle
                  ServiceToggle(
                    selectedIndex: _selectedServiceIndex,
                    onChanged: (index) {
                      setState(() {
                        _selectedServiceIndex = index;
                      });
                    },
                  ),

                  const SizedBox(height: 12),

                  // Booking type shortcuts
                  Row(
                    children: [
                      _buildBookingTypeChip(
                        icon: Icons.access_time,
                        label: 'Hourly',
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const HourlyBookingScreen(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _buildBookingTypeChip(
                        icon: Icons.flight,
                        label: 'Airport',
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const AirportBookingScreen(),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Search Bar
                  GestureDetector(
                    onTap: _onSearchTap,
                    child: Container(
                      height: 52,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.inputBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.inputBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.search,
                            color: AppColors.txtInactive,
                            size: 22,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Where to?',
                              style: AppTextStyles.inputHint,
                            ),
                          ),
                          // Time Badge
                          GestureDetector(
                            onTap: _showPickupTimeSheet,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.bgPri,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: AppColors.inputBorder,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.access_time,
                                    color: Colors.white,
                                    size: 14,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Now',
                                    style: AppTextStyles.caption.copyWith(
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(
                                    Icons.keyboard_arrow_down,
                                    color: Colors.white,
                                    size: 16,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Recent Locations
                  Consumer<BookingState>(
                    builder: (context, bookingState, child) {
                      if (bookingState.recentLocations.isEmpty) {
                        return const SizedBox.shrink();
                      }
                      return Column(
                        children: bookingState.recentLocations.map((location) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8.0),
                            child: RecentLocationCard(
                              title: location.name,
                              subtitle: location.address,
                              distance:
                                  '', // Calculate if needed, or leave empty
                              onTap: () {
                                // Handle location selection
                                bookingState.setDropoffLocation(location);
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const WhereToScreen(),
                                  ),
                                );
                              },
                            ),
                          );
                        }).toList(),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCircleButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.bgPri,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Icon(icon, color: Colors.white, size: 22),
      ),
    );
  }

  Widget _buildBookingTypeChip({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppColors.yellow90, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
