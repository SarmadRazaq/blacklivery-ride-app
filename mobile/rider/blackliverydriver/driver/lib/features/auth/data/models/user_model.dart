class User {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String? phone;
  final String? profileImage;
  final String? status;
  final String? region;
  final bool twoFactorEnabled;
  final String? homeAddress;
  final String? workAddress;
  final DriverProfile? driverProfile;
  final DriverStatus? driverStatus;
  final List<EmergencyContact> emergencyContacts;

  User({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
    this.phone,
    this.profileImage,
    this.status,
    this.region,
    this.twoFactorEnabled = false,
    this.homeAddress,
    this.workAddress,
    this.driverProfile,
    this.driverStatus,
    this.emergencyContacts = const [],
  });

  String get displayName => '${firstName ?? ''} ${lastName ?? ''}'.trim();

  factory User.fromJson(Map<String, dynamic> json) {
    // Backend returns 'displayName'. Attempt to split into first/last.
    String fName = json['firstName'] ?? '';
    String lName = json['lastName'] ?? '';

    if (json['displayName'] != null && fName.isEmpty && lName.isEmpty) {
      final parts = (json['displayName'] as String).split(' ');
      if (parts.isNotEmpty) fName = parts.first;
      if (parts.length > 1) lName = parts.sublist(1).join(' ');
    }

    // Handle nested driverStatus if present
    String? status = json['status'];
    if (json['driverStatus'] != null && json['driverStatus'] is Map) {
      status = json['driverStatus']['state'];
    }

    return User(
      id: json['uid'] ?? json['id'] ?? '',
      email: json['email'] ?? '',
      firstName: fName.isNotEmpty ? fName : null,
      lastName: lName.isNotEmpty ? lName : null,
      phone: json['phoneNumber'] ?? json['phone'],
      profileImage: json['photoURL'] ?? json['profileImage'],
      status: status,
      region: json['region'],
      twoFactorEnabled: json['twoFactorEnabled'] ?? false,
      homeAddress: json['homeAddress'],
      workAddress: json['workAddress'],
      driverProfile: json['driverProfile'] != null
          ? DriverProfile.fromJson(json['driverProfile'])
          : null,
      driverStatus: json['driverStatus'] != null
          ? DriverStatus.fromJson(json['driverStatus'])
          : null,
      emergencyContacts:
          (json['emergencyContacts'] as List<dynamic>?)
              ?.map((e) => EmergencyContact.fromJson(e))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'phoneNumber': phone,
      'photoURL': profileImage,
      'status': status,
      'region': region,
      'twoFactorEnabled': twoFactorEnabled,
      'emergencyContacts': emergencyContacts.map((e) => e.toJson()).toList(),
    };
  }
}

class EmergencyContact {
  final String name;
  final String phoneNumber;

  EmergencyContact({required this.name, required this.phoneNumber});

  factory EmergencyContact.fromJson(Map<String, dynamic> json) {
    return EmergencyContact(
      name: json['name'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {'name': name, 'phoneNumber': phoneNumber};
  }
}

class DriverProfile {
  // ... (rest of DriverProfile)
  final String? vehicleId;
  final String? licenseNumber;
  final BankDetails? bankDetails;
  final bool autoPayoutEnabled;
  final String preferredPayoutCurrency;

  DriverProfile({
    this.vehicleId,
    this.licenseNumber,
    this.bankDetails,
    this.autoPayoutEnabled = false,
    this.preferredPayoutCurrency = 'NGN',
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    return DriverProfile(
      vehicleId: json['vehicleId'],
      licenseNumber: json['licenseNumber'],
      bankDetails: json['bankDetails'] != null
          ? BankDetails.fromJson(json['bankDetails'])
          : null,
      autoPayoutEnabled: json['autoPayoutEnabled'] ?? false,
      preferredPayoutCurrency: json['preferredPayoutCurrency'] ?? 'NGN',
    );
  }
}

class BankDetails {
  final String accountName;
  final String accountNumber;
  final String bankCode;
  final String? bankName;

  BankDetails({
    required this.accountName,
    required this.accountNumber,
    required this.bankCode,
    this.bankName,
  });

  factory BankDetails.fromJson(Map<String, dynamic> json) {
    return BankDetails(
      accountName: json['accountName'] ?? '',
      accountNumber: json['accountNumber'] ?? '',
      bankCode: json['bankCode'] ?? '',
      bankName: json['bankName'],
    );
  }
}

class DriverStatus {
  final bool isOnline;
  final String state;
  final DateTime? lastOnlineAt;

  DriverStatus({
    required this.isOnline,
    required this.state,
    this.lastOnlineAt,
  });

  factory DriverStatus.fromJson(Map<String, dynamic> json) {
    return DriverStatus(
      isOnline: json['isOnline'] ?? false,
      state: json['state'] ?? 'offline',
      lastOnlineAt: json['lastOnlineAt'] != null
          ? DateTime.tryParse(json['lastOnlineAt'])
          : null,
    );
  }
}
