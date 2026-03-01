import 'package:flutter_test/flutter_test.dart';
import 'package:driver/features/auth/data/models/user_model.dart';

void main() {
  group('User.fromJson', () {
    test('parses firstName and lastName directly', () {
      final user = User.fromJson({
        'uid': 'u1',
        'email': 'driver@test.com',
        'firstName': 'Emeka',
        'lastName': 'Obi',
        'phoneNumber': '+2348012345678',
      });
      expect(user.id, 'u1');
      expect(user.email, 'driver@test.com');
      expect(user.firstName, 'Emeka');
      expect(user.lastName, 'Obi');
      expect(user.phone, '+2348012345678');
    });

    test('splits displayName when firstName/lastName empty', () {
      final user = User.fromJson({
        'id': 'u2',
        'email': '',
        'displayName': 'Chidi Nwankwo',
      });
      expect(user.firstName, 'Chidi');
      expect(user.lastName, 'Nwankwo');
    });

    test('displayName with single word', () {
      final user = User.fromJson({
        'id': 'u3',
        'email': '',
        'displayName': 'Tunde',
      });
      expect(user.firstName, 'Tunde');
      expect(user.lastName, isNull); // empty string → null
    });

    test('id fallback: uid preferred over id', () {
      final user = User.fromJson({
        'uid': 'firebase1',
        'id': 'other1',
        'email': '',
      });
      expect(user.id, 'firebase1');
    });

    test('id fallback: id when uid missing', () {
      final user = User.fromJson({
        'id': 'other1',
        'email': '',
      });
      expect(user.id, 'other1');
    });

    test('phone from phoneNumber preferred over phone', () {
      final user = User.fromJson({
        'id': 'u4',
        'email': '',
        'phoneNumber': '+234phone1',
        'phone': '+234phone2',
      });
      expect(user.phone, '+234phone1');
    });

    test('profileImage from photoURL preferred over profileImage', () {
      final user = User.fromJson({
        'id': 'u5',
        'email': '',
        'photoURL': 'https://photo.png',
        'profileImage': 'https://profile.png',
      });
      expect(user.profileImage, 'https://photo.png');
    });

    test('status extracted from nested driverStatus.state', () {
      final user = User.fromJson({
        'id': 'u6',
        'email': '',
        'driverStatus': {
          'state': 'active',
          'isOnline': true,
          'lastOnlineAt': '2025-01-15T00:00:00.000Z',
        },
      });
      expect(user.status, 'active');
      expect(user.driverStatus, isNotNull);
      expect(user.driverStatus!.isOnline, true);
    });

    test('twoFactorEnabled defaults to false', () {
      final user = User.fromJson({'id': 'u7', 'email': ''});
      expect(user.twoFactorEnabled, false);
    });

    test('parses driverProfile with bankDetails', () {
      final user = User.fromJson({
        'id': 'u8',
        'email': '',
        'driverProfile': {
          'vehicleId': 'v1',
          'licenseNumber': 'LIC-001',
          'autoPayoutEnabled': true,
          'preferredPayoutCurrency': 'USD',
          'bankDetails': {
            'accountName': 'Emeka Obi',
            'accountNumber': '1234567890',
            'bankCode': '044',
            'bankName': 'Access Bank',
          },
        },
      });
      expect(user.driverProfile, isNotNull);
      expect(user.driverProfile!.vehicleId, 'v1');
      expect(user.driverProfile!.autoPayoutEnabled, true);
      expect(user.driverProfile!.preferredPayoutCurrency, 'USD');
      expect(user.driverProfile!.bankDetails, isNotNull);
      expect(user.driverProfile!.bankDetails!.accountName, 'Emeka Obi');
      expect(user.driverProfile!.bankDetails!.bankCode, '044');
    });

    test('parses emergencyContacts list', () {
      final user = User.fromJson({
        'id': 'u9',
        'email': '',
        'emergencyContacts': [
          {'name': 'Mum', 'phoneNumber': '+2340001'},
          {'name': 'Dad', 'phoneNumber': '+2340002'},
        ],
      });
      expect(user.emergencyContacts.length, 2);
      expect(user.emergencyContacts[0].name, 'Mum');
      expect(user.emergencyContacts[1].phoneNumber, '+2340002');
    });

    test('emergencyContacts defaults to empty list', () {
      final user = User.fromJson({'id': 'u10', 'email': ''});
      expect(user.emergencyContacts, isEmpty);
    });

    test('handles completely empty json', () {
      final user = User.fromJson({});
      expect(user.id, '');
      expect(user.email, '');
      expect(user.firstName, isNull);
      expect(user.lastName, isNull);
      expect(user.twoFactorEnabled, false);
    });
  });

  group('User.displayName', () {
    test('joins firstName and lastName', () {
      final user = User(id: '1', email: '', firstName: 'John', lastName: 'Doe');
      expect(user.displayName, 'John Doe');
    });

    test('returns only firstName when lastName is null', () {
      final user = User(id: '1', email: '', firstName: 'John');
      expect(user.displayName, 'John');
    });

    test('returns empty when both null', () {
      final user = User(id: '1', email: '');
      expect(user.displayName, '');
    });
  });

  group('User.toJson', () {
    test('serializes all fields', () {
      final user = User(
        id: 'u1',
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        phone: '+234',
        profileImage: 'img.png',
        region: 'NG',
        twoFactorEnabled: true,
        emergencyContacts: [
          EmergencyContact(name: 'Mum', phoneNumber: '+2340001'),
        ],
      );
      final json = user.toJson();
      expect(json['id'], 'u1');
      expect(json['email'], 'a@b.com');
      expect(json['firstName'], 'A');
      expect(json['phoneNumber'], '+234');
      expect(json['photoURL'], 'img.png');
      expect(json['twoFactorEnabled'], true);
      expect((json['emergencyContacts'] as List).length, 1);
    });
  });

  group('DriverStatus.fromJson', () {
    test('parses all fields', () {
      final ds = DriverStatus.fromJson({
        'isOnline': true,
        'state': 'active',
        'lastOnlineAt': '2025-01-15T10:00:00.000Z',
      });
      expect(ds.isOnline, true);
      expect(ds.state, 'active');
      expect(ds.lastOnlineAt, isNotNull);
      expect(ds.lastOnlineAt!.year, 2025);
    });

    test('defaults isOnline to false and state to "offline"', () {
      final ds = DriverStatus.fromJson({});
      expect(ds.isOnline, false);
      expect(ds.state, 'offline');
      expect(ds.lastOnlineAt, isNull);
    });
  });

  group('DriverProfile.fromJson', () {
    test('defaults autoPayoutEnabled and preferredPayoutCurrency', () {
      final dp = DriverProfile.fromJson({});
      expect(dp.autoPayoutEnabled, false);
      expect(dp.preferredPayoutCurrency, 'NGN');
      expect(dp.bankDetails, isNull);
    });
  });

  group('BankDetails.fromJson', () {
    test('defaults to empty strings', () {
      final bd = BankDetails.fromJson({});
      expect(bd.accountName, '');
      expect(bd.accountNumber, '');
      expect(bd.bankCode, '');
      expect(bd.bankName, isNull);
    });
  });

  group('EmergencyContact', () {
    test('fromJson defaults', () {
      final ec = EmergencyContact.fromJson({});
      expect(ec.name, '');
      expect(ec.phoneNumber, '');
    });

    test('toJson roundtrip', () {
      final ec = EmergencyContact(name: 'Ada', phoneNumber: '+234');
      final restored = EmergencyContact.fromJson(ec.toJson());
      expect(restored.name, 'Ada');
      expect(restored.phoneNumber, '+234');
    });
  });
}
