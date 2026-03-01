import 'package:flutter_test/flutter_test.dart';
import 'package:blackliveryrider/core/models/booking_model.dart';
import 'package:blackliveryrider/core/models/location_model.dart';
import 'package:blackliveryrider/core/models/ride_option_model.dart';

void main() {
  // Reusable minimal JSON fragments
  final pickupJson = {
    'id': 'loc1',
    'name': 'Home',
    'address': '123 Main St',
    'latitude': 6.5244,
    'longitude': 3.3792,
  };
  final dropoffJson = {
    'id': 'loc2',
    'name': 'Office',
    'address': '456 Business Ave',
    'latitude': 6.6018,
    'longitude': 3.3515,
  };
  final rideOptionJson = {
    'id': 'eco',
    'name': 'Economy',
    'description': 'Affordable',
    'iconPath': 'car.png',
    'basePrice': 500.0,
    'pricePerKm': 100.0,
    'estimatedMinutes': 15,
    'capacity': 4,
  };

  group('Booking.fromJson', () {
    test('parses full JSON with driver', () {
      final json = {
        'id': 'b1',
        'pickup': pickupJson,
        'dropoff': dropoffJson,
        'rideOption': rideOptionJson,
        'driver': {
          'id': 'd1',
          'name': 'Chidi',
          'photoUrl': 'photo.png',
          'rating': 4.9,
          'totalRides': 300,
          'carModel': 'Toyota Camry',
          'carColor': 'Black',
          'licensePlate': 'LAG-123',
          'phone': '+234800',
          'latitude': 6.52,
          'longitude': 3.38,
        },
        'scheduledTime': '2025-01-15T10:00:00.000Z',
        'estimatedPrice': 2500.0,
        'distanceKm': 12.5,
        'status': 'confirmed',
        'isForSomeoneElse': true,
        'recipientName': 'Ada',
        'recipientPhone': '+234801',
      };

      final booking = Booking.fromJson(json);
      expect(booking.id, 'b1');
      expect(booking.pickup.name, 'Home');
      expect(booking.dropoff.name, 'Office');
      expect(booking.rideOption.name, 'Economy');
      expect(booking.driver, isNotNull);
      expect(booking.driver!.name, 'Chidi');
      expect(booking.estimatedPrice, 2500.0);
      expect(booking.distanceKm, 12.5);
      expect(booking.status, 'confirmed');
      expect(booking.isForSomeoneElse, true);
      expect(booking.recipientName, 'Ada');
      expect(booking.recipientPhone, '+234801');
    });

    test('handles null driver gracefully', () {
      final json = {
        'id': 'b2',
        'pickup': pickupJson,
        'dropoff': dropoffJson,
        'rideOption': rideOptionJson,
        'scheduledTime': '2025-01-15T10:00:00.000Z',
        'estimatedPrice': 1000,
        'distanceKm': 5,
        'status': 'pending',
      };

      final booking = Booking.fromJson(json);
      expect(booking.driver, isNull);
      expect(booking.isForSomeoneElse, false);
      expect(booking.recipientName, isNull);
    });

    test('defaults missing fields to safe values', () {
      final booking = Booking.fromJson({});
      expect(booking.id, '');
      expect(booking.estimatedPrice, 0.0);
      expect(booking.distanceKm, 0.0);
      expect(booking.status, 'pending');
      expect(booking.isForSomeoneElse, false);
    });

    test('parses estimatedPrice as int (num cast)', () {
      final booking = Booking.fromJson({
        'estimatedPrice': 2000, // int, not double
        'distanceKm': 10,
      });
      expect(booking.estimatedPrice, 2000.0);
      expect(booking.distanceKm, 10.0);
    });
  });

  group('Booking.toJson', () {
    test('serializes all fields', () {
      final booking = Booking(
        id: 'b1',
        pickup: Location(id: 'l1', name: 'A', address: 'Addr', latitude: 1.0, longitude: 2.0),
        dropoff: Location(id: 'l2', name: 'B', address: 'Addr2', latitude: 3.0, longitude: 4.0),
        rideOption: RideOption(
          id: 'r1', name: 'Economy', description: 'Cheap',
          iconPath: '', basePrice: 500, pricePerKm: 100,
          estimatedMinutes: 10, capacity: 4,
        ),
        scheduledTime: DateTime.utc(2025, 1, 15, 10, 0),
        estimatedPrice: 1500,
        distanceKm: 8.0,
        status: 'pending',
        isForSomeoneElse: true,
        recipientName: 'Tunde',
        recipientPhone: '+234',
      );

      final json = booking.toJson();
      expect(json['id'], 'b1');
      expect(json['status'], 'pending');
      expect(json['isForSomeoneElse'], true);
      expect(json['recipientName'], 'Tunde');
      expect(json['pickup'], isA<Map>());
      expect(json['rideOption'], isA<Map>());
      expect(json['scheduledTime'], contains('2025-01-15'));
    });

    test('serializes null driver as null', () {
      final booking = Booking(
        id: 'b2',
        pickup: Location(id: '', name: '', address: '', latitude: 0, longitude: 0),
        dropoff: Location(id: '', name: '', address: '', latitude: 0, longitude: 0),
        rideOption: RideOption(
          id: '', name: '', description: '',
          iconPath: '', basePrice: 0, pricePerKm: 0,
          estimatedMinutes: 0, capacity: 4,
        ),
        scheduledTime: DateTime.now(),
        estimatedPrice: 0,
        distanceKm: 0,
        status: 'pending',
      );
      expect(booking.toJson()['driver'], isNull);
    });
  });

  group('Booking.copyWith', () {
    late Booking original;
    setUp(() {
      original = Booking(
        id: 'b1',
        pickup: Location(id: 'l1', name: 'A', address: '', latitude: 0, longitude: 0),
        dropoff: Location(id: 'l2', name: 'B', address: '', latitude: 0, longitude: 0),
        rideOption: RideOption(
          id: 'r1', name: 'Economy', description: '',
          iconPath: '', basePrice: 500, pricePerKm: 100,
          estimatedMinutes: 10, capacity: 4,
        ),
        scheduledTime: DateTime.utc(2025, 1, 1),
        estimatedPrice: 1000,
        distanceKm: 5,
        status: 'pending',
      );
    });

    test('preserves all fields when no overrides given', () {
      final copy = original.copyWith();
      expect(copy.id, original.id);
      expect(copy.status, original.status);
      expect(copy.estimatedPrice, original.estimatedPrice);
    });

    test('overrides status', () {
      final copy = original.copyWith(status: 'confirmed');
      expect(copy.status, 'confirmed');
      expect(copy.id, 'b1'); // unchanged
    });

    test('overrides estimatedPrice', () {
      final copy = original.copyWith(estimatedPrice: 2000);
      expect(copy.estimatedPrice, 2000);
    });

    test('overrides isForSomeoneElse and recipient', () {
      final copy = original.copyWith(
        isForSomeoneElse: true,
        recipientName: 'Ada',
        recipientPhone: '+234',
      );
      expect(copy.isForSomeoneElse, true);
      expect(copy.recipientName, 'Ada');
      expect(copy.recipientPhone, '+234');
    });
  });
}
