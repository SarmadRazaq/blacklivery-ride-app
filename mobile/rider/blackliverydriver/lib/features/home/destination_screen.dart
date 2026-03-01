import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/theme/app_theme.dart';
import 'providers/driver_preferences_provider.dart';

class DestinationScreen extends StatefulWidget {
  const DestinationScreen({super.key});

  @override
  State<DestinationScreen> createState() => _DestinationScreenState();
}

class _DestinationScreenState extends State<DestinationScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, String>> _searchResults = [];
  bool _isSearching = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.trim().length < 3) {
      setState(() => _searchResults = []);
      return;
    }

    setState(() => _isSearching = true);
    try {
      final locations = await locationFromAddress(query);
      final results = <Map<String, String>>[];

      for (final loc in locations.take(5)) {
        final placemarks = await placemarkFromCoordinates(
          loc.latitude,
          loc.longitude,
        );
        if (placemarks.isNotEmpty) {
          final pm = placemarks.first;
          final name = pm.name ?? pm.street ?? 'Unknown';
          final address = [
            pm.street,
            pm.locality,
            pm.administrativeArea,
            pm.country,
          ].where((s) => s != null && s.isNotEmpty).join(', ');
          results.add({'name': name, 'address': address});
        }
      }

      setState(() => _searchResults = results);
    } catch (e) {
      debugPrint('Search error: $e');
      setState(() => _searchResults = []);
    } finally {
      setState(() => _isSearching = false);
    }
  }

  Future<void> _useCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      if (placemarks.isNotEmpty && mounted) {
        final pm = placemarks.first;
        final name = pm.name ?? pm.street ?? 'Current Location';
        final address = [
          pm.street,
          pm.locality,
          pm.administrativeArea,
        ].where((s) => s != null && s.isNotEmpty).join(', ');

        final prefs = context.read<DriverPreferencesProvider>();
        await prefs.setDestination(name, address);

        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Destination set: $name')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not get current location')),
        );
      }
    }
  }

  void _setAsHome(DriverPreferencesProvider prefs) async {
    if (prefs.hasActiveDestination) {
      await prefs.setHomeAddress(
        '${prefs.destinationName}, ${prefs.destinationAddress}',
      );
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Home address updated')));
      }
    }
  }

  void _setAsWork(DriverPreferencesProvider prefs) async {
    if (prefs.hasActiveDestination) {
      await prefs.setWorkAddress(
        '${prefs.destinationName}, ${prefs.destinationAddress}',
      );
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Work address updated')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final prefs = context.watch<DriverPreferencesProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back, color: AppColors.white),
        ),
        title: const Text(
          'Set Destination',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          if (prefs.hasActiveDestination)
            TextButton(
              onPressed: () => prefs.clearDestination(),
              child: const Text(
                'Clear',
                style: TextStyle(color: AppColors.primary),
              ),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: AppColors.primary, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Set a destination to get ride requests heading your way.',
                      style: TextStyle(color: AppColors.primary, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Search field
            Container(
              decoration: BoxDecoration(
                color: AppColors.cardBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
              ),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(color: AppColors.white, fontSize: 15),
                onChanged: _search,
                decoration: InputDecoration(
                  hintText: 'Search destination...',
                  hintStyle: TextStyle(color: Colors.grey[600]),
                  prefixIcon: const Icon(
                    Icons.search,
                    color: AppColors.grey,
                    size: 22,
                  ),
                  suffixIcon: _isSearching
                      ? const Padding(
                          padding: EdgeInsets.all(14),
                          child: SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.primary,
                            ),
                          ),
                        )
                      : _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(
                            Icons.clear,
                            color: AppColors.grey,
                            size: 20,
                          ),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchResults = []);
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                ),
              ),
            ),

            // Search results
            if (_searchResults.isNotEmpty) ...[
              const SizedBox(height: 12),
              ...List.generate(_searchResults.length, (index) {
                final result = _searchResults[index];
                return _buildPlaceItem(
                  icon: Icons.location_on_outlined,
                  name: result['name'] ?? '',
                  address: result['address'] ?? '',
                  isActive: prefs.destinationName == result['name'],
                  onTap: () {
                    prefs.setDestination(result['name'], result['address']);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Destination set: ${result['name']}'),
                      ),
                    );
                  },
                );
              }),
            ],

            const SizedBox(height: 8),

            // Use current location
            GestureDetector(
              onTap: _useCurrentLocation,
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.cardBackground,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.06),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.my_location,
                        color: Colors.blue,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Use Current Location',
                            style: TextStyle(
                              color: AppColors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Set your current position as destination',
                            style: TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      color: Colors.grey[600],
                      size: 20,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Saved Places
            const Text(
              'Saved Places',
              style: TextStyle(
                color: AppColors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            _buildPlaceItem(
              icon: Icons.home_rounded,
              name: 'Home',
              address: prefs.homeAddress ?? 'Tap to set home address',
              isActive: prefs.destinationName == 'Home',
              onTap: () {
                if (prefs.homeAddress != null) {
                  prefs.setDestination('Home', prefs.homeAddress!);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Destination set to Home')),
                  );
                } else {
                  _setAsHome(prefs);
                }
              },
            ),
            _buildPlaceItem(
              icon: Icons.work_rounded,
              name: 'Work',
              address: prefs.workAddress ?? 'Tap to set work address',
              isActive: prefs.destinationName == 'Work',
              onTap: () {
                if (prefs.workAddress != null) {
                  prefs.setDestination('Work', prefs.workAddress!);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Destination set to Work')),
                  );
                } else {
                  _setAsWork(prefs);
                }
              },
            ),

            // Active destination indicator
            if (prefs.hasActiveDestination) ...[
              const SizedBox(height: 28),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.navigation_rounded,
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
                            'Active Destination',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${prefs.destinationName} — ${prefs.destinationAddress}',
                            style: TextStyle(
                              color: AppColors.primary.withValues(alpha: 0.7),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.check_circle,
                      color: AppColors.primary,
                      size: 24,
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceItem({
    required IconData icon,
    required String name,
    required String address,
    required VoidCallback onTap,
    bool isActive = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isActive
              ? AppColors.primary.withValues(alpha: 0.1)
              : AppColors.cardBackground,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isActive
                ? AppColors.primary.withValues(alpha: 0.3)
                : Colors.white.withValues(alpha: 0.06),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      color: AppColors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    address,
                    style: TextStyle(color: Colors.grey[500], fontSize: 12),
                  ),
                ],
              ),
            ),
            Icon(
              isActive ? Icons.check_circle : Icons.chevron_right,
              color: isActive ? AppColors.primary : Colors.grey[600],
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
