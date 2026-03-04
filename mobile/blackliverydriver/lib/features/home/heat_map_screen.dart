import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import 'providers/driver_preferences_provider.dart';
import '../auth/data/services/driver_service.dart';

class HeatMapScreen extends StatefulWidget {
  const HeatMapScreen({super.key});

  @override
  State<HeatMapScreen> createState() => _HeatMapScreenState();
}

class _HeatMapScreenState extends State<HeatMapScreen> {
  final Completer<GoogleMapController> _controller = Completer();
  final DriverService _driverService = DriverService();
  String _selectedFilter = 'All';
  Set<Circle> _demandCircles = {};
  bool _isLoadingZones = false;
  bool _hasLoadedOnce = false;
  bool _hasError = false;

  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(41.8781, -87.6298),
    zoom: 13.0,
  );

  static const String _darkMapStyle = '''
[
  {"elementType": "geometry", "stylers": [{"color": "#212121"}]},
  {"elementType": "labels.icon", "stylers": [{"visibility": "off"}]},
  {"elementType": "labels.text.fill", "stylers": [{"color": "#757575"}]},
  {"elementType": "labels.text.stroke", "stylers": [{"color": "#212121"}]},
  {"featureType": "road", "elementType": "geometry.fill", "stylers": [{"color": "#2c2c2c"}]},
  {"featureType": "road.arterial", "elementType": "geometry", "stylers": [{"color": "#373737"}]},
  {"featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#3c3c3c"}]},
  {"featureType": "water", "elementType": "geometry", "stylers": [{"color": "#000000"}]}
]
''';

  final List<String> _filters = ['All', 'Rides', 'Deliveries', 'Surge'];

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _loadDemandZones(); // Always fetch demand data, even if location fails
  }

  Future<void> _getCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      final controller = await _controller.future;
      controller.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: LatLng(position.latitude, position.longitude),
            zoom: 13.0,
          ),
        ),
      );
    } catch (_) {
      // Location may fail but map still renders via myLocationEnabled
    }
  }

  Future<void> _loadDemandZones() async {
    setState(() => _isLoadingZones = true);

    final prefs = context.read<DriverPreferencesProvider>();

    try {
      final zones = await _driverService.getDemandZones(filter: _selectedFilter);
      final circles = <Circle>{};

      for (final raw in zones) {
        final zone = raw as Map<String, dynamic>;
        final type = (zone['type'] ?? 'Rides').toString();
        final intensity = (zone['intensity'] as num?)?.toDouble() ?? 0.3;
        final lat = (zone['lat'] as num?)?.toDouble();
        final lng = (zone['lng'] as num?)?.toDouble();
        if (lat == null || lng == null) continue;

        // Apply filter
        if (_selectedFilter != 'All' && _selectedFilter != type) continue;

        // Apply preferences
        if (type == 'Rides' && !prefs.acceptRides) continue;
        if (type == 'Deliveries' && !prefs.acceptDeliveries) continue;

        // Choose color based on type
        Color zoneColor;
        switch (type) {
          case 'Surge':
            zoneColor = Colors.red;
            break;
          case 'Deliveries':
            zoneColor = Colors.blue;
            break;
          default:
            zoneColor = Colors.orange;
        }

        circles.add(
          Circle(
            circleId: CircleId((zone['id'] ?? '${lat}_$lng').toString()),
            center: LatLng(lat, lng),
            radius: (zone['radiusMeters'] as num?)?.toDouble() ?? (300 + intensity * 350),
            fillColor: zoneColor.withValues(alpha: (0.12 + intensity * 0.25).clamp(0.12, 0.45)),
            strokeColor: zoneColor.withValues(alpha: (0.25 + intensity * 0.35).clamp(0.25, 0.7)),
            strokeWidth: 1,
          ),
        );
      }

      if (!mounted) return;
      setState(() {
        _demandCircles = circles;
        _hasError = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _hasError = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to load demand zones')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingZones = false;
          _hasLoadedOnce = true;
        });
      }
    }
  }

  void _onFilterChanged(String filter) {
    setState(() => _selectedFilter = filter);
    _loadDemandZones();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Map with demand circles
          GoogleMap(
            mapType: MapType.normal,
            initialCameraPosition: _initialPosition,
            style: _darkMapStyle,
            onMapCreated: (controller) {
              if (!_controller.isCompleted) _controller.complete(controller);
            },
            circles: _demandCircles,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            compassEnabled: false,
          ),

          // Top bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.cardBackground,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.arrow_back,
                          color: AppColors.white,
                          size: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Demand Heat Map',
                      style: TextStyle(
                        color: AppColors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    // Refresh button
                    IconButton(
                      onPressed: () {
                        _getCurrentLocation();
                        _loadDemandZones();
                      },
                      icon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.cardBackground,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.refresh,
                          color: AppColors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Filter chips
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(top: 64, left: 16, right: 16),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _filters.map((filter) {
                      final isSelected = _selectedFilter == filter;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => _onFilterChanged(filter),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primary
                                  : AppColors.cardBackground,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primary
                                    : Colors.white.withValues(alpha: 0.1),
                              ),
                            ),
                            child: Text(
                              filter,
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.black
                                    : AppColors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
          ),

          // Bottom info card
          Positioned(
            left: 16,
            right: 16,
            bottom: 32,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.cardBackground,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.local_fire_department,
                          color: AppColors.primary,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Demand Zones',
                              style: TextStyle(
                                color: AppColors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _isLoadingZones
                                ? 'Syncing live demand...'
                                : _hasError
                                  ? 'Tap refresh to retry'
                                  : !_hasLoadedOnce
                                    ? 'Loading demand data...'
                                    : _demandCircles.isEmpty
                                      ? 'No active demand zones nearby'
                                      : '${_demandCircles.length} active zones nearby',
                              style: const TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Legend
                  Row(
                    children: [
                      _buildLegendItem(Colors.orange, 'Rides'),
                      const SizedBox(width: 8),
                      _buildLegendItem(Colors.blue, 'Deliveries'),
                      const SizedBox(width: 8),
                      _buildLegendItem(Colors.red, 'Surge'),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
