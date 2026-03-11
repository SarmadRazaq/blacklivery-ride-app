import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/services/ride_service.dart';
import '../../../../core/services/socket_service.dart';
import '../../../../core/services/connectivity_service.dart';
import '../data/services/navigation_service.dart';
import '../data/models/ride_model.dart';
import '../../delivery/data/models/delivery_model.dart';
import '../../home/providers/driver_preferences_provider.dart';
import '../../../../core/providers/region_provider.dart';

class RideProvider with ChangeNotifier {
  final RideService _rideService = RideService();
  final NavigationService _navService = NavigationService();
  final SocketService _socketService = SocketService();

  /// Called when a ride is completed or cancelled — allows external refresh triggers.
  VoidCallback? onRideCompleted;

  Ride? _currentRide;
  bool _isLoading = false;
  String? _error;
  RideRequest? _pendingRideRequest;
  DeliveryRequest? _pendingDeliveryRequest;
  StreamSubscription? _rideRequestSubscription;
  StreamSubscription<bool>? _connectivitySubscription;
  bool _isRideActionInFlight = false;
  int _scheduledRidesCount = 0;

  Ride? get currentRide => _currentRide;
  bool get isLoading => _isLoading;
  String? get error => _error;
  RideRequest? get pendingRideRequest => _pendingRideRequest;
  DeliveryRequest? get pendingDeliveryRequest => _pendingDeliveryRequest;
  bool get hasPendingDelivery => _pendingDeliveryRequest != null;
  bool get hasWebSocketConnection => _socketService.isConnected;
  int get scheduledRidesCount => _scheduledRidesCount;

  // Navigation
  List<LatLng> _routePolyline = [];
  Set<Polyline> _polylines = {};
  Set<Polyline> get polylines => _polylines;

  bool _canTransitionFromCurrent(String nextStatus) {
    final currentStatus = _currentRide?.status;
    if (currentStatus == null || currentStatus.isEmpty) return true;
    if (currentStatus == nextStatus) return true;

    const terminal = {'completed', 'cancelled'};
    if (terminal.contains(currentStatus)) return false;

    const allowed = <String, Set<String>>{
      'accepted': {'arrived', 'in_progress', 'cancelled'},
      'arrived': {'in_progress', 'cancelled'},
      'in_progress': {'completed', 'cancelled'},
    };

    final allowedNext = allowed[currentStatus];
    if (allowedNext == null) {
      return !terminal.contains(nextStatus);
    }
    return allowedNext.contains(nextStatus);
  }

  /// Initialize WebSocket connection
  void initWebSocket(
    String authToken, {
    DriverPreferencesProvider? prefsProvider,
    RegionProvider? regionProvider,
  }) {
    _socketService.initSocket(authToken);

    // Listen for ride requests and other events
    _rideRequestSubscription?.cancel();
    _rideRequestSubscription = _socketService.rideRequests.listen((data) {
      debugPrint("RideProvider received event: $data");

      // Handle cancellation
      if (data['type'] == 'ride_cancelled') {
        _pendingRideRequest = null;
        _pendingDeliveryRequest = null;
        _currentRide = null;
        _cacheCurrentRide(null);
        _isRideActionInFlight = false;
        _isLoading = false;
        _error = null;
        notifyListeners();
        return;
      }

      if (data['type'] == 'ride_completed') {
        _pendingRideRequest = null;
        _pendingDeliveryRequest = null;
        _currentRide = null;
        _cacheCurrentRide(null);
        _isRideActionInFlight = false;
        _isLoading = false;
        _error = null;
        notifyListeners();
        onRideCompleted?.call();
        return;
      }

      // Handle state sync on reconnect — refresh active ride from backend
      if (data['type'] == 'ride_state_sync') {
        debugPrint('RideProvider: ride:state_sync received — refreshing active ride');
        checkForActiveRide();
        return;
      }

      // Handle new request — filter based on driver preferences
      try {
        final eventType = data['type'] as String? ?? '';
        final requestData = data.containsKey('data') ? data['data'] : data;

        // Auto-decline cross-region requests based on active region
        if (regionProvider != null && requestData != null) {
          double? pLat;
          double? pLng;

          if (requestData['pickupLocation'] is Map) {
            final loc = requestData['pickupLocation'] as Map;
            pLat = (loc['lat'] ?? loc['latitude'])?.toDouble();
            pLng = (loc['lng'] ?? loc['longitude'])?.toDouble();
          } else if (requestData['pickupLat'] != null && requestData['pickupLng'] != null) {
            pLat = requestData['pickupLat']?.toDouble();
            pLng = requestData['pickupLng']?.toDouble();
          }

          if (pLat != null && pLng != null) {
            bool isUSA(double lat, double lng) {
              return lat >= 24.5 && lat <= 49.5 && lng >= -125.0 && lng <= -66.5;
            }

            bool rideIsUS = isUSA(pLat, pLng);

            if (rideIsUS && regionProvider.isNigeria) {
              debugPrint('RideProvider: Auto-declining cross-region ride (Driver: NG, Ride: US)');
              final id = requestData['id'] ?? requestData['_id'];
              if (id != null) {
                _socketService.declineRide(id, reason: 'out_of_region');
              }
              return;
            }

            if (!rideIsUS && regionProvider.isChicago) {
              debugPrint('RideProvider: Auto-declining cross-region ride (Driver: US, Ride: NG)');
              final id = requestData['id'] ?? requestData['_id'];
              if (id != null) {
                _socketService.declineRide(id, reason: 'out_of_region');
              }
              return;
            }
          }
        }

        // Auto-decline delivery requests if driver has disabled deliveries
        final isDelivery = eventType == 'delivery_request' ||
            requestData['bookingType'] == 'delivery';
        if (prefsProvider != null) {
          if (isDelivery && !prefsProvider.acceptDeliveries) {
            debugPrint(
              'RideProvider: Auto-declining delivery (preference off)',
            );
            final id = requestData['id'] ?? requestData['_id'];
            if (id != null) {
              _socketService.declineRide(id, reason: 'preference_disabled');
            }
            return;
          }
          if (!isDelivery && eventType == 'ride_request' && !prefsProvider.acceptRides) {
            debugPrint('RideProvider: Auto-declining ride (preference off)');
            final id = requestData['id'] ?? requestData['_id'];
            if (id != null) {
              _socketService.declineRide(id, reason: 'preference_disabled');
            }
            return;
          }
          // Auto-decline scheduled rides if preference is off
          if (requestData['isScheduled'] == true &&
              !prefsProvider.acceptScheduled) {
            debugPrint(
              'RideProvider: Auto-declining scheduled ride (preference off)',
            );
            final id = requestData['id'] ?? requestData['_id'];
            if (id != null) {
              _socketService.declineRide(id, reason: 'preference_disabled');
            }
            return;
          }
          // Filter by trip duration preferences
          final estimatedDuration =
              requestData['estimatedDuration'] as int?; // minutes
          if (estimatedDuration != null) {
            if (estimatedDuration > 30 && !prefsProvider.longTrips) {
              debugPrint(
                'RideProvider: Auto-declining long trip (preference off)',
              );
              final id = requestData['id'] ?? requestData['_id'];
              if (id != null) {
                _socketService.declineRide(id, reason: 'preference_disabled');
              }
              return;
            }
            if (estimatedDuration < 15 && !prefsProvider.shortTrips) {
              debugPrint(
                'RideProvider: Auto-declining short trip (preference off)',
              );
              final id = requestData['id'] ?? requestData['_id'];
              if (id != null) {
                _socketService.declineRide(id, reason: 'preference_disabled');
              }
              return;
            }
          }
          // Filter airport rides
          final isAirport =
              requestData['isAirport'] == true ||
              requestData['isAirportRide'] == true ||
              requestData['bookingType'] == 'airport_transfer' ||
              (requestData['pickupAddress']?.toString().toLowerCase().contains(
                    'airport',
                  ) ??
                  false) ||
              (requestData['dropoffAddress']?.toString().toLowerCase().contains(
                    'airport',
                  ) ??
                  false);
          if (isAirport && !prefsProvider.airportRides) {
            debugPrint(
              'RideProvider: Auto-declining airport ride (preference off)',
            );
            final id = requestData['id'] ?? requestData['_id'];
            if (id != null) {
              _socketService.declineRide(id, reason: 'preference_disabled');
            }
            return;
          }
        }

        // Ensure it looks like a request (has ID)
        if (requestData['id'] != null || requestData['_id'] != null) {
          if (isDelivery) {
            // Parse as delivery-specific request
            _pendingDeliveryRequest = DeliveryRequest.fromJson(
              Map<String, dynamic>.from(requestData),
            );
            _pendingRideRequest = null;
          } else {
            // Parse as regular ride request
            _pendingRideRequest = RideRequest.fromJson(
              Map<String, dynamic>.from(requestData),
            );
            _pendingDeliveryRequest = null;
          }
          notifyListeners();
        }
      } catch (e) {
        debugPrint("Error parsing ride request: $e");
      }
    });

    // Reconnect socket when connectivity is restored
    _connectivitySubscription?.cancel();
    _connectivitySubscription = ConnectivityService().onConnectivityChanged
        .listen((isOnline) {
          if (isOnline && !_socketService.isConnected) {
            debugPrint(
              'RideProvider: Connectivity restored — triggering socket reconnect',
            );
            _socketService.reconnect();
          }
        });
  }

  /// Dispose WebSocket connection
  void disposeWebSocket() {
    _rideRequestSubscription?.cancel();
    _connectivitySubscription?.cancel();
    _socketService.disconnect();
  }

  /// Clear pending ride request
  void clearPendingRideRequest() {
    _pendingRideRequest = null;
    _pendingDeliveryRequest = null;
    notifyListeners();
  }

  /// Accept pending ride request via WebSocket
  /// Optionally sends auto-greeting if preference is enabled.
  Future<void> acceptPendingRide({
    DriverPreferencesProvider? prefsProvider,
  }) async {
    if (_pendingRideRequest == null || _isRideActionInFlight) return;

    _isRideActionInFlight = true;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final rideId = _pendingRideRequest!.id;
      _socketService.acceptRide(rideId);

      // Send auto-greeting if enabled
      if (prefsProvider != null && prefsProvider.autoGreeting) {
        final greeting = prefsProvider.quietMode
            ? 'Hi! I\'m on my way. I prefer minimal chat during rides. Thank you!'
            : 'Hi! I\'m on my way to pick you up. See you soon!';
        _socketService.emitChatMessage(rideId, greeting);
        debugPrint('RideProvider: Sent auto-greeting for ride $rideId');
      }

      // Clear pending
      _pendingRideRequest = null;
      notifyListeners();

      // Check for active ride — the socket accept may take a moment to process
      for (var i = 0; i < 3; i++) {
        await Future.delayed(const Duration(milliseconds: 500));
        await checkForActiveRide();
        if (_currentRide != null) break;
      }
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isRideActionInFlight = false;
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Decline pending ride request
  void declinePendingRide({String? reason}) {
    if (_pendingRideRequest != null) {
      _socketService.declineRide(_pendingRideRequest!.id, reason: reason);
      _pendingRideRequest = null;
    } else if (_pendingDeliveryRequest != null) {
      _socketService.declineRide(_pendingDeliveryRequest!.id, reason: reason);
      _pendingDeliveryRequest = null;
    }
    notifyListeners();
  }

  /// Accept pending delivery request via WebSocket
  Future<void> acceptPendingDelivery() async {
    if (_pendingDeliveryRequest == null || _isRideActionInFlight) return;

    _isRideActionInFlight = true;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final deliveryId = _pendingDeliveryRequest!.id;
      _socketService.acceptRide(deliveryId);

      // Clear pending
      _pendingDeliveryRequest = null;
      notifyListeners();

      // Check for active ride — delivery uses the same ride entity
      for (var i = 0; i < 3; i++) {
        await Future.delayed(const Duration(milliseconds: 500));
        await checkForActiveRide();
        if (_currentRide != null) break;
      }
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isRideActionInFlight = false;
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Send auto-greeting message to rider via socket chat
  void sendAutoGreeting(String rideId, String message) {
    _socketService.emitChatMessage(rideId, message);
    debugPrint('RideProvider: Sent auto-greeting for ride $rideId');
  }

  /// Emit driver mode to backend based on preferences
  void emitDriverMode({
    required bool acceptRides,
    required bool acceptDeliveries,
  }) {
    String mode;
    if (acceptRides && acceptDeliveries) {
      mode = 'both';
    } else if (acceptRides) {
      mode = 'ride';
    } else if (acceptDeliveries) {
      mode = 'delivery';
    } else {
      mode = 'both'; // Fallback
    }
    _socketService.emitDriverMode(mode);
  }

  /// Send location update via WebSocket
  void sendLocationUpdate({
    required double latitude,
    required double longitude,
    double? heading,
    double? speed,
  }) {
    _socketService.emitLocationUpdate(latitude, longitude, heading: heading);
  }

  Future<void> fetchRoute(LatLng origin, LatLng destination) async {
    try {
      final points = await _navService.getRoute(origin, destination);
      _routePolyline = points;
      _polylines = {
        Polyline(
          polylineId: const PolylineId('route'),
          points: _routePolyline,
          color: Colors.blue,
          width: 5,
        ),
      };
      notifyListeners();
    } catch (e) {
      debugPrint('Route fetch error: $e');
    }
  }

  Future<void> checkForActiveRide() async {
    try {
      final ride = await _rideService.getActiveRide();
      _currentRide = ride;
      _cacheCurrentRide(ride);
      notifyListeners();
    } catch (e) {
      debugPrint('Error checking active ride: $e');
      _currentRide = null;
      notifyListeners();
    }
  }

  Future<void> refreshScheduledRidesCount() async {
    try {
      final count = await _rideService.getUpcomingRideCount();
      _scheduledRidesCount = count;
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading scheduled ride count: $e');
    }
  }

  Future<void> acceptRide(String rideId) async {
    if (_isRideActionInFlight) return;
    _isRideActionInFlight = true;
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      await _rideService.updateRideStatus(rideId, 'accepted');
      // Clear pending requests so listeners don't re-trigger the overlay
      _pendingRideRequest = null;
      _pendingDeliveryRequest = null;
      // Fetch ride details or assume it is the current one
      await checkForActiveRide();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isRideActionInFlight = false;
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateStatus(String status, {String? reason}) async {
    if (_currentRide == null || _isRideActionInFlight) return;
    if (!_canTransitionFromCurrent(status)) {
      _error = 'Invalid ride transition: ${_currentRide!.status} -> $status';
      notifyListeners();
      return;
    }

    _isRideActionInFlight = true;
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      await _rideService.updateRideStatus(_currentRide!.id, status, reason: reason);
      await checkForActiveRide(); // Refresh (also updates cache)
      if (status == 'completed' || status == 'cancelled') {
        await clearCachedRide();
        onRideCompleted?.call();
      }
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isRideActionInFlight = false;
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> rateRider(String rideId, int rating, String? feedback) async {
    try {
      await _rideService.rateRider(rideId, rating, feedback);
    } catch (e) {
      rethrow;
    }
  }

  // ── Trip State Persistence ──────────────────────────────────────────

  static const _cacheKey = 'active_ride';

  /// Persist active ride to SharedPreferences (or remove on null).
  Future<void> _cacheCurrentRide(Ride? ride) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (ride != null) {
        await prefs.setString(_cacheKey, jsonEncode(ride.toJson()));
      } else {
        await prefs.remove(_cacheKey);
      }
    } catch (e) {
      debugPrint('RideProvider: Failed to cache ride: $e');
    }
  }

  /// Load cached ride from SharedPreferences (cold-start recovery).
  Future<void> loadCachedRide() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_cacheKey);
      if (json != null) {
        _currentRide = Ride.fromJson(jsonDecode(json) as Map<String, dynamic>);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('RideProvider: Failed to load cached ride: $e');
    }
  }

  /// Clear persisted ride (call when ride completes or is cancelled).
  Future<void> clearCachedRide() async {
    _currentRide = null;
    notifyListeners();
    await _cacheCurrentRide(null);
  }
}
