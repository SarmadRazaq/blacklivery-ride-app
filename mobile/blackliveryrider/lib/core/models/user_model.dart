import 'package:flutter/foundation.dart';

class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String phone;
  final String? profileImage;
  final String? region;
  final String? role;
  final double? rating;
  final int? totalTrips;
  final Map<String, dynamic>? driverDetails;
  final bool twoFactorEnabled;

  User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.phone,
    this.profileImage,
    this.region,
    this.role,
    this.rating,
    this.totalTrips,
    this.driverDetails,
    this.twoFactorEnabled = false,
  });

  /// Get full name from firstName + lastName
  String get fullName {
    final parts = [firstName, lastName].where((s) => s.isNotEmpty).toList();
    return parts.isEmpty ? 'User' : parts.join(' ');
  }

  factory User.fromJson(Map<String, dynamic> json) {
    debugPrint('User.fromJson parsing: $json');

    // Handle name from various possible fields
    String firstName = json['firstName'] ?? '';
    String lastName = json['lastName'] ?? '';

    // Check displayName (Firestore format)
    if (firstName.isEmpty && json['displayName'] != null) {
      final nameParts = (json['displayName'] as String).split(' ');
      firstName = nameParts.isNotEmpty ? nameParts.first : '';
      lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';
    }

    // Check fullName (alternate format)
    if (firstName.isEmpty && json['fullName'] != null) {
      final nameParts = (json['fullName'] as String).split(' ');
      firstName = nameParts.isNotEmpty ? nameParts.first : '';
      lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';
    }

    // Check name (simple format)
    if (firstName.isEmpty && json['name'] != null) {
      final nameParts = (json['name'] as String).split(' ');
      firstName = nameParts.isNotEmpty ? nameParts.first : '';
      lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';
    }

    // Parse driver details if available
    double? rating;
    int? totalTrips;
    Map<String, dynamic>? driverDetails;

    if (json['driverDetails'] != null) {
      driverDetails = json['driverDetails'];
      if (driverDetails != null) {
        rating = (driverDetails['rating'] is num)
            ? (driverDetails['rating'] as num).toDouble()
            : 5.0;
        totalTrips = driverDetails['totalTrips'] as int? ?? 0;
      }
    }

    return User(
      id: json['id'] ?? json['_id'] ?? json['uid'] ?? '',
      email: json['email'] ?? '',
      firstName: firstName,
      lastName: lastName,
      phone: json['phone'] ?? json['phoneNumber'] ?? '',
      profileImage: json['profileImage'] ?? json['avatar'] ?? json['photoURL'],
      region: json['region']?.toString(),
      role: json['role'],
      rating: rating,
      totalTrips: totalTrips,
      driverDetails: driverDetails,
      twoFactorEnabled: json['twoFactorEnabled'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'fullName': fullName,
      'phone': phone,
      'profileImage': profileImage,
      'region': region,
      'role': role,
      'driverDetails': driverDetails,
    };
  }
}
