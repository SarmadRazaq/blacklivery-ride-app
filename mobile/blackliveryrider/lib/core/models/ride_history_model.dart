class RideDriver {
  final String name;
  final double rating;
  final String photoUrl;
  final String? vehicleColor;
  final String? plateNumber;
  final String? vehicleModel;

  RideDriver({
    required this.name,
    required this.rating,
    required this.photoUrl,
    this.vehicleColor,
    this.plateNumber,
    this.vehicleModel,
  });

  factory RideDriver.fromJson(Map<String, dynamic> json) {
    return RideDriver(
      name: json['name'] ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      photoUrl: json['photoUrl'] ?? '',
      vehicleColor: json['vehicleColor'] ?? json['vehicle']?['color'],
      plateNumber: json['plateNumber'] ?? json['vehicle']?['plateNumber'],
      vehicleModel: json['vehicleModel'] ?? json['vehicle']?['model'],
    );
  }
}

class RideHistoryItem {
  final String id;
  final String pickupAddress;
  final String dropoffAddress;
  final DateTime date;
  final String time;
  final double price;
  final String status; // 'scheduled', 'completed', 'cancelled'
  final RideDriver? driver;
  final String rideType;
  final String? paymentMethod;
  final String? currency;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final double? baseFare;
  final double? distanceFare;
  final double? timeFare;
  final double? surgeFare;
  final double? surgeMultiplier;
  final double? tip;

  RideHistoryItem({
    required this.id,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.date,
    required this.time,
    required this.price,
    required this.status,
    this.driver,
    required this.rideType,
    this.paymentMethod,
    this.currency,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
    this.baseFare,
    this.distanceFare,
    this.timeFare,
    this.surgeFare,
    this.surgeMultiplier,
    this.tip,
  });

  factory RideHistoryItem.fromJson(Map<String, dynamic> json) {
    // Backend returns nested Firestore ride documents:
    //   pickupLocation: { lat, lng, address }, dropoffLocation: { lat, lng, address }
    //   pricing: { estimatedFare, finalFare, currency }
    //   vehicleCategory (not rideType), createdAt (not date/time)
    final pickup = json['pickupLocation'] as Map<String, dynamic>?;
    final dropoff = json['dropoffLocation'] as Map<String, dynamic>?;
    final pricing = json['pricing'] as Map<String, dynamic>?;

    // Parse date: try createdAt first, then date
    DateTime parsedDate = DateTime.now();
    final rawDate = json['createdAt'] ?? json['date'];
    if (rawDate is String) {
      parsedDate = DateTime.tryParse(rawDate) ?? DateTime.now();
    } else if (rawDate is Map && rawDate['_seconds'] != null) {
      parsedDate = DateTime.fromMillisecondsSinceEpoch(
        (rawDate['_seconds'] as int) * 1000,
      );
    }

    // Parse price: prefer pricing.finalFare > pricing.estimatedFare > flat price
    final price = (pricing?['finalFare'] as num?)?.toDouble() ??
        (pricing?['estimatedFare'] as num?)?.toDouble() ??
        (json['price'] as num?)?.toDouble() ??
        0.0;

    // Parse fare breakdown from pricing.breakdown (PriceBreakdown from backend)
    final breakdown = pricing?['breakdown'] as Map<String, dynamic>?;

    return RideHistoryItem(
      id: json['id'] ?? '',
      pickupAddress: json['pickupAddress'] ?? pickup?['address'] ?? '',
      dropoffAddress: json['dropoffAddress'] ?? dropoff?['address'] ?? '',
      date: parsedDate,
      time: json['time'] ?? '',
      price: price,
      status: json['status'] ?? 'pending',
      driver: json['driver'] != null ? RideDriver.fromJson(json['driver']) : null,
      rideType: json['rideType'] ?? json['vehicleCategory'] ?? 'Economy',
      paymentMethod: json['paymentMethod'],
      currency: json['currency'] ?? pricing?['currency'],
      pickupLat: (json['pickupLat'] as num?)?.toDouble() ?? (pickup?['lat'] as num?)?.toDouble(),
      pickupLng: (json['pickupLng'] as num?)?.toDouble() ?? (pickup?['lng'] as num?)?.toDouble(),
      dropoffLat: (json['dropoffLat'] as num?)?.toDouble() ?? (dropoff?['lat'] as num?)?.toDouble(),
      dropoffLng: (json['dropoffLng'] as num?)?.toDouble() ?? (dropoff?['lng'] as num?)?.toDouble(),
      baseFare: (breakdown?['baseFare'] as num?)?.toDouble(),
      distanceFare: (breakdown?['distanceFare'] as num?)?.toDouble(),
      timeFare: (breakdown?['timeFare'] as num?)?.toDouble(),
      surgeFare: (breakdown?['surgeFare'] as num?)?.toDouble(),
      surgeMultiplier: (pricing?['surgeMultiplier'] as num?)?.toDouble() ?? (breakdown?['surgeMultiplier'] as num?)?.toDouble(),
      tip: (json['tip'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'pickupAddress': pickupAddress,
      'dropoffAddress': dropoffAddress,
      'date': date.toIso8601String(),
      'time': time,
      'price': price,
      'status': status,
      'driver': driver != null ? {
        'name': driver!.name,
        'rating': driver!.rating,
        'photoUrl': driver!.photoUrl,
        'vehicleColor': driver!.vehicleColor,
        'plateNumber': driver!.plateNumber,
        'vehicleModel': driver!.vehicleModel,
      } : null,
      'rideType': rideType,
      'paymentMethod': paymentMethod,
      'currency': currency,
      'pickupLat': pickupLat,
      'pickupLng': pickupLng,
      'dropoffLat': dropoffLat,
      'dropoffLng': dropoffLng,
      'baseFare': baseFare,
      'distanceFare': distanceFare,
      'timeFare': timeFare,
      'surgeFare': surgeFare,
      'surgeMultiplier': surgeMultiplier,
      'tip': tip,
    };
  }
}
