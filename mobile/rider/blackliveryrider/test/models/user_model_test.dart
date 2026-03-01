import 'package:flutter_test/flutter_test.dart';
import 'package:blackliveryrider/core/models/user_model.dart';

void main() {
  group('User.fromJson', () {
    test('parses firstName and lastName directly', () {
      final user = User.fromJson({
        'id': 'u1',
        'email': 'john@test.com',
        'firstName': 'John',
        'lastName': 'Doe',
        'phone': '+2341234567890',
      });
      expect(user.id, 'u1');
      expect(user.email, 'john@test.com');
      expect(user.firstName, 'John');
      expect(user.lastName, 'Doe');
      expect(user.phone, '+2341234567890');
    });

    test('falls back to displayName when firstName is empty', () {
      final user = User.fromJson({
        'id': 'u2',
        'email': 'a@b.com',
        'displayName': 'Jane Smith-Williams',
        'phone': '555',
      });
      expect(user.firstName, 'Jane');
      expect(user.lastName, 'Smith-Williams');
    });

    test('falls back to fullName when firstName and displayName missing', () {
      final user = User.fromJson({
        'id': 'u3',
        'email': 'a@b.com',
        'fullName': 'Alice Bob Charlie',
        'phone': '555',
      });
      expect(user.firstName, 'Alice');
      expect(user.lastName, 'Bob Charlie');
    });

    test('falls back to name when all other name fields missing', () {
      final user = User.fromJson({
        'id': 'u4',
        'email': 'a@b.com',
        'name': 'Kemi',
        'phone': '555',
      });
      expect(user.firstName, 'Kemi');
      expect(user.lastName, '');
    });

    test('id from _id fallback', () {
      final user = User.fromJson({
        '_id': 'mongo1',
        'email': '',
        'firstName': 'A',
        'lastName': 'B',
        'phone': '',
      });
      expect(user.id, 'mongo1');
    });

    test('id from uid fallback', () {
      final user = User.fromJson({
        'uid': 'firebase1',
        'email': '',
        'firstName': 'A',
        'lastName': 'B',
        'phone': '',
      });
      expect(user.id, 'firebase1');
    });

    test('phone from phoneNumber fallback', () {
      final user = User.fromJson({
        'id': 'u5',
        'email': '',
        'firstName': 'A',
        'lastName': 'B',
        'phoneNumber': '+1555',
      });
      expect(user.phone, '+1555');
    });

    test('profileImage from avatar fallback', () {
      final user = User.fromJson({
        'id': 'u6',
        'email': '',
        'firstName': 'A',
        'lastName': 'B',
        'phone': '',
        'avatar': 'https://avatar.png',
      });
      expect(user.profileImage, 'https://avatar.png');
    });

    test('profileImage from photoURL fallback', () {
      final user = User.fromJson({
        'id': 'u7',
        'email': '',
        'firstName': 'A',
        'lastName': 'B',
        'phone': '',
        'photoURL': 'https://photo.png',
      });
      expect(user.profileImage, 'https://photo.png');
    });

    test('parses driverDetails with rating and totalTrips', () {
      final user = User.fromJson({
        'id': 'u8',
        'email': '',
        'firstName': 'D',
        'lastName': 'R',
        'phone': '',
        'driverDetails': {
          'rating': 4.8,
          'totalTrips': 120,
        },
      });
      expect(user.rating, 4.8);
      expect(user.totalTrips, 120);
      expect(user.driverDetails, isNotNull);
    });

    test('driverDetails defaults rating to 5.0 when not a num', () {
      final user = User.fromJson({
        'id': 'u9',
        'email': '',
        'firstName': 'D',
        'lastName': 'R',
        'phone': '',
        'driverDetails': {
          'rating': 'good',
          'totalTrips': 5,
        },
      });
      expect(user.rating, 5.0);
      expect(user.totalTrips, 5);
    });

    test('handles completely empty json gracefully', () {
      final user = User.fromJson({});
      expect(user.id, '');
      expect(user.email, '');
      expect(user.firstName, '');
      expect(user.lastName, '');
      expect(user.phone, '');
      expect(user.twoFactorEnabled, false);
    });

    test('parses region and role', () {
      final user = User.fromJson({
        'id': 'u10',
        'email': '',
        'firstName': 'A',
        'lastName': 'B',
        'phone': '',
        'region': 'NG',
        'role': 'rider',
      });
      expect(user.region, 'NG');
      expect(user.role, 'rider');
    });
  });

  group('User.fullName', () {
    test('joins firstName and lastName', () {
      final user = User(
        id: '1',
        email: '',
        firstName: 'John',
        lastName: 'Doe',
        phone: '',
      );
      expect(user.fullName, 'John Doe');
    });

    test('returns only firstName when lastName is empty', () {
      final user = User(
        id: '1',
        email: '',
        firstName: 'John',
        lastName: '',
        phone: '',
      );
      expect(user.fullName, 'John');
    });

    test('returns "User" when both names are empty', () {
      final user = User(
        id: '1',
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
      );
      expect(user.fullName, 'User');
    });
  });

  group('User.toJson', () {
    test('serializes all fields correctly', () {
      final user = User(
        id: 'u1',
        email: 'a@b.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+234',
        profileImage: 'img.png',
        region: 'NG',
        role: 'rider',
        driverDetails: {'rating': 4.5},
      );
      final json = user.toJson();
      expect(json['id'], 'u1');
      expect(json['email'], 'a@b.com');
      expect(json['firstName'], 'John');
      expect(json['lastName'], 'Doe');
      expect(json['fullName'], 'John Doe');
      expect(json['phone'], '+234');
      expect(json['profileImage'], 'img.png');
      expect(json['region'], 'NG');
      expect(json['role'], 'rider');
    });

    test('roundtrip fromJson → toJson preserves data', () {
      final original = {
        'id': 'u1',
        'email': 'test@test.com',
        'firstName': 'Jane',
        'lastName': 'Smith',
        'phone': '+1555',
        'region': 'US-CHI',
        'role': 'rider',
      };
      final user = User.fromJson(original);
      final json = user.toJson();
      expect(json['id'], original['id']);
      expect(json['firstName'], original['firstName']);
      expect(json['lastName'], original['lastName']);
      expect(json['email'], original['email']);
      expect(json['phone'], original['phone']);
    });
  });
}
