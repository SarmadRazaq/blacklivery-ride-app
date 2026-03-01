import 'package:flutter_test/flutter_test.dart';
import 'package:blackliveryrider/core/models/ride_history_model.dart';

void main() {
  group('RideDriver.fromJson', () {
    test('parses all fields directly', () {
      final d = RideDriver.fromJson({
        'name': 'Emeka',
        'rating': 4.8,
        'photoUrl': 'photo.png',
        'vehicleColor': 'White',
        'plateNumber': 'LAG-001',
        'vehicleModel': 'Camry',
      });
      expect(d.name, 'Emeka');
      expect(d.rating, 4.8);
      expect(d.vehicleColor, 'White');
      expect(d.plateNumber, 'LAG-001');
      expect(d.vehicleModel, 'Camry');
    });

    test('falls back to nested vehicle object', () {
      final d = RideDriver.fromJson({
        'name': 'Tunde',
        'rating': 4.5,
        'photoUrl': '',
        'vehicle': {
          'color': 'Red',
          'plateNumber': 'ABJ-999',
          'model': 'Corolla',
        },
      });
      expect(d.vehicleColor, 'Red');
      expect(d.plateNumber, 'ABJ-999');
      expect(d.vehicleModel, 'Corolla');
    });

    test('defaults for empty map', () {
      final d = RideDriver.fromJson({});
      expect(d.name, '');
      expect(d.rating, 0.0);
      expect(d.photoUrl, '');
      expect(d.vehicleColor, isNull);
      expect(d.plateNumber, isNull);
      expect(d.vehicleModel, isNull);
    });
  });

  group('RideHistoryItem.fromJson', () {
    test('parses all fields with driver', () {
      final item = RideHistoryItem.fromJson({
        'id': 'r1',
        'pickupAddress': '123 Main St',
        'dropoffAddress': '456 Office Blvd',
        'date': '2025-01-15T10:00:00.000Z',
        'time': '10:00 AM',
        'price': 2500.0,
        'status': 'completed',
        'driver': {
          'name': 'Chidi',
          'rating': 4.9,
          'photoUrl': 'p.png',
        },
        'rideType': 'Premium',
        'paymentMethod': 'card',
        'currency': 'NGN',
        'pickupLat': 6.5,
        'pickupLng': 3.3,
        'dropoffLat': 6.6,
        'dropoffLng': 3.4,
      });
      expect(item.id, 'r1');
      expect(item.pickupAddress, '123 Main St');
      expect(item.price, 2500.0);
      expect(item.status, 'completed');
      expect(item.driver, isNotNull);
      expect(item.driver!.name, 'Chidi');
      expect(item.rideType, 'Premium');
      expect(item.currency, 'NGN');
      expect(item.pickupLat, 6.5);
    });

    test('coordinate fallback to nested pickup/dropoff objects', () {
      final item = RideHistoryItem.fromJson({
        'id': 'r2',
        'pickup': {'lat': 41.8, 'lng': -87.6},
        'dropoff': {'lat': 41.9, 'lng': -87.7},
        'date': '2025-01-01T00:00:00.000Z',
      });
      expect(item.pickupLat, 41.8);
      expect(item.pickupLng, -87.6);
      expect(item.dropoffLat, 41.9);
      expect(item.dropoffLng, -87.7);
    });

    test('null driver when not present', () {
      final item = RideHistoryItem.fromJson({'id': 'r3'});
      expect(item.driver, isNull);
    });

    test('defaults status to "pending" and rideType to "Economy"', () {
      final item = RideHistoryItem.fromJson({});
      expect(item.status, 'pending');
      expect(item.rideType, 'Economy');
    });

    test('parses price as int (num cast)', () {
      final item = RideHistoryItem.fromJson({
        'price': 3000, // int
      });
      expect(item.price, 3000.0);
    });
  });

  group('RideHistoryItem.toJson', () {
    test('serializes all fields including driver', () {
      final item = RideHistoryItem(
        id: 'r1',
        pickupAddress: 'A',
        dropoffAddress: 'B',
        date: DateTime.utc(2025, 6, 1),
        time: '10:00',
        price: 1500,
        status: 'completed',
        driver: RideDriver(name: 'D', rating: 4.5, photoUrl: ''),
        rideType: 'Economy',
        paymentMethod: 'wallet',
        currency: 'NGN',
        pickupLat: 6.5,
        pickupLng: 3.3,
        dropoffLat: 6.6,
        dropoffLng: 3.4,
      );
      final json = item.toJson();
      expect(json['id'], 'r1');
      expect(json['price'], 1500);
      expect(json['driver'], isNotNull);
      expect(json['driver']['name'], 'D');
      expect(json['currency'], 'NGN');
      expect(json['pickupLat'], 6.5);
    });

    test('null driver serializes as null', () {
      final item = RideHistoryItem(
        id: 'r2',
        pickupAddress: '',
        dropoffAddress: '',
        date: DateTime.now(),
        time: '',
        price: 0,
        status: 'pending',
        rideType: 'Economy',
      );
      expect(item.toJson()['driver'], isNull);
    });

    test('roundtrip preserves data', () {
      final original = RideHistoryItem.fromJson({
        'id': 'r3',
        'pickupAddress': 'Home',
        'dropoffAddress': 'Office',
        'date': '2025-03-01T08:00:00.000Z',
        'time': '8:00 AM',
        'price': 5000,
        'status': 'completed',
        'rideType': 'Premium',
        'currency': 'USD',
      });
      final restored = RideHistoryItem.fromJson(original.toJson());
      expect(restored.id, 'r3');
      expect(restored.pickupAddress, 'Home');
      expect(restored.price, 5000);
      expect(restored.currency, 'USD');
    });
  });
}
