import 'package:flutter_test/flutter_test.dart';
import 'package:driver/features/ride/data/models/ride_model.dart';

void main() {
  // ============================= RideLocation ================================
  group('RideLocation', () {
    test('fromJson parses all fields', () {
      final loc = RideLocation.fromJson({
        'lat': 6.5244,
        'lng': 3.3792,
        'address': '123 Main St, Lagos',
      });
      expect(loc.lat, 6.5244);
      expect(loc.lng, 3.3792);
      expect(loc.address, '123 Main St, Lagos');
    });

    test('fromJson defaults for empty map', () {
      final loc = RideLocation.fromJson({});
      expect(loc.lat, 0.0);
      expect(loc.lng, 0.0);
      expect(loc.address, '');
    });

    test('toJson roundtrip', () {
      final loc = RideLocation(lat: 41.8, lng: -87.6, address: 'Chicago');
      final json = loc.toJson();
      final restored = RideLocation.fromJson(json);
      expect(restored.lat, 41.8);
      expect(restored.lng, -87.6);
      expect(restored.address, 'Chicago');
    });
  });

  // ============================= RidePricing =================================
  group('RidePricing', () {
    test('fromJson parses all fields', () {
      final p = RidePricing.fromJson({
        'estimatedFare': 2500.0,
        'finalFare': 2700.0,
        'currency': 'NGN',
        'distance': 12.5,
        'tips': 500.0,
      });
      expect(p.estimatedFare, 2500.0);
      expect(p.finalFare, 2700.0);
      expect(p.currency, 'NGN');
      expect(p.distance, 12.5);
      expect(p.tips, 500.0);
    });

    test('defaults for empty map', () {
      final p = RidePricing.fromJson({});
      expect(p.estimatedFare, 0.0);
      expect(p.finalFare, isNull);
      expect(p.currency, 'NGN');
      expect(p.distance, 0.0);
      expect(p.tips, 0.0);
    });

    test('handles int amounts (num cast)', () {
      final p = RidePricing.fromJson({
        'estimatedFare': 3000,
        'distance': 10,
      });
      expect(p.estimatedFare, 3000.0);
      expect(p.distance, 10.0);
    });

    test('toJson roundtrip', () {
      final p = RidePricing(estimatedFare: 2000, finalFare: 2200, currency: 'USD', distance: 8, tips: 100);
      final restored = RidePricing.fromJson(p.toJson());
      expect(restored.estimatedFare, 2000);
      expect(restored.finalFare, 2200);
      expect(restored.currency, 'USD');
    });
  });

  // ============================= RidePayment =================================
  group('RidePayment', () {
    test('extracts driverAmount from nested settlement', () {
      final p = RidePayment.fromJson({
        'status': 'completed',
        'gateway': 'paystack',
        'settlement': {'driverAmount': 1800.0},
      });
      expect(p.status, 'completed');
      expect(p.gateway, 'paystack');
      expect(p.driverAmount, 1800.0);
    });

    test('driverAmount is null when no settlement', () {
      final p = RidePayment.fromJson({'status': 'pending'});
      expect(p.driverAmount, isNull);
    });

    test('toJson wraps driverAmount in settlement', () {
      final p = RidePayment(status: 'done', gateway: 'stripe', driverAmount: 1500);
      final json = p.toJson();
      expect(json['settlement']['driverAmount'], 1500);
    });

    test('toJson settlement is null when driverAmount is null', () {
      final p = RidePayment(status: 'pending');
      expect(p.toJson()['settlement'], isNull);
    });
  });

  // ============================= Rider =======================================
  group('Rider', () {
    test('fromJson parses all fields', () {
      final r = Rider.fromJson({
        'id': 'r1',
        'displayName': 'Ada Okafor',
        'phoneNumber': '+234801',
        'photoURL': 'photo.png',
        'rating': 4.8,
        'quietMode': true,
      });
      expect(r.id, 'r1');
      expect(r.name, 'Ada Okafor');
      expect(r.phone, '+234801');
      expect(r.image, 'photo.png');
      expect(r.rating, 4.8);
      expect(r.quietMode, true);
    });

    test('name falls back: displayName → name → "Rider"', () {
      expect(Rider.fromJson({'name': 'Tunde'}).name, 'Tunde');
      expect(Rider.fromJson({}).name, 'Rider');
    });

    test('id from uid fallback', () {
      expect(Rider.fromJson({'uid': 'fb1'}).id, 'fb1');
    });

    test('phone from phoneNumber preferred', () {
      final r = Rider.fromJson({'phoneNumber': '+234', 'phone': '+1'});
      expect(r.phone, '+234');
    });

    test('image from photoURL preferred', () {
      final r = Rider.fromJson({'photoURL': 'a.png', 'image': 'b.png'});
      expect(r.image, 'a.png');
    });

    test('rating defaults to 5.0', () {
      expect(Rider.fromJson({}).rating, 5.0);
    });

    test('quietMode from nested preferences', () {
      final r = Rider.fromJson({
        'preferences': {'quietMode': true},
      });
      expect(r.quietMode, true);
    });

    test('quietMode defaults to false', () {
      expect(Rider.fromJson({}).quietMode, false);
    });
  });

  // ============================= Ride ========================================
  group('Ride', () {
    final fullJson = {
      'id': 'ride1',
      'riderId': 'r1',
      'driverId': 'd1',
      'status': 'in_progress',
      'bookingType': 'scheduled',
      'pickupLocation': {'lat': 6.5, 'lng': 3.3, 'address': 'Lagos'},
      'dropoffLocation': {'lat': 6.6, 'lng': 3.4, 'address': 'Ikeja'},
      'vehicleCategory': 'suv',
      'region': 'NG',
      'isAirport': true,
      'pricing': {
        'estimatedFare': 5000,
        'finalFare': 5500,
        'currency': 'NGN',
        'distance': 15.0,
        'tips': 200,
      },
      'payment': {
        'status': 'completed',
        'gateway': 'paystack',
        'settlement': {'driverAmount': 4400},
      },
      'createdAt': '2025-01-15T10:00:00.000Z',
      'completedAt': '2025-01-15T10:30:00.000Z',
      'acceptedAt': '2025-01-15T10:01:00.000Z',
      'arrivedAt': '2025-01-15T10:05:00.000Z',
      'startedAt': '2025-01-15T10:06:00.000Z',
      'rider': {
        'id': 'r1',
        'displayName': 'Ada',
        'rating': 4.9,
      },
    };

    test('fromJson parses full ride with all nested objects', () {
      final ride = Ride.fromJson(fullJson);
      expect(ride.id, 'ride1');
      expect(ride.riderId, 'r1');
      expect(ride.driverId, 'd1');
      expect(ride.status, 'in_progress');
      expect(ride.bookingType, 'scheduled');
      expect(ride.pickupLocation.address, 'Lagos');
      expect(ride.dropoffLocation.address, 'Ikeja');
      expect(ride.vehicleCategory, 'suv');
      expect(ride.region, 'NG');
      expect(ride.isAirport, true);
      expect(ride.pricing.estimatedFare, 5000);
      expect(ride.pricing.finalFare, 5500);
      expect(ride.payment, isNotNull);
      expect(ride.payment!.driverAmount, 4400);
      expect(ride.rider, isNotNull);
      expect(ride.rider!.name, 'Ada');
    });

    test('id from _id fallback', () {
      final ride = Ride.fromJson({'_id': 'mongo1', 'riderId': 'r'});
      expect(ride.id, 'mongo1');
    });

    test('defaults for empty json', () {
      final ride = Ride.fromJson({});
      expect(ride.id, '');
      expect(ride.status, 'requested');
      expect(ride.bookingType, 'on_demand');
      expect(ride.vehicleCategory, 'sedan');
      expect(ride.region, 'NG');
      expect(ride.isAirport, false);
      expect(ride.payment, isNull);
      expect(ride.rider, isNull);
    });

    test('createdAt from Firestore timestamp', () {
      final ride = Ride.fromJson({
        'createdAt': {'_seconds': 1736899200, '_nanoseconds': 0},
      });
      expect(ride.createdAt.year, 2025);
    });

    test('fare getter returns finalFare when available', () {
      final ride = Ride.fromJson(fullJson);
      expect(ride.fare, 5500); // finalFare
    });

    test('fare getter falls back to estimatedFare when no finalFare', () {
      final ride = Ride.fromJson({
        'pricing': {'estimatedFare': 3000},
      });
      expect(ride.fare, 3000);
    });

    test('convenience getters delegate to nested objects', () {
      final ride = Ride.fromJson(fullJson);
      expect(ride.pickupAddress, 'Lagos');
      expect(ride.dropoffAddress, 'Ikeja');
      expect(ride.pickupLat, 6.5);
      expect(ride.pickupLng, 3.3);
    });

    test('toJson roundtrip preserves data', () {
      final original = Ride.fromJson(fullJson);
      final restored = Ride.fromJson(original.toJson());
      expect(restored.id, original.id);
      expect(restored.status, original.status);
      expect(restored.pricing.estimatedFare, original.pricing.estimatedFare);
      expect(restored.pickupLocation.address, original.pickupLocation.address);
    });
  });

  // ============================= RideRequest =================================
  group('RideRequest', () {
    test('parses flat fields', () {
      final rr = RideRequest.fromJson({
        'id': 'rr1',
        'riderId': 'r1',
        'riderName': 'Ada',
        'riderPhone': '+234',
        'pickupLat': 6.5,
        'pickupLng': 3.3,
        'pickupAddress': 'Lagos',
        'dropoffLat': 6.6,
        'dropoffLng': 3.4,
        'dropoffAddress': 'Ikeja',
        'estimatedFare': 2500,
        'distance': 12.0,
        'duration': 900,
        'createdAt': '2025-01-15T10:00:00.000Z',
      });
      expect(rr.id, 'rr1');
      expect(rr.riderName, 'Ada');
      expect(rr.pickupLat, 6.5);
      expect(rr.dropoffAddress, 'Ikeja');
      expect(rr.estimatedFare, 2500);
      expect(rr.distance, 12.0);
      expect(rr.estimatedDuration, 900);
    });

    test('parses from nested pickupLocation/dropoffLocation/pricing', () {
      final rr = RideRequest.fromJson({
        'id': 'rr2',
        'riderId': 'r1',
        'pickupLocation': {'lat': 41.8, 'lng': -87.6, 'address': 'Chicago'},
        'dropoffLocation': {'lat': 41.9, 'lng': -87.7, 'address': 'O\'Hare'},
        'pricing': {'estimatedFare': 45.0},
        'createdAt': '2025-01-15T10:00:00.000Z',
      });
      expect(rr.pickupLat, 41.8);
      expect(rr.pickupAddress, 'Chicago');
      expect(rr.estimatedFare, 45.0);
    });

    test('id from rideId fallback', () {
      final rr = RideRequest.fromJson({
        'rideId': 'socket1',
        'createdAt': '2025-01-15T10:00:00.000Z',
      });
      expect(rr.id, 'socket1');
    });

    test('distance from distanceKm fallback', () {
      final rr = RideRequest.fromJson({
        'distanceKm': 8.5,
        'createdAt': '2025-01-15T10:00:00.000Z',
      });
      expect(rr.distance, 8.5);
    });

    test('estimatedDuration from etaSeconds fallback', () {
      final rr = RideRequest.fromJson({
        'etaSeconds': 600,
        'createdAt': '2025-01-15T10:00:00.000Z',
      });
      expect(rr.estimatedDuration, 600);
    });

    test('riderName defaults to "Unknown"', () {
      final rr = RideRequest.fromJson({'createdAt': '2025-01-15T10:00:00.000Z'});
      expect(rr.riderName, 'Unknown');
    });

    test('defaults numeric fields to 0', () {
      final rr = RideRequest.fromJson({'createdAt': '2025-01-15T10:00:00.000Z'});
      expect(rr.pickupLat, 0.0);
      expect(rr.estimatedFare, 0.0);
      expect(rr.distance, 0.0);
      expect(rr.estimatedDuration, 0);
    });
  });
}
