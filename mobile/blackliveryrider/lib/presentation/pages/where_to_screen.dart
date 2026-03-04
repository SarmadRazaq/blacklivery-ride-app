import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/models/location_model.dart';
import '../../core/models/saved_place_model.dart';
import 'package:provider/provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/services/places_service.dart';
import '../../core/providers/region_provider.dart';
import '../../core/utils/region_geofence.dart';
import '../../core/utils/currency_utils.dart';
import '../widgets/recent_location_card.dart';
import 'pickup_time_sheet.dart';
import 'select_ride_screen.dart';
import 'saved_places_screen.dart';
import 'map_picker_screen.dart';

class WhereToScreen extends StatefulWidget {
  const WhereToScreen({super.key});

  @override
  State<WhereToScreen> createState() => _WhereToScreenState();
}

class _WhereToScreenState extends State<WhereToScreen> {
  final TextEditingController _pickupController = TextEditingController();
  final TextEditingController _dropoffController = TextEditingController();
  final FocusNode _pickupFocus = FocusNode();
  final FocusNode _dropoffFocus = FocusNode();

  // final BookingState _bookingState = BookingState(); // Removed local instance

  late BookingState _bookingState;
  final PlacesService _placesService = PlacesService();

  String _selectedTime = 'Pickup Now';
  String _selectedFor = 'For Me';
  String? _recipientName;
  String? _recipientPhone;
  bool _isPickupFocused = false;
  bool _isDropoffFocused = false;
  bool _suppressSearch = false;

  List<Location> _searchResults = [];

  @override
  void initState() {
    super.initState();

    // Initialize booking state immediately to avoid LateInitializationError
    _bookingState = Provider.of<BookingState>(context, listen: false);

    // Initialize after build for async operations
    WidgetsBinding.instance.addPostFrameCallback((_) async {

      // If location is not yet set, fetch it
      if (_bookingState.currentLocation.name == 'Loading...' ||
          _bookingState.currentLocation.name == 'Current Location') {
        // 'Current Location' is the default name set in useCurrentLocation before reverse geocoding fully completes or if manual
        // Actually checking if it's "Loading..." or we just want to refresh.
        // Let's await it.
        await _bookingState.useCurrentLocation();
      }

      if (mounted) {
        setState(() {
          final pickup = _bookingState.pickupLocation ?? _bookingState.currentLocation;
          // Prefer address for better readability, fall back to name
          final displayName = (pickup.address.isNotEmpty && pickup.name == 'Current Location')
              ? pickup.address
              : pickup.name;
          _pickupController.text = displayName.isNotEmpty ? displayName : '';
          _dropoffController.text = _bookingState.dropoffLocation?.name ?? '';
          _searchResults = _bookingState.recentLocations;
        });
        if (_bookingState.pickupLocation != null && _bookingState.dropoffLocation != null) {
          _checkAndNavigateToRideSelection();
        }
      }
    });

    _pickupFocus.addListener(() {
      setState(() {
        _isPickupFocused = _pickupFocus.hasFocus;
        if (_pickupFocus.hasFocus) {
          _searchResults = _bookingState.recentLocations;
        }
      });
    });

    _dropoffFocus.addListener(() {
      setState(() {
        _isDropoffFocused = _dropoffFocus.hasFocus;
        if (_dropoffFocus.hasFocus) {
          _searchResults = _bookingState.recentLocations;
        }
      });
    });

    _pickupController.addListener(_onPickupSearchChanged);
    _dropoffController.addListener(_onDropoffSearchChanged);
  }

  void _onPickupSearchChanged() async {
    if (_suppressSearch) return;
    if (_isPickupFocused) {
      final results = await _bookingState.searchLocations(
        _pickupController.text,
      );
      if (mounted) {
        setState(() {
          _searchResults = results;
        });
      }
    }
  }

  void _onDropoffSearchChanged() async {
    if (_suppressSearch) return;
    if (_isDropoffFocused) {
      final results = await _bookingState.searchLocations(
        _dropoffController.text,
      );
      if (mounted) {
        setState(() {
          _searchResults = results;
        });
      }
    }
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _dropoffController.dispose();
    _pickupFocus.dispose();
    _dropoffFocus.dispose();
    super.dispose();
  }

  void _showPickupTimeSheet() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => PickupTimeSheet(
        initialDateTime: _bookingState.scheduledTime,
        initialIsNow: _bookingState.isPickupNow,
      ),
    );

    if (result != null) {
      setState(() {
        _selectedTime = result['displayText'] as String;
        _bookingState.setScheduledTime(
          result['dateTime'] as DateTime,
          isNow: result['isNow'] as bool,
        );
      });
    }
  }

  void _showForMeOptions() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgPri,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => _ForMeBottomSheet(
        selectedFor: _selectedFor,
        recipientName: _recipientName,
        recipientPhone: _recipientPhone,
        onSelect: (value, name, phone) {
          setState(() {
            _selectedFor = value;
            _recipientName = name;
            _recipientPhone = phone;
            _bookingState.setForSomeoneElse(
              value != 'For Me',
              name: name,
              phone: phone,
            );
          });
        },
      ),
    );
  }

  void _selectLocation(Location location) async {
    // If the location has no coordinates (e.g. from Google Autocomplete), resolve them.
    // Only attempt Place Details if the id looks like a Google Place ID (starts with
    // "ChIJ" or "Eh" etc.), not a Firestore document ID from saved places.
    Location resolved = location;
    if (location.latitude == 0.0 && location.longitude == 0.0 && location.id.isNotEmpty) {
      final isGooglePlaceId = location.id.startsWith('ChIJ') ||
          location.id.startsWith('Eh') ||
          location.id.startsWith('Gm') ||
          location.id.length > 20;

      if (isGooglePlaceId) {
        final details = await _placesService.getPlaceDetails(location.id);
        if (details != null) {
          resolved = Location(
            id: details.id,
            name: location.name.isNotEmpty ? location.name : details.name,
            address: location.address.isNotEmpty ? location.address : details.address,
            latitude: details.latitude,
            longitude: details.longitude,
          );
        } else {
          // Place Details resolution failed — don't proceed with 0,0 coordinates
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Could not resolve location. Try picking on the map instead.'),
                backgroundColor: Colors.orange.shade700,
                behavior: SnackBarBehavior.floating,
                action: SnackBarAction(
                  label: 'Map',
                  textColor: Colors.white,
                  onPressed: () => _pickLocationOnMap(isPickup: _isPickupFocused),
                ),
              ),
            );
          }
          return;
        }
      } else {
        // Saved place with 0,0 coords and non-Google ID — can't resolve
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('This saved place has no coordinates. Please update it.'),
              backgroundColor: Colors.orange.shade700,
              behavior: SnackBarBehavior.floating,
              action: SnackBarAction(
                label: 'Map',
                textColor: Colors.white,
                onPressed: () => _pickLocationOnMap(isPickup: _isPickupFocused),
              ),
            ),
          );
        }
        return;
      }
    }

    if (!mounted) return;

    // Suppress search listeners while programmatically setting text
    _suppressSearch = true;

    // Use address for display (name may be "Home"/"Work" which triggers search)
    final displayText = resolved.address.isNotEmpty ? resolved.address : resolved.name;

    if (_isPickupFocused) {
      _pickupController.text = displayText;
      _bookingState.setPickupLocation(resolved);
      _pickupFocus.unfocus();
      // Auto focus dropoff
      Future.delayed(const Duration(milliseconds: 100), () {
        _dropoffFocus.requestFocus();
      });
    } else {
      _dropoffController.text = displayText;
      _bookingState.setDropoffLocation(resolved);
      _bookingState.addToRecentLocations(resolved);
      _dropoffFocus.unfocus();

      // If both locations are set, navigate to ride selection
      _checkAndNavigateToRideSelection();
    }

    _suppressSearch = false;

    setState(() {
      _searchResults = _bookingState.recentLocations;
    });
  }

  Future<void> _useCurrentLocation() async {
    // Show loading state immediately
    _pickupController.text = 'Getting location...';
    _pickupFocus.unfocus();

    await _bookingState.useCurrentLocation();

    if (mounted) {
      // Now currentLocation has the resolved address
      final loc = _bookingState.currentLocation;
      final displayName = (loc.address.isNotEmpty && loc.address != 'Enter Pickup Location')
          ? loc.address
          : loc.name;
      _pickupController.text = displayName;

      Future.delayed(const Duration(milliseconds: 100), () {
        if (mounted) _dropoffFocus.requestFocus();
      });
    }
  }

  void _openSavedPlaces() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SavedPlacesScreen(
          onPlaceSelected: (place) {
            final location = Location(
              id: place.id,
              name: place.name,
              address: place.address,
              latitude: place.latitude,
              longitude: place.longitude,
            );
            _selectLocation(location);
          },
        ),
      ),
    );
    // Reload saved places so newly added ones appear inline
    _bookingState.loadSavedPlaces();
  }

  void _checkAndNavigateToRideSelection() {
    if (_bookingState.canSelectRide) {
      final pickup = _bookingState.pickupLocation;
      final dropoff = _bookingState.dropoffLocation;

      if (pickup != null && dropoff != null) {
        // Determine which supported region each location is in
        final pickupRegion =
            RegionGeofence.regionOf(pickup.latitude, pickup.longitude);
        final dropoffRegion =
            RegionGeofence.regionOf(dropoff.latitude, dropoff.longitude);

        // Block if pickup is outside all supported regions
        if (pickupRegion == null) {
          _showRegionError(
            'Pickup location is outside our service area. '
            'We currently operate in ${RegionGeofence.label(RegionGeofence.chicago)} '
            'and ${RegionGeofence.label(RegionGeofence.nigeria)}.',
          );
          return;
        }

        // Block if dropoff is outside all supported regions
        if (dropoffRegion == null) {
          _showRegionError(
            'Dropoff location is outside our service area. '
            'We currently operate in ${RegionGeofence.label(RegionGeofence.chicago)} '
            'and ${RegionGeofence.label(RegionGeofence.nigeria)}.',
          );
          return;
        }

        // Block cross-region (e.g. Nigeria → Chicago)
        if (pickupRegion != dropoffRegion) {
          _showRegionError('Cross-region rides are not supported.');
          return;
        }

        // Temporarily switch region context so fare estimates, ride options,
        // and currency all match the RIDE's coordinates (not the user profile).
        final regionProvider =
            Provider.of<RegionProvider>(context, listen: false);
        final rideRegionCode = pickupRegion == RegionGeofence.chicago
            ? RegionCode.usChi
            : RegionCode.ng;
        final rideApiKey = pickupRegion == RegionGeofence.chicago
            ? 'chicago'
            : 'nigeria';
        final rideCurrency = pickupRegion == RegionGeofence.chicago
            ? 'USD'
            : 'NGN';

        // Sync ride service region & currency so estimates use correct pricing
        _bookingState.rideService.setRegion(rideApiKey);
        CurrencyUtils.activeCurrency = rideCurrency;

        // If the user's profile region differs, update provider so ride
        // options (vehicle categories) and payment gateways match the ride.
        if (regionProvider.code != rideRegionCode) {
          regionProvider.setRegion(rideRegionCode);
        }
      }

      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const SelectRideScreen()),
      );
    }
  }

  void _showRegionError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            _buildHeader(),

            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 16,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Quick Options
                    _buildQuickOptions(),

                    const SizedBox(height: 24),

                    // Search Results / Recent Locations
                    ..._searchResults.map(
                      (location) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: RecentLocationCard(
                          title: location.name,
                          subtitle: location.address,
                          showClock: true,
                          onTap: () => _selectLocation(location),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      decoration: const BoxDecoration(
        color: AppColors.bgSec,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Top row
          Row(
            children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: const Icon(
                  Icons.chevron_left,
                  color: Colors.white,
                  size: 28,
                ),
              ),
              const SizedBox(width: 12),
              Text('Where to?', style: AppTextStyles.heading3),
              const Spacer(),
              // Time pill
              GestureDetector(
                onTap: _showPickupTimeSheet,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.inputBg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.inputBorder),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _selectedTime.length > 12
                            ? '${_selectedTime.substring(0, 12)}...'
                            : _selectedTime,
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.white,
                          fontSize: 11,
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
              const SizedBox(width: 8),
              // For Me pill
              Flexible(
                child: GestureDetector(
                  onTap: _showForMeOptions,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _selectedFor == 'For Someone Else'
                          ? AppColors.yellow90.withOpacity(0.15)
                          : AppColors.inputBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _selectedFor == 'For Someone Else'
                            ? AppColors.yellow90
                            : AppColors.inputBorder,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            _selectedFor == 'For Someone Else'
                                ? (_recipientName != null && _recipientName!.isNotEmpty
                                    ? 'For ${_recipientName!.length > 6 ? '${_recipientName!.substring(0, 6)}..' : _recipientName!}'
                                    : 'Someone')
                                : 'For Me',
                            style: AppTextStyles.caption.copyWith(
                              color: _selectedFor == 'For Someone Else'
                                  ? AppColors.yellow90
                                  : Colors.white,
                              fontSize: 11,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.keyboard_arrow_down,
                          color: _selectedFor == 'For Someone Else'
                              ? AppColors.yellow90
                              : Colors.white,
                          size: 16,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Recipient info banner (visible when booking for someone else)
          if (_selectedFor == 'For Someone Else' &&
              _recipientName != null &&
              _recipientName!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.yellow90.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.yellow90.withOpacity(0.25),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.person_outline,
                    color: AppColors.yellow90,
                    size: 18,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _recipientName!,
                          style: AppTextStyles.bodySmall.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (_recipientPhone != null &&
                            _recipientPhone!.isNotEmpty)
                          Text(
                            _recipientPhone!,
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.txtSec,
                              fontSize: 11,
                            ),
                          ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedFor = 'For Me';
                        _recipientName = null;
                        _recipientPhone = null;
                        _bookingState.setForSomeoneElse(false);
                      });
                    },
                    child: const Icon(
                      Icons.close,
                      color: AppColors.txtInactive,
                      size: 18,
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 20),

          // Location inputs
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Route indicator
              Column(
                children: [
                  const SizedBox(height: 18),
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: AppColors.yellow90,
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                  Column(
                    children: List.generate(
                      4,
                      (index) => Container(
                        width: 2,
                        height: 6,
                        margin: const EdgeInsets.symmetric(vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.inputBorder,
                          borderRadius: BorderRadius.circular(1),
                        ),
                      ),
                    ),
                  ),
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                ],
              ),

              const SizedBox(width: 12),

              // Input fields
              Expanded(
                child: Column(
                  children: [
                    // Pickup input
                    Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: AppColors.inputBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _isPickupFocused
                              ? AppColors.yellow90
                              : AppColors.inputBorder,
                        ),
                      ),
                      child: TextField(
                        controller: _pickupController,
                        focusNode: _pickupFocus,
                        style: AppTextStyles.body.copyWith(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                        decoration: InputDecoration(
                          border: InputBorder.none,
                          hintText: 'Pickup Location',
                          hintStyle: AppTextStyles.body.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 14,
                          ),
                          suffixIcon: IconButton(
                            icon: const Icon(
                              Icons.map_outlined,
                              color: AppColors.txtInactive,
                            ),
                            onPressed: () => _pickLocationOnMap(isPickup: true),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    // Dropoff input
                    Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: AppColors.inputBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _isDropoffFocused
                              ? AppColors.yellow90
                              : AppColors.inputBorder,
                        ),
                      ),
                      child: TextField(
                        controller: _dropoffController,
                        focusNode: _dropoffFocus,
                        style: AppTextStyles.body.copyWith(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                        decoration: InputDecoration(
                          border: InputBorder.none,
                          hintText: 'Dropoff Location',
                          hintStyle: AppTextStyles.body.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 14,
                          ),
                          suffixIcon: IconButton(
                            icon: const Icon(
                              Icons.map_outlined,
                              color: AppColors.txtInactive,
                            ),
                            onPressed: () =>
                                _pickLocationOnMap(isPickup: false),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _pickLocationOnMap({required bool isPickup}) async {
    // Pass current location so map starts there instead of raw GPS
    LatLng? initialLoc;
    if (isPickup && _bookingState.pickupLocation != null) {
      final p = _bookingState.pickupLocation!;
      initialLoc = LatLng(p.latitude, p.longitude);
    } else if (!isPickup && _bookingState.dropoffLocation != null) {
      final d = _bookingState.dropoffLocation!;
      initialLoc = LatLng(d.latitude, d.longitude);
    } else if (_bookingState.currentLocation.latitude != 0.0) {
      final c = _bookingState.currentLocation;
      initialLoc = LatLng(c.latitude, c.longitude);
    }
    final result = await Navigator.push<Location>(
      context,
      MaterialPageRoute(
        builder: (context) => MapPickerScreen(
          title: isPickup ? 'Set Pickup Location' : 'Set Drop-off Location',
          initialLocation: initialLoc,
        ),
      ),
    );

    if (result != null) {
      if (isPickup) {
        _bookingState.setPickupLocation(result);
        _pickupController.text = result.address;
        // Auto focus dropoff
        Future.delayed(const Duration(milliseconds: 100), () {
          _dropoffFocus.requestFocus();
        });
      } else {
        _bookingState.setDropoffLocation(result);
        _dropoffController.text = result.address;
        _checkAndNavigateToRideSelection();
      }
    }
  }

  Widget _buildQuickOptions() {
    return Consumer<BookingState>(
      builder: (context, bookingState, _) {
        final savedPlaces = bookingState.savedPlaces;
        return Column(
          children: [
            _buildQuickOptionItem(
              icon: Icons.my_location,
              title: 'Use My Current Location',
              onTap: _useCurrentLocation,
            ),
            _buildQuickOptionItem(
              icon: Icons.location_on_outlined,
              title: 'Set Location on the map',
              onTap: () => _pickLocationOnMap(isPickup: _isPickupFocused),
            ),
            _buildQuickOptionItem(
              icon: Icons.bookmark_outline,
              title: 'Saved Places',
              onTap: _openSavedPlaces,
            ),
            // Inline saved places for quick selection
            ...savedPlaces.map((place) => _buildSavedPlaceItem(place)),
          ],
        );
      },
    );
  }

  Widget _buildSavedPlaceItem(SavedPlace place) {
    IconData icon;
    switch (place.type) {
      case 'home':
        icon = Icons.home_outlined;
        break;
      case 'work':
        icon = Icons.work_outline;
        break;
      default:
        icon = Icons.place_outlined;
    }
    return GestureDetector(
      onTap: () {
        final location = Location(
          id: place.id,
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
        );
        _selectLocation(location);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: AppColors.inputBorder.withOpacity(0.3),
              width: 1,
            ),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.inputBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.yellow90, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    place.name,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    place.address,
                    style: AppTextStyles.body.copyWith(
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

  Widget _buildQuickOptionItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: AppColors.inputBorder.withOpacity(0.3),
              width: 1,
            ),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.inputBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.yellow90, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: AppTextStyles.body.copyWith(
                  color: Colors.white,
                  fontSize: 14,
                ),
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: AppColors.txtInactive,
              size: 22,
            ),
          ],
        ),
      ),
    );
  }
}

// For Me Bottom Sheet
class _ForMeBottomSheet extends StatefulWidget {
  final String selectedFor;
  final String? recipientName;
  final String? recipientPhone;
  final Function(String, String?, String?) onSelect;

  const _ForMeBottomSheet({
    required this.selectedFor,
    required this.onSelect,
    this.recipientName,
    this.recipientPhone,
  });

  @override
  State<_ForMeBottomSheet> createState() => _ForMeBottomSheetState();
}

class _ForMeBottomSheetState extends State<_ForMeBottomSheet> {
  late String _selected;
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selected = widget.selectedFor;
    // Restore previously saved values
    if (widget.recipientName != null) {
      _nameController.text = widget.recipientName!;
    }
    if (widget.recipientPhone != null) {
      _phoneController.text = widget.recipientPhone!;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.inputBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              Text('Booking For', style: AppTextStyles.heading3),
              const SizedBox(height: 24),
              _buildOption('For Me', Icons.person_outline),
              const SizedBox(height: 12),
              _buildOption('For Someone Else', Icons.people_outline),
              if (_selected == 'For Someone Else') ...[
                const SizedBox(height: 20),
                TextField(
                  controller: _nameController,
                  style: AppTextStyles.body.copyWith(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Recipient Name',
                    hintStyle: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive,
                    ),
                    filled: true,
                    fillColor: AppColors.inputBg,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  style: AppTextStyles.body.copyWith(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Recipient Phone',
                    hintStyle: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive,
                    ),
                    filled: true,
                    fillColor: AppColors.inputBg,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              GestureDetector(
                onTap: () {
                  widget.onSelect(
                    _selected,
                    _selected == 'For Someone Else'
                        ? _nameController.text
                        : null,
                    _selected == 'For Someone Else'
                        ? _phoneController.text
                        : null,
                  );
                  Navigator.pop(context);
                },
                child: Container(
                  width: double.infinity,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.yellow90,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      'Confirm',
                      style: AppTextStyles.body.copyWith(
                        color: Colors.black,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOption(String title, IconData icon) {
    final isSelected = _selected == title;
    return GestureDetector(
      onTap: () => setState(() => _selected = title),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.yellow90.withOpacity(0.1)
              : AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.yellow90 : AppColors.inputBorder,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.yellow90 : Colors.white,
              size: 24,
            ),
            const SizedBox(width: 16),
            Text(
              title,
              style: AppTextStyles.body.copyWith(
                color: isSelected ? AppColors.yellow90 : Colors.white,
              ),
            ),
            const Spacer(),
            if (isSelected)
              Icon(Icons.check_circle, color: AppColors.yellow90, size: 24),
          ],
        ),
      ),
    );
  }
}
