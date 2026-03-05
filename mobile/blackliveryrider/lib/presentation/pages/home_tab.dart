import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/models/driver_model.dart';
import '../../core/models/location_model.dart';
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

import '../../core/utils/region_geofence.dart';

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
  BitmapDescriptor? _carIcon;

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
    _ensureLocationPermission();
    _loadCarIcon();

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

  /// Load a custom car icon for driver markers on the map.
  Future<void> _loadCarIcon() async {
    try {
      _carIcon = await BitmapDescriptor.asset(
        const ImageConfiguration(size: Size(48, 48)),
        'assets/images/sedan_icon.png',
      );
      if (mounted) setState(() {});
    } catch (e) {
      debugPrint('Could not load car icon: $e');
    }
  }

  /// Keep requesting location permission via the native OS dialog until
  /// the user grants it. If permanently denied, opens App Settings.
  Future<void> _ensureLocationPermission() async {
    while (mounted) {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        _getCurrentLocation();
        return;
      }

      if (permission == LocationPermission.deniedForever) {
        await Geolocator.openAppSettings();
        await Future.delayed(const Duration(seconds: 1));
        continue;
      }

      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        _getCurrentLocation();
        return;
      }

      // Denied — brief pause then re-request
      await Future.delayed(const Duration(milliseconds: 500));
    }
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

        final gpsLat = position.latitude;
        final gpsLng = position.longitude;
        final regionProvider = context.read<RegionProvider>();

        // Check if GPS is within the user's *profile* region
        final gpsRegion = RegionGeofence.regionOf(gpsLat, gpsLng);
        final profileRegion = regionProvider.apiRegionKey; // 'nigeria' or 'chicago'

        if (gpsRegion == profileRegion) {
          // GPS matches profile region → use actual GPS position
          setState(() {
            _currentLocation = LatLng(gpsLat, gpsLng);
          });
        } else {
          // GPS is outside user's region (e.g. emulator) → default to region center
          setState(() {
            _currentLocation = regionProvider.isChicago
                ? const LatLng(41.8781, -87.6298)
                : const LatLng(6.5244, 3.3792);
          });
        }

        // Sync region into RideService (do NOT auto-switch region from GPS)
        if (mounted) {
          context.read<BookingState>().rideService.setRegion(regionProvider.apiRegionKey);
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

    // Driver markers — use car icon if loaded, fallback to orange pin
    for (var driver in drivers) {
      newMarkers.add(
        Marker(
          markerId: MarkerId(driver.id),
          position: LatLng(driver.latitude, driver.longitude),
          icon: _carIcon ?? BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueOrange,
          ),
          rotation: 0,
          anchor: const Offset(0.5, 0.5),
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
      // Delivery mode — pick locations first, then open delivery wizard
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const WhereToScreen(returnOnConfirm: true),
        ),
      ).then((confirmed) {
        if (confirmed == true && mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const DeliveryBookingScreen(),
            ),
          ).then((_) {
            if (mounted) {
              final bs = Provider.of<BookingState>(context, listen: false);
              if (bs.bookingStatus != 'searching_driver' && bs.bookingStatus != 'driver_assigned' && bs.bookingStatus != 'in_progress') {
                bs.resetBookingFlow();
              }
            }
          });
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

          // Bottom Content — draggable panel
          DraggableScrollableSheet(
            initialChildSize: 0.32,
            minChildSize: 0.18,
            maxChildSize: 0.65,
            snap: true,
            snapSizes: const [0.32, 0.65],
            builder: (context, scrollController) {
              return Container(
                decoration: BoxDecoration(
                  color: AppColors.bgPri,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 12,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  children: [
                    // Drag Handle
                    Center(
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 10),
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.inputBorder,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),

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
                        const SizedBox(width: 8),
                        _buildBookingTypeChip(
                          icon: Icons.local_shipping,
                          label: 'Delivery',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const WhereToScreen(returnOnConfirm: true),
                            ),
                          ).then((confirmed) {
                            if (confirmed == true && mounted) {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const DeliveryBookingScreen(),
                                ),
                              );
                            }
                          }),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

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

                    const SizedBox(height: 14),

                    // Saved Places shortcuts (Home/Work)
                    Consumer<BookingState>(
                      builder: (context, bookingState, child) {
                        final places = bookingState.savedPlaces;
                        if (places.isEmpty) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: places.take(3).map((place) {
                                final icon = place.type == 'home'
                                    ? Icons.home_outlined
                                    : place.type == 'work'
                                        ? Icons.work_outline
                                        : Icons.place_outlined;
                                return Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: GestureDetector(
                                    onTap: () {
                                      final location = Location(
                                        id: place.id,
                                        name: place.name,
                                        address: place.address,
                                        latitude: place.latitude,
                                        longitude: place.longitude,
                                      );
                                      bookingState.setDropoffLocation(location);
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => const WhereToScreen(),
                                        ),
                                      );
                                    },
                                    child: Container(
                                      constraints: const BoxConstraints(maxWidth: 180),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 14,
                                        vertical: 8,
                                      ),
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
                                          Flexible(
                                            child: Text(
                                              place.name,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w500,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                              maxLines: 1,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        );
                      },
                    ),

                    // Recent Locations (max 3 visible on home screen)
                    Consumer<BookingState>(
                      builder: (context, bookingState, child) {
                        // De-duplicate by name+address on the client side as well
                        final seen = <String>{};
                        final unique = bookingState.recentLocations.where((loc) {
                          final key = '${loc.name}|${loc.address}';
                          if (seen.contains(key)) return false;
                          seen.add(key);
                          return true;
                        }).take(3).toList(); // Limit to 3 on home

                        if (unique.isEmpty) {
                          return const SizedBox.shrink();
                        }

                        return Column(
                          mainAxisSize: MainAxisSize.min,
                          children: unique.map((location) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8.0),
                              child: RecentLocationCard(
                                title: location.name,
                                subtitle: location.address,
                                distance: '',
                                onTap: () {
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
              );
            },
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
