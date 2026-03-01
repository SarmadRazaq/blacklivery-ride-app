import 'package:flutter_test/flutter_test.dart';
import 'package:driver/features/auth/data/models/vehicle_model.dart';

void main() {
  group('Vehicle.fromJson', () {
    test('parses all fields', () {
      final v = Vehicle.fromJson({
        'id': 'v1',
        'name': 'Toyota Camry',
        'year': 2022,
        'plateNumber': 'LAG-001-AB',
        'status': 'Active',
        'seats': 4,
        'category': 'ride',
      });
      expect(v.id, 'v1');
      expect(v.name, 'Toyota Camry');
      expect(v.year, '2022'); // converted to String
      expect(v.plateNumber, 'LAG-001-AB');
      expect(v.status, 'Active');
      expect(v.seats, 4);
      expect(v.category, 'ride');
    });

    test('status from isApproved=true → "Active"', () {
      final v = Vehicle.fromJson({
        'id': 'v2',
        'name': 'Honda Civic',
        'year': '2021',
        'plateNumber': 'ABJ-002',
        'isApproved': true,
      });
      expect(v.status, 'Active');
    });

    test('status from isApproved=false → "Pending"', () {
      final v = Vehicle.fromJson({
        'id': 'v3',
        'name': 'Kia Rio',
        'year': 2020,
        'plateNumber': 'LAG-003',
        'isApproved': false,
      });
      expect(v.status, 'Pending');
    });

    test('status field takes precedence over isApproved', () {
      final v = Vehicle.fromJson({
        'id': 'v4',
        'name': 'BMW X5',
        'year': 2023,
        'plateNumber': 'LAG-004',
        'status': 'Suspended',
        'isApproved': true,
      });
      expect(v.status, 'Suspended');
    });

    test('defaults seats to 4 and category to "ride"', () {
      final v = Vehicle.fromJson({'id': 'v5', 'name': 'Test'});
      expect(v.seats, 4);
      expect(v.category, 'ride');
    });

    test('year converts int to string', () {
      final v = Vehicle.fromJson({'year': 2024});
      expect(v.year, '2024');
    });

    test('year handles string input', () {
      final v = Vehicle.fromJson({'year': '2023'});
      expect(v.year, '2023');
    });

    test('handles empty json', () {
      final v = Vehicle.fromJson({});
      expect(v.id, '');
      expect(v.name, '');
      expect(v.year, '');
      expect(v.plateNumber, '');
      expect(v.status, 'Pending'); // null isApproved → Pending
    });
  });

  group('Vehicle.toJson', () {
    test('serializes all fields', () {
      final v = Vehicle(
        id: 'v1',
        name: 'Corolla',
        year: '2022',
        plateNumber: 'LAG-001',
        status: 'Active',
        seats: 4,
        category: 'ride',
      );
      final json = v.toJson();
      expect(json['name'], 'Corolla');
      expect(json['year'], '2022');
      expect(json['plateNumber'], 'LAG-001');
      expect(json['seats'], 4);
      expect(json['category'], 'ride');
    });

    test('roundtrip preserves data', () {
      final original = Vehicle.fromJson({
        'id': 'v1',
        'name': 'Camry',
        'year': 2022,
        'plateNumber': 'LAG-001',
        'seats': 5,
        'category': 'delivery',
        'status': 'Active',
      });
      final json = original.toJson();
      expect(json['name'], 'Camry');
      expect(json['year'], '2022');
      expect(json['seats'], 5);
      expect(json['category'], 'delivery');
    });
  });
}
