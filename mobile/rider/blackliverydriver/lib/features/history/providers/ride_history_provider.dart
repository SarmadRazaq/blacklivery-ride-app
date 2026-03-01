import 'package:flutter/material.dart';
import '../data/services/ride_history_service.dart';
import '../../ride/data/models/ride_model.dart';
import '../../../core/services/cache_service.dart';
import '../../../core/services/connectivity_service.dart';

class RideHistoryProvider with ChangeNotifier {
  final RideHistoryService _rideHistoryService = RideHistoryService();

  List<Ride> _rides = []; // History rides
  List<Ride> _upcomingRides = [];
  bool _isLoading = false;
  bool _isUpcomingLoading = false;
  String? _error;
  String? _upcomingError;
  int _currentPage = 1;
  bool _hasMore = true;

  List<Ride> get rides => _rides;
  List<Ride> get upcomingRides => _upcomingRides;
  bool get isLoading => _isLoading;
  bool get isUpcomingLoading => _isUpcomingLoading;
  String? get error => _error;
  String? get upcomingError => _upcomingError;
  bool get hasMore => _hasMore;

  Future<void> loadRideHistory({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
      _rides = [];
    }

    if (!_hasMore || (_isLoading && !refresh)) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (!ConnectivityService().isOnline) {
        // Load from cache if offline
        if (_currentPage == 1) {
          final cached = CacheService().getJsonList('ride_history');
          if (cached != null) {
            _rides = cached.map((e) => Ride.fromJson(e)).toList();
            _hasMore = false; // Can't paginate offline
          } else {
            _error = 'No internet connection and no cached data available.';
          }
        } else {
          _error = 'No internet connection to load more rides.';
        }
        return;
      }

      const int limit = 20;
      final newRides = await _rideHistoryService.getRideHistory(
        page: _currentPage,
        limit: limit,
        type: 'history',
      );

      if (newRides.length < limit) {
        _hasMore = false;
      }

      if (newRides.isNotEmpty) {
        _rides.addAll(newRides);
        _currentPage++;
        
        // Cache the first page
        if (_currentPage == 2) {
          CacheService().setJsonList('ride_history', _rides.map((r) => r.toJson()).toList());
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadUpcomingRides() async {
    _isUpcomingLoading = true;
    _upcomingError = null;
    notifyListeners();

    try {
      if (!ConnectivityService().isOnline) {
        final cached = CacheService().getJsonList('upcoming_rides');
        if (cached != null) {
          _upcomingRides = cached.map((e) => Ride.fromJson(e)).toList();
        } else {
          _upcomingError = 'No internet connection and no cached data available.';
        }
        return;
      }

      // Fetch all upcoming without pagination for now (or basic pagination)
      _upcomingRides = await _rideHistoryService.getRideHistory(
        page: 1,
        limit: 50,
        type: 'upcoming',
      );
      
      CacheService().setJsonList('upcoming_rides', _upcomingRides.map((r) => r.toJson()).toList());
    } catch (e) {
      _upcomingError = e.toString();
    } finally {
      _isUpcomingLoading = false;
      notifyListeners();
    }
  }
}
