import 'package:flutter_test/flutter_test.dart';
import 'package:blackliveryrider/core/models/location_model.dart';
import 'package:blackliveryrider/core/models/driver_model.dart';
import 'package:blackliveryrider/core/models/ride_option_model.dart';
import 'package:blackliveryrider/core/models/saved_place_model.dart';
import 'package:blackliveryrider/core/models/emergency_contact_model.dart';

void main() {
  // ============================= Location ====================================
  group('Location', () {
    test('fromJson parses all fields', () {
      final loc = Location.fromJson({
        'id': 'l1',
        'name': 'Home',
        'address': '123 Main St',
        'latitude': 6.5244,
        'longitude': 3.3792,
        'lastUsed': '2025-01-01T00:00:00.000Z',
      });
      expect(loc.id, 'l1');
      expect(loc.name, 'Home');
      expect(loc.latitude, 6.5244);
      expect(loc.longitude, 3.3792);
      expect(loc.lastUsed, isNotNull);
    });

    test('fromJson defaults for empty map', () {
      final loc = Location.fromJson({});
      expect(loc.id, '');
      expect(loc.name, '');
      expect(loc.latitude, 0.0);
      expect(loc.longitude, 0.0);
      expect(loc.lastUsed, isNull);
    });

    test('toJson includes all fields', () {
      final loc = Location(
        id: 'l1',
        name: 'A',
        address: 'B',
        latitude: 1.0,
        longitude: 2.0,
        lastUsed: DateTime.utc(2025, 6, 1),
      );
      final json = loc.toJson();
      expect(json['id'], 'l1');
      expect(json['latitude'], 1.0);
      expect(json['lastUsed'], contains('2025'));
    });

    test('toJson with null lastUsed', () {
      final loc = Location(id: '', name: '', address: '', latitude: 0, longitude: 0);
      expect(loc.toJson()['lastUsed'], isNull);
    });
  });

  // ============================= Driver ======================================
  group('Driver', () {
    test('fromJson parses all fields', () {
      final d = Driver.fromJson({
        'id': 'd1',
        'name': 'Chidi',
        'photoUrl': 'pic.png',
        'rating': 4.9,
        'totalRides': 200,
        'carModel': 'Corolla',
        'carColor': 'Black',
        'licensePlate': 'LAG-001',
        'phone': '+234800',
        'latitude': 6.5,
        'longitude': 3.3,
      });
      expect(d.id, 'd1');
      expect(d.name, 'Chidi');
      expect(d.rating, 4.9);
      expect(d.totalRides, 200);
      expect(d.carModel, 'Corolla');
      expect(d.phone, '+234800');
    });

    test('name defaults to "Unknown Driver"', () {
      final d = Driver.fromJson({});
      expect(d.name, 'Unknown Driver');
    });

    test('phone falls back to phoneNumber', () {
      final d = Driver.fromJson({'phoneNumber': '+1555'});
      expect(d.phone, '+1555');
    });

    test('numeric fields default to 0', () {
      final d = Driver.fromJson({});
      expect(d.rating, 0.0);
      expect(d.totalRides, 0);
      expect(d.latitude, 0.0);
      expect(d.longitude, 0.0);
    });
  });

  // ============================= RideOption ==================================
  group('RideOption', () {
    test('fromJson parses all fields', () {
      final r = RideOption.fromJson({
        'id': 'premium',
        'name': 'Premium',
        'description': 'Luxury',
        'iconPath': 'premium.png',
        'basePrice': 1500.0,
        'pricePerKm': 200.0,
        'estimatedMinutes': 20,
        'capacity': 4,
      });
      expect(r.id, 'premium');
      expect(r.name, 'Premium');
      expect(r.basePrice, 1500.0);
      expect(r.pricePerKm, 200.0);
      expect(r.capacity, 4);
    });

    test('defaults capacity to 4 when missing', () {
      final r = RideOption.fromJson({});
      expect(r.capacity, 4);
    });

    test('calculatePrice computes base + perKm * distance', () {
      final r = RideOption(
        id: 'eco',
        name: 'Economy',
        description: '',
        iconPath: '',
        basePrice: 500,
        pricePerKm: 100,
        estimatedMinutes: 10,
        capacity: 4,
      );
      expect(r.calculatePrice(10), 1500); // 500 + 100*10
      expect(r.calculatePrice(0), 500);   // base only
    });

    test('toJson roundtrip', () {
      final original = RideOption.fromJson({
        'id': 'eco',
        'name': 'Economy',
        'description': 'Affordable',
        'iconPath': 'car.png',
        'basePrice': 500,
        'pricePerKm': 100,
        'estimatedMinutes': 15,
        'capacity': 4,
      });
      final json = original.toJson();
      final restored = RideOption.fromJson(json);
      expect(restored.id, original.id);
      expect(restored.name, original.name);
      expect(restored.basePrice, original.basePrice);
      expect(restored.pricePerKm, original.pricePerKm);
    });
  });

  // ============================= SavedPlace ==================================
  group('SavedPlace', () {
    test('fromJson parses all fields', () {
      final sp = SavedPlace.fromJson({
        'id': 'sp1',
        'name': 'Home',
        'address': '123 Main St',
        'type': 'home',
        'latitude': 6.5,
        'longitude': 3.3,
      });
      expect(sp.id, 'sp1');
      expect(sp.type, 'home');
      expect(sp.latitude, 6.5);
    });

    test('type defaults to "other"', () {
      final sp = SavedPlace.fromJson({});
      expect(sp.type, 'other');
    });

    test('toJson roundtrip', () {
      final original = SavedPlace(
        id: 'sp1',
        name: 'Work',
        address: '789 Office Blvd',
        type: 'work',
        latitude: 41.8,
        longitude: -87.6,
      );
      final restored = SavedPlace.fromJson(original.toJson());
      expect(restored.id, 'sp1');
      expect(restored.name, 'Work');
      expect(restored.type, 'work');
      expect(restored.latitude, 41.8);
    });
  });

  // ============================= EmergencyContact ============================
  group('EmergencyContact', () {
    test('fromJson parses all fields', () {
      final ec = EmergencyContact.fromJson({
        'id': 'ec1',
        'name': 'Mum',
        'phone': '+234801234567',
      });
      expect(ec.id, 'ec1');
      expect(ec.name, 'Mum');
      expect(ec.phone, '+234801234567');
    });

    test('fromJson defaults empty strings', () {
      final ec = EmergencyContact.fromJson({});
      expect(ec.id, '');
      expect(ec.name, '');
      expect(ec.phone, '');
    });

    test('toJson roundtrip', () {
      final original = EmergencyContact(id: 'ec1', name: 'Dad', phone: '+1555');
      final restored = EmergencyContact.fromJson(original.toJson());
      expect(restored.id, 'ec1');
      expect(restored.name, 'Dad');
      expect(restored.phone, '+1555');
    });
  });
}
