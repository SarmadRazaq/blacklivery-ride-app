import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:blackliveryrider/core/services/navigation_service.dart';

void main() {
  group('NavigationService', () {
    late NavigationService navigationService;

    setUp(() {
      navigationService = NavigationService();
    });

    test('decodePolyline decodes correctly', () {
      // Example polyline for a short straight line
      const String encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

      final points = navigationService.decodePolyline(encoded);

      expect(points, isA<List<LatLng>>());
      expect(points.isNotEmpty, true);
    });
  });
}
