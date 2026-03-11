/// Parses date from backend: ISO string or Firestore timestamp { _seconds, _nanoseconds }.
DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  if (value is Map && value['_seconds'] != null) {
    final sec = (value['_seconds'] as num).toInt();
    return DateTime.fromMillisecondsSinceEpoch(sec * 1000);
  }
  return null;
}

class Ride {
  final String id;
  final String riderId;
  final String? driverId;
  final String status;
  final String bookingType;
  final RideLocation pickupLocation;
  final RideLocation dropoffLocation;
  final String vehicleCategory;
  final String region;
  final bool isAirport;
  final RidePricing pricing;
  final RidePayment? payment;
  final String? paymentMethod;
  final DateTime createdAt;
  final DateTime? completedAt;
  final DateTime? acceptedAt;
  final DateTime? arrivedAt;
  final DateTime? startedAt;
  final DateTime? cancelledAt;
  final Rider? rider;

  Ride({
    required this.id,
    required this.riderId,
    this.driverId,
    required this.status,
    required this.bookingType,
    required this.pickupLocation,
    required this.dropoffLocation,
    required this.vehicleCategory,
    required this.region,
    this.isAirport = false,
    required this.pricing,
    this.payment,
    this.paymentMethod,
    required this.createdAt,
    this.completedAt,
    this.acceptedAt,
    this.arrivedAt,
    this.startedAt,
    this.cancelledAt,
    this.rider,
  });

  factory Ride.fromJson(Map<String, dynamic> json) {
    // Parse pricing, and inject top-level tip field into it
    final pricingJson = Map<String, dynamic>.from(json['pricing'] ?? {});
    if (json['tip'] != null) {
      pricingJson['tips'] = json['tip'];
    }

    return Ride(
      id: json['id'] ?? json['_id'] ?? '',
      riderId: json['riderId'] ?? '',
      driverId: json['driverId'],
      status: json['status'] ?? 'requested',
      bookingType: json['bookingType'] ?? 'on_demand',
      pickupLocation: RideLocation.fromJson(json['pickupLocation'] ?? {}),
      dropoffLocation: RideLocation.fromJson(json['dropoffLocation'] ?? {}),
      vehicleCategory: json['vehicleCategory'] ?? 'sedan',
      region: json['region'] ?? 'NG',
      isAirport: json['isAirport'] ?? false,
      pricing: RidePricing.fromJson(pricingJson),
      payment: json['payment'] != null
          ? RidePayment.fromJson(json['payment'])
          : null,
      paymentMethod: json['paymentMethod'] as String?,
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
      completedAt: _parseDate(json['completedAt']),
      acceptedAt: _parseDate(json['acceptedAt']),
      arrivedAt: _parseDate(json['arrivedAt']),
      startedAt: _parseDate(json['startedAt']),
      cancelledAt: _parseDate(json['cancelledAt']),
      // Rider might be populated or we might need to fetch it.
      // If backend sends 'rider' object, use it.
      rider: json['rider'] != null ? Rider.fromJson(json['rider']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'riderId': riderId,
    'driverId': driverId,
    'status': status,
    'bookingType': bookingType,
    'pickupLocation': pickupLocation.toJson(),
    'dropoffLocation': dropoffLocation.toJson(),
    'vehicleCategory': vehicleCategory,
    'region': region,
    'isAirport': isAirport,
    'pricing': pricing.toJson(),
    'payment': payment?.toJson(),
    'paymentMethod': paymentMethod,
    'createdAt': createdAt.toIso8601String(),
    'completedAt': completedAt?.toIso8601String(),
    'acceptedAt': acceptedAt?.toIso8601String(),
    'arrivedAt': arrivedAt?.toIso8601String(),
    'startedAt': startedAt?.toIso8601String(),
    'cancelledAt': cancelledAt?.toIso8601String(),
    'rider': rider?.toJson(),
  };

  Ride copyWith({
    String? status,
    DateTime? completedAt,
    DateTime? startedAt,
    DateTime? arrivedAt,
    DateTime? acceptedAt,
    DateTime? cancelledAt,
  }) {
    return Ride(
      id: id,
      riderId: riderId,
      driverId: driverId,
      status: status ?? this.status,
      bookingType: bookingType,
      pickupLocation: pickupLocation,
      dropoffLocation: dropoffLocation,
      vehicleCategory: vehicleCategory,
      region: region,
      isAirport: isAirport,
      pricing: pricing,
      payment: payment,
      paymentMethod: paymentMethod,
      createdAt: createdAt,
      completedAt: completedAt ?? this.completedAt,
      acceptedAt: acceptedAt ?? this.acceptedAt,
      arrivedAt: arrivedAt ?? this.arrivedAt,
      startedAt: startedAt ?? this.startedAt,
      cancelledAt: cancelledAt ?? this.cancelledAt,
      rider: rider,
    );
  }

  // Getters for compatibility with older code if necessary, or refactor usages
  String get pickupAddress => pickupLocation.address;
  String get dropoffAddress => dropoffLocation.address;
  double get pickupLat => pickupLocation.lat;
  double get pickupLng => pickupLocation.lng;
  double get dropoffLat => dropoffLocation.lat;
  double get dropoffLng => dropoffLocation.lng;
  double get fare => pricing.finalFare ?? pricing.estimatedFare;
}

class RideLocation {
  final double lat;
  final double lng;
  final String address;

  RideLocation({required this.lat, required this.lng, required this.address});

  factory RideLocation.fromJson(Map<String, dynamic> json) {
    return RideLocation(
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
      address: json['address'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'lat': lat, 'lng': lng, 'address': address};
}

class RidePricing {
  final double estimatedFare;
  final double? finalFare;
  final String currency;
  final double distance; // km
  final double tips;

  RidePricing({
    required this.estimatedFare,
    this.finalFare,
    required this.currency,
    this.distance = 0.0,
    this.tips = 0.0,
  });

  factory RidePricing.fromJson(Map<String, dynamic> json) {
    return RidePricing(
      estimatedFare: (json['estimatedFare'] as num?)?.toDouble() ?? 0.0,
      finalFare: (json['finalFare'] as num?)?.toDouble(),
      currency: json['currency'] ?? 'NGN',
      distance: (json['distance'] as num?)?.toDouble() ?? 0.0,
      tips: (json['tips'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'estimatedFare': estimatedFare,
    'finalFare': finalFare,
    'currency': currency,
    'distance': distance,
    'tips': tips,
  };
}

class RidePayment {
  final String? status;
  final String? gateway;
  final double? driverAmount;

  RidePayment({this.status, this.gateway, this.driverAmount});

  factory RidePayment.fromJson(Map<String, dynamic> json) {
    return RidePayment(
      status: json['status'],
      gateway: json['gateway'],
      driverAmount: (json['settlement']?['driverAmount'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
    'status': status,
    'gateway': gateway,
    'settlement': driverAmount != null ? {'driverAmount': driverAmount} : null,
  };
}

class Rider {
  final String id;
  final String name;
  final String? phone;
  final String? image;
  final double rating;
  final bool quietMode;

  Rider({
    required this.id,
    required this.name,
    this.phone,
    this.image,
    required this.rating,
    this.quietMode = false,
  });

  factory Rider.fromJson(Map<String, dynamic> json) {
    return Rider(
      id: json['id'] ?? json['uid'] ?? '',
      name: json['displayName'] ?? json['name'] ?? 'Rider',
      phone: json['phoneNumber'] ?? json['phone'],
      image: json['photoURL'] ?? json['image'],
      rating: (json['rating'] as num?)?.toDouble() ?? 5.0,
      quietMode:
          json['quietMode'] == true ||
          json['preferences']?['quietMode'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'phone': phone,
    'image': image,
    'rating': rating,
    'quietMode': quietMode,
  };
}

class RideRequest {
  // Keeping this for compatibility with SocketService if needed,
  // but ideally we should map incoming socket events to Ride model or similar.
  // For now, I'll keep a minimal version or assume SocketService uses it.
  // I will recreate it based on the previous version but cleaner.
  final String id;
  final String riderId;
  final String riderName;
  final String riderPhone;
  final String? riderPhotoUrl;
  final double pickupLat;
  final double pickupLng;
  final String pickupAddress;
  final double dropoffLat;
  final double dropoffLng;
  final String dropoffAddress;
  final double estimatedFare;
  final double distance;
  final int estimatedDuration;
  final String? scheduledTime;
  final String bookingType;
  final bool isAirport;
  final String? paymentMethod;
  final DateTime createdAt;

  RideRequest({
    required this.id,
    required this.riderId,
    required this.riderName,
    required this.riderPhone,
    this.riderPhotoUrl,
    required this.pickupLat,
    required this.pickupLng,
    required this.pickupAddress,
    required this.dropoffLat,
    required this.dropoffLng,
    required this.dropoffAddress,
    required this.estimatedFare,
    required this.distance,
    required this.estimatedDuration,
    this.scheduledTime,
    this.bookingType = 'on_demand',
    this.isAirport = false,
    this.paymentMethod,
    required this.createdAt,
  });

  factory RideRequest.fromJson(Map<String, dynamic> json) {
    final pickup = json['pickupLocation'] as Map<String, dynamic>?;
    final dropoff = json['dropoffLocation'] as Map<String, dynamic>?;
    final pricing = json['pricing'] as Map<String, dynamic>?;

    return RideRequest(
      id: json['id'] ?? json['rideId'] ?? '',
      riderId: json['riderId'] ?? '',
      riderName: json['riderName'] ?? 'Unknown',
      riderPhone: json['riderPhone'] ?? '',
      riderPhotoUrl: json['riderPhotoUrl'] ?? json['riderAvatar'],
      pickupLat:
          (json['pickupLat'] ?? pickup?['lat'] as num?)?.toDouble() ?? 0.0,
      pickupLng:
          (json['pickupLng'] ?? pickup?['lng'] as num?)?.toDouble() ?? 0.0,
      pickupAddress: json['pickupAddress'] ?? pickup?['address'] ?? '',
      dropoffLat:
          (json['dropoffLat'] ?? dropoff?['lat'] as num?)?.toDouble() ?? 0.0,
      dropoffLng:
          (json['dropoffLng'] ?? dropoff?['lng'] as num?)?.toDouble() ?? 0.0,
      dropoffAddress: json['dropoffAddress'] ?? dropoff?['address'] ?? '',
      estimatedFare:
          (json['estimatedFare'] ?? pricing?['estimatedFare'] as num?)
              ?.toDouble() ??
          0.0,
      distance:
          (json['distance'] as num?)?.toDouble() ??
          (json['distanceKm'] as num?)?.toDouble() ??
          0.0,
      estimatedDuration:
          (json['duration'] as num?)?.toInt() ??
          (json['etaSeconds'] as num?)?.toInt() ??
          0,
      scheduledTime: json['scheduledTime'] ?? json['scheduledAt']?.toString(),
      bookingType: json['bookingType'] ?? 'on_demand',
      isAirport: json['isAirport'] == true || json['bookingType'] == 'airport_transfer',
      paymentMethod: json['paymentMethod'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }
}
