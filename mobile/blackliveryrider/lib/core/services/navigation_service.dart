import 'package:dio/dio.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../config/env_config.dart';

class NavigationService {
  // For Maps SDK (Android/iOS), check AndroidManifest/AppDelegate
  static String get _googleApiKey => EnvConfig.googleMapsApiKey;

  // Shared Dio instance to avoid creating a new one on every call
  static final Dio _externalDio = Dio();

  Future<Map<String, dynamic>> getRoute(
    LatLng origin,
    LatLng destination,
  ) async {
    try {
      final String url =
          'https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=$_googleApiKey';

      // Use shared static Dio to avoid creating a new instance on every call
      final response = await _externalDio.get(url);

      if (response.statusCode == 200) {
        if (response.data['status'] == 'OK') {
          return response.data;
        } else {
          throw Exception(
            'Directions API Error: ${response.data['status']} - ${response.data['error_message']}',
          );
        }
      } else {
        throw Exception('Failed to load route');
      }
    } catch (e) {
      throw Exception('Failed to fetch directions: $e');
    }
  }

  List<LatLng> decodePolyline(String encoded) {
    List<LatLng> poly = [];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      LatLng p = LatLng((lat / 1E5).toDouble(), (lng / 1E5).toDouble());
      poly.add(p);
    }
    return poly;
  }
}
