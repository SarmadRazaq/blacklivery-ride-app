import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/models/saved_place_model.dart';
import '../../core/models/location_model.dart';
import '../../core/services/places_service.dart';
import '../../core/services/location_service.dart';
import 'map_picker_screen.dart';

class AddHomeScreen extends StatefulWidget {
  const AddHomeScreen({super.key});

  @override
  State<AddHomeScreen> createState() => _AddHomeScreenState();
}

class _AddHomeScreenState extends State<AddHomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  final PlacesService _placesService = PlacesService();
  final LocationService _locationService = LocationService();
  String _searchQuery = '';
  List<Location> _searchResults = [];
  bool _isSearching = false;
  bool _isFetchingLocation = false;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    final query = _searchController.text;
    if (query != _searchQuery) {
      setState(() => _searchQuery = query);
      _performSearch(query);
    }
  }

  Future<void> _performSearch(String query) async {
    if (query.isEmpty) {
      setState(() => _searchResults = []);
      return;
    }
    
    setState(() => _isSearching = true);
    try {
      final results = await _placesService.searchLocations(query);
      if (mounted) {
        setState(() {
          _searchResults = results;
          _isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSearching = false);
      }
    }
  }

  Future<void> _selectPlace(Location result) async {
    double lat = result.latitude;
    double lng = result.longitude;

    // Google Autocomplete results have 0,0 coords — resolve via Place Details
    if (lat == 0.0 && lng == 0.0 && result.id.isNotEmpty) {
      final details = await _placesService.getPlaceDetails(result.id);
      if (details != null) {
        lat = details.latitude;
        lng = details.longitude;
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not resolve address coordinates')),
          );
        }
        return;
      }
    }

    if (!mounted) return;

    final savedPlace = SavedPlace(
      id: 'home',
      name: 'Home',
      address: result.address,
      type: 'home',
      latitude: lat,
      longitude: lng,
    );
    Navigator.pop(context, savedPlace);
  }

  Future<void> _useCurrentLocation() async {
    setState(() => _isFetchingLocation = true);
    try {
      final position = await _locationService.getCurrentLocation();
      final placemark = await _locationService.getAddressFromCoordinates(
        position.latitude,
        position.longitude,
      );
      if (!mounted) return;

      String address = 'Current Location';
      if (placemark != null) {
        final parts = [
          placemark.street,
          placemark.locality,
          placemark.administrativeArea,
          placemark.postalCode,
        ].where((p) => p != null && p.isNotEmpty).toList();
        if (parts.isNotEmpty) address = parts.join(', ');
      }

      final savedPlace = SavedPlace(
        id: 'home',
        name: 'Home',
        address: address,
        type: 'home',
        latitude: position.latitude,
        longitude: position.longitude,
      );
      Navigator.pop(context, savedPlace);
    } catch (e) {
      if (mounted) {
        setState(() => _isFetchingLocation = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not get current location')),
        );
      }
    }
  }

  Future<void> _pickOnMap() async {
    final location = await Navigator.push<Location>(
      context,
      MaterialPageRoute(
        builder: (_) => const MapPickerScreen(title: 'Set Home Location'),
      ),
    );
    if (location != null && mounted) {
      final savedPlace = SavedPlace(
        id: 'home',
        name: 'Home',
        address: location.address,
        type: 'home',
        latitude: location.latitude,
        longitude: location.longitude,
      );
      Navigator.pop(context, savedPlace);
    }
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
        backgroundColor: AppColors.bgPri,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.inputBg,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.inputBorder),
            ),
            child: const Icon(
              Icons.chevron_left,
              color: Colors.white,
            ),
          ),
        ),
        title: Text(
          'Add Home',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(20),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.inputBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.inputBorder),
              ),
              child: Row(
                children: [
                  const SizedBox(width: 16),
                  Icon(
                    Icons.home_outlined,
                    color: AppColors.yellow90,
                    size: 22,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: AppTextStyles.body.copyWith(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Search an address',
                        hintStyle: AppTextStyles.body.copyWith(
                          color: AppColors.txtInactive,
                          fontSize: 14,
                        ),
                        border: InputBorder.none,
                        contentPadding:
                            const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Search results
          Expanded(
            child: _isSearching 
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: _searchResults.length + 2, // +2 for current location & map
                    itemBuilder: (context, index) {
                      if (index == _searchResults.length) {
                        return _buildCurrentLocationItem();
                      }
                      if (index == _searchResults.length + 1) {
                        return _buildMapPickerItem();
                      }
                      final result = _searchResults[index];
                      return _buildSearchResultItem(result);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResultItem(Location result) {
    return GestureDetector(
      onTap: () => _selectPlace(result),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.bgPri,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.location_on_outlined,
                color: AppColors.yellow90,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    result.name,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    result.address,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 12,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentLocationItem() {
    return GestureDetector(
      onTap: _isFetchingLocation ? null : _useCurrentLocation,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8, top: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            _isFetchingLocation
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.yellow90,
                    ),
                  )
                : Icon(
                    Icons.my_location,
                    color: AppColors.yellow90,
                    size: 20,
                  ),
            const SizedBox(width: 12),
            Text(
              _isFetchingLocation
                  ? 'Getting your location...'
                  : 'Use My Current Location',
              style: AppTextStyles.body.copyWith(
                color: AppColors.yellow90,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMapPickerItem() {
    return GestureDetector(
      onTap: _pickOnMap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              Icons.map_outlined,
              color: AppColors.yellow90,
              size: 20,
            ),
            const SizedBox(width: 12),
            Text(
              'Pick on Map',
              style: AppTextStyles.body.copyWith(
                color: AppColors.yellow90,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
