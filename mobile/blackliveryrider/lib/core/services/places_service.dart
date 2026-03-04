import 'package:dio/dio.dart';
import '../network/api_client.dart';
import '../models/location_model.dart';
import '../models/saved_place_model.dart';

class PlacesService {
  final Dio _dio = ApiClient().dio;

  /// Get user's saved places (home, work, other)
  Future<List<SavedPlace>> getSavedPlaces() async {
    try {
      final response = await _dio.get('/api/v1/places/saved');
      final List<dynamic> placesJson = response.data['data'] ?? [];
      return placesJson.map((json) => SavedPlace.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Add a new saved place
  Future<SavedPlace?> addSavedPlace(SavedPlace place) async {
    try {
      final response = await _dio.post(
        '/api/v1/places/saved',
        data: place.toJson(),
      );
      return SavedPlace.fromJson(response.data['data']);
    } catch (e) {
      return null;
    }
  }

  /// Update a saved place
  Future<SavedPlace?> updateSavedPlace(SavedPlace place) async {
    try {
      final response = await _dio.put(
        '/api/v1/places/saved/${place.id}',
        data: place.toJson(),
      );
      return SavedPlace.fromJson(response.data['data']);
    } catch (e) {
      return null;
    }
  }

  /// Delete a saved place
  Future<bool> deleteSavedPlace(String placeId) async {
    try {
      await _dio.delete('/api/v1/places/saved/$placeId');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get recent locations
  Future<List<Location>> getRecentLocations() async {
    try {
      final response = await _dio.get('/api/v1/places/recent');
      final List<dynamic> locationsJson = response.data['data'] ?? [];
      return locationsJson.map((json) => Location.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Search locations by query
  Future<List<Location>> searchLocations(String query) async {
    if (query.isEmpty) {
      return getRecentLocations();
    }
    
    try {
      final response = await _dio.get(
        '/api/v1/places/search',
        queryParameters: {'q': query},
      );
      final List<dynamic> locationsJson = response.data['data'] ?? [];
      return locationsJson.map((json) {
        // Backend now returns name/address/id, but also handle legacy mainText/description
        final map = json as Map<String, dynamic>;
        return Location(
          id: map['id']?.toString() ?? map['placeId']?.toString() ?? '',
          name: map['name']?.toString() ??
              map['mainText']?.toString() ??
              map['description']?.toString() ??
              '',
          address: map['address']?.toString() ??
              map['description']?.toString() ??
              map['secondaryText']?.toString() ??
              '',
          latitude: (map['lat'] as num?)?.toDouble() ??
              (map['latitude'] as num?)?.toDouble() ??
              0.0,
          longitude: (map['lng'] as num?)?.toDouble() ??
              (map['longitude'] as num?)?.toDouble() ??
              0.0,
        );
      }).toList();
    } catch (e) {
      return [];
    }
  }

  /// Get place details (coordinates) from a Google Place ID
  Future<Location?> getPlaceDetails(String placeId) async {
    try {
      final response = await _dio.get(
        '/api/v1/places/details/$placeId',
        options: Options(extra: {'suppressGlobalError': true}),
      );
      final data = response.data['data'];
      if (data == null) return null;
      return Location.fromJson(data);
    } catch (e) {
      return null;
    }
  }

  /// Add a location to recent history
  Future<void> addToRecentLocations(Location location) async {
    try {
      await _dio.post(
        '/api/v1/places/recent',
        data: location.toJson(),
      );
    } catch (e) {
      // Silently fail
    }
  }
}
