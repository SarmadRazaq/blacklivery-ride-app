import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/ride_service.dart';
import '../services/socket_service.dart';
import '../services/location_service.dart';
import '../services/places_service.dart';
import '../models/driver_model.dart';
import '../models/location_model.dart';
import '../models/saved_place_model.dart';
import '../models/ride_option_model.dart';
import '../models/booking_model.dart';

class BookingState extends ChangeNotifier {
  static final BookingState _instance = BookingState._internal();
  factory BookingState() => _instance;
  BookingState._internal() {
    _loadPaymentMethod();
  }

  Future<void> _loadPaymentMethod() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('payment_method');
    if (saved != null && const {'wallet', 'cash', 'card'}.contains(saved)) {
      _paymentMethod = saved;
      notifyListeners();
    }
  }

  // ── Ride State Persistence ─────────────────────────────────────────
  static const _rideStateKey = 'active_ride_state';

  /// Persist current ride state so the app can recover after kill/restart.
  Future<void> _cacheRideState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_currentBooking != null && _rideId != null) {
        final state = <String, dynamic>{
          'rideId': _rideId,
          'booking': _currentBooking!.toJson(),
          'bookingStatus': _bookingStatus,
          'paymentMethod': _paymentMethod,
          'driver': _assignedDriver != null
              ? {
                  'id': _assignedDriver!.id,
                  'name': _assignedDriver!.name,
                  'photoUrl': _assignedDriver!.photoUrl,
                  'rating': _assignedDriver!.rating,
                  'carModel': _assignedDriver!.carModel,
                  'carColor': _assignedDriver!.carColor,
                  'licensePlate': _assignedDriver!.licensePlate,
                  'phone': _assignedDriver!.phone,
                  'latitude': _assignedDriver!.latitude,
                  'longitude': _assignedDriver!.longitude,
                }
              : null,
          'estimatedDistanceKm': _estimatedDistanceKm,
          'estimatedDurationMin': _estimatedDurationMin,
          'cachedAt': DateTime.now().toIso8601String(),
        };
        await prefs.setString(_rideStateKey, jsonEncode(state));
      } else {
        await prefs.remove(_rideStateKey);
      }
    } catch (e) {
      debugPrint('BookingState: Failed to cache ride state: $e');
    }
  }

  /// Clear persisted ride state (on completion, cancellation, or reset).
  Future<void> _clearCachedRideState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_rideStateKey);
    } catch (e) {
      debugPrint('BookingState: Failed to clear cached ride state: $e');
    }
  }

  /// Restore ride from local cache + backend verification.
  /// Call this on app startup (splash/home screen).
  /// Returns true if an active ride was restored.
  Future<bool> restoreActiveRide() async {
    // 1. Try local cache first (instant recovery)
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_rideStateKey);
      if (json != null) {
        final state = jsonDecode(json) as Map<String, dynamic>;
        _rideId = state['rideId'] as String?;
        _bookingStatus = state['bookingStatus'] as String? ?? 'idle';
        _estimatedDistanceKm =
            (state['estimatedDistanceKm'] as num?)?.toDouble() ?? 0.0;
        _estimatedDurationMin =
            (state['estimatedDurationMin'] as num?)?.toInt() ?? 0;
        if (state['booking'] != null) {
          _currentBooking =
              Booking.fromJson(state['booking'] as Map<String, dynamic>);
        }
        if (state['driver'] != null) {
          _assignedDriver =
              Driver.fromJson(state['driver'] as Map<String, dynamic>);
        }
        notifyListeners();
        debugPrint('BookingState: Restored ride from cache (rideId=$_rideId)');
      }
    } catch (e) {
      debugPrint('BookingState: Failed to restore from cache: $e');
    }

    // 2. Verify with backend (may update or clear stale cache)
    try {
      final activeRide = await _rideService.getActiveRide();
      if (activeRide == null) {
        // No active ride on server — clear local state
        if (_rideId != null) {
          debugPrint('BookingState: Server says no active ride — clearing local');
          resetBookingFlow();
          await _clearCachedRideState();
        }
        return false;
      }

      // Rebuild local state from server data
      final status = activeRide['status'] as String? ?? 'finding_driver';
      _rideId = activeRide['id'] as String?;

      if (activeRide['driver'] != null) {
        _assignedDriver = Driver.fromJson(
            activeRide['driver'] as Map<String, dynamic>);
      } else if (activeRide['driverName'] != null) {
        _assignedDriver = Driver(
          id: (activeRide['driverId'] ?? '').toString(),
          name: (activeRide['driverName'] ?? 'Driver').toString(),
          photoUrl: (activeRide['driverPhoto'] ?? '').toString(),
          rating: (activeRide['driverRating'] as num?)?.toDouble() ?? 5.0,
          totalRides: 0,
          carModel: (activeRide['vehicleModel'] ?? '').toString(),
          carColor: (activeRide['vehicleColor'] ?? '').toString(),
          licensePlate: (activeRide['vehiclePlate'] ?? '').toString(),
          phone: (activeRide['driverPhone'] ?? '').toString(),
          latitude: 0.0,
          longitude: 0.0,
        );
      }

      // Rebuild pickup/dropoff from server data
      final pickup = activeRide['pickupLocation'];
      if (pickup is Map<String, dynamic>) {
        _pickupLocation = Location(
          id: 'pickup',
          name: pickup['address']?.toString() ?? 'Pickup',
          address: pickup['address']?.toString() ?? '',
          latitude: (pickup['lat'] as num?)?.toDouble() ?? 0.0,
          longitude: (pickup['lng'] as num?)?.toDouble() ?? 0.0,
        );
      }
      final dropoff = activeRide['dropoffLocation'];
      if (dropoff is Map<String, dynamic>) {
        _dropoffLocation = Location(
          id: 'dropoff',
          name: dropoff['address']?.toString() ?? 'Dropoff',
          address: dropoff['address']?.toString() ?? '',
          latitude: (dropoff['lat'] as num?)?.toDouble() ?? 0.0,
          longitude: (dropoff['lng'] as num?)?.toDouble() ?? 0.0,
        );
      }

      // Map ride status to booking status
      const statusMap = {
        'finding_driver': 'searching_driver',
        'pending': 'searching_driver',
        'accepted': 'driver_assigned',
        'arrived': 'arriving',
        'in_progress': 'in_progress',
      };
      _bookingStatus = statusMap[status] ?? 'idle';

      // Rebuild booking object
      _currentBooking = Booking(
        id: _rideId ?? '',
        pickup: _pickupLocation ?? Location(id: '', name: '', address: '', latitude: 0, longitude: 0),
        dropoff: _dropoffLocation ?? Location(id: '', name: '', address: '', latitude: 0, longitude: 0),
        rideOption: _selectedRideOption ?? RideOption.defaultOption(),
        driver: _assignedDriver,
        scheduledTime: DateTime.now(),
        estimatedPrice: (activeRide['pricing']?['estimatedFare'] as num?)?.toDouble() ?? 0,
        distanceKm: _estimatedDistanceKm,
        status: status,
      );

      // Re-listen for socket updates
      if (_rideId != null) {
        _socketService.listenToRideUpdates(_rideId!, (data) {
          _handleRideUpdate(data);
        });
      }

      notifyListeners();
      await _cacheRideState();
      debugPrint('BookingState: Restored ride from server (status=$status)');
      return true;
    } catch (e) {
      debugPrint('BookingState: Failed to restore from server: $e');
      // If we had a cached ride, keep it
      return _rideId != null;
    }
  }

  /// Whether there's an active ride in progress (for startup routing).
  bool get hasActiveRide =>
      _rideId != null &&
      _currentBooking != null &&
      !_isTerminalStatus(_currentBooking!.status);

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  final RideService _rideService = RideService();
  RideService get rideService => _rideService;
  final LocationService _locationService = LocationService();
  final PlacesService _placesService = PlacesService();
  final SocketService _socketService = SocketService(); // Added SocketService

  // Booking flow state
  Location? _pickupLocation;
  Location? _dropoffLocation;
  DateTime _scheduledTime = DateTime.now();
  bool _isPickupNow = true;
  bool _isForSomeoneElse = false;
  String? _recipientName;
  String? _recipientPhone;
  RideOption? _selectedRideOption;
  Booking? _currentBooking;
  Driver? _assignedDriver;
  String? _rideId; // Added _rideId to track current ride ID
  String _paymentMethod = 'wallet'; // wallet, cash, card
  DateTime? _driverArrivedAt; // Timestamp when driver marked arrived (for wait time)
  String _bookingStatus =
      'idle'; // idle, selecting_ride, confirming, searching_driver, driver_assigned, arriving, in_progress, completed

  // Booking type: on_demand, hourly, airport, delivery
  String _bookingType = 'on_demand';
  int _hoursBooked = 2; // For hourly bookings (min 2)
  String? _airportCode; // For airport bookings: 'ORD' or 'MDW'
  bool _isAirportPickup = true; // true = pickup FROM airport, false = dropoff TO airport

  // Getters
  Location? get pickupLocation => _pickupLocation;
  Location? get dropoffLocation => _dropoffLocation;
  DateTime get scheduledTime => _scheduledTime;
  bool get isPickupNow => _isPickupNow;
  bool get isForSomeoneElse => _isForSomeoneElse;
  String? get recipientName => _recipientName;
  String? get recipientPhone => _recipientPhone;
  RideOption? get selectedRideOption => _selectedRideOption;
  Booking? get currentBooking => _currentBooking;
  Driver? get assignedDriver => _assignedDriver ?? _currentBooking?.driver;
  String get bookingStatus => _bookingStatus;
  String? get rideId => _rideId;
  String get paymentMethod => _paymentMethod;
  DateTime? get driverArrivedAt => _driverArrivedAt;
  String get bookingType => _bookingType;
  int get hoursBooked => _hoursBooked;
  String? get airportCode => _airportCode;
  bool get isAirportPickup => _isAirportPickup;

  static const Set<String> _terminalRideStatuses = {
    'completed',
    'cancelled',
    'no_driver',
  };

  bool _isTerminalStatus(String status) => _terminalRideStatuses.contains(status);

  bool _canTransitionTo(String nextStatus) {
    final currentStatus = _currentBooking?.status;
    if (currentStatus == null || currentStatus.isEmpty) return true;
    if (_isTerminalStatus(currentStatus)) return false;
    if (currentStatus == nextStatus) return true;

    const allowed = <String, Set<String>>{
      'finding_driver': {'accepted', 'arrived', 'cancelled', 'no_driver'},
      'accepted': {'arrived', 'in_progress', 'cancelled'},
      'arrived': {'in_progress', 'cancelled'},
      'in_progress': {'completed', 'cancelled'},
    };

    final allowedNext = allowed[currentStatus];
    if (allowedNext == null) {
      return !_isTerminalStatus(nextStatus);
    }
    return allowedNext.contains(nextStatus);
  }

  void setBookingType(String type) {
    _bookingType = type;
    notifyListeners();
  }

  void setHoursBooked(int hours) {
    _hoursBooked = hours < 2 ? 2 : hours;
    notifyListeners();
  }

  void setAirportCode(String? code) {
    _airportCode = code;
    notifyListeners();
  }

  void setAirportDirection({required bool isPickup}) {
    _isAirportPickup = isPickup;
    notifyListeners();
  }

  void setPaymentMethod(String method) {
    _paymentMethod = method;
    notifyListeners();
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString('payment_method', method);
    });
  }

  List<Driver> _nearbyDrivers = [];
  List<Driver> get nearbyDrivers => _nearbyDrivers;

  // Recent Locations
  List<Location> _recentLocations = [];
  List<Location> get recentLocations => _recentLocations;

  // Saved Places
  List<SavedPlace> _savedPlaces = [];
  List<SavedPlace> get savedPlaces => _savedPlaces;

  // Ride Options
  List<RideOption> _rideOptions = [];
  List<RideOption> get rideOptions => _rideOptions;

  // Current Location State
  Location? _currentLocation;
  Location get currentLocation =>
      _currentLocation ??
      Location(
        id: 'current',
        name: 'Loading...',
        address: '',
        latitude: 0,
        longitude: 0,
      );

  // Computed Properties
  bool get canSelectRide => _pickupLocation != null && _dropoffLocation != null;

  String get formattedScheduledTime {
    if (_isPickupNow) return 'Pickup Now';

    final now = DateTime.now();
    final isToday =
        _scheduledTime.day == now.day &&
        _scheduledTime.month == now.month &&
        _scheduledTime.year == now.year;

    final hour = _scheduledTime.hour;
    final minute = _scheduledTime.minute;
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    final timeStr = '$displayHour:${minute.toString().padLeft(2, '0')} $period';

    if (isToday) {
      return 'Today at $timeStr';
    } else {
      final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return '${days[_scheduledTime.weekday - 1]} at $timeStr';
    }
  }

  // --- Actions ---

  /// Initialize data from API
  Future<void> initialize() async {
    await Future.wait([
      loadSavedPlaces(),
      loadRecentLocations(),
      loadRideOptions(),
    ]);
  }

  /// Load saved places from API
  Future<void> loadSavedPlaces() async {
    try {
      _savedPlaces = await _placesService.getSavedPlaces();
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading saved places: $e');
    }
  }

  /// Load recent locations from API
  Future<void> loadRecentLocations() async {
    try {
      _recentLocations = await _placesService.getRecentLocations();
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading recent locations: $e');
    }
  }

  /// Load ride options from API — with estimated prices if pickup/dropoff are set
  Future<void> loadRideOptions() async {
    try {
      _rideOptions = await _rideService.getRideOptions(
        pickupLat: _pickupLocation?.latitude,
        pickupLng: _pickupLocation?.longitude,
        dropoffLat: _dropoffLocation?.latitude,
        dropoffLng: _dropoffLocation?.longitude,
      );
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading ride options: $e');
    }
  }

  void setPickupLocation(Location? location) {
    _pickupLocation = location;
    notifyListeners();
  }

  void setDropoffLocation(Location? location) {
    _dropoffLocation = location;
    notifyListeners();
  }

  void setScheduledTime(DateTime time, {bool isNow = false}) {
    _scheduledTime = time;
    _isPickupNow = isNow;
    notifyListeners();
  }

  void setForSomeoneElse(bool value, {String? name, String? phone}) {
    _isForSomeoneElse = value;
    _recipientName = name;
    _recipientPhone = phone;
    notifyListeners();
  }

  void selectRideOption(RideOption option) {
    _selectedRideOption = option;
    _bookingStatus = 'selecting_ride';
    notifyListeners();
  }

  Future<void> useCurrentLocation() async {
    try {
      final position = await _locationService.getCurrentLocation();
      final placemark = await _locationService.getAddressFromCoordinates(
        position.latitude,
        position.longitude,
      );

      String name = 'Current Location';
      String address = 'Lat: ${position.latitude}, Lng: ${position.longitude}';
      if (placemark != null) {
        final parts = [
          placemark.street,
          placemark.locality,
          placemark.administrativeArea,
          placemark.postalCode,
        ].where((p) => p != null && p.isNotEmpty).toList();
        if (parts.isNotEmpty) {
          address = parts.join(', ');
          // Use street + locality as the display name if available
          name = placemark.street ?? placemark.locality ?? 'Current Location';
        }
      }

      _currentLocation = Location(
        id: 'current',
        name: name,
        address: address,
        latitude: position.latitude,
        longitude: position.longitude,
      );

      _pickupLocation = _currentLocation;
      notifyListeners();

      _fetchNearbyDrivers(position.latitude, position.longitude);
    } catch (e) {
      debugPrint('Error getting location: $e');
      // Fallback if location fails
      _currentLocation = Location(
        id: 'manual',
        name: 'Enter Pickup Location',
        address: '',
        latitude: 0,
        longitude: 0,
      );
      _pickupLocation = _currentLocation;
      notifyListeners();
    }
  }

  Future<void> _fetchNearbyDrivers(double lat, double lng) async {
    try {
      _nearbyDrivers = await _rideService.getNearbyDrivers(lat, lng);
      notifyListeners();
    } catch (e) {
      debugPrint('Error fetching drivers: $e');
    }
  }

  Future<void> getFareEstimate() async {
    if (_pickupLocation == null || _dropoffLocation == null) return;

    try {
      // Fetch options again to ensure fresh data
      await loadRideOptions();

      // Update each option with calculated price
      // Note: In a real app, the API might return the options WITH prices directly.
      // Here we simulate iterating or calling a bulk estimate endpoint.
      // If the API defines `getFareEstimate` taking a rideType, we might need to call it for each.
      // Or if the API is smart, it returns all options.
      // Let's assume we iterate for now or the API endpoint `estimate` returns data for all.
      // Based on RideService, `getFareEstimate` takes `rideType` and returns data for ONE.
      // So we loop.

      List<RideOption> updatedOptions = [];

      for (var option in _rideOptions) {
        try {
          final estimate = await _rideService.getFareEstimate(
            pickupLat: _pickupLocation!.latitude,
            pickupLng: _pickupLocation!.longitude,
            dropoffLat: _dropoffLocation!.latitude,
            dropoffLng: _dropoffLocation!.longitude,
            rideType: option.id,
          );

          // Create new option with updated price
          // We might need to subclass RideOption or add a mutable price field/copyWith
          // For now, let's assume `RideOption` is final and we shouldn't hack it.
          // Ideally `RideOption` has `price` field. Checked model: yes `basePrice`, `pricePerKm`.
          // But we want the TOTAL calculated price.
          // The model has `calculatePrice(distance)` helper.
          // We should set the `estimatedDistance` on the state and let UI calc, OR
          // update the model to hold a specific `totalPrice` for this session.
          // Let's update `estimatedDistance` property of State.

          // Assuming estimate returns {'price': 12.5, 'distance': 5.2, 'duration': 15}
          // We can update the state's `estimatedDistance` (and maybe duration).

          // Use the first successful estimate to set distance/duration,
          // as distance is the same regardless of vehicle type.
          if (updatedOptions.isEmpty && estimate != null) {
            _estimatedDistanceKm =
              (estimate['distanceKm'] as num?)?.toDouble() ??
              (estimate['distance'] as num?)?.toDouble() ??
              _estimatedDistanceKm;
            _estimatedDurationMin =
              (estimate['durationMinutes'] as num?)?.round() ??
              (estimate['estimatedDurationMinutes'] as num?)?.round() ??
              (estimate['duration'] as num?)?.round() ??
              _estimatedDurationMin;
          }

          final estimatedFare =
              (estimate?['estimatedFare'] as num?)?.toDouble() ??
              (estimate?['baseFare'] as num?)?.toDouble() ??
              (estimate?['pricing']?['estimatedFare'] as num?)?.toDouble();
            final durationSeconds =
              (estimate?['durationSeconds'] as num?)?.toDouble();
            final estimatedMinutes =
              (estimate?['durationMinutes'] as num?)?.round() ??
              (estimate?['estimatedDurationMinutes'] as num?)?.round() ??
              (durationSeconds != null
                ? (durationSeconds / 60).round()
                : null);

          updatedOptions.add(
            RideOption(
              id: option.id,
              name: option.name,
              description: option.description,
              iconPath: option.iconPath,
              basePrice: estimatedFare ?? option.basePrice,
              pricePerKm: estimatedFare != null ? 0 : option.pricePerKm,
              estimatedMinutes: estimatedMinutes ?? option.estimatedMinutes,
              capacity: option.capacity,
            ),
          );
        } catch (e) {
          // If estimate fails for one type, keep the original or skip
          updatedOptions.add(option);
        }
      }

      _rideOptions = updatedOptions;
      notifyListeners();
    } catch (e) {
      debugPrint('Error getting fare estimates: $e');
    }
  }

  // Real properties for distance/duration
  double _estimatedDistanceKm = 0.0;
  int _estimatedDurationMin = 0;

  double get estimatedDistance => _estimatedDistanceKm;
  int get estimatedDuration => _estimatedDurationMin;

  Future<List<Location>> searchLocations(String query) async {
    try {
      return await _placesService.searchLocations(query);
    } catch (e) {
      debugPrint('Error searching locations: $e');
      return [];
    }
  }

  Future<void> createBooking() async {
    if (_isLoading || _rideId != null || _bookingStatus == 'searching_driver') {
      return;
    }

    if (_pickupLocation == null ||
        _dropoffLocation == null ||
        _selectedRideOption == null) {
      throw Exception('Missing booking details');
    }

    _isLoading = true;
    notifyListeners();

    try {
      // 1. Initialize Socket
      await _socketService.initSocket();

      // 2. Create Ride Request via API (payment method included for backend escrow)
      final result = await _rideService.createRideRequest(
        pickupLat: _pickupLocation!.latitude,
        pickupLng: _pickupLocation!.longitude,
        dropoffLat: _dropoffLocation!.latitude,
        dropoffLng: _dropoffLocation!.longitude,
        rideType: _selectedRideOption!.id,
        pickupAddress: _pickupLocation!.address,
        dropoffAddress: _dropoffLocation!.address,
        paymentMethod: _paymentMethod,
        bookingType: _bookingType,
        hoursBooked: _bookingType == 'hourly' ? _hoursBooked : null,
        airportCode: _bookingType == 'airport_transfer' ? _airportCode : null,
        scheduledAt: _isPickupNow ? null : _scheduledTime,
        isForSomeoneElse: _isForSomeoneElse,
        recipientName: _recipientName,
        recipientPhone: _recipientPhone,
      );

      if (result != null) {
        _rideId = result['id']; // Capture Ride ID

        final isScheduled = !_isPickupNow;
        final initialStatus = isScheduled ? 'scheduled' : 'finding_driver';

        // 3. Update Local State
        _currentBooking = Booking(
          id: _rideId!,
          pickup: _pickupLocation!,
          dropoff: _dropoffLocation!,
          rideOption: _selectedRideOption!,
          scheduledTime: _isPickupNow ? DateTime.now() : _scheduledTime,
          estimatedPrice: (result['estimatedPrice'] as num?)?.toDouble() ?? 0,
          distanceKm:
              (result['distanceKm'] as num?)?.toDouble() ??
              _estimatedDistanceKm,
          status: initialStatus,
          isForSomeoneElse: _isForSomeoneElse,
          recipientName: _recipientName,
          recipientPhone: _recipientPhone,
        );
        _bookingStatus = isScheduled ? 'scheduled' : 'searching_driver';
        _isLoading = false;
        notifyListeners();
        _cacheRideState(); // Persist for crash recovery

        // 4. Listen for Socket Updates (only for immediate rides)
        if (!isScheduled) {
          _socketService.listenToRideUpdates(_rideId!, (data) {
            _handleRideUpdate(data);
          });
        }
      } else {
        // Handle error
        _isLoading = false;
        notifyListeners();
        throw Exception('Failed to create booking.');
      }
    } catch (e) {
      debugPrint('Error creating booking: $e');
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  /// Re-register socket ride update listeners.
  /// Call this when navigating to a new screen that needs to receive
  /// ride status updates after a previous screen called stopListeningToRideUpdates.
  void reRegisterSocketListeners() {
    if (_rideId != null) {
      _socketService.listenToRideUpdates(_rideId!, (data) {
        _handleRideUpdate(data);
      });
    }
  }

  void _handleRideUpdate(Map<String, dynamic> data) {
    if (_currentBooking == null) return;

    final dynamic nestedDriver = data['driver'];
    final String status = (data['status'] as String?)?.trim() ?? '';

    if (status.isEmpty) {
      if (nestedDriver is Map<String, dynamic>) {
        final driver = _currentBooking!.driver;
        _assignedDriver = Driver(
          id: (nestedDriver['id'] ?? driver?.id ?? 'unknown').toString(),
          name: (nestedDriver['name'] ?? driver?.name ?? 'Unknown Driver').toString(),
          photoUrl: (nestedDriver['profileImageUrl'] ?? nestedDriver['photoUrl'] ?? driver?.photoUrl ?? '').toString(),
          rating: (nestedDriver['rating'] as num?)?.toDouble() ?? driver?.rating ?? 0.0,
          totalRides: driver?.totalRides ?? 0,
          carModel: (nestedDriver['carModel'] ?? driver?.carModel ?? '').toString(),
          carColor: (nestedDriver['carColor'] ?? driver?.carColor ?? '').toString(),
          licensePlate: (nestedDriver['licensePlate'] ?? driver?.licensePlate ?? '').toString(),
          latitude: (nestedDriver['currentLocation']?['lat'] as num?)?.toDouble() ?? driver?.latitude ?? 0.0,
          longitude: (nestedDriver['currentLocation']?['lng'] as num?)?.toDouble() ?? driver?.longitude ?? 0.0,
        );
        _currentBooking = _currentBooking!.copyWith(driver: _assignedDriver);
        notifyListeners();
      }
      return;
    }

    if (!_canTransitionTo(status)) {
      return;
    }

    // Update local booking object
    Driver? updatedDriver = _currentBooking!.driver;

    // Create or update driver if data is present
    if (data['driverName'] != null || data['driverId'] != null || nestedDriver != null) {
      final nested = nestedDriver is Map<String, dynamic> ? nestedDriver : <String, dynamic>{};
      updatedDriver = Driver(
        id: (data['driverId'] ?? nested['id'] ?? 'unknown').toString(),
        name: (data['driverName'] ?? nested['name'] ?? 'Unknown Driver').toString(),
        photoUrl: (data['driverPhoto'] ?? nested['profileImageUrl'] ?? nested['photoUrl'] ?? '').toString(),
        rating: (data['driverRating'] as num?)?.toDouble() ?? (nested['rating'] as num?)?.toDouble() ?? 0.0,
        totalRides: 0, // Not always sent
        carModel: (data['vehicleModel'] ?? nested['carModel'] ?? '').toString(),
        carColor: (data['vehicleColor'] ?? nested['carColor'] ?? '').toString(),
        licensePlate: (data['vehiclePlate'] ?? nested['licensePlate'] ?? '').toString(),
        phone: (data['driverPhone'] ?? nested['phone'] ?? nested['phoneNumber'] ?? '').toString(),
        latitude: (data['driverLocationLat'] as num?)?.toDouble() ??
            (nested['currentLocation']?['lat'] as num?)?.toDouble() ??
            0.0,
        longitude: (data['driverLocationLng'] as num?)?.toDouble() ??
            (nested['currentLocation']?['lng'] as num?)?.toDouble() ??
            0.0,
      );
      // Keep assignedDriver in sync
      _assignedDriver = updatedDriver;
    }

    // Update booking content
    _currentBooking = _currentBooking!.copyWith(
      status: status,
      driver: updatedDriver,
      estimatedPrice: (data['estimatedPrice'] as num?)
          ?.toDouble(), // Update price if needed
    );

    // Update BookingStatus string based on ride status
    switch (status) {
      case 'accepted':
      case 'arrived':
        _bookingStatus = 'driver_assigned'; // or 'arriving'
        if (status == 'arrived') {
          _bookingStatus = 'arriving';
          _driverArrivedAt ??= DateTime.now();
        }
        break;
      case 'in_progress':
        _bookingStatus = 'in_progress';
        break;
      case 'completed':
        _bookingStatus = 'completed';
        // Keep _rideId and _assignedDriver alive for rating/tip on completed screen.
        // They will be cleared when resetBookingFlow() is called.
        break;
      case 'cancelled':
        _bookingStatus = 'cancelled';
        _rideId = null;
        break;
      case 'no_driver':
        _bookingStatus = 'no_driver';
        _rideId = null;
        break;
      default:
        _bookingStatus = 'searching_driver'; // Or a more generic 'active'
        break;
    }

    _isLoading = false;
    notifyListeners();

    // Persist state for crash recovery (clear on terminal statuses)
    if (_isTerminalStatus(status)) {
      _clearCachedRideState();
    } else {
      _cacheRideState();
    }
  }

  void updateBookingStatus(String status) {
    if (status.isEmpty || (_currentBooking != null && !_canTransitionTo(status))) {
      return;
    }

    if (_currentBooking != null) {
      _currentBooking = _currentBooking!.copyWith(status: status);
    }
    // Update BookingStatus string based on ride status
    switch (status) {
      case 'accepted':
      case 'arrived':
        _bookingStatus = 'driver_assigned';
        if (status == 'arrived') _bookingStatus = 'arriving';
        break;
      case 'in_progress':
        _bookingStatus = 'in_progress';
        break;
      case 'completed':
        _bookingStatus = 'completed';
        // Keep _rideId and _assignedDriver alive for rating/tip on completed screen.
        break;
      case 'cancelled':
        _bookingStatus = 'cancelled';
        _rideId = null;
        break;
      case 'finding_driver':
        _bookingStatus = 'searching_driver';
        break;
      default:
        return;
    }
    notifyListeners();
  }

  /// Poll the backend for the latest ride status (fallback for missed socket events).
  Future<void> refreshRideStatus(String rideId) async {
    try {
      final data = await _rideService.getRideDetails(rideId);
      if (data != null && data['status'] != null) {
        _handleRideUpdate(data);
      }
    } catch (e) {
      debugPrint('BookingState.refreshRideStatus error: $e');
    }
  }

  Future<void> cancelBooking({String? reason}) async {
    if (_isTerminalStatus(_currentBooking?.status ?? '')) {
      return;
    }

    // Call backend API to cancel the ride if we have a rideId
    if (_rideId != null) {
      try {
        await _rideService.cancelRide(_rideId!, reason: reason);
      } catch (e) {
        debugPrint('Error cancelling ride via API: $e');
        // Still proceed with local cleanup even if API call fails
      }
    }
    _currentBooking = null;
    _assignedDriver = null;
    _bookingStatus = 'idle';
    _rideId = null;
    _socketService.stopListeningToRideUpdates(); // Clean up ride listeners
    _clearCachedRideState();
    notifyListeners();
  }

  void resetBookingFlow() {
    _pickupLocation = null;
    _dropoffLocation = null;
    _selectedRideOption = null;
    _isForSomeoneElse = false;
    _recipientName = null;
    _recipientPhone = null;
    _isPickupNow = true;
    _scheduledTime = DateTime.now();
    _currentBooking = null;
    _assignedDriver = null;
    _bookingStatus = 'idle';
    _bookingType = 'on_demand';
    _hoursBooked = 2;
    _airportCode = null;
    _isAirportPickup = true;
    _rideId = null;
    _driverArrivedAt = null;
    _socketService.stopListeningToRideUpdates(); // Clean up stale ride listeners
    _clearCachedRideState();
    notifyListeners();
  }

  void addToRecentLocations(Location location) {
    final existing = _recentLocations.indexWhere((l) => l.id == location.id);
    if (existing != -1) {
      _recentLocations.removeAt(existing);
    }
    _recentLocations.insert(0, location);
    if (_recentLocations.length > 10) {
      _recentLocations.removeLast();
    }

    // Also save to API
    _placesService.addToRecentLocations(location);
  }
}
