import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';
import '../models/driver_model.dart';
import '../models/ride_option_model.dart';

class RideService {
  final Dio _dio = ApiClient().dio;

  Map<String, dynamic> _extractMapData(dynamic raw) {
    if (raw is Map<String, dynamic>) {
      final nested = raw['data'];
      if (nested is Map<String, dynamic>) return nested;
      return raw;
    }
    return <String, dynamic>{};
  }

  /// Active region key passed to backend. Defaults to 'nigeria'.
  /// Updated at runtime via [setRegion] when RegionProvider changes.
  String _region = 'nigeria';
  String get region => _region;
  void setRegion(String regionKey) => _region = regionKey;

  /// Get available ride options with estimated prices from backend
  /// Falls back to static vehicle types if coordinates are not available
  Future<List<RideOption>> getRideOptions({
    double? pickupLat,
    double? pickupLng,
    double? dropoffLat,
    double? dropoffLng,
  }) async {
    // Vehicle categories matching backend VehicleCategory enum
    final categories = [
      {
        'id': 'sedan',
        'name': 'Standard',
        'desc': 'Affordable, compact rides',
        'icon': 'sedan',
        'capacity': 4,
      },
      {
        'id': 'suv',
        'name': 'SUV',
        'desc': 'Spacious rides for groups',
        'icon': 'suv',
        'capacity': 6,
      },
      {
        'id': 'xl',
        'name': 'XL',
        'desc': 'Extra space for luggage',
        'icon': 'xl',
        'capacity': 6,
      },
      {
        'id': 'first_class',
        'name': 'Premium',
        'desc': 'Luxury rides for special occasions',
        'icon': 'first_class',
        'capacity': 4,
      },
      {
        'id': 'business_sedan',
        'name': 'Business Sedan',
        'desc': 'Professional rides for business travel',
        'icon': 'business_sedan',
        'capacity': 4,
      },
      {
        'id': 'business_suv',
        'name': 'Business SUV',
        'desc': 'Spacious luxury for executive groups',
        'icon': 'business_suv',
        'capacity': 6,
      },
      {
        'id': 'motorbike',
        'name': 'Moto',
        'desc': 'Fastest way through traffic',
        'icon': 'motorbike',
        'capacity': 1,
      },
      {
        'id': 'cargo_van',
        'name': 'Cargo Van',
        'desc': 'Large items and bulk deliveries',
        'icon': 'cargo_van',
        'capacity': 2,
      },
    ];

    // If we have pickup/dropoff coordinates, get real estimates from backend
    if (pickupLat != null &&
        pickupLng != null &&
        dropoffLat != null &&
        dropoffLng != null) {
      final List<RideOption> options = [];
      for (final cat in categories) {
        try {
          final estimate = await getFareEstimate(
            pickupLat: pickupLat,
            pickupLng: pickupLng,
            dropoffLat: dropoffLat,
            dropoffLng: dropoffLng,
            rideType: cat['id'] as String,
          );
          options.add(
            RideOption(
              id: cat['id'] as String,
              name: cat['name'] as String,
              description: cat['desc'] as String,
              iconPath: cat['icon'] as String,
              // estimatedFare from backend already includes distance — set pricePerKm to 0
              // to avoid double-counting in calculatePrice()
              basePrice:
                  (estimate?['estimatedFare'] ??
                          estimate?['baseFare'] ??
                          estimate?['pricing']?['estimatedFare'] ??
                          0)
                      .toDouble(),
              pricePerKm: 0,
              estimatedMinutes: (() {
                final durationMinutes = estimate?['durationMinutes'];
                if (durationMinutes is num) return durationMinutes.round();

                final estimatedDurationMinutes =
                    estimate?['estimatedDurationMinutes'];
                if (estimatedDurationMinutes is num) {
                  return estimatedDurationMinutes.round();
                }

                final durationSeconds = estimate?['durationSeconds'];
                if (durationSeconds is num) {
                  return (durationSeconds / 60).round();
                }

                return 0;
              })(),
              capacity: cat['capacity'] as int,
            ),
          );
        } catch (e) {
          debugPrint('Failed to get estimate for ${cat['id']}: $e');
        }
      }
      if (options.isNotEmpty) return options;
    }

    // Fallback: return static options without prices (UI should show "Get estimate" or similar)
    return categories
        .map(
          (cat) => RideOption(
            id: cat['id'] as String,
            name: cat['name'] as String,
            description: cat['desc'] as String,
            iconPath: cat['icon'] as String,
            basePrice: 0,
            pricePerKm: 0,
            estimatedMinutes: 0,
            capacity: cat['capacity'] as int,
          ),
        )
        .toList();
  }

  /// Get nearby drivers
  /// Endpoint: GET /api/v1/rides/drivers/nearby?lat=6.5244&lng=3.3792
  Future<List<Driver>> getNearbyDrivers(double lat, double lng) async {
    try {
      final response = await _dio.get(
        '/api/v1/rides/drivers/nearby',
        queryParameters: {
          'lat': lat, // Backend expects 'lat'
          'lng': lng, // Backend expects 'lng'
          'radiusKm': 5,
          // 'vehicleCategory': 'sedan', // Optional filter
        },
      );
      // Backend returns directly the list, not wrapped in data?
      // Checked controller: res.status(200).json(drivers);
      // So it IS the list directly, OR typical express response structure.
      // Wait, backend controller says: res.status(200).json(drivers);.
      // If drivers is an array, then response.data is the array.
      // If drivers is { data: [] }, then response.data['data'].
      // Most of the other endpoints look like they wrap in data, but let's check the controller `findNearbyDrivers` return type.
      // Assuming array for now based on standard pattern, usually we wrap.
      // But looking at getRideHistory it does { success: true, data: ... }.
      // createRide does json(ride), updateRideStatus json(ride).
      // safely handle both.

      final dynamic data = response.data;
      final List<dynamic> driversJson;
      if (data is List) {
        driversJson = data;
      } else if (data is Map && data.containsKey('data')) {
        driversJson = data['data'] ?? [];
      } else {
        driversJson = [];
      }

      return driversJson.map((json) => Driver.fromJson(json)).toList();
    } catch (e) {
      debugPrint('RideService.getNearbyDrivers error: $e');
      return [];
    }
  }

  /// Get fare estimate
  /// Endpoint: POST /api/v1/rides/estimate
  Future<Map<String, dynamic>?> getFareEstimate({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required String rideType,
    String bookingType = 'on_demand',
    int? hoursBooked,
    String? airportCode,
  }) async {
    try {
      final payload = <String, dynamic>{
        'pickup': {'lat': pickupLat, 'lng': pickupLng},
        'dropoff': {'lat': dropoffLat, 'lng': dropoffLng},
        'vehicleCategory': rideType,
        'region': _region,
        'bookingType': bookingType,
      };
      if (hoursBooked != null) {
        payload['hoursBooked'] = hoursBooked;
      }
      if (airportCode != null && airportCode.isNotEmpty) {
        payload['airportCode'] = airportCode;
      }

      final response = await _dio.post(
        '/api/v1/rides/estimate',
        data: payload,
      );
      return _extractMapData(response.data);
    } catch (e) {
      debugPrint('RideService.getFareEstimate error: $e');
      return null;
    }
  }

  /// Create ride request
  /// Endpoint: POST /api/v1/rides
  Future<Map<String, dynamic>?> createRideRequest({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required String rideType,
    String? pickupAddress,
    String? dropoffAddress,
    String paymentMethod = 'wallet',
    String bookingType = 'on_demand',
    int? hoursBooked,
    String? airportCode,
  }) async {
    try {
      final payload = <String, dynamic>{
        'pickup': {
          'lat': pickupLat,
          'lng': pickupLng,
          'address': pickupAddress ?? 'Unknown Location',
        },
        'dropoff': {
          'lat': dropoffLat,
          'lng': dropoffLng,
          'address': dropoffAddress ?? 'Unknown Destination',
        },
        'vehicleCategory': rideType,
        'region': _region,
        'bookingType': bookingType,
        'paymentMethod': paymentMethod,
      };
      if (hoursBooked != null) {
        payload['hoursBooked'] = hoursBooked;
      }
      if (airportCode != null && airportCode.isNotEmpty) {
        payload['airportCode'] = airportCode;
      }

      final response = await _dio.post(
        '/api/v1/rides',
        data: payload,
      );
      final data = _extractMapData(response.data);

      // Map nested backend fields to flat structure expected by BookingState
      return {
        'id': data['id'] ?? data['_id'],
        'status': data['status'],
        'estimatedPrice': data['pricing']?['estimatedFare'] ?? data['estimatedFare'],
        'distanceKm':
            data['distanceKm'] ??
            0.0, // Might be missing, BookingState should fallback
        // Add other fields if needed
      };
    } catch (e) {
      debugPrint('RideService.createRideRequest error: $e');
      throw Exception('Failed to create ride request');
    }
  }

  /// Get ride details
  /// Endpoint: GET /api/v1/rides/{{rideId}}
  Future<Map<String, dynamic>?> getRideDetails(String rideId) async {
    try {
      final response = await _dio.get('/api/v1/rides/$rideId');
      return _extractMapData(response.data);
    } catch (e) {
      debugPrint('RideService.getRideDetails error: $e');
      throw Exception('Failed to get ride details');
    }
  }

  /// Rate driver
  /// Endpoint: POST /api/v1/rides/{{rideId}}/rate
  Future<bool> rateDriver({
    required String rideId,
    required int rating,
    String? comment,
  }) async {
    try {
      await _dio.post(
        '/api/v1/rides/$rideId/rate',
        data: {'rating': rating, 'feedback': comment},
      );
      return true;
    } catch (e) {
      debugPrint('RideService.rateDriver error: $e');
      return false;
    }
  }

  /// Add tip to ride
  /// Endpoint: POST /api/v1/rides/{{rideId}}/tip
  Future<bool> addTip({required String rideId, required double amount}) async {
    try {
      await _dio.post('/api/v1/rides/$rideId/tip', data: {'amount': amount});
      return true;
    } catch (e) {
      debugPrint('RideService.addTip error: $e');
      return false;
    }
  }

  /// Get ride history
  /// Endpoint: GET /api/v1/rides/history?page=1&limit=10
  Future<List<dynamic>> getRideHistory({int page = 1, int limit = 10}) async {
    try {
      final response = await _dio.get(
        '/api/v1/rides/history',
        queryParameters: {'page': page, 'limit': limit},
      );
      return response.data['data'] ?? [];
    } catch (e) {
      debugPrint('RideService.getRideHistory error: $e');
      return [];
    }
  }

  /// Cancel ride (uses existing status transition endpoint)
  /// Backend requires a reason (3-300 chars) for cancellation.
  Future<bool> cancelRide(String rideId, {String? reason}) async {
    try {
      await _dio.put(
        '/api/v1/rides/$rideId/status',
        data: {
          'status': 'cancelled',
          'reason': (reason != null && reason.trim().length >= 3)
              ? reason.trim()
              : 'Cancelled by rider',
        },
      );
      return true;
    } catch (e) {
      debugPrint('RideService.cancelRide error: $e');
      return false;
    }
  }

  /// Complete ride — notifies backend of rider-confirmed completion
  Future<bool> completeRide(String rideId) async {
    try {
      await _dio.put(
        '/api/v1/rides/$rideId/status',
        data: {'status': 'completed'},
      );
      return true;
    } catch (e) {
      debugPrint('RideService.completeRide error: $e');
      return false;
    }
  }
}
