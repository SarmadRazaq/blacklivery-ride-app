import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_polyline_points/flutter_polyline_points.dart';
import '../../../../core/constants/api_constants.dart';

class NavigationService {
  final Dio _dio = Dio();

  Future<List<LatLng>> getRoute(LatLng origin, LatLng destination) async {
    final String apiKey = ApiConstants.googleMapsApiKey;

    if (apiKey.isEmpty || apiKey == 'YOUR_GOOGLE_MAPS_API_KEY') {
      debugPrint('NavigationService: Google Maps API key not configured');
      return [];
    }

    final String url =
        'https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=$apiKey';

    try {
      final response = await _dio.get(url);
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = response.data;
        if ((data['routes'] as List).isNotEmpty) {
          final String encodedPolyline =
              data['routes'][0]['overview_polyline']['points'];
          final PolylinePoints polylinePoints = PolylinePoints();
          final List<PointLatLng> result = polylinePoints.decodePolyline(
            encodedPolyline,
          );

          return result
              .map((point) => LatLng(point.latitude, point.longitude))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('NavigationService: Error fetching route - $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> getRouteWithDetails(
    LatLng origin,
    LatLng destination,
  ) async {
    final String apiKey = ApiConstants.googleMapsApiKey;

    if (apiKey.isEmpty || apiKey == 'YOUR_GOOGLE_MAPS_API_KEY') {
      debugPrint('NavigationService: Google Maps API key not configured');
      return null;
    }

    final String url =
        'https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=$apiKey';

    try {
      final response = await _dio.get(url);
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = response.data;
        if ((data['routes'] as List).isNotEmpty) {
          final route = data['routes'][0];
          final leg = route['legs'][0];
          final String encodedPolyline = route['overview_polyline']['points'];
          final PolylinePoints polylinePoints = PolylinePoints();
          final List<PointLatLng> points = polylinePoints.decodePolyline(
            encodedPolyline,
          );

          return {
            'polyline': points
                .map((p) => LatLng(p.latitude, p.longitude))
                .toList(),
            'distance': leg['distance']['text'],
            'distanceValue': leg['distance']['value'], // in meters
            'duration': leg['duration']['text'],
            'durationValue': leg['duration']['value'], // in seconds
            'startAddress': leg['start_address'],
            'endAddress': leg['end_address'],
          };
        }
      }
      return null;
    } catch (e) {
      debugPrint('NavigationService: Error fetching route details - $e');
      return null;
    }
  }

  String getGoogleMapsUrl(double lat, double lng) {
    return 'https://www.google.com/maps/search/?api=1&query=$lat,$lng';
  }

  String getGoogleMapsNavigationUrl(double destLat, double destLng) {
    return 'https://www.google.com/maps/dir/?api=1&destination=$destLat,$destLng&travelmode=driving';
  }
}
